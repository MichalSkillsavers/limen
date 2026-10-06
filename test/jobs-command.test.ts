import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { renderJobDirectory } from "../src/commands/jobs.ts";
import { processInfo } from "../src/runtime/contain.ts";
import { ownerAlive } from "../src/runtime/reap.ts";
import { limen, limenWithEnv, scratchRepo } from "./scratch.ts";

test("a running record without pid is starting, not invalid", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const job = join(scratch.root, ".limen/jobs/handshake");
	await mkdir(job);
	await writeFile(join(job, "task.md"), "soon\n");
	await writeFile(join(job, "state"), "running\n");
	await writeFile(join(job, "started-at"), `${new Date().toISOString()}\n`);
	await writeFile(join(job, "label"), "F001 implementation\n");
	await writeFile(join(job, "branch"), "limen/handshake\n");
	await writeFile(join(job, "log"), "");
	await writeFile(join(job, "activity"), "think\n");
	const result = limen(scratch, "jobs");
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /RUNNING F001 implementation/);
	assert.match(result.stdout, /starting/);
	assert.doesNotMatch(result.stdout, /INVALID/);
});

test("jobs tails a rambling log and keeps the last limen detail line", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const job = join(scratch.root, ".limen/jobs/ramble");
	await mkdir(job);
	await writeFile(join(job, "task.md"), "ramble\n");
	await writeFile(join(job, "state"), "failed\n");
	await writeFile(join(job, "label"), "ramble\n");
	await writeFile(join(job, "branch"), "main\n");
	const noise = Array.from({ length: 400 }, (_, i) => `noise-${i}-${"x".repeat(40)}`).join("\n");
	await writeFile(join(job, "log"), `${noise}\n[limen 2026-08-13T00:00:00.000Z] start\n[limen 2026-08-13T00:00:01.000Z] failed: rambling\nlast line\n`);
	const result = limen(scratch, "jobs", "ramble");
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /FAILED ramble/);
	assert.match(result.stdout, /failed: rambling/);
	assert.match(result.stdout, /last line/);
	assert.doesNotMatch(result.stdout, /noise-0-/);
});

test("jobs detail shows result and commits for a terminal job that has them", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const job = join(scratch.root, ".limen/jobs/finished");
	await mkdir(job);
	await writeFile(join(job, "task.md"), "finish\n");
	await writeFile(join(job, "state"), "done\n");
	await writeFile(join(job, "label"), "F017 finished\n");
	await writeFile(join(job, "branch"), "main\n");
	await writeFile(join(job, "log"), "done\n");
	await writeFile(join(job, "commits"), "abc1234 the candidate\n");
	await writeFile(join(job, "result"), "final summary line\nsecond line\n");
	await writeFile(join(job, "stop-reason"), "error: usage limit reached\n");
	const detail = limen(scratch, "jobs", "finished");
	assert.equal(detail.status, 0, detail.stderr);
	assert.match(detail.stdout, /stop-reason:\n    error: usage limit reached/);
	assert.match(detail.stdout, /commits:\n    abc1234 the candidate/);
	assert.match(detail.stdout, /result:\n    final summary line\n    second line/);
	// The compact snapshot stays compact: no result or commits blocks there.
	await writeFile(join(job, "state"), "running\n");
	await writeFile(join(job, "started-at"), `${new Date().toISOString()}\n`);
	await writeFile(join(job, "activity"), "think\n");
	const snapshot = limen(scratch, "jobs");
	assert.equal(snapshot.status, 0, snapshot.stderr);
	assert.doesNotMatch(snapshot.stdout, /result:|commits:/);
});

