import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { resolveJob } from "../job/lookup.ts";
import { readBoard } from "../picture/board.ts";
import { readPicture } from "../picture/picture-build.ts";
import { checkTickets, readTickets } from "../picture/tickets.ts";
import { cleanWorktree, commitList, currentBranch, limenRoot, mergeBranch, workspaceRepository } from "../project/git.ts";

export async function landCommand(args: readonly string[], cwd: string): Promise<void> {
	if (process.env.LIMEN_GROUP_ID) throw new Error("group members cannot land; the owner-facing lead owns landing");
	const parsed = parseLandArgs(args);
	const { id, jobDir } = await resolveJob(cwd, parsed.query, "control");
	const [state, branch, base, repo, label] = await Promise.all([
		text(`${jobDir}/state`),
		text(`${jobDir}/branch`),
		text(`${jobDir}/base`),
		text(`${jobDir}/repo`),
		text(`${jobDir}/label`),
	]);
	if (state !== "done") throw new Error(`job ${id} is ${state || "missing"}; land requires a done job`);
	if (!branch || !base) throw new Error(`job ${id} has no recorded ${branch ? "base" : "branch"}`);
	const root = limenRoot(cwd);
	const repository = repo ? workspaceRepository(root, repo) : root;
	const current = currentBranch(repository);
	const target = parsed.onto ?? current;
	if (target !== current) throw new Error(`land merges onto the current branch (${current}); checkout ${target} first`);
	if (target === branch) throw new Error(`already on job branch ${branch}`);
	if (!cleanWorktree(repository)) throw new Error(`target ${target} is dirty`);
	const commits = commitList(repository, base, branch);
	if (!commits) throw new Error(`job ${id} has no commits to land`);
	const gate = await landTicketCheck(repository, root, branch, "HEAD", id);
	if (!gate.ok) throw new Error(`land refused: ${branch} has tickets that fail the strict check\n${gate.lines.join("\n")}`);
	for (const line of gate.lines) console.log(line);
	if (!parsed.yes && !(await confirm(`Land ${label || id} onto ${target}? [y/N] `))) throw new Error("land cancelled");
	const output = mergeBranch(repository, branch);
	if (output) console.log(output);
	console.log(`landed ${id} onto ${target}`);
}

export const TICKET_PATH = /^spec\/features\/(?:[^/]+\/)*(F\d+)-[^/]+\/ticket\.md$/;

/**
 * The strict ticket check for tickets that `branch` adds, changes or moves against `target`, read at the branch tip.
 * `lines` is print-ready: the no-map note, warnings, errors, then the keeper command when the check refuses.
 */
