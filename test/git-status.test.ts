// F925 old suite, frozen at 49 lines. Delete this file when its replacement lands; never add to it.
import assert from "node:assert/strict";
import { mkdir, readFile, utimes, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { cleanWorktree } from "../src/project/git.ts";
import { git, limen, scratchRepo } from "./scratch.ts";

test("cleanWorktree observes changes without refreshing the worker's index", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	const index = join(scratch.root, ".git/index");
	const before = await readFile(index);
	// Stale stat data makes ordinary git status take an optional index lock and
	// rewrite the index, racing the worker's git add/commit even on a clean tree.
	const old = new Date("2000-01-01T00:00:00Z");
	await utimes(join(scratch.root, "README.md"), old, old);
	assert.equal(cleanWorktree(scratch.root), true);
	assert.deepEqual(await readFile(index), before, "background status must not refresh the index");
	await writeFile(join(scratch.root, "README.md"), "changed\n");
	await writeFile(join(scratch.root, "untracked.md"), "new\n");
	assert.equal(cleanWorktree(scratch.root), false);
	assert.deepEqual(await readFile(index), before);
});

test("job commands outside a project name the directory and where to run", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	const outside = { ...scratch, root: dirname(scratch.root) };
	for (const args of [["status"], ["jobs"], ["wait", "missing"], ["land", "missing"], ["spawn", "--detached", "Read the repository."]]) {
		const result = limen(outside, ...args);
		assert.equal(result.status, 1);
		assert.ok(result.stderr.includes(`not inside a Limen project: ${outside.root}`), result.stderr);
		assert.match(result.stderr, /run this command from your project repository or Limen workspace/);
		assert.doesNotMatch(result.stderr, /fatal: not a git repository/);
	}
});

test("spawn in an unborn repository explains the first commit and starts no worktree", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	const empty = { ...scratch, root: join(dirname(scratch.root), "empty") };
	await mkdir(empty.root);
	git(empty.root, "init", "-b", "main");
	const result = limen(empty, "spawn", "--detached", "Read the repository.");
	assert.equal(result.status, 1);
	assert.match(result.stderr, /this repository has no commit yet; commit once, then spawn\./);
	assert.equal(git(empty.root, "worktree", "list", "--porcelain").split("worktree ").length, 2);
});
