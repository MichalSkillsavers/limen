import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs, { existsSync } from "node:fs";
import { mkdir, readdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { publishJob } from "../src/job/publication.ts";
import { normalizeWorkerExtensions, readWorkerExtensions } from "../src/runtime/worker-extensions.ts";
import { git, limen, limenWithEnv, onlyJobId, scratchRepo, scratchWorkspace, waitForState } from "./scratch.ts";

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

test("extension paths canonicalize local files, directories and symlinks in first-seen order", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	const file = join(scratch.root, "selected file.ts");
	const directory = join(scratch.root, "package");
	await writeFile(file, "export default () => {};\n");
	await mkdir(directory);
	await symlink(file, join(scratch.root, "alias.ts"));
	assert.deepEqual(await normalizeWorkerExtensions(["selected file.ts", "package", "alias.ts", file], scratch.root, "pi"), [file, directory]);
	const fifo = join(scratch.root, "pipe");
	execFileSync("mkfifo", [fifo]);
	await assert.rejects(normalizeWorkerExtensions([fifo], scratch.root, "pi"), /neither a file nor a directory/);
});

test("extension records distinguish legacy absence, invalid data, read errors and deleted targets", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	const record = join(scratch.root, "extensions.json");
	assert.deepEqual(await readWorkerExtensions(scratch.root, "pi"), []);
	for (const body of ["{", "{}", "[1]", '["relative.ts"]', '[""]', '["/bad\\npath"]']) {
		await writeFile(record, body);
		await assert.rejects(readWorkerExtensions(scratch.root, "pi"), /extensions.json|local file or directory/);
	}
	await rm(record);
	await mkdir(record);
	await assert.rejects(readWorkerExtensions(scratch.root, "pi"), /cannot read.*extensions.json/);
	await rm(record, { recursive: true });
	await writeFile(record, JSON.stringify([join(scratch.root, "deleted.ts")]));
	await assert.rejects(readWorkerExtensions(scratch.root, "pi"), /cannot use extension.*deleted.ts/);
});

test("spawn rejects extension errors and OMP selection before preflight or job/worktree creation", async (context) => {
	const scratch = await scratchRepo(fakePi);
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const trees = git(scratch.root, "worktree", "list", "--porcelain");
	for (const value of ["", " ", "npm:package", "git:example/repo", "https://example.test/a", "builtin:mcp", "git@example.test:repo", "*.ts", "missing.ts", "~other/a"]) {
		const result = limenWithEnv(scratch, { LIMEN_PREFLIGHT: "auth" }, "spawn", "--engine", "pi", "--extension", value, "task");
		assert.equal(result.status, 1, value);
		assert.match(result.stderr, /requires a value|local file or directory|cannot use extension/);
		assert.doesNotMatch(result.stderr, /preflight must not run/);
	}
	for (const args of [
		["--engine", "pi", "task", "--extension"],
		["--engine", "pi", "task", "--extension", "--detached"],
		["--engine", "omp", "--extension", "README.md", "task"],
	]) {
		const result = limen(scratch, "spawn", ...args);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /requires a value|supported only for Pi/);
	}
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")), []);
	assert.equal(existsSync(join(dirname(scratch.root), ".repo-limen-worktrees")), false);
	assert.equal(git(scratch.root, "worktree", "list", "--porcelain"), trees);
});

test("two fixture homes select only their explicit extensions from a workspace caller", async (context) => {
	const scratch = await scratchWorkspace(fakePi);
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "workspace", "init").status, 0);
	for (const user of ["one", "two"]) {
		const home = join(dirname(scratch.root), user);
		await mkdir(join(home, ".pi/agent/extensions"), { recursive: true });
		const settings = '{"extensions":["ambient.ts"]}\n';
		await writeFile(join(home, ".pi/agent/settings.json"), settings);
		const extension = join(home, "selected file.ts");
		const source = "export default () => {};\n";
		await writeFile(extension, source);
		const directory = join(home, "package");
		await mkdir(directory);
		await symlink(extension, join(scratch.root, `${user}.ts`));
		const launched = limenWithEnv(
			scratch,
			{ HOME: home },
			"spawn",
			"--engine",
			"pi",
			"--repo",
			"api",
			"--detached",
			"--extension",
			"~/selected file.ts",
			"--extension",
			`${user}.ts`,
			"--extension",
			directory,
			"task",
		);
		assert.equal(launched.status, 0, launched.stderr);
		const id = onlyJobId(launched.stdout);
		await waitForState(scratch.root, id, "done");
		const job = join(scratch.root, ".limen/jobs", id);
		assert.deepEqual(JSON.parse(await readFile(join(job, "extensions.json"), "utf8")), [extension, directory]);
		const argv = JSON.parse(await readFile(join(job, "session/argv.json"), "utf8")) as string[];
		assert.equal(argv.includes("--no-extensions"), true);
		assert.deepEqual(
			named(argv).map((path) => path?.split("/").at(-1)),
			["steering.ts", "communication.ts", "selected file.ts", "package"],
		);
		assert.equal(named(argv).filter((path) => path === extension).length, 1);
		assert.equal(await readFile(extension, "utf8"), source);
		assert.equal(await readFile(join(home, ".pi/agent/settings.json"), "utf8"), settings);
	}
});