test("jobs marks a terminal job with zero tool calls and no commits as produced nothing", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const root = join(scratch.root, ".limen/jobs");
	const empty = join(root, "empty");
	await mkdir(empty);
	await writeFile(join(empty, "task.md"), "empty\n");
	await writeFile(join(empty, "state"), "done\n");
	await writeFile(join(empty, "label"), "F011 empty\n");
	await writeFile(join(empty, "branch"), "limen/empty\n");
	await writeFile(join(empty, "log"), "[limen 2026-08-15T00:00:00.000Z] done: pi exited 0\n");
	await writeFile(join(empty, "tool-calls"), "0\n");
	await writeFile(join(empty, "commits"), "");
	await writeFile(join(empty, "stop-reason"), "error: usage limit reached\n");

	const snapshot = limen(scratch, "jobs");
	assert.equal(snapshot.status, 0, snapshot.stderr);
	assert.match(snapshot.stdout, /DONE F011 empty.*tools 0.*produced nothing \(0 tool calls, no commits\)/);
	assert.doesNotMatch(snapshot.stdout, /terminal job hidden/);
	const detail = limen(scratch, "jobs", "empty");
	assert.equal(detail.status, 0, detail.stderr);
	assert.match(detail.stdout, /DONE F011 empty.*tools 0.*produced nothing \(0 tool calls, no commits\)/);
	assert.match(detail.stdout, /stop-reason:\n    error: usage limit reached/);

	const survey = join(root, "survey");
	await mkdir(survey);
	for (const [name, value] of [
		["task.md", "survey\n"],
		["state", "done\n"],
		["label", "F011 survey\n"],
		["branch", "limen/survey\n"],
		["log", "surveyed\n"],
		["tool-calls", "1\n"],
		["commits", ""],
	] as const)
		await writeFile(join(survey, name), value);
	const surveyDetail = limen(scratch, "jobs", "survey");
	assert.equal(surveyDetail.status, 0, surveyDetail.stderr);
	assert.doesNotMatch(surveyDetail.stdout, /produced nothing/);
});

test("jobs lists running first, then newest started-at", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const root = join(scratch.root, ".limen/jobs");
	for (const job of [
		{ id: "old-done", state: "done", started: "2026-08-13T18:00:00.000Z", label: "old done" },
		{ id: "new-run", state: "running", started: "2026-08-13T20:00:00.000Z", label: "new run" },
		{ id: "mid-stop", state: "stopped", started: "2026-08-13T19:00:00.000Z", label: "mid stop" },
	]) {
		const dir = join(root, job.id);
		await mkdir(dir);
		await writeFile(join(dir, "task.md"), "x\n");
		await writeFile(join(dir, "state"), `${job.state}\n`);
		await writeFile(join(dir, "label"), `${job.label}\n`);
		await writeFile(join(dir, "branch"), "main\n");
		await writeFile(join(dir, "started-at"), `${job.started}\n`);
		if (job.state === "running") await writeFile(join(dir, "pid"), `${process.pid}\n`);
		await writeFile(join(dir, "log"), "");
	}
	const result = limen(scratch, "jobs", "--all");
	assert.equal(result.status, 0, result.stderr);
	const labels = [...result.stdout.matchAll(/^(?:RUNNING|DONE|STOPPED|FAILED) (.+?) ·/gm)].map((match) => match[1]);
	assert.deepEqual(labels, ["new run", "mid stop", "old done"]);
});

test("the default jobs snapshot stays compact and exposes every live job", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const root = join(scratch.root, ".limen/jobs");
	for (let index = 0; index < 40; index += 1) {
		const dir = join(root, `archived-${index}`);
		await mkdir(dir);
		await writeFile(join(dir, "task.md"), "x\n");
		await writeFile(join(dir, "state"), "done\n");
		await writeFile(join(dir, "label"), `archived-${index}\n`);
		await writeFile(join(dir, "branch"), "main\n");
		await writeFile(join(dir, "log"), `archive-${index}-${"x".repeat(8_192)}\n`);
	}
	const running = join(root, "live");
	await mkdir(running);
	await writeFile(join(running, "task.md"), "x\n");
	await writeFile(join(running, "state"), "running\n");
	await writeFile(join(running, "started-at"), `${new Date().toISOString()}\n`);
	await writeFile(join(running, "label"), `F005 live review ${"x".repeat(8_192)}\n`);
	await writeFile(join(running, "branch"), "limen/live\n");
	await writeFile(join(running, "activity"), "tool\n");
	await writeFile(join(running, "last-tool"), `${"tool".repeat(4_096)}\n`);
	await writeFile(join(running, "log"), "live log\n");
	for (const option of [undefined, "--running", "--active"] as const) {
		const result = option ? limen(scratch, "jobs", option) : limen(scratch, "jobs");
		assert.equal(result.status, 0, result.stderr);
		assert.match(result.stdout, /RUNNING F005 live review/);
		assert.match(result.stdout, /…/);
		assert.doesNotMatch(result.stdout, /archive-\d+/);
		assert.ok(Buffer.byteLength(result.stdout) < 1_024, "live snapshot must stay below tool-output limits");
		if (option) assert.doesNotMatch(result.stdout, /terminal jobs hidden/);
		else assert.match(result.stdout, /40 terminal jobs hidden/);
	}
});