export async function landTicketCheck(
	repository: string,
	root: string,
	branch: string,
	target = "HEAD",
	job = "<id>",
): Promise<{ readonly ok: boolean; readonly tickets: readonly string[]; readonly lines: readonly string[] }> {
	const changed = new Map<string, string>();
	for (const row of gitText(repository, ["diff", "--name-status", "-M", `${target}...${branch}`]).split("\n")) {
		const [status = "", ...paths] = row.split("\t");
		const path = paths.at(-1) ?? "";
		if (/^[AMR]/.test(status) && TICKET_PATH.test(path)) changed.set(path, status[0] ?? "");
	}
	const tickets = [...changed.keys()];
	if (tickets.length === 0) return { ok: true, tickets, lines: [] };
	const lines: string[] = [];
	const map = `${root}/.limen/picture`;
	let placeIds: ReadonlySet<string> | undefined;
	if (existsSync(map)) {
		const model = await readPicture(map);
		placeIds = new Set([...model.nodes.filter((node) => node.kind === "module").map((node) => node.id), ...(model.project.rootId ? [model.project.rootId] : [])]);
		const codes = new Map(tickets.map((path) => [TICKET_PATH.exec(path)?.[1] ?? "", path]));
		for (const record of [...model.nodes, ...model.edges, ...model.features, ...model.journeys])
			for (const source of record.sources) {
				const current = codes.get(/\/(F\d+)-/.exec(source)?.[1] ?? "");
				if (current && !gitOk(repository, ["cat-file", "-e", `${branch}:${source.replace(/\/$/, "")}`]))
					lines.push(`warn ${map}/${record.source}: source "${source}" does not exist at ${branch}; fix: change it to ${current}`);
			}
	} else lines.push(`land: no picture map at ${map}; touches place ids not checked`);
	const tip = await mkdtemp(join(tmpdir(), "limen-land-"));
	try {
		const archive = execFileSync("git", ["archive", branch, "--", ":(glob)spec/features/**/ticket.md"], { cwd: repository, maxBuffer: 256 * 1024 * 1024 });
		execFileSync("tar", ["-x", "-C", tip], { input: archive });
		const board = spawnSync("git", ["show", `${branch}:spec/build.md`], { cwd: repository, maxBuffer: 64 * 1024 * 1024 });
		if (board.status === 0) await writeFile(join(tip, "spec/build.md"), board.stdout);
		const entries = await readBoard(tip);
		for (const path of tickets) {
			const lane = path.split("/")[2];
			const folder = path.split("/").at(-2) ?? "";
			const code = TICKET_PATH.exec(path)?.[1] ?? "";
			const want =
				lane === "active"
					? { state: "ACTIVE", line: `- \`${folder}\` (🟠 ACTIVE): <one clause> under ## NOW` }
					: lane === "done"
						? { state: "PROVEN", line: `- \`${folder}\` (🟢 PROVEN): <one clause> under ## PROVEN` }
						: undefined;
			if (!want) continue;
			const entry = entries.get(code.toLowerCase());
			if (!entry) lines.push(`warn spec/build.md: no board line for ${code}; fix: add ${want.line}`);
			else if (entry.state !== want.state)
				lines.push(
					`warn spec/build.md:${entry.line}: ${code} is ${entry.state} on the board but its folder is in ${lane}; fix: mark it ${want.state} in the ${lane === "active" ? "NOW" : "PROVEN"} section`,
				);
		}
		const read = await readTickets(tip);
		const diagnostics = [...read.diagnostics, ...(placeIds ? checkTickets(read.tickets, placeIds) : [])].filter((d) => d.source !== null && changed.has(d.source));
		const errors = diagnostics.filter((d) => d.level === "error").map((d) => `${d.source}:${d.line ?? 1}: ${d.message}`);
		const all = gitText(repository, ["ls-tree", "-r", "--name-only", branch, "--", "spec/features"]).split("\n");
		for (const [path, status] of changed) {
			if (status !== "A") continue;
			const code = TICKET_PATH.exec(path)?.[1];
			const other = all.find((candidate) => candidate !== path && TICKET_PATH.exec(candidate)?.[1] === code);
			if (other) errors.push(`${path}:1: ${code} is also used by ${other}; fix: move this ticket to a free F number (limen ticket new picks one)`);
		}
		for (const d of diagnostics) if (d.level === "warn") lines.push(`warn ${d.source}:${d.line ?? 1}: ${d.message}`);
		lines.push(...errors);
		if (errors.length === 0) return { ok: true, tickets, lines };
		const bad = errors[0]?.slice(0, errors[0].indexOf(":")) ?? tickets[0];
		lines.push(`fix: limen keeper ${bad} --job ${job} --engine <engine> --provider <provider> --model <model> --thinking <level>`);
		return { ok: false, tickets, lines };
	} finally {
		await rm(tip, { recursive: true, force: true });
	}
}

function gitText(cwd: string, args: readonly string[]): string {
	return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
}

function gitOk(cwd: string, args: readonly string[]): boolean {
	return spawnSync("git", args, { cwd, stdio: "ignore" }).status === 0;
}

function parseLandArgs(args: readonly string[]): { readonly query: string; readonly yes: boolean; readonly onto?: string } {
	let query: string | undefined;
	let yes = false;
	let onto: string | undefined;
	for (let index = 0; index < args.length; index += 1) {
		const value = args[index];
		if (!value) continue;
		if (value === "--yes") yes = true;
		else if (value === "--onto") {
			const next = args[index + 1];
			if (!next || next.startsWith("--")) throw new Error("--onto requires a branch");
			if (onto !== undefined) throw new Error("--onto may be supplied only once");
			onto = next;
			index += 1;
		} else if (value.startsWith("--")) throw new Error(`unknown land option ${value}`);
		else if (query) throw new Error("land requires exactly one job id");
		else query = value;
	}
	if (!query) throw new Error("land requires a job id");
	return onto !== undefined ? { query, yes, onto } : { query, yes };
}

async function confirm(question: string): Promise<boolean> {
	if (process.stdin.isTTY !== true || process.stdout.isTTY !== true) throw new Error("land requires a TTY confirm, or pass --yes");
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	try {
		return /^(y|yes)$/i.test((await rl.question(question)).trim());
	} finally {
		rl.close();
	}
}

function text(path: string): Promise<string> {
	return readFile(path, "utf8").then(
		(value) => value.trim(),
		() => "",
	);
}
