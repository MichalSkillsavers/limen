// F925 old suite, frozen at 42 lines. Delete this file when its replacement lands; never add to it.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { limen, limenWithEnv, onlyJobId, scratchRepo } from "./scratch.ts";

test("wait blocks for terminal state and reports the readable label", async (context) => {
	const scratch = await scratchRepo(`#!/usr/bin/env node
setTimeout(() => console.log("finished"), 400);
`);
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const id = onlyJobId(limen(scratch, "spawn", "--label", "F001 implementation", "do work").stdout);
	const started = Date.now();
	const suffix = id.slice(-4);
	const result = limen(scratch, "wait", suffix);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, new RegExp(`DONE F001 implementation · id ${id}`));
	assert.ok(Date.now() - started >= 100, "wait returned before the running job settled");
});

test("a coordinator's wait refuses a running job with the command to use, and reports an ended one", async (context) => {
	const scratch = await scratchRepo(`#!/usr/bin/env node
setTimeout(() => console.log("finished"), 3000);
`);
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const id = onlyJobId(limen(scratch, "spawn", "--label", "slow", "do work").stdout);
	const started = Date.now();
	const result = limenWithEnv(scratch, { LIMEN_COORDINATOR: "1" }, "wait", id);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /LIMEN_COORDINATOR=1/);
	assert.ok(result.stderr.includes(`\`limen jobs ${id}\``), result.stderr);
	assert.ok(Date.now() - started < 2_000, "refusal must not wait for the running job");
	assert.equal((await readFile(join(scratch.root, ".limen/jobs", id, "state"), "utf8")).trim(), "running");
	const ended = limen(scratch, "wait", id);
	assert.equal(ended.status, 0, ended.stderr);
	const read = limenWithEnv(scratch, { LIMEN_COORDINATOR: "1" }, "wait", id);
	assert.equal(read.status, 0, read.stderr);
	assert.match(read.stdout, new RegExp(`DONE slow · id ${id}`));
});