test("continuation inherits or replaces extensions without reading stale replacement targets or changing parent bytes", async (context) => {
	const scratch = await scratchRepo(fakePi);
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const first = join(scratch.fakeBin, "first.ts");
	const second = join(scratch.fakeBin, "second.ts");
	await writeFile(first, "export default () => {};\n");
	await writeFile(second, "export default () => {};\n");
	const spawned = limen(scratch, "spawn", "--engine", "pi", "--extension", first, "--detached", "task");
	assert.equal(spawned.status, 0, spawned.stderr);
	const parent = onlyJobId(spawned.stdout);
	await waitForState(scratch.root, parent, "done");
	const parentDir = join(scratch.root, ".limen/jobs", parent);
	const record = join(parentDir, "extensions.json");
	const parentBytes = await readFile(record, "utf8");
	const jobsBefore = await readdir(join(scratch.root, ".limen/jobs"));
	for (const args of [["--extension"], ["--extension", "--detached"], ["--extension", ""], ["--extension", "npm:remote"]]) {
		const invalid = limenWithEnv(scratch, { LIMEN_PREFLIGHT: "auth" }, "continue", parent, "task", ...args);
		assert.equal(invalid.status, 1);
		assert.match(invalid.stderr, /requires a value|local file or directory/);
		assert.doesNotMatch(invalid.stderr, /preflight must not run/);
	}
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")), jobsBefore);
	const flags = ["--provider", "fixture-provider", "--model", "fixture-model", "--thinking", "high"];
	const caller = { ...scratch, root: join(scratch.root, "subdir") };
	await mkdir(caller.root);
	for (const replacement of [false, true]) {
		if (replacement) {
			await rm(first);
			const failed = limen(scratch, "continue", parent, "task", "--detached");
			assert.equal(failed.status, 1);
			assert.match(failed.stderr, /cannot use extension/);
			assert.equal((await readdir(join(scratch.root, ".limen/jobs"))).length, 2, "missing inherited path must not publish a child");
		}
		const resumed = limen(caller, "continue", parent, "task", "--detached", ...flags, ...(replacement ? ["--extension", "../../bin/second.ts", "--extension", second] : []));
		assert.equal(resumed.status, 0, resumed.stderr);
		const id = onlyJobId(resumed.stdout);
		await waitForState(scratch.root, id, "done");
		const job = join(scratch.root, ".limen/jobs", id);
		assert.deepEqual(JSON.parse(await readFile(join(job, "extensions.json"), "utf8")), [replacement ? second : first]);
		const argv = JSON.parse(await readFile(join(job, "session/argv.json"), "utf8")) as string[];
		assert.deepEqual(named(argv).slice(-1), [replacement ? second : first]);
		assert.deepEqual(argv.slice(argv.indexOf("--provider"), argv.indexOf("--provider") + flags.length), flags);
		assert.equal(await readFile(record, "utf8"), parentBytes);
	}
	const branch = (await readFile(join(parentDir, "branch"), "utf8")).trim();
	const fresh = limen(scratch, "spawn", "--engine", "pi", "--branch", branch, "--detached", "fresh task");
	assert.equal(fresh.status, 0, fresh.stderr);
	const freshId = onlyJobId(fresh.stdout);
	await waitForState(scratch.root, freshId, "done");
	assert.deepEqual(JSON.parse(await readFile(join(scratch.root, ".limen/jobs", freshId, "extensions.json"), "utf8")), []);
	await writeFile(record, "malformed");
	assert.match(limen(scratch, "continue", parent, "task", "--detached").stderr, /invalid.*extensions.json/);
	const repaired = limen(scratch, "continue", parent, "task", "--detached", "--extension", second);
	assert.equal(repaired.status, 0, repaired.stderr);
	await waitForState(scratch.root, onlyJobId(repaired.stdout), "done");
	assert.equal(await readFile(record, "utf8"), "malformed");
	await rm(record);
	const legacy = limen(scratch, "continue", parent, "task", "--detached");
	assert.equal(legacy.status, 0, legacy.stderr);
	const id = onlyJobId(legacy.stdout);
	await waitForState(scratch.root, id, "done");
	assert.deepEqual(JSON.parse(await readFile(join(scratch.root, ".limen/jobs", id, "extensions.json"), "utf8")), []);
	assert.equal(existsSync(record), false);
});

test("OMP continuation refuses an explicit extension before preflight or child publication", async (context) => {
	const scratch = await scratchRepo(fakePi);
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const spawned = limen(scratch, "spawn", "--engine", "omp", "--detached", "task");
	assert.equal(spawned.status, 0, spawned.stderr);
	const parent = onlyJobId(spawned.stdout);
	await waitForState(scratch.root, parent, "done");
	const result = limenWithEnv(scratch, { LIMEN_PREFLIGHT: "auth" }, "continue", parent, "task", "--extension", "README.md");
	assert.equal(result.status, 1);
	assert.match(result.stderr, /supported only for Pi/);
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")), [parent]);
});

test("publication exposes the complete extension selection in its existing atomic rename", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	const jobDir = join(scratch.root, ".limen/jobs/selected");
	const extensions = [await realpath(join(scratch.root, "README.md"))];
	const rename = fs.promises.rename;
	let checked = false;
	fs.promises.rename = async (from, to) => {
		assert.equal(existsSync(jobDir), false);
		assert.deepEqual(JSON.parse(await readFile(`${from}/extensions.json`, "utf8")), extensions);
		await rename(from, to);
		assert.deepEqual(JSON.parse(await readFile(`${to}/extensions.json`, "utf8")), extensions);
		checked = true;
	};
	syncBuiltinESMExports();
	try {
		await publishJob(jobDir, {
			task: "task",
			label: "test",
			branch: "test",
			worktree: scratch.root,
			base: "base",
			role: "worker",
			engine: "pi",
			planningSource: "committed",
			extensions,
		});
	} finally {
		fs.promises.rename = rename;
		syncBuiltinESMExports();
	}
	assert.equal(checked, true);
});
