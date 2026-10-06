// U10 · The background status read Limen runs on a worker's tree (group close, hosted idle check) must not refresh
// that tree's index: on stale stat data plain `git status` takes index.lock and races the worker's own commit (43c01cf).
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { cleanWorktree } from "../src/project/git.ts";
import { repository } from "./plant.ts";

test("cleanWorktree reads a tree with stale stat data without rewriting its index", async (context) => {
	const root = await mkdtemp(join(tmpdir(), "limen-u10-"));
	context.after(() => rm(root, { recursive: true, force: true }));
	await repository(root);
	const index = join(root, ".git/index");
	const before = await readFile(index);
	await utimes(join(root, "README.md"), new Date(0), new Date(0));
	assert.equal(cleanWorktree(root), true);
	assert.deepEqual(await readFile(index), before);
	await writeFile(join(root, "README.md"), "changed\n");
	assert.equal(cleanWorktree(root), false);
	assert.deepEqual(await readFile(index), before);
});
