import { resolve } from "node:path";
import { buildPicture } from "../picture/picture-build.ts";
import { headCommit, repoRoot } from "../project/git.ts";
import { pictureTick } from "../project/picture-tick.ts";

const HELP = "limen picture build [--dir D] [--out F] [--json F] [--strict]\nlimen picture tick [--dir D] [--dry-run] --engine E --provider P --model M --thinking T";

export async function pictureCommand(args: readonly string[], cwd: string): Promise<void> {
	if (args[0] === "--help" || args[0] === "-h") {
		console.log(HELP);
		return;
	}
	const [mode, ...rest] = args;
	if (mode !== "build" && mode !== "tick") throw new Error(HELP);
	const values = new Map<string, string>();
	let strict = false;
	let dryRun = false;
	const allowed = mode === "build" ? ["--dir", "--out", "--json"] : ["--dir", "--engine", "--provider", "--model", "--thinking"];
	for (let i = 0; i < rest.length; i++) {
		const flag = rest[i] ?? "";
		if (flag === "--strict" && mode === "build") strict = true;
		else if (flag === "--dry-run" && mode === "tick") dryRun = true;
		else {
			const value = rest[++i];
			if (!allowed.includes(flag) || !value || value.startsWith("--") || values.has(flag)) throw new Error(`invalid picture option ${flag}\n${HELP}`);
			values.set(flag, value);
		}
	}
	const root = repoRoot(cwd);
	const dir = resolve(cwd, values.get("--dir") ?? `${root}/.limen/picture`);
	if (mode === "tick") {
		await pictureTick(root, dir, values, dryRun);
		return;
	}
	const out = resolve(cwd, values.get("--out") ?? `${dir}/map.html`);
	const json = values.get("--json");
	const model = await buildPicture(dir, out, json ? resolve(cwd, json) : undefined, headCommit(root));
	for (const d of model.diagnostics) console.error(`${d.level} ${d.code}${d.source ? ` ${d.source}` : ""}: ${d.message}`);
	console.log(`picture: ${model.nodes.length} places, ${model.edges.length} edges; wrote ${out}`);
	if (strict && model.diagnostics.some((d) => d.level === "error")) process.exitCode = 1;
}
