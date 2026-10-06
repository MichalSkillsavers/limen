import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPicture } from "../picture/picture-build.ts";
import { ID_PATTERN } from "../picture/picture-model.ts";
import { repoRoot } from "../project/git.ts";

const HELP = 'limen ticket new "what becomes true" [--lane planned|active] [--touches id,id]';
const PLACE_ID = ID_PATTERN;

async function directories(path: string): Promise<string[]> {
	const entries = await readdir(path, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
		if (error.code === "ENOENT") return [];
		throw error;
	});
	return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function nextFeatureNumber(base: string): Promise<number> {
	let highest = 0;
	for (const lane of ["planned", "active", "done", "dropped"]) {
		const lanePath = join(base, lane);
		const parents = lane === "done" || lane === "dropped" ? (await directories(lanePath)).map((month) => join(lanePath, month)) : [lanePath];
		for (const parent of parents) {
			for (const name of await directories(parent)) {
				const match = /^F(\d+)-/.exec(name);
				if (match) highest = Math.max(highest, Number(match[1]));
			}
		}
	}
	return highest + 1;
}

export async function ticketCommand(args: readonly string[], cwd: string): Promise<void> {
	const [mode, title, ...options] = args;
	if (mode !== "new" || !title || title.startsWith("--") || /[\r\n]/.test(title) || !title.trim()) throw new Error(HELP);
	let lane: "planned" | "active" = "planned";
	let touches: string[] = [];
	const seen = new Set<string>();
	for (let i = 0; i < options.length; i += 2) {
		const flag = options[i];
		const value = options[i + 1];
		if (!flag || !value || seen.has(flag)) throw new Error(HELP);
		seen.add(flag);
		if (flag === "--lane" && (value === "planned" || value === "active")) lane = value;
		else if (flag === "--touches") {
			const ids = value.split(",");
			if (!ids.every((id) => PLACE_ID.test(id)) || new Set(ids).size !== ids.length) throw new Error(HELP);
			touches = ids;
		} else throw new Error(HELP);
	}
	const slug = title
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
	if (!slug) throw new Error(HELP);
	const root = repoRoot(cwd);
	if (touches.length) {
		const local = join(root, ".limen", "picture");
		const map = await readPicture(existsSync(local) ? local : join(process.env.LIMEN_CONTEXT_ROOT ?? root, ".limen", "picture"));
		if (map.diagnostics.some((item) => item.level === "error")) throw new Error("the picture has errors; fix them before linking a ticket");
		const places = new Set(map.nodes.map((node) => node.id));
		if (map.project.rootId) places.add(map.project.rootId);
		const unknown = touches.find((id) => !places.has(id));
		if (unknown) throw new Error(`unknown map place id "${unknown}"; choose an id from .limen/picture/nodes/`);
	}
	const base = join(root, "spec", "features");
	const code = `F${String(await nextFeatureNumber(base)).padStart(3, "0")}`;
	const path = join("spec", "features", lane, `${code}-${slug}`, "ticket.md");
	const now = new Date();
	const opened = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
	const normalizedTitle = title.trim();
	const outcome = /[.!?]$/.test(normalizedTitle) ? normalizedTitle : `${normalizedTitle}.`;
	const template = await readFile(join(base, "_template", "ticket.md"), "utf8").catch((error: NodeJS.ErrnoException) => {
		if (error.code !== "ENOENT") throw error;
		return readFile(fileURLToPath(new URL("../../templates/spec/features/_template/ticket.md", import.meta.url)), "utf8");
	});
	const start = template.indexOf("## Outcome\n");
	if (start < 0) throw new Error("ticket template needs an ## Outcome section");
	const text = `---\n${touches.length ? `touches:\n${touches.map((id) => `  - ${id}\n`).join("")}` : ""}opened: ${opened}\n---\n\n# ${code} · ${normalizedTitle}\n\n${template.slice(start).replace("## Outcome\n", `## Outcome\n\n${outcome}\n`)}`;
	await mkdir(join(root, "spec", "features", lane), { recursive: true });
	await mkdir(join(root, "spec", "features", lane, `${code}-${slug}`));
	await writeFile(join(root, path), text, { flag: "wx" });
	console.log(path);
}
