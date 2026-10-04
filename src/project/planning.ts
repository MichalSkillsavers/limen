import { readFileSync } from "node:fs";
import { readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

export type PlanningSource = "committed" | "private";

/** The project setting is local cabinet state, never a planning copy. */
export function planningSource(root: string): PlanningSource {
	return readPlanningSource(`${root}/.limen/planning-source`);
}
export function recordedPlanningSource(jobDir: string): PlanningSource {
	return readPlanningSource(`${jobDir}/planning-source`);
}
function readPlanningSource(file: string): PlanningSource {
	let value: string;
	try {
		value = readFileSync(file, "utf8").trim();
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return "committed";
		throw error;
	}
	return parsePlanningSource(value);
}
export function parsePlanningSource(value: string): PlanningSource {
	if (value !== "committed" && value !== "private") throw new Error("planning source must be committed or private");
	return value;
}

/** A running job keeps its recorded choice even if the project setting changes. */
export function inheritedPlanning(worktree: string): { root: string; source: PlanningSource; repo?: string } | undefined {
	const root = process.env.LIMEN_CONTEXT_ROOT;
	const id = process.env.LIMEN_JOB_ID;
	if (process.env.LIMEN_JOB !== "1" || !root || !id || !/^[A-Za-z0-9._-]+$/.test(id)) return;
	const dir = `${root}/.limen/jobs/${id}`;
	const recordedTree = readFileSync(`${dir}/worktree`, "utf8").trim();
	if (resolve(recordedTree) !== resolve(worktree)) return;
	let repo: string | undefined;
	try {
		repo = readFileSync(`${dir}/repo`, "utf8").trim();
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
	}
	return { root, source: recordedPlanningSource(dir), ...(repo ? { repo } : {}) };
}

/** Reject both lexical escapes and resolved symlink escapes before reading. */
export async function privatePlanningFile(root: string, path: string): Promise<string> {
	const absolute = resolve(root, path);
	const inside = (base: string, file: string): boolean => {
		const rel = relative(base, file);
		return Boolean(rel) && rel !== ".." && !rel.startsWith("../") && !isAbsolute(rel);
	};
	if (path.split(/[\\/]/).includes("..") || !inside(resolve(root), absolute)) throw new Error(`private planning path must be inside canonical root: ${path}`);
	const canonicalRoot = await realpath(root);
	const canonicalFile = await realpath(absolute);
	if (!inside(canonicalRoot, canonicalFile)) throw new Error(`private planning path escapes canonical root: ${path}`);
	const info = await stat(canonicalFile);
	if (!info.isFile() || !(info.mode & 0o444)) throw new Error(`private planning file is not readable: ${path}`);
	await readFile(canonicalFile, "utf8");
	return absolute;
}

export async function privatePlanningTask(root: string, task: string): Promise<string> {
	let result = task;
	for (const match of task.matchAll(/\bTicket:\s+(\S+)/g)) {
		const token = match[1] ?? "";
		const path = token.replace(/[.,;:!?)\]'"`]+$/, "");
		const absolute = await privatePlanningFile(root, path);
		result = result.replace(match[0], match[0].replace(path, absolute));
	}
	return result;
}

export function privatePlanningGuidance(root: string): string {
	return `Planning source: private. Read canonical planning in ${root}; do not copy, link, stage or commit it. Planning-commit instructions apply only to committed mode. Product-code Git requirements are unchanged.\nVision (read-only): ${root}/spec/vision.md\nBoard (read-only): ${root}/spec/build.md\n`;
}
