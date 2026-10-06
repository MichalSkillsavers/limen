import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import test from "node:test";
import { testLineCap } from "../src/commands/land.ts";

const root = new URL("..", import.meta.url).pathname;

async function filesBelow(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const paths = await Promise.all(
		entries
			.filter((entry) => !["node_modules", ".git", ".omp", ".pi"].includes(entry.name))
			.map(async (entry) => {
				const path = join(dir, entry.name);
				return entry.isDirectory() ? filesBelow(path) : [path];
			}),
	);
	return paths.flat();
}

test("runtime remains dependency-free and TypeScript basenames stay unambiguous", async () => {
	const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as { dependencies?: Record<string, string> };
	assert.deepEqual(pkg.dependencies, {});
	const names = (await filesBelow(root)).filter((path) => path.endsWith(".ts")).map((path) => basename(path));
	assert.equal(new Set(names).size, names.length, "TypeScript basenames must be unique");
});

// Old files the F925 test reset has not replaced yet, with their line counts when the cap landed. An old file may only
// shrink, and its entry leaves this list in the commit that deletes the file. Every other file in test/ counts toward the cap.
const oldSuite = new Map(
	`communication-hook:504 continue-command:506 coordinator-wake:339 diff-command:137 engine:175 finalize:214 finish-receipt:154 finish-webhook-helper:427
	finish-webhook:829 git-status:48 github-doctor:117 github-doorbell:700 github-issue-body:174 group-command:880 hosted-binding:322 hosted-hook:168
	hosted-spawn:1340 hosted-uncertainty:37 inherit:101 init-command:150 job:92 jobs-command:470 keeper-command:83 land-command:240 lead-step-finish:198
	linear-command:37 open-command:252 picture-board:80 picture-generator:248 picture-layers:281 picture-overlay:154 picture-tick:207 picture-tickets:193
	picture-viewer:328 picture-watch:117 picture-work:161 plant-events:263 prune-command:338 reaper:177 recovery:386 scratch.ts:195 spawn-command:1012
	stalled-tool:279 status-command:293 steer-command:186 steering-hook:113 stop-command:315 stream:27 sweep-command:267 ticket-author-command:140
	ticket-command:81 view:154 wait-command:41 wake-hook:1889 wake-sweep:443 watch-command:71 workspace-command:89`
		.split(/\s+/)
		.map((entry) => {
			const [name = "", lines] = entry.split(":");
			return [name.endsWith(".ts") ? name : `${name}.test.ts`, Number(lines)] as const;
		}),
);

test("test/ stays within the line cap that spec/vision.md sets", async () => {
	const cap = testLineCap(await readFile(join(root, "spec/vision.md"), "utf8"));
	assert.ok(cap, "spec/vision.md names no cap for test/");
	const dir = join(root, "test");
	const files = await filesBelow(dir);
	let lines = 0;
	for (const path of files) {
		const name = path.slice(dir.length + 1);
		const count = (await readFile(path, "utf8")).split("\n").length - 1;
		const frozen = oldSuite.get(name);
		if (frozen === undefined) lines += count;
		else assert.ok(count <= frozen, `test/${name} is an old file waiting for its replacement; it may only shrink (${count} > ${frozen} lines)`);
	}
	for (const name of oldSuite.keys()) assert.ok(files.includes(join(dir, name)), `test/${name} is gone; delete its entry from the old-suite list in test/structure.test.ts`);
	assert.ok(lines <= cap, `test/ has ${lines} lines; spec/vision.md caps it at ${cap}. Remove ${lines - cap} test lines, or ask Adam to raise the cap.`);
});
