import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, readFile, utimes, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import groupPeer from "../hook/group-peer.ts";
import { type GroupRun, groupPath, leadHookLive, saveJson } from "../src/job/group-cabinet.ts";
import { finalizeJob } from "../src/job/record.ts";
import { limenWithEnv, onlyJobId, type Scratch, scratchRepo, waitForState } from "./scratch.ts";

// A fake Herdr that records every prompt and answers `agent prompt` the way the real CLI does for the given outcome.
async function fakeHerdr(scratch: Scratch, prompt: "observed" | "stalled" | "missing" | "flaky"): Promise<string> {
	const path = join(scratch.fakeBin, "herdr");
	const observed = `console.log(JSON.stringify({ result: { status: "working" } }));`;
	const missing = `console.error("pane_not_found"); process.exit(1);`;
	const answer =
		prompt === "observed"
			? observed
			: prompt === "stalled"
				? `console.error("agent_prompt_stalled: no working state observed"); process.exit(1);`
				: prompt === "missing"
					? missing
					: `if (require("node:fs").readFileSync(${JSON.stringify(join(scratch.root, "herdr-prompts"))}, "utf8").trim().split("\\n").length === 1) { ${missing} } ${observed}`;
	await writeFile(
		path,
		`#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "agent" && args[1] === "prompt") {
  require("node:fs").appendFileSync(${JSON.stringify(join(scratch.root, "herdr-prompts"))}, JSON.stringify(args) + "\\n");
  ${answer}
} else console.log(JSON.stringify({ result: {} }));
`,
	);
	await chmod(path, 0o755);
	return path;
}

async function receipt(job: string): Promise<string> {
	const deadline = Date.now() + 10_000;
	for (;;) {
		const value = (await readFile(join(job, "notify/herdr-prompt"), "utf8").catch(() => "")).trim();
		if (value && !value.startsWith("attempting")) return value;
		if (Date.now() > deadline) throw new Error(`no settled Herdr wake receipt; last ${JSON.stringify(value)}`);
		await new Promise((resolve) => setTimeout(resolve, 50));
	}
}

