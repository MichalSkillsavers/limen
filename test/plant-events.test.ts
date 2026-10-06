import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import test, { type TestContext } from "node:test";
import { type CoordinatorSignal, type CoordinatorTurn, coordinatorSignals, sweepCoordinators, turnSignal } from "../src/integrations/coordinator-signal.ts";
import { processInfo } from "../src/runtime/contain.ts";
import { noteHostedIdle } from "../src/runtime/supervisor.ts";

type Body = Record<string, unknown>;

/** A plant with a finish webhook config whose sender's fetch is a fake receiver that records each request body. */
async function plant(t: TestContext) {
	const root = await mkdtemp(join(tmpdir(), "limen-plant-events-"));
	t.after(() => rm(root, { recursive: true, force: true }));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	await mkdir(join(root, ".limen/jobs"), { recursive: true });
	const config = join(root, ".limen/finish-webhook.env");
	await writeFile(config, "LIMEN_FINISH_WEBHOOK_URL='https://receiver.example.invalid/plant'\nLIMEN_FINISH_WEBHOOK_AUTH='Bearer synthetic-plant'\n", { mode: 0o600 });
	const capture = join(root, "requests.jsonl");
	const preload = join(root, "receiver.mjs");
	await writeFile(
		preload,
		`import { appendFileSync } from 'node:fs';
globalThis.fetch = async (url, options) => {
  appendFileSync(process.env.LIMEN_TEST_CAPTURE, JSON.stringify({ url: String(url), body: JSON.parse(options.body) }) + '\\n');
  return { status: 204 };
};
`,
	);
	for (const [key, value] of Object.entries({
		NODE_OPTIONS: `--import=${preload}`,
		LIMEN_TEST_CAPTURE: capture,
		LIMEN_FINISH_WEBHOOK_ENV: undefined,
		LIMEN_FINISH_WEBHOOK_AUTHOR: undefined,
		LIMEN_JOB: undefined,
		LIMEN_COORDINATOR: "1",
		HERDR_ENV: undefined,
		HERDR_PANE_ID: undefined,
	})) {
		const previous = process.env[key];
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
		t.after(() => {
			if (previous === undefined) delete process.env[key];
			else process.env[key] = previous;
		});
	}
	execFileSync("git", ["init", "-q", "-b", "main", root]);
	return {
		root,
		config,
		async requests(): Promise<Body[]> {
			const text = await readFile(capture, "utf8").catch(() => "");
			return text
				.split("\n")
				.filter(Boolean)
				.map((line) => {
					const request: { body: Body } = JSON.parse(line);
					return request.body;
				});
		},
	};
}

/** Wait until every claimed event under `events` has its receipt; the claim set is then final for this step. */
async function settledEvents(events: string, count: number): Promise<string[]> {
	const deadline = Date.now() + 20_000;
	for (;;) {
		const names = (await readdir(events).catch(() => [] as string[])).sort();
		const receipts = names.filter((name) => existsSync(join(events, name, "finish-webhook")));
		if (names.length === count && receipts.length === count) return names;
		if (Date.now() > deadline) throw new Error(`expected ${count} settled events in ${events}, saw ${names.join(", ") || "none"}`);
		await new Promise((resolve) => setTimeout(resolve, 20));
	}
}

function session(id: string, name: string) {
	return { cwd: "/", sessionManager: { getSessionId: () => id, getSessionFile: () => undefined, getSessionName: () => name } };
}

test("a settled turn's signal: blockers always count, idle and done wait for owned jobs, an aborted turn never counts", () => {
	const todo = (content: string, status: string, blocker?: string) => ({ content, status, ...(blocker ? { blocker } : {}) });
	const base = { todos: [], todosClosed: false, stop: "stop", ownedRunning: 0 };
	const cases: Array<[string, CoordinatorTurn, CoordinatorSignal | undefined]> = [
		["no todos and no goal", base, undefined],
		[
			"open todos",
			{ ...base, todos: [todo("Review", "pending"), todo("Land F781", "in_progress")] },
			{ kind: "coordinator.idle", reason: "turn ended with 2 open todos; next: Land F781" },
		],
		["open todos while an owned job runs", { ...base, todos: [todo("Land F781", "in_progress")], ownedRunning: 1 }, undefined],
		[
			"a blocked todo while an owned job runs",
			{ ...base, todos: [todo("Land F781", "blocked", "needs owner merge approval")], ownedRunning: 2 },
			{ kind: "coordinator.blocked", reason: "todo blocked: Land F781 (needs owner merge approval)" },
		],
		[
			"a goal out of token budget",
			{ ...base, goal: { id: "g", objective: "Ship F781", status: "budget-limited" } },
			{ kind: "coordinator.blocked", reason: "goal token budget reached: Ship F781" },
		],
		["an active goal", { ...base, goal: { id: "g", objective: "Ship F781", status: "active" } }, { kind: "coordinator.idle", reason: "turn ended with goal active: Ship F781" }],
		[
			"every todo closed this turn",
			{ ...base, todos: [todo("Spawn", "completed"), todo("Report", "abandoned"), todo("Land F781", "completed")], todosClosed: true },
			{ kind: "coordinator.goal-done", reason: "all 3 todos closed; last done: Land F781" },
		],
		[
			"every todo closed while the goal stays active",
			{ ...base, todos: [todo("Land", "completed")], todosClosed: true, goal: { id: "g", objective: "Ship", status: "active" } },
			{ kind: "coordinator.idle", reason: "turn ended with goal active: Ship" },
		],
		["a failed turn with nothing open", { ...base, stop: "error" }, { kind: "coordinator.idle", reason: "last turn failed" }],
		["an aborted turn with open todos", { ...base, stop: "aborted", todos: [todo("Land", "pending")] }, undefined],
	];
	for (const [name, turn, expected] of cases) assert.deepEqual(turnSignal(turn), expected, name);
});

