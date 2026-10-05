import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { limen, limenWithEnv, limenWithSession, onlyJobId, scratchRepo, waitForState } from "./scratch.ts";

const pane = (id: string) => ({ HERDR_ENV: "1", HERDR_PANE_ID: id });

test("a coordinator can watch and unwatch any durable job", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const id = onlyJobId(limen(scratch, "spawn", "ownerless work").stdout);
	await waitForState(scratch.root, id, "done");
	const job = join(scratch.root, ".limen/jobs", id);
	await assert.rejects(access(join(job, "origin-session")));
	const outside = limen(scratch, "watch", id);
	assert.equal(outside.status, 1);
	assert.match(outside.stderr, /needs a wake route to this coordinator.*limen jobs <id>/);
	const watched = limenWithSession(scratch, "coordinator-b", "watch", id.slice(-4));
	assert.equal(watched.status, 0, watched.stderr);
	await access(join(job, "notify/subscribers/coordinator-b"));
	assert.equal(limenWithSession(scratch, "coordinator-b", "watch", "ownerless work").status, 0, "watch is idempotent and resolves labels");
	assert.equal(limenWithSession(scratch, "coordinator-b", "unwatch", id).status, 0);
	await assert.rejects(access(join(job, "notify/subscribers/coordinator-b")));
});

test("watch snapshots running jobs and unwatch clears this session", async (context) => {
	const scratch = await scratchRepo(`#!/usr/bin/env node
process.on("SIGTERM", () => process.exit(0));
setInterval(() => {}, 1000);
`);
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const id = onlyJobId(limen(scratch, "spawn", "long work").stdout);
	const watched = limenWithSession(scratch, "coordinator-c", "watch", "--running");
	assert.equal(watched.status, 0, watched.stderr);
	assert.match(watched.stdout, /watching 1 job/);
	const marker = join(scratch.root, ".limen/jobs", id, "notify/subscribers/coordinator-c");
	await access(marker);
	assert.equal(limenWithSession(scratch, "coordinator-c", "unwatch", "--all").status, 0);
	await assert.rejects(access(marker));
	limen(scratch, "stop", id, "test cleanup");
	await waitForState(scratch.root, id, "stopped");
});

test("an OMP coordinator in Herdr watches through its pane: watch takes the wake, unwatch gives back only its own", async (context) => {
	const scratch = await scratchRepo(`#!/usr/bin/env node
process.on("SIGTERM", () => process.exit(0));
setInterval(() => {}, 1000);
`);
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const id = onlyJobId(limen(scratch, "spawn", "--label", "live work", "long work").stdout);
	const wakePane = join(scratch.root, ".limen/jobs", id, "origin-pane");
	const first = limenWithEnv(scratch, pane("w1:p7"), "watch", id);
	assert.equal(first.status, 0, first.stderr);
	assert.equal(first.stdout, "watching 1 job\n");
	assert.equal(await readFile(wakePane, "utf8"), "w1:p7\n");
	assert.equal(limenWithEnv(scratch, pane("w1:p8"), "watch", "live work").status, 0);
	assert.equal(await readFile(wakePane, "utf8"), "w1:p8\n", "a takeover moves the wake to the new pane");
	assert.equal(limenWithEnv(scratch, pane("w1:p7"), "unwatch", "--all").status, 0);
	assert.equal(await readFile(wakePane, "utf8"), "w1:p8\n", "unwatch leaves another pane's wake alone");
	assert.equal(limenWithEnv(scratch, pane("w1:p8"), "unwatch", id).status, 0);
	await assert.rejects(access(wakePane));
	limen(scratch, "stop", id, "test cleanup");
	await waitForState(scratch.root, id, "stopped");
	const late = limenWithEnv(scratch, pane("w1:p7"), "watch", id);
	assert.equal(late.status, 0, late.stderr);
	assert.match(late.stdout, new RegExp(`${id} already stopped; no wake will follow`));
});