async function prompts(scratch: Scratch): Promise<string[][]> {
	const raw = await readFile(join(scratch.root, "herdr-prompts"), "utf8").catch(() => "");
	return raw
		.split("\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line) as string[]);
}

function wipe(scratch: Scratch): void {
	spawnSync("/bin/rm", ["-rf", dirname(scratch.root)], { stdio: "ignore" });
}

const herdrCoordinator = (herdr: string) => ({ HERDR_ENV: "1", HERDR_PANE_ID: "w1:p7", HERDR_TAB_ID: "w1:t3", LIMEN_HERDR: herdr, LIMEN_COORDINATOR: "1" });

test("a job spawned from a Herdr coordinator without a Pi session starts a turn on that pane when it ends", async (context) => {
	const scratch = await scratchRepo();
	context.after(() => wipe(scratch));
	const herdr = await fakeHerdr(scratch, "observed");
	limenWithEnv(scratch, {}, "init");
	const launched = limenWithEnv(scratch, herdrCoordinator(herdr), "spawn", "--detached", "--label", "omp wake", "make commit");
	assert.equal(launched.status, 0, launched.stderr);
	const id = onlyJobId(launched.stdout);
	const job = join(scratch.root, ".limen/jobs", id);
	assert.equal((await readFile(join(job, "origin-pane"), "utf8")).trim(), "w1:p7");
	await waitForState(scratch.root, id, "done");
	assert.match(await receipt(job), /^attempt 1: turn observed on w1:p7 \S+$/);
	const sent = await prompts(scratch);
	assert.equal(sent.length, 1, "an observed turn ends automatic delivery");
	const [verb, sub, target, text, ...flags] = sent[0] ?? [];
	assert.deepEqual([verb, sub, target], ["agent", "prompt", "w1:p7"]);
	assert.match(text ?? "", new RegExp(`limen jobs ${id}`));
	assert.match(text ?? "", /Commits:\n[0-9a-f]+ candidate/);
	assert.match(text ?? "", /Final message:\nfake pi completed/);
	assert.ok(flags.includes("--wait") && flags.includes("working"), "the prompt must wait for an observed turn");
	// The observed turn settles the in-process wake hook so no Pi fallback repeats it.
	assert.ok((await readFile(join(job, "notify/delivered/_herdr"), "utf8")).trim());
	assert.match(await readFile(join(job, "log"), "utf8"), /coordinator wake via Herdr: attempt 1: turn observed on w1:p7/);
	const detail = limenWithEnv(scratch, {}, "jobs", id);
	assert.equal(detail.status, 0, detail.stderr);
	assert.match(detail.stdout, /herdr-wake:\n {4}attempt 1: turn observed on w1:p7/);
});

test("one failed Herdr prompt is retried once and the observed retry delivers", async (context) => {
	const scratch = await scratchRepo();
	context.after(() => wipe(scratch));
	const herdr = await fakeHerdr(scratch, "flaky");
	limenWithEnv(scratch, {}, "init");
	const id = onlyJobId(limenWithEnv(scratch, herdrCoordinator(herdr), "spawn", "--detached", "do work").stdout);
	const job = join(scratch.root, ".limen/jobs", id);
	await waitForState(scratch.root, id, "done");
	assert.match(await receipt(job), /^attempt 1: failed on w1:p7: pane_not_found \S+\nattempt 2: turn observed on w1:p7 \S+$/);
	assert.equal((await prompts(scratch)).length, 2);
	assert.ok((await readFile(join(job, "notify/delivered/_herdr"), "utf8")).trim());
});

test("two stalled Herdr prompts stop automatic delivery and leave the wake undelivered", async (context) => {
	const scratch = await scratchRepo();
	context.after(() => wipe(scratch));
	const herdr = await fakeHerdr(scratch, "stalled");
	limenWithEnv(scratch, {}, "init");
	const id = onlyJobId(limenWithEnv(scratch, herdrCoordinator(herdr), "spawn", "--detached", "do work").stdout);
	const job = join(scratch.root, ".limen/jobs", id);
	await waitForState(scratch.root, id, "done");
	assert.match(
		await receipt(job),
		/^attempt 1: submitted to w1:p7; no turn observed \S+\nattempt 2: submitted to w1:p7; no turn observed \S+\nautomatic delivery stopped after 2 unsuccessful attempts/,
	);
	assert.equal((await prompts(scratch)).length, 2, "no third automatic attempt");
	await assert.rejects(readFile(join(job, "notify/delivered/_herdr")));
});

test("a missing coordinator pane fails the Herdr wake visibly without blocking the terminal state", async (context) => {
	const scratch = await scratchRepo();
	context.after(() => wipe(scratch));
	const herdr = await fakeHerdr(scratch, "missing");
	limenWithEnv(scratch, {}, "init");
	const id = onlyJobId(limenWithEnv(scratch, herdrCoordinator(herdr), "spawn", "--detached", "do work").stdout);
	const job = join(scratch.root, ".limen/jobs", id);
	await waitForState(scratch.root, id, "done");
	assert.match(await receipt(job), /^attempt 1: failed on w1:p7: pane_not_found \S+\nattempt 2: failed on w1:p7: pane_not_found \S+\nautomatic delivery stopped/);
	await assert.rejects(readFile(join(job, "notify/delivered/_herdr")));
});

test("a Pi coordinator keeps its in-process wake route and records no Herdr pane", async (context) => {
	const scratch = await scratchRepo();
	context.after(() => wipe(scratch));
	const herdr = await fakeHerdr(scratch, "observed");
	limenWithEnv(scratch, {}, "init");
	const id = onlyJobId(limenWithEnv(scratch, { ...herdrCoordinator(herdr), PI_SESSION_ID: "pi-session" }, "spawn", "--detached", "do work").stdout);
	const job = join(scratch.root, ".limen/jobs", id);
	// Wake routing keys on origin-pane alone: without it finalize never prompts Herdr.
	await assert.rejects(readFile(join(job, "origin-pane")));
	assert.ok(await readFile(join(job, "notify/subscribers/pi-session"), "utf8"));
});

// A separate fake engine process that runs until the test writes `.limen/release`, so a coordinator can take the live job over.
// It polls the file because the test controls its end only through the shared job root.
const releasedPi = `#!/usr/bin/env node
const { existsSync } = require("node:fs");
const release = require("node:path").join(process.env.LIMEN_CONTEXT_ROOT, ".limen/release");
console.log(JSON.stringify({ type: "agent_start" }));
console.log(JSON.stringify({ type: "tool_execution_start", toolName: "bash", args: { command: "git status" } }));
const timer = setInterval(() => {
  if (!existsSync(release)) return;
  clearInterval(timer);
  console.log(JSON.stringify({ type: "message_end", message: { role: "assistant", content: [{ type: "text", text: "released" }] } }));
}, 25);
`;

test("an OMP coordinator that takes over a live job with limen watch gets its wake on its own pane", async (context) => {
	const scratch = await scratchRepo(releasedPi);
	context.after(() => wipe(scratch));
	const herdr = await fakeHerdr(scratch, "observed");
	limenWithEnv(scratch, {}, "init");
	const spawned = limenWithEnv(scratch, { ...herdrCoordinator(herdr), HERDR_PANE_ID: "w1:p3" }, "spawn", "--detached", "--label", "taken over", "do work");
	assert.equal(spawned.status, 0, spawned.stderr);
	const id = onlyJobId(spawned.stdout);
	const job = join(scratch.root, ".limen/jobs", id);
	const watched = limenWithEnv(scratch, herdrCoordinator(herdr), "watch", id);
	assert.equal(watched.status, 0, watched.stderr);
	assert.equal(watched.stdout, "watching 1 job\n");
	await writeFile(join(scratch.root, ".limen/release"), "");
	await waitForState(scratch.root, id, "done");
	assert.match(await receipt(job), /^attempt 1: turn observed on w1:p7 \S+$/);
	const sent = await prompts(scratch);
	assert.deepEqual(
		sent.map((args) => args[2]),
		["w1:p7"],
		"the pane that spawned the job no longer gets its wake",
	);
	assert.match(sent[0]?.[3] ?? "", new RegExp(`^Limen job "taken over": do work\\nis done \\(${id}\\)`));
});

test("a continuation started with no wake route keeps the parent's coordinator pane", async (context) => {
	const scratch = await scratchRepo();
	context.after(() => wipe(scratch));
	const herdr = await fakeHerdr(scratch, "observed");
	limenWithEnv(scratch, {}, "init");
	const parent = onlyJobId(limenWithEnv(scratch, herdrCoordinator(herdr), "spawn", "--detached", "--label", "first pass", "do work").stdout);
	await waitForState(scratch.root, parent, "done");
	// `continue` resumes the parent's transcript; the default fake engine writes none.
	await mkdir(join(scratch.root, ".limen/jobs", parent, "session"), { recursive: true });
	await writeFile(join(scratch.root, ".limen/jobs", parent, "session/run.jsonl"), `${JSON.stringify({ type: "session" })}\n`);
	// A remote executor or a plain terminal: no Herdr pane and no Pi session.
	const continued = limenWithEnv(scratch, { LIMEN_HERDR: herdr }, "continue", parent, "Check again");
	assert.equal(continued.status, 0, continued.stderr);
	const id = onlyJobId(continued.stdout);
	const job = join(scratch.root, ".limen/jobs", id);
	assert.equal((await readFile(join(job, "origin-pane"), "utf8")).trim(), "w1:p7");
	await waitForState(scratch.root, id, "done");
	assert.match(await receipt(job), /^attempt 1: turn observed on w1:p7 \S+$/);
	const sent = await prompts(scratch);
	assert.deepEqual(
		sent.map((args) => args[2]),
		["w1:p7", "w1:p7"],
	);
	assert.match(sent[1]?.[3] ?? "", new RegExp(`limen jobs ${id}`));
});

// A group cabinet from plain files: two team coordinators recorded on the lead pane w1:p7, one worker on its coordinator's pane w1:p9.
async function groupCabinet(scratch: Scratch): Promise<GroupRun> {
	const deadline = Date.now() + 3_600_000;
	const run: GroupRun = {
		id: "group-1",
		root: scratch.root,
		feature: "spec/features/active/F001-example",
		lead: "lead-session",
		startedAt: Date.now(),
		teams: ["team-1", "team-2"],
		workersPerTeam: 1,
		engine: "omp",
		provider: "anthropic",
		model: "claude-opus-5-5",
		thinking: "xhigh",
		workerThinking: "high",
		deadline,
		workerTimeoutMs: 600_000,
		reserveMs: 60_000,
		stopped: false,
		closed: false,
		mode: "detached",
		members: [
			{ id: "team-1-coordinator", team: "team-1", role: "coordinator", deadline },
			{ id: "team-2-coordinator", team: "team-2", role: "coordinator", deadline },
			{ id: "team-1-worker", team: "team-1", role: "worker", parent: "team-1-coordinator", deadline },
		],
	};
	await mkdir(groupPath(run), { recursive: true });
	await saveJson(`${groupPath(run)}/run.json`, run);
	for (const member of run.members) {
		const job = join(scratch.root, ".limen/jobs", member.id);
		await mkdir(job, { recursive: true });
		const pane = member.role === "coordinator" ? "w1:p7" : "w1:p9";
		const files = {
			group: run.id,
			team: member.team,
			role: member.role,
			label: `${member.team} ${member.role}`,
			branch: `limen/${member.id}`,
			state: "running",
			"task.md": `Pursue the ${member.team} approach.`,
			"origin-pane": pane,
		};
		for (const [name, body] of Object.entries(files)) await writeFile(join(job, name), `${body}\n`);
		await writeFile(join(job, "log"), "");
	}
	return run;
}

function useHerdr(context: { after(fn: () => void): void }, herdr: string): void {
	const before = process.env.LIMEN_HERDR;
	process.env.LIMEN_HERDR = herdr;
	context.after(() => {
		if (before === undefined) delete process.env.LIMEN_HERDR;
		else process.env.LIMEN_HERDR = before;
	});
}

test("a team coordinator's finish wakes the lead pane through Herdr when the lead group hook is not running", async (context) => {
	const scratch = await scratchRepo();
	context.after(() => wipe(scratch));
	useHerdr(context, await fakeHerdr(scratch, "observed"));
	const run = await groupCabinet(scratch);
	// A registration written by hand names a live process, but no hook refreshes it.
	const registration = join(scratch.root, ".limen/group-leads/lead-session");
	await mkdir(dirname(registration), { recursive: true });
	await writeFile(registration, `${process.pid}\n`);
	const old = new Date(Date.now() - 60_000);
	await utimes(registration, old, old);
	const coordinator = join(scratch.root, ".limen/jobs/team-1-coordinator");
	await writeFile(join(coordinator, "result"), "team-1 found the cause\n");
	await finalizeJob(coordinator, "done", "omp exited 0");
	assert.match(await receipt(coordinator), /^attempt 1: turn observed on w1:p7 \S+$/);
	const [sent] = await prompts(scratch);
	assert.equal(sent?.[2], "w1:p7");
	const text = sent?.[3] ?? "";
	assert.match(
		text,
		/^Limen job "team-1 coordinator" is done \(team-1-coordinator\) on branch limen\/team-1-coordinator\. It is the team-1 coordinator of group group-1 for spec\/features\/active\/F001-example\./,
	);
	assert.match(text, /Final message:\nteam-1 found the cause/);
	assert.match(text, /1 of 2 team coordinators are finished/);
	assert.match(text, new RegExp(`limen group status ${run.id}`));
	assert.match(text, /reload this pane .*hook\/group-peer\.ts.*resume lead session lead-session/);
	assert.match(await readFile(join(coordinator, "log"), "utf8"), /lead group hook for session lead-session is not running; waking the lead pane w1:p7 through Herdr/);

	// A worker's finish belongs to its team coordinator; it never prompts any pane.
	const worker = join(scratch.root, ".limen/jobs/team-1-worker");
	await finalizeJob(worker, "done", "omp exited 0");
	assert.equal((await prompts(scratch)).length, 1);
	await assert.rejects(readFile(join(worker, "notify/herdr-prompt")));
});

test("a live lead group hook carries a team coordinator's finish as a group event and Herdr stays quiet", async (context) => {
	const scratch = await scratchRepo();
	context.after(() => wipe(scratch));
	useHerdr(context, await fakeHerdr(scratch, "observed"));
	const run = await groupCabinet(scratch);
	const before = process.env.LIMEN_JOB;
	delete process.env.LIMEN_JOB;
	context.after(() => {
		if (before !== undefined) process.env.LIMEN_JOB = before;
	});
	type Handler = (event: never, context: never) => unknown;
	const handlers: Record<string, Handler> = {};
	const delivered: string[] = [];
	groupPeer({
		on: (name: string, handler: Handler) => {
			handlers[name] = handler;
		},
		sendMessage: (payload: { content: string }) => {
			delivered.push(payload.content);
		},
	} as Parameters<typeof groupPeer>[0]);
	const lead = { cwd: scratch.root, sessionManager: { getSessionId: () => run.lead }, ui: { notify: () => {} } };
	await handlers.session_start?.({} as never, lead as never);
	context.after(() => handlers.session_shutdown?.({} as never, lead as never));
	// The heartbeat: a completed sweep refreshes a registration that went stale.
	const registration = join(scratch.root, ".limen/group-leads", run.lead);
	const old = new Date(Date.now() - 60_000);
	await utimes(registration, old, old);
	assert.equal(await leadHookLive(scratch.root, run.lead), false);
	for (let waited = 0; !(await leadHookLive(scratch.root, run.lead)); waited += 100) {
		assert.ok(waited < 5_000, "the lead hook never refreshed its registration");
		await delay(100);
	}

	const coordinator = join(scratch.root, ".limen/jobs/team-1-coordinator");
	await finalizeJob(coordinator, "done", "omp exited 0");
	assert.match(await readFile(join(coordinator, "log"), "utf8"), /coordinator wake via Herdr: not sent; the lead group hook for session lead-session is live/);
	// The lead reads each batch and ends its turn, as a real agent does, so the next batch can follow.
	let seen = 0;
	for (let waited = 0; !delivered.some((text) => /coordinator team-1-coordinator: state done/.test(text)); waited += 100) {
		assert.ok(waited < 10_000, `the team coordinator's finish never reached the lead: ${JSON.stringify(delivered)}`);
		for (; seen < delivered.length; seen += 1) {
			await handlers.context?.({ messages: [{ role: "custom", content: delivered[seen] }] } as never, lead as never);
			await handlers.message_end?.({ message: { role: "assistant", stopReason: "stop" } } as never, lead as never);
		}
		await delay(100);
	}
	assert.deepEqual(await prompts(scratch), []);
	await assert.rejects(readFile(join(coordinator, "notify/herdr-prompt")));
});