test("a coordinator rings once per standing state, once per completed goal, and after an unanswered ask", async (t) => {
	const p = await plant(t);
	const signals = coordinatorSignals(40);
	signals.start(p.root, session("coord-1", "F781 lead"));
	t.after(() => signals.shutdown());
	const events = join(p.root, ".limen/coordinators/coord-1/events");
	assert.equal(await readFile(join(p.root, ".limen/coordinators/coord-1/pid"), "utf8"), `${process.pid}\n`);
	const todos = (statuses: readonly string[]) => ({
		toolName: "todo",
		details: { phases: [{ name: "Work", tasks: statuses.map((status, index) => ({ content: `Task ${index + 1}`, status })) }] },
	});
	signals.toolResult(todos(["in_progress", "pending"]));
	signals.messageEnd("stop");
	signals.settled();
	// The same state at the next turn end is not a new event.
	signals.messageEnd("stop");
	signals.settled();
	await settledEvents(events, 1);
	// An owned running job will wake the coordinator, so idle does not ring.
	await mkdir(join(p.root, ".limen/jobs/worker/notify/subscribers"), { recursive: true });
	await writeFile(join(p.root, ".limen/jobs/worker/state"), "running\n");
	await writeFile(join(p.root, ".limen/jobs/worker/notify/subscribers/coord-1"), "\n");
	signals.toolResult(todos(["completed", "in_progress"]));
	signals.settled();
	await rm(join(p.root, ".limen/jobs/worker"), { recursive: true });
	signals.goalUpdated({ goal: { id: "goal-7", objective: "Ship F781", status: "complete" } });
	signals.goalUpdated({ goal: { id: "goal-7", objective: "Ship F781", status: "complete" } });
	// A goal that completed this turn replaces the turn's idle signal.
	signals.settled();
	await settledEvents(events, 2);
	signals.toolStart({ toolCallId: "ask-1", toolName: "ask", args: { questions: [{ question: "Answered fast?" }] } });
	signals.toolEnd({ toolCallId: "ask-1", toolName: "ask" });
	signals.toolStart({ toolCallId: "ask-2", toolName: "ask", args: { questions: [{ id: "q", question: "Land F781 now?" }] } });
	await settledEvents(events, 3);
	const bodies = await p.requests();
	assert.deepEqual(
		bodies.map((body) => [body.event, body.status, body.reason]),
		[
			["coordinator.idle", "idle", "turn ended with 2 open todos; next: Task 1"],
			["coordinator.goal-done", "goal-done", "goal complete: Ship F781"],
			["coordinator.blocked", "blocked", "waiting for an answer: Land F781 now?"],
		],
	);
	for (const body of bodies) {
		assert.deepEqual([body.plant, body.title, body.jobId, body.job, body.branch], [basename(p.root), "F781 lead", "coord-1", "F781 lead", "main"]);
		assert.match(String(body.handoff), /^Coordinator /);
		assert.equal(body.jobState, undefined);
	}
});

