// F925 old suite, frozen at 118 lines. Delete this file when its replacement lands; never add to it.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { git, limen, type Scratch, scratchRepo, waitForState } from "./scratch.ts";

const MODEL = ["--engine", "omp", "--provider", "fake", "--model", "fake", "--thinking", "high"];

// The hook starts a real background process; its log is the only signal, so poll it like waitForState polls a job.
async function logMatching(path: string, pattern: RegExp): Promise<string> {
	const deadline = Date.now() + 20_000;
	while (Date.now() < deadline) {
		const text = await readFile(path, "utf8").catch(() => "");
		if (pattern.test(text)) return text;
		await delay(50);
	}
	throw new Error(`${path} never matched ${pattern}: ${await readFile(path, "utf8").catch(() => "(missing)")}`);
}
/** Commit as a coordinator would: its wake routing is in the environment. */
function commitAsMover(s: Scratch, cwd: string, message: string): void {
	const env = {
		...process.env,
		PATH: `${s.fakeBin}:${process.env.PATH}`,
		LIMEN_PI: "pi",
		LIMEN_OMP: "omp",
		LIMEN_HERDR: "0",
		LIMEN_HUNK: "0",
		LIMEN_HOME: dirname(s.root),
		PI_SESSION_ID: "mover-session",
		HERDR_ENV: "1",
		HERDR_PANE_ID: "w1:p1",
		HERDR_TAB_ID: "w1:t1",
		LIMEN_COORDINATOR: "1",
	};
	const result = spawnSync("git", ["commit", "-q", "--allow-empty", "-am", message], { cwd, env, encoding: "utf8" });
	assert.equal(result.status, 0, result.stderr);
}

test("the watch is off until a project turns it on, never replaces another hook, and off removes it", async () => {
	const s = await scratchRepo();
	try {
		const hook = join(s.root, ".git/hooks/reference-transaction");
		assert.equal(limen(s, "picture", "watch").stdout, "picture watch off\n");
		await writeFile(hook, "#!/bin/sh\nexit 0\n");
		const refused = limen(s, "picture", "watch", "on", ...MODEL);
		assert.notEqual(refused.status, 0);
		assert.match(refused.stderr, /not a limen picture watch/);
		assert.equal(await readFile(hook, "utf8"), "#!/bin/sh\nexit 0\n");
		assert.equal(limen(s, "picture", "watch", "off").stdout, "picture watch already off\n");
		await rm(hook);
		const on = limen(s, "picture", "watch", "on", ...MODEL);
		assert.equal(on.status, 0, on.stderr);
		assert.match(limen(s, "picture", "watch").stdout, /^picture watch on: refs\/heads\/main /);
		assert.equal(limen(s, "picture", "watch", "off").stdout, "picture watch off\n");
		await assert.rejects(readFile(hook));
		assert.equal(limen(s, "picture", "watch").stdout, "picture watch off\n");
	} finally {
		await s.cleanup();
	}
});

test("only a move of the top branch runs a tick; worker branches and worktrees run nothing", async () => {
	const s = await scratchRepo();
	try {
		assert.equal(limen(s, "picture", "watch", "on", ...MODEL).status, 0);
		const worker = join(dirname(s.root), "worker");
		git(s.root, "worktree", "add", "-q", "-b", "limen/worker", worker);
		commitAsMover(s, worker, "worker commit");
		git(s.root, "branch", "side");
		commitAsMover(s, s.root, "landed");
		const text = await logMatching(join(s.root, ".limen/picture-watch.log"), /no map yet/);
		const moves = text.split("\n").filter((line) => line.includes("moved to"));
		assert.equal(moves.length, 1, text);
		assert.match(moves[0] ?? "", new RegExp(` refs/heads/main moved to ${git(s.root, "rev-parse", "main")}$`));
		assert.deepEqual(await readdir(join(s.root, ".limen/jobs")).catch(() => []), []);
	} finally {
		await s.cleanup();
	}
});

test("a relevant top-branch move starts one picture job that inherits none of the mover's routing", async () => {
	const s = await scratchRepo();
	try {
		await mkdir(join(s.root, "src"));
		await writeFile(join(s.root, "src/worker.ts"), "export const task = 1;\n");
		await writeFile(join(s.root, ".gitignore"), "/.limen/\n");
		git(s.root, "add", "src", ".gitignore");
		git(s.root, "commit", "-q", "-m", "code");
		const dir = join(s.root, ".limen/picture");
		await mkdir(join(dir, "nodes"), { recursive: true });
		await writeFile(
			join(dir, "nodes/sample.plant.md"),
			`---\nschema: architecture-map/1\nkind: plant\nid: sample.plant\nproject: sample\ntitle: Sample\nstatus: ready\nparent: null\nrevision: ${git(s.root, "rev-parse", "HEAD")}\n---\nSample plant.\n`,
		);
		await writeFile(
			join(dir, "nodes/sample.worker.md"),
			"---\nschema: architecture-map/1\nkind: module\nid: sample.worker\nproject: sample\ntitle: Worker\nstatus: ready\nparent: sample.plant\nsources:\n  - src/worker.ts\n---\nThe worker runs the task.\n",
		);
		assert.equal(limen(s, "picture", "watch", "on", ...MODEL).status, 0);
		await writeFile(join(s.root, "src/worker.ts"), "export const task = 2;\n");
		commitAsMover(s, s.root, "cited change");
		const text = await logMatching(join(s.root, ".limen/picture-watch.log"), /picture rebuild running: \S+/);
		const id = /picture rebuild running: (\S+)/.exec(text)?.[1] ?? "";
		assert.deepEqual(await readdir(join(s.root, ".limen/jobs")), [id]);
		assert.equal((await readFile(join(dir, "job"), "utf8")).trim(), id);
		await waitForState(s.root, id, "done", 20_000);
		const job = join(s.root, ".limen/jobs", id);
		assert.equal(await readFile(join(job, "role"), "utf8"), "picture\n");
		for (const routed of ["origin-session", "origin-pane", "origin-tab", "notify/subscribers/mover-session"])
			await assert.rejects(readFile(join(job, routed)), `${routed} leaked from the mover`);
		assert.equal(git(s.root, "status", "--porcelain"), "");
	} finally {
		await s.cleanup();
	}
});
