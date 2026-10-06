// U9: a job is alive only while its own wrapper lives. A recycled process group id with a different birth is a
// stranger: the job is dead, so the sweep reaps it and `stop` never signals that group.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { processInfo } from "../src/runtime/contain.ts";
import { liveJob } from "../src/runtime/reap.ts";

test("a live process group with a mismatched birth is a dead job; the matching birth is alive", async (t) => {
	const job = await mkdtemp(join(tmpdir(), "u9-"));
	const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1e9)"], { detached: true, stdio: "ignore" });
	t.after(() => rm(job, { recursive: true, force: true }));
	t.after(() => child.kill("SIGKILL"));
	assert.ok(child.pid);
	await writeFile(join(job, "state"), "running\n");
	await writeFile(join(job, "pid"), `${child.pid}\n`);
	await writeFile(join(job, "started-at"), "2026-01-01T00:00:00.000Z\n");
	assert.equal(await liveJob(job), true, "a live group with no recorded birth is alive");
	await writeFile(join(job, "born"), "0.000000\n");
	// Under load the identity query can miss its one-second deadline; an unknown identity counts as alive, so ask again.
	let alive = true;
	for (let attempt = 0; alive && attempt < 10; attempt += 1) alive = await liveJob(job);
	assert.equal(alive, false, "a recycled group id with another birth is dead");
	const info = await processInfo(child.pid, Date.now() + 30_000);
	assert.equal(info.kind, "present");
	if (info.kind === "present") await writeFile(join(job, "born"), `${info.process.born}\n`);
	assert.equal(await liveJob(job), true, "the recorded birth of the live group is alive");
});