test("the sweep rings once for a coordinator that died without a normal exit and quietly drops clean exits", async (t) => {
	const p = await plant(t);
	const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
	const identity = await processInfo(child.pid ?? 0);
	assert.equal(identity.kind, "present");
	const born = identity.kind === "present" ? identity.process.born : "";
	child.kill("SIGKILL");
	await once(child, "exit");
	const startedAt = "2026-10-05T20:00:00.000Z";
	const exitRecord = (kind: string, reason: string, at: string) =>
		`${JSON.stringify({ type: "custom", customType: "session_exit", data: { reason, kind, recordedAt: at }, id: "e", parentId: "p", timestamp: at })}\n`;
	const register = async (name: string, files: Record<string, string>) => {
		const dir = join(p.root, ".limen/coordinators", name);
		await mkdir(dir, { recursive: true });
		for (const [file, value] of Object.entries({ pid: String(child.pid), born, "started-at": startedAt, title: `${name} lead`, ...files }))
			await writeFile(join(dir, file), `${value}\n`);
		return dir;
	};
	// An older process's normal exit in the same session file is not this process's exit.
	const killedLog = join(p.root, "killed.jsonl");
	await writeFile(killedLog, `{"cut line\n${exitRecord("normal", "dispose", "2026-10-05T19:00:00.000Z")}`);
	const killed = await register("killed", { "session-file": killedLog, tool: "bash: limen land 2026-10-05-f781 --yes" });
	const fatalLog = join(p.root, "fatal.jsonl");
	await writeFile(fatalLog, exitRecord("fatal", "uncaughtException", "2026-10-05T21:00:00.000Z"));
	await register("fatal", { "session-file": fatalLog });
	const normalLog = join(p.root, "normal.jsonl");
	await writeFile(normalLog, exitRecord("normal", "dispose", "2026-10-05T21:00:00.000Z"));
	const normal = await register("normal", { "session-file": normalLog });
	const pi = await register("pi", { shutdown: "2026-10-05T21:00:00.000Z" });
	const self = await processInfo(process.pid);
	const live = await register("live", { pid: String(process.pid), born: self.kind === "present" ? self.process.born : "" });
	await sweepCoordinators(p.root);
	await sweepCoordinators(p.root);
	const bodies = await p.requests();
	assert.deepEqual(bodies.map((body) => [body.event, body.jobId, body.reason]).sort(), [
		["coordinator.exited", "fatal", `pid ${child.pid} exited (fatal: uncaughtException)`],
		["coordinator.exited", "killed", `pid ${child.pid} exited without a session shutdown (killed or crashed) while running bash: limen land 2026-10-05-f781 --yes`],
	]);
	for (const body of bodies) assert.deepEqual([body.status, body.plant, body.title], ["exited", basename(p.root), `${body.jobId} lead`]);
	assert.equal(existsSync(normal), false);
	assert.equal(existsSync(pi), false);
	assert.equal(existsSync(join(live, "events")), false);
	assert.match(await readFile(join(killed, "events/coordinator.exited/finish-webhook"), "utf8"), /^coordinator\.exited accepted:/);
});

test("a hosted stall rings once while the job runs; a clean idle close rings no stall", async (t) => {
	const p = await plant(t);
	const job = async (id: string, files: Record<string, string>) => {
		const dir = join(p.root, ".limen/jobs", id);
		await mkdir(dir, { recursive: true });
		for (const [name, value] of Object.entries({
			state: "running",
			label: `${id} label`,
			branch: `limen/${id}`,
			"finish-webhook-env": p.config,
			activity: "wait",
			"tool-calls": "3",
			...files,
		}))
			await writeFile(join(dir, name), `${value}\n`);
		return dir;
	};
	const stalled = await job("stalled", {});
	const now = Date.now();
	await noteHostedIdle(stalled, "blocked", { leftWorkingAt: undefined, armed: true }, now, 1_000);
	const watch = { leftWorkingAt: undefined, armed: true };
	// A recovered supervisor re-arms on the same standing note; that is not a new stall.
	await noteHostedIdle(stalled, "blocked", watch, now, 1_000);
	await noteHostedIdle(stalled, "blocked", watch, now + 5_000, 1_000);
	await settledEvents(join(stalled, "events"), 1);
	const [body] = await p.requests();
	assert.deepEqual(
		[body?.event, body?.status, body?.jobId, body?.title, body?.reason, body?.plant],
		["job.stalled", "stalled", "stalled", "stalled label", "blocked after 3 tool calls, session still open", basename(p.root)],
	);
	const tree = join(p.root, "clean-tree");
	execFileSync("git", ["init", "-q", tree]);
	execFileSync("git", ["-C", tree, "-c", "user.name=t", "-c", "user.email=t@example.invalid", "commit", "-q", "--allow-empty", "-m", "base"]);
	const clean = await job("clean", { worktree: tree });
	await mkdir(join(clean, "session"));
	await writeFile(
		join(clean, "session/a.jsonl"),
		`${JSON.stringify({ type: "message", message: { role: "assistant", content: [{ type: "text", text: "Finished." }], stopReason: "stop" } })}\n`,
	);
	const idle = { leftWorkingAt: undefined, armed: true };
	assert.equal(await noteHostedIdle(clean, "idle", idle, now, 1_000), undefined);
	assert.equal(await noteHostedIdle(clean, "idle", idle, now + 2_000, 1_000), "closed a clean idle session");
	assert.equal(existsSync(join(clean, "events")), false);
	assert.equal(existsSync(join(clean, "advisory")), false);
	assert.equal((await p.requests()).length, 1);
});