test("compact snapshots cap malformed live diagnostics", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const job = join(scratch.root, ".limen/jobs/malformed-live");
	await mkdir(job);
	await writeFile(join(job, "task.md"), "x\n");
	await writeFile(join(job, "state"), "running\n");
	await writeFile(join(job, "started-at"), `${new Date().toISOString()}\n`);
	await writeFile(join(job, "label"), "F005 malformed live\n");
	await writeFile(join(job, "branch"), "limen/malformed\n");
	await writeFile(join(job, "tool-calls"), `${"x".repeat(8_192)}\n`);
	await writeFile(join(job, "log"), "x\n");
	const result = limen(scratch, "jobs");
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /INVALID malformed-live · invalid tool-calls/);
	assert.doesNotMatch(result.stdout, /x{200}/);
	assert.ok(Buffer.byteLength(result.stdout) < 1_024);
});

test("hosted jobs pulse follows activity, not Herdr unseen-idle", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const herdr = join(scratch.fakeBin, "herdr");
	await writeFile(
		herdr,
		`#!/usr/bin/env node
console.log(JSON.stringify({ result: { agent: { agent_status: "idle" } } }));
`,
	);
	await chmod(herdr, 0o755);
	const env = { HERDR_ENV: "1", LIMEN_HERDR: herdr };
	const job = join(scratch.root, ".limen/jobs/hosted-think");
	await mkdir(join(job, "herdr"), { recursive: true });
	await writeFile(join(job, "task.md"), "think\n");
	await writeFile(join(job, "state"), "running\n");
	await writeFile(join(job, "started-at"), `${new Date().toISOString()}\n`);
	await writeFile(join(job, "label"), "F038 hosted gen\n");
	await writeFile(join(job, "branch"), "limen/hosted-think\n");
	await writeFile(join(job, "log"), "think\n");
	await writeFile(join(job, "hosted"), "weaker guarantees\n");
	await writeFile(join(job, "pid"), "1\n");
	await writeFile(join(job, "herdr/agent"), "w1:p1\n");
	await writeFile(join(job, "activity"), "think\n");
	const thinking = limenWithEnv(scratch, env, "jobs");
	assert.equal(thinking.status, 0, thinking.stderr);
	assert.match(thinking.stdout, /RUNNING F038 hosted gen/);
	assert.match(thinking.stdout, / · think(?: ·|$)/);
	assert.doesNotMatch(thinking.stdout, / · wait(?: ·|$)/);
	await writeFile(join(job, "activity"), "tool\n");
	const tooling = limenWithEnv(scratch, env, "jobs");
	assert.match(tooling.stdout, / · tool(?: ·|$)/);
	await writeFile(join(job, "activity"), "wait\n");
	const waiting = limenWithEnv(scratch, env, "jobs");
	assert.match(waiting.stdout, / · wait(?: ·|$)/);
	await writeFile(join(job, "pid"), "");
	const handshake = limenWithEnv(scratch, env, "jobs");
	assert.match(handshake.stdout, /starting/);
});

test("jobs shows the advisory line on a running hosted job", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const job = join(scratch.root, ".limen/jobs/stalled");
	await mkdir(job);
	await writeFile(join(job, "task.md"), "stall\n");
	await writeFile(join(job, "state"), "running\n");
	await writeFile(join(job, "started-at"), `${new Date().toISOString()}\n`);
	await writeFile(join(job, "label"), "F027 stalled\n");
	await writeFile(join(job, "branch"), "limen/stalled\n");
	await writeFile(join(job, "log"), "wait\n");
	await writeFile(join(job, "activity"), "wait\n");
	await writeFile(join(job, "hosted"), "weaker guarantees\n");
	await writeFile(join(job, "advisory"), "idle 10m after 14 tool calls, session still open\n");
	const result = limen(scratch, "jobs");
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /RUNNING F027 stalled/);
	assert.match(result.stdout, /advisory idle 10m after 14 tool calls, session still open/);
	await writeFile(join(job, "ownership-uncertainty"), JSON.stringify({ since: Date.now(), root: true, child: false }));
	assert.doesNotMatch(limen(scratch, "jobs").stdout, /ownership observation/, "real failures and idle episodes have display priority");
	await rm(join(job, "advisory"));
	assert.match(limen(scratch, "jobs").stdout, /ownership observation unavailable/);
	await mkdir(join(job, "notify/unconfirmed"), { recursive: true });
	await writeFile(join(job, "notify/unconfirmed/_uncertainty"), "1\n1\n");
	assert.match(limen(scratch, "jobs", "stalled").stdout, /ownership observation unavailable/, "exhausted delivery does not hide the condition");
});

