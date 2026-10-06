// F925 old suite, frozen at 81 lines. Delete this file when its replacement lands; never add to it.
import assert from "node:assert/strict";
import { readdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { readWorkerExtensions } from "../src/runtime/worker-extensions.ts";
import { git, limen, limenWithEnv, onlyJobId, scratchRepo, waitForState } from "./scratch.ts";

const fakePi = `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "auth") { console.error("preflight must not run"); process.exit(1); }
const session = args[args.indexOf("--session-dir") + 1];
fs.mkdirSync(session, { recursive: true });
fs.writeFileSync(session + "/run.jsonl", '{"type":"session"}\\n');
fs.writeFileSync(session + "/argv.json", JSON.stringify(args));
console.log(JSON.stringify({ type: "message_end", message: { role: "assistant", content: [{ type: "text", text: "ok" }] } }));
`;
const named = (argv: string[]) => argv.flatMap((value, index) => (value === "--extension" ? [argv[index + 1]] : []));

test("spawn refuses a remote, missing or OMP extension before preflight, job or worktree", async (context) => {
	const scratch = await scratchRepo(fakePi);
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const trees = git(scratch.root, "worktree", "list", "--porcelain");
	for (const args of [
		["--engine", "pi", "--extension", "npm:package"],
		["--engine", "pi", "--extension", "missing.ts"],
		["--engine", "omp", "--extension", "README.md"],
	]) {
		const result = limenWithEnv(scratch, { LIMEN_PREFLIGHT: "auth" }, "spawn", ...args, "task");
		assert.equal(result.status, 1, args.join(" "));
		assert.match(result.stderr, /local file or directory|cannot use extension|supported only for Pi/);
	}
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")), []);
	assert.equal(git(scratch.root, "worktree", "list", "--porcelain"), trees);
});

test("a detached Pi job loads its selection once; continue inherits it or replaces it without touching the parent", async (context) => {
	const scratch = await scratchRepo(fakePi);
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const first = join(scratch.fakeBin, "first.ts");
	const second = join(scratch.fakeBin, "second.ts");
	await writeFile(first, "export default () => {};\n");
	await writeFile(second, "export default () => {};\n");
	await symlink(first, join(scratch.fakeBin, "alias.ts"));
	const argvOf = async (id: string) => {
		await waitForState(scratch.root, id, "done");
		return JSON.parse(await readFile(join(scratch.root, ".limen/jobs", id, "session/argv.json"), "utf8")) as string[];
	};
	const spawned = limen(scratch, "spawn", "--engine", "pi", "--detached", "--extension", first, "--extension", join(scratch.fakeBin, "alias.ts"), "task");
	assert.equal(spawned.status, 0, spawned.stderr);
	const parent = onlyJobId(spawned.stdout);
	const canonical = [await realpath(first), await realpath(second)];
	const parentArgv = await argvOf(parent);
	assert.ok(parentArgv.includes("--no-extensions"));
	assert.deepEqual(named(parentArgv).slice(-1), [canonical[0]], "a symlink alias is the same extension");
	const record = join(scratch.root, ".limen/jobs", parent, "extensions.json");
	const parentBytes = await readFile(record, "utf8");
	const inherited = limen(scratch, "continue", parent, "again", "--detached");
	assert.equal(inherited.status, 0, inherited.stderr);
	assert.deepEqual(named(await argvOf(onlyJobId(inherited.stdout))).slice(-1), [canonical[0]]);
	await rm(first);
	const replaced = limen(scratch, "continue", parent, "again", "--detached", "--extension", second);
	assert.equal(replaced.status, 0, replaced.stderr);
	const replacedArgv = named(await argvOf(onlyJobId(replaced.stdout)));
	assert.deepEqual(replacedArgv.slice(-1), [canonical[1]]);
	assert.equal(replacedArgv.includes(canonical[0]), false);
	assert.equal(await readFile(record, "utf8"), parentBytes);
});

test("a job without an extension record has no extras; a bad record or a deleted target stops the launch", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.deepEqual(await readWorkerExtensions(scratch.root, "pi"), []);
	await writeFile(join(scratch.root, "extensions.json"), '["relative.ts"]');
	await assert.rejects(readWorkerExtensions(scratch.root, "pi"), /invalid .*extensions.json/);
	await writeFile(join(scratch.root, "extensions.json"), JSON.stringify([join(scratch.root, "deleted.ts")]));
	await assert.rejects(readWorkerExtensions(scratch.root, "pi"), /cannot use extension .*deleted.ts/);
});