test("jobs names a directory with no state and no live spawner as an orphan", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const job = join(scratch.root, ".limen/jobs/half-written");
	await mkdir(job);
	// A spawner that died before it wrote state leaves its pid behind.
	const dead = spawnSync(process.execPath, ["-e", ""]).pid;
	await writeFile(join(job, "starting"), `${dead}\n`);
	const listed = limen(scratch, "jobs");
	assert.equal(listed.status, 0, listed.stderr);
	assert.match(listed.stdout, /ORPHAN half-written · no state/);
	const all = limen(scratch, "jobs", "--all");
	assert.match(all.stdout, /ORPHAN half-written · no state/);
});

test("jobs --label lists matching jobs including hidden terminal ones", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const root = join(scratch.root, ".limen/jobs");
	for (const job of [
		{ id: "wave-live", state: "running", started: "2026-09-16T20:00:00.000Z", label: "wave-a live" },
		{ id: "wave-done", state: "done", started: "2026-09-16T19:00:00.000Z", label: "wave-a done" },
		{ id: "other-done", state: "done", started: "2026-09-16T18:00:00.000Z", label: "other done" },
	]) {
		const dir = join(root, job.id);
		await mkdir(dir);
		await writeFile(join(dir, "task.md"), "x\n");
		await writeFile(join(dir, "state"), `${job.state}\n`);
		await writeFile(join(dir, "label"), `${job.label}\n`);
		await writeFile(join(dir, "branch"), "main\n");
		await writeFile(join(dir, "started-at"), `${job.started}\n`);
		await writeFile(join(dir, "log"), "");
		if (job.state === "running") {
			await writeFile(join(dir, "pid"), `${process.pid}\n`);
			await writeFile(join(dir, "activity"), "think\n");
		} else await writeFile(join(dir, "tool-calls"), "1\n");
	}
	const snapshot = limen(scratch, "jobs");
	assert.equal(snapshot.status, 0, snapshot.stderr);
	assert.match(snapshot.stdout, /RUNNING wave-a live/);
	assert.doesNotMatch(snapshot.stdout, /wave-a done|other done/);
	assert.match(snapshot.stdout, /2 terminal jobs hidden/);
	const matched = limen(scratch, "jobs", "--label", "wave-a");
	assert.equal(matched.status, 0, matched.stderr);
	assert.match(matched.stdout, /RUNNING wave-a live/);
	assert.match(matched.stdout, /DONE wave-a done/);
	assert.doesNotMatch(matched.stdout, /other done/);
	assert.doesNotMatch(matched.stdout, /terminal jobs hidden|nothing matched/);
	const human = limenWithEnv(scratch, { LIMEN_VIEW: "human" }, "jobs", "--label", "wave-a");
	assert.equal(human.status, 0, human.stderr);
	assert.match(human.stdout, /wave-a live/);
	assert.match(human.stdout, /wave-a done/);
	assert.doesNotMatch(human.stdout, /other done/);
	const miss = limen(scratch, "jobs", "--label", "nope");
	assert.equal(miss.status, 0, miss.stderr);
	assert.equal(miss.stdout, "nothing matched\n");
	assert.doesNotMatch(miss.stdout, /wave-a|other done|--all/);
	const all = limen(scratch, "jobs", "--all");
	assert.equal(all.status, 0, all.stderr);
	assert.match(all.stdout, /RUNNING wave-a live/);
	assert.match(all.stdout, /DONE wave-a done/);
	assert.match(all.stdout, /DONE other done/);
	const detail = limen(scratch, "jobs", "wave-done");
	assert.equal(detail.status, 0, detail.stderr);
	assert.match(detail.stdout, /DONE wave-a done/);
});

test("hosted pulse uses wrapper identity even when the agent is idle", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const herdr = join(scratch.fakeBin, "herdr");
	await writeFile(herdr, '#!/usr/bin/env node\nconsole.log(JSON.stringify({ result: { agent: { agent_status: "idle" } } }));\n', { mode: 0o755 });
	const previous = process.env.LIMEN_HERDR;
	process.env.LIMEN_HERDR = herdr;
	context.after(() => {
		if (previous === undefined) delete process.env.LIMEN_HERDR;
		else process.env.LIMEN_HERDR = previous;
	});
	const jobs = join(scratch.root, ".limen/jobs");
	const job = join(jobs, "identity");
	await mkdir(join(job, "herdr"), { recursive: true });
	for (const [field, value] of Object.entries({
		state: "running",
		label: "wrapper identity",
		branch: "main",
		pid: String(process.pid),
		born: "different birth",
		activity: "tool",
		hosted: "hosted",
		"herdr/agent": "w1:p1",
		"task.md": "identity",
		log: "tool",
		"started-at": new Date().toISOString(),
	}))
		await writeFile(join(job, field), `${value}\n`);
	const lost = await renderJobDirectory(scratch.root, jobs, "identity", "human");
	assert.equal(await ownerAlive(job), false);
	assert.equal(lost.record.pulse, "dead");
	assert.equal(lost.record.agentStatus, "idle");
	assert.match(lost.compact, /agent idle/);
	const info = await processInfo(process.pid);
	assert.equal(info.kind, "present");
	if (info.kind !== "present") return;
	await writeFile(join(job, "born"), info.process.born);
	const live = await renderJobDirectory(scratch.root, jobs, "identity", "human");
	assert.equal(await ownerAlive(job), true);
	assert.equal(live.record.pulse, "tool");
});

test("failed human rows prefer stop-reason and ignore post-finish delivery logs", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const jobs = join(scratch.root, ".limen/jobs");
	for (const [id, reason] of [
		["limited", 'error: 429 {"error":{"type":"rate_limit_error"}} retry-after-ms=4272000'],
		["legacy", ""],
	]) {
		const job = join(jobs, id!);
		await mkdir(job);
		for (const [field, value] of Object.entries({
			state: "failed",
			label: id,
			branch: "main",
			"task.md": "work",
			log: "[limen 2026-10-05T00:00:00Z] failed: worker crashed\n[limen 2026-10-05T00:00:01Z] wake delivery failed\n[limen 2026-10-05T00:00:02Z] tab closed\n",
			...(reason ? { "stop-reason": reason } : {}),
		}))
			await writeFile(join(job, field), `${value}\n`);
	}
	const rows = limenWithEnv(scratch, { LIMEN_VIEW: "human" }, "jobs", "--all");
	assert.equal(rows.status, 0, rows.stderr);
	assert.match(rows.stdout, /limited.*rate limit \(429\); retry after 71m/);
	assert.match(rows.stdout, /legacy.*worker crashed/);
	assert.doesNotMatch(rows.stdout, /wake delivery failed|tab closed/);
});

test("jobs refuses an unknown id in an empty plant and hides old empty jobs", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const missing = limen(scratch, "jobs", "nope");
	assert.equal(missing.status, 1);
	assert.match(missing.stderr, /no job matches "nope"/);
	const day = 24 * 60 * 60 * 1000;
	for (const [id, ageDays] of [
		["fresh-empty", 1],
		["old-empty", 9],
	] as const) {
		const dir = join(scratch.root, ".limen/jobs", id);
		await mkdir(dir, { recursive: true });
		const at = new Date(Date.now() - ageDays * day).toISOString();
		for (const [name, value] of Object.entries({
			"task.md": "x",
			state: "done",
			label: id,
			branch: "main",
			"started-at": at,
			"finished-at": at,
			"tool-calls": "0",
			commits: "",
			log: "",
		}))
			await writeFile(join(dir, name), `${value}\n`);
	}
	const snapshot = limen(scratch, "jobs");
	assert.equal(snapshot.status, 0, snapshot.stderr);
	assert.match(snapshot.stdout, /fresh-empty/);
	assert.doesNotMatch(snapshot.stdout, /old-empty/);
	assert.match(snapshot.stdout, /1 older empty job hidden/);
});

test("hosted detail folds activity words and hides the finish webhook while running", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const dir = join(scratch.root, ".limen/jobs/hosted-busy");
	await mkdir(dir);
	const words = Array.from({ length: 20 }, (_, index) => ["think", "read", "bash"][index % 3]);
	for (const [name, value] of Object.entries({
		"task.md": "x",
		state: "running",
		label: "hosted-busy",
		branch: "main",
		hosted: "1",
		pid: String(process.pid),
		activity: "think",
		"started-at": new Date().toISOString(),
		log: words.join("\n"),
	}))
		await writeFile(join(dir, name), `${value}\n`);
	const detail = limen(scratch, "jobs", "hosted-busy");
	assert.equal(detail.status, 0, detail.stderr);
	assert.match(detail.stdout, /recent activity: think, read, bash \(20 events\)/);
	assert.doesNotMatch(detail.stdout, /finish-webhook/);
});
