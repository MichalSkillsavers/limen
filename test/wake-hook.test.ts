import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import limenWake from "../hook/wake.ts";
import { closeFeatureTabs } from "../src/integrations/herdr.ts";
import { processInfo } from "../src/runtime/contain.ts";

const WAKE_HOME = await mkdtemp(join(tmpdir(), "limen-wake-home-"));
const PREVIOUS_LIMEN_HOME = process.env.LIMEN_HOME;
process.env.LIMEN_HOME = WAKE_HOME;
test.after(async () => {
	if (PREVIOUS_LIMEN_HOME === undefined) delete process.env.LIMEN_HOME;
	else process.env.LIMEN_HOME = PREVIOUS_LIMEN_HOME;
	await rm(WAKE_HOME, { recursive: true, force: true });
});

type TestContext = {
	readonly cwd: string;
	isIdle(): boolean;
	readonly sessionManager: { getSessionId(): string };
	readonly ui: {
		notify(message: string, level: "info"): void;
		setStatus(key: string, value: string | undefined): void;
	};
};

test("wake ignores history, announces start, and steers once on terminal change", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-wake-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	await mkdir(join(jobs, "old"), { recursive: true });
	await writeFile(join(jobs, "old/state"), "done\n");
	await writeFile(join(jobs, "old/branch"), "old-branch\n");
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const notifications: string[] = [];
	const statuses: Array<string | undefined> = [];
	const messages: Array<{ content: string; deliverAs?: string }> = [];
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage(content, options) {
			messages.push({ content, ...(options ? { deliverAs: options.deliverAs } : {}) });
		},
	});
	const session = {
		cwd: root,
		// Wake delivery must still be explicitly steered if this check says idle:
		// the agent may begin another prompt before the extension hands it to Pi.
		isIdle: () => true,
		sessionManager: sessionManager("coordinator-a"),
		ui: {
			notify: (message: string) => notifications.push(message),
			setStatus: (_key: string, value: string | undefined) => statuses.push(value),
		},
	};
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	await waitUntilAsync(async () => (await readFile(join(WAKE_HOME, ".limen/projects"), "utf8").catch(() => "")).split("\n").includes(root));
	assert.equal(messages.length, 0);
	await mkdir(join(jobs, "new"));
	await writeFile(join(jobs, "new/label"), "F001 implementation\n");
	await writeFile(join(jobs, "new/branch"), "candidate\n");
	await subscribe(jobs, "new", "coordinator-a");
	await writeFile(join(jobs, "new/state"), "running\n");
	await waitUntil(() => notifications.length === 1);
	assert.deepEqual(notifications, ["limen: F001 implementation started (new)"]);
	await writeFile(join(jobs, "new/activity"), "tool\n");
	await writeFile(join(jobs, "new/last-tool"), "bash\n");
	await waitUntil(() => statuses.some((status) => /\bstarting$/.test(status ?? "")));
	await writeFile(join(jobs, "new/state"), "done\n");
	await waitUntil(() => messages.length === 1);
	// A finished job stays named on the job line until it lands or its feature closes.
	await waitUntil(() => /\bdone$/.test(statuses.at(-1) ?? ""));
	// Idle coordinators get a normal user message (visible turn), not a buried steer.
	assert.equal(messages[0]?.deliverAs, undefined);
	await writeFile(join(jobs, "new/state"), "failed\n");
	await new Promise((resolve) => setTimeout(resolve, 100));
	assert.equal(messages.length, 1, "a corrected terminal state must not send another wake");
	handlers.get("session_shutdown")?.({}, session);
	assert.deepEqual((await import("node:fs/promises").then(({ readdir }) => readdir(join(jobs, "new")))).sort(), ["activity", "branch", "label", "last-tool", "notify", "state"]);
});

test("a completion wake carries bounded commits and the worker's final message", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-wake-handoff-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const messages: string[] = [];
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage(content) {
			messages.push(content);
		},
	});
	const session = { cwd: root, isIdle: () => true, sessionManager: sessionManager("coordinator-a"), ui: { notify() {}, setStatus() {} } };
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	await mkdir(join(jobs, "handoff"), { recursive: true });
	await writeFile(join(jobs, "handoff/label"), "F017 handoff\n");
	await writeFile(join(jobs, "handoff/branch"), "limen/handoff\n");
	await subscribe(jobs, "handoff", "coordinator-a");
	await writeFile(join(jobs, "handoff/state"), "running\n");
	const commitLines = Array.from({ length: 12 }, (_, index) => `${(index + 1).toString(16).padStart(7, "0")} commit ${index + 1}`);
	await writeFile(join(jobs, "handoff/commits"), `${commitLines.join("\n")}\n`);
	const resultLines = Array.from({ length: 20 }, (_, index) => `result line ${index + 1}`);
	await writeFile(join(jobs, "handoff/result"), `${resultLines.join("\n")}\n`);
	await writeFile(join(jobs, "handoff/stop-reason"), "error: usage limit reached\n");
	await mkdir(join(jobs, "handoff/steer/inbox"), { recursive: true });
	await writeFile(join(jobs, "handoff/steer/inbox/0001"), "turn left\n");
	await writeFile(join(jobs, "handoff/state"), "done\n");
	await waitUntil(() => messages.length === 1);
	const wake = messages[0] ?? "";
	assert.match(wake, /Stop reason: error: usage limit reached/);
	assert.match(wake, /1 steer\(s\) never delivered/);
	assert.match(wake, /Commits:\n0000001 commit 1/);
	assert.match(wake, /000000a commit 10\n… 2 more/);
	assert.doesNotMatch(wake, /commit 11/);
	assert.match(wake, /Final message:\nresult line 1\n/);
	assert.match(wake, /result line 15\n…/);
	assert.doesNotMatch(wake, /result line 16/);
	await mkdir(join(jobs, "bare"), { recursive: true });
	await writeFile(join(jobs, "bare/label"), "F017 bare\n");
	await writeFile(join(jobs, "bare/branch"), "limen/bare\n");
	await subscribe(jobs, "bare", "coordinator-a");
	await writeFile(join(jobs, "bare/state"), "stopped\n");
	await waitUntil(() => messages.length === 2);
});

test("a completion wake says when a terminal job produced nothing", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-wake-empty-handoff-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const messages: string[] = [];
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage(content) {
			messages.push(content);
		},
	});
	const session = { cwd: root, isIdle: () => true, sessionManager: sessionManager("coordinator-a"), ui: { notify() {}, setStatus() {} } };
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));

	const empty = join(jobs, "empty");
	await mkdir(empty, { recursive: true });
	await writeFile(join(empty, "label"), "F011 empty\n");
	await writeFile(join(empty, "branch"), "limen/empty\n");
	await writeFile(join(empty, "tool-calls"), "0\n");
	await writeFile(join(empty, "commits"), "");
	await writeFile(join(empty, "stop-reason"), "error: usage limit reached\n");
	await subscribe(jobs, "empty", "coordinator-a");
	await writeFile(join(empty, "state"), "done\n");
	await waitUntil(() => messages.length === 1);
	assert.match(messages[0] ?? "", /is done \(empty\)/);
	assert.match(messages[0] ?? "", /It produced nothing \(0 tool calls, no commits\)/);
	assert.match(messages[0] ?? "", /Stop reason: error: usage limit reached/);

	const survey = join(jobs, "survey");
	await mkdir(survey, { recursive: true });
	await writeFile(join(survey, "label"), "F011 survey\n");
	await writeFile(join(survey, "branch"), "limen/survey\n");
	await writeFile(join(survey, "tool-calls"), "1\n");
	await writeFile(join(survey, "commits"), "");
	await subscribe(jobs, "survey", "coordinator-a");
	await writeFile(join(survey, "state"), "done\n");
	await waitUntil(() => messages.length === 2);
	assert.doesNotMatch(messages[1] ?? "", /produced nothing/);
});

test("a reloaded coordinator tab resubscribes to its running jobs", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	stashEnv(context, "HERDR_TAB_ID", "w1:t1");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-wake-reload-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const mine = join(jobs, "mine");
	const other = join(jobs, "other");
	for (const job of [mine, other]) {
		await mkdir(join(job, "notify/subscribers"), { recursive: true });
		await writeFile(join(job, "state"), "running\n");
		await writeFile(join(job, "label"), `${job === mine ? "mine" : "other"}\n`);
		await writeFile(join(job, "branch"), "limen/x\n");
		await writeFile(join(job, "notify/ready"), "1\n");
		await writeFile(join(job, "notify/subscribers/old-session"), "1\n");
	}
	await writeFile(join(mine, "origin-tab"), "w1:t1\n");
	await writeFile(join(other, "origin-tab"), "w1:t9\n");
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const messages: string[] = [];
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage(content) {
			messages.push(content);
		},
	});
	const session = {
		cwd: root,
		isIdle: () => true,
		sessionManager: sessionManager("new-session"),
		ui: { notify() {}, setStatus() {} },
	};
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	assert.equal(await readFile(join(mine, "notify/subscribers/new-session"), "utf8").then((text) => text.length > 0), true);
	await assert.rejects(import("node:fs/promises").then(({ access }) => access(join(other, "notify/subscribers/new-session"))));
	await writeFile(join(mine, "state"), "done\n");
	await waitUntil(() => messages.some((message) => message.includes("is done (mine)")));
});

test("wake remains inert inside workers", () => {
	const inheritedJob = process.env.LIMEN_JOB;
	process.env.LIMEN_JOB = "1";
	try {
		const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
		const statuses: Array<string | undefined> = [];
		limenWake({
			on(event, handler) {
				handlers.set(event, handler);
			},
			sendUserMessage() {
				assert.fail("worker must not receive coordinator wakes");
			},
		});
		const session = {
			cwd: "/missing",
			isIdle: () => true,
			sessionManager: sessionManager("coordinator-a"),
			ui: { notify() {}, setStatus: (_key: string, value: string | undefined) => statuses.push(value) },
		};
		handlers.get("session_start")?.({}, session);
		handlers.get("session_shutdown")?.({}, session);
		assert.deepEqual(statuses, []);
	} finally {
		if (inheritedJob === undefined) delete process.env.LIMEN_JOB;
		else process.env.LIMEN_JOB = inheritedJob;
	}
});

test("wake stays out of foreign projects and honors LIMEN_WAKE=0", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const start = async (prepare: (root: string) => Promise<unknown>) => {
		const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-wake-inert-")));
		context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
		await prepare(root);
		const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
		const statuses: Array<string | undefined> = [];
		limenWake({
			on(event, handler) {
				handlers.set(event, handler);
			},
			sendUserMessage() {
				assert.fail("an inert session must not receive wakes");
			},
		});
		const session = {
			cwd: root,
			isIdle: () => true,
			sessionManager: sessionManager("coordinator-a"),
			ui: { notify() {}, setStatus: (_key: string, value: string | undefined) => statuses.push(value) },
		};
		handlers.get("session_start")?.({}, session);
		context.after(() => handlers.get("session_shutdown")?.({}, session));
		return { root, statuses };
	};
	const foreign = await start(async () => {});
	await assert.rejects(
		import("node:fs/promises").then(({ access }) => access(join(foreign.root, ".limen"))),
		"a project without .agents/limen must stay untouched",
	);
	assert.deepEqual(foreign.statuses, []);
	stashEnv(context, "LIMEN_WAKE", "0");
	const disabled = await start((root) => mkdir(join(root, ".agents/limen"), { recursive: true }));
	await assert.rejects(
		import("node:fs/promises").then(({ access }) => access(join(disabled.root, ".limen"))),
		"LIMEN_WAKE=0 must keep the session silent",
	);
	assert.deepEqual(disabled.statuses, []);
});

test("wake finds the project root from a subdirectory", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-wake-subdir-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	await mkdir(join(root, "src"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const messages: string[] = [];
	const statuses: Array<string | undefined> = [];
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage(content) {
			messages.push(content);
		},
	});
	const session = {
		cwd: join(root, "src"),
		isIdle: () => true,
		sessionManager: sessionManager("coordinator-a"),
		ui: { notify() {}, setStatus: (_key: string, value: string | undefined) => statuses.push(value) },
	};
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	await import("node:fs/promises").then(({ access }) => access(jobs));
	await mkdir(join(jobs, "sub"), { recursive: true });
	await writeFile(join(jobs, "sub/label"), "F023 from src\n");
	await writeFile(join(jobs, "sub/branch"), "candidate\n");
	await subscribe(jobs, "sub", "coordinator-a");
	await writeFile(join(jobs, "sub/state"), "running\n");
	await waitUntil(() => statuses.some((status) => /\bstarting$/.test(status ?? "")));
	await writeFile(join(jobs, "sub/state"), "done\n");
	await waitUntil(() => messages.length === 1);
	assert.match(messages[0] ?? "", /F023 from src.*is done \(sub\)/);
});

test("/limen off mutes the session and /limen on catches up once", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-mute-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	let command: ((args: string, context: { ui: { notify(message: string, level: "info"): void } }) => void) | undefined;
	const messages: string[] = [];
	const statuses: Array<string | undefined> = [];
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage(content) {
			messages.push(content);
		},
		registerCommand(name, options) {
			assert.equal(name, "limen");
			command = options.handler;
		},
	});
	assert.ok(command, "the /limen command must register");
	const confirmations: string[] = [];
	const commandUi = { ui: { notify: (message: string) => confirmations.push(message) } };
	const session = {
		cwd: root,
		isIdle: () => true,
		sessionManager: sessionManager("coordinator-a"),
		ui: { notify() {}, setStatus: (_key: string, value: string | undefined) => statuses.push(value) },
	};
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	command("off", commandUi);
	assert.deepEqual(confirmations, ["limen wake off"]);
	await mkdir(join(jobs, "quiet"), { recursive: true });
	await writeFile(join(jobs, "quiet/label"), "F002 quiet work\n");
	await writeFile(join(jobs, "quiet/branch"), "candidate\n");
	await subscribe(jobs, "quiet", "coordinator-a");
	await writeFile(join(jobs, "quiet/state"), "done\n");
	await new Promise((resolve) => setTimeout(resolve, 150));
	assert.deepEqual(messages, [], "a muted session must not receive wakes");
	assert.deepEqual(
		statuses.filter((value) => value !== undefined),
		[],
		"a muted session must not draw the footer",
	);
	command("on", commandUi);
	assert.deepEqual(confirmations, ["limen wake off", "limen wake on"]);
	await waitUntil(() => messages.length === 1);
	assert.match(messages[0] ?? "", /F002 quiet work.*is done \(quiet\)/);
	command("", commandUi);
	assert.equal(confirmations.at(-1), "limen wake off", "bare /limen must toggle");
});

test("subscriptions scope wakes and one idle coordinator receives fallback", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-routing-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const handlersA = new Map<string, (event: unknown, context: TestContext) => void>();
	const handlersB = new Map<string, (event: unknown, context: TestContext) => void>();
	const messagesA: string[] = [];
	const messagesB: string[] = [];
	const startsA: string[] = [];
	const startsB: string[] = [];
	limenWake({
		on(event, handler) {
			handlersA.set(event, handler);
		},
		sendUserMessage(content) {
			messagesA.push(content);
		},
	});
	limenWake({
		on(event, handler) {
			handlersB.set(event, handler);
		},
		sendUserMessage(content) {
			messagesB.push(content);
		},
	});
	const sessionA = {
		cwd: root,
		isIdle: () => true,
		sessionManager: sessionManager("coordinator-a"),
		ui: { notify: (message: string) => startsA.push(message), setStatus() {} },
	};
	const sessionB = {
		cwd: root,
		isIdle: () => true,
		sessionManager: sessionManager("coordinator-b"),
		ui: { notify: (message: string) => startsB.push(message), setStatus() {} },
	};
	handlersA.get("session_start")?.({}, sessionA);
	handlersB.get("session_start")?.({}, sessionB);
	context.after(() => handlersA.get("session_shutdown")?.({}, sessionA));
	context.after(() => handlersB.get("session_shutdown")?.({}, sessionB));

	await mkdir(join(jobs, "owned"), { recursive: true });
	await writeFile(join(jobs, "owned/label"), "F010 owned\n");
	await writeFile(join(jobs, "owned/branch"), "candidate-owned\n");
	await subscribe(jobs, "owned", "coordinator-a");
	await writeFile(join(jobs, "owned/state"), "running\n");
	await waitUntil(() => startsA.length === 1);
	assert.deepEqual(startsB, []);
	await writeFile(join(jobs, "owned/state"), "done\n");
	await waitUntil(() => messagesA.length === 1);
	assert.deepEqual(messagesB, []);

	await mkdir(join(jobs, "shared"), { recursive: true });
	await writeFile(join(jobs, "shared/label"), "F011 shared\n");
	await writeFile(join(jobs, "shared/branch"), "candidate-shared\n");
	await subscribe(jobs, "shared", "coordinator-a");
	await subscribe(jobs, "shared", "coordinator-b");
	await writeFile(join(jobs, "shared/state"), "done\n");
	await waitUntil(() => messagesA.length === 2 && messagesB.length === 1);

	await mkdir(join(jobs, "fallback"), { recursive: true });
	await writeFile(join(jobs, "fallback/label"), "F012 fallback\n");
	await writeFile(join(jobs, "fallback/branch"), "candidate-fallback\n");
	await subscribe(jobs, "fallback", "closed-session");
	await writeFile(join(jobs, "fallback/finished-at"), "2000-01-01T00:00:00.000Z\n");
	await writeFile(join(jobs, "fallback/state"), "done\n");
	await waitUntil(() => messagesA.length + messagesB.length === 4);
});

test("herdr pane naming follows running jobs and each terminal state notifies once", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-herdr-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	const calls = join(root, "herdr-calls");
	await mkdir(calls);
	const fake = join(root, "herdr");
	await writeFile(fake, `#!/bin/sh\nout="${calls}/call.$$"\nprintf '%s\\n' "$@" > "$out"\n`);
	await chmod(fake, 0o755);
	stashEnv(context, "LIMEN_HERDR", fake);
	stashEnv(context, "HERDR_ENV", "1");
	stashEnv(context, "HERDR_PANE_ID", "w1:p1");
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage() {},
	});
	const session = { cwd: root, isIdle: () => true, sessionManager: sessionManager("coordinator-a"), ui: { notify() {}, setStatus() {} } };
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	await mkdir(join(jobs, "new"), { recursive: true });
	await writeFile(join(jobs, "new/label"), "F001 implementation\n");
	await writeFile(join(jobs, "new/branch"), "candidate\n");
	await subscribe(jobs, "new", "coordinator-a");
	await writeFile(join(jobs, "new/state"), "running\n");
	const body = "1 RUNNING · 1 watched · 0 unwatched · implementation · F001 starting";
	await waitUntilAsync(async () => (await readCalls(calls)).some((call) => call.includes(`limen=${body}`)));
	const naming = (await readCalls(calls)).find((call) => call.includes(`limen=${body}`));
	assert.ok(naming, "pane metadata call expected");
	assert.deepEqual(naming.slice(0, 5), ["pane", "report-metadata", "w1:p1", "--source", "limen"]);
	const titleAt = naming.indexOf("--title");
	assert.equal(naming[titleAt + 1], "Limen · implementation · F001");
	assert.equal(naming[naming.indexOf("--display-agent") + 1], "Limen · waiting on 1 job");
	const tokenAt = naming.indexOf(`limen=${body}`);
	assert.equal(naming[tokenAt - 1], "--token");
	assert.equal(naming[tokenAt + 1], "--state-label");
	assert.equal(naming[tokenAt + 2], `idle=${body}`);
	assert.equal(naming[tokenAt + 4], `done=${body}`);
	await writeFile(join(jobs, "new/state"), "done\n");
	await waitUntilAsync(async () => (await readCalls(calls)).some((call) => call[0] === "notification"));
	await waitUntilAsync(async () => (await readCalls(calls)).some((call) => call.includes("--clear-token")));
	const done = (await readCalls(calls)).filter((call) => call[0] === "notification");
	assert.equal(done.length, 1, "one notification per terminal state");
	const clear = (await readCalls(calls)).find((call) => call.includes("--clear-token"));
	assert.ok(clear, "clear-token call expected");
	assert.deepEqual(clear.slice(0, 5), ["pane", "report-metadata", "w1:p1", "--source", "limen"]);
	assert.equal(clear[clear.indexOf("--clear-token") + 1], "limen");
	assert.ok(clear.includes("--clear-title"), "finished jobs must restore the pane's own title");
	assert.equal(clear[clear.indexOf("--display-agent") + 1], "Limen coordinator");
	assert.ok(clear.includes("--clear-state-labels"), "finished jobs must restore the pane's own state label");
	handlers.get("session_shutdown")?.({}, session);
	await waitUntilAsync(async () => (await readCalls(calls)).some((call) => call.includes("--clear-display-agent")));
});

test("settled coordinator labels count watched and visible unwatched RUNNING jobs beyond truncated detail", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "HERDR_TAB_ID", undefined);
	const root = await mkdtemp(join(tmpdir(), "limen-running-metadata-"));
	context.after(() => rm(root, { recursive: true, force: true }));
	const calls = join(root, "calls");
	await mkdir(calls);
	const fake = join(root, "herdr");
	await writeFile(fake, `#!/bin/sh\nprintf '%s\\n' "$@" > "${calls}/call.$$"\n`);
	await chmod(fake, 0o755);
	stashEnv(context, "LIMEN_HERDR", fake);
	stashEnv(context, "HERDR_ENV", "1");
	stashEnv(context, "HERDR_PANE_ID", "w1:p1");
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const worker = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { detached: true, stdio: "ignore" });
	context.after(() => worker.kill());
	assert.ok(worker.pid);
	for (const id of ["a", "b", "c", "d"]) {
		await mkdir(join(jobs, id), { recursive: true });
		await writeFile(join(jobs, id, "state"), "running\n");
		await writeFile(join(jobs, id, "activity"), "think\n");
		await writeFile(join(jobs, id, "pid"), `${worker.pid}\n`);
		await subscribe(jobs, id, id === "d" ? "other-session" : "coordinator-a");
	}
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const messages: string[] = [];
	limenWake({
		on: (event, handler) => handlers.set(event, handler),
		sendUserMessage: (message) => {
			messages.push(message);
		},
	});
	let leadIdle = true;
	const session = { cwd: root, isIdle: () => leadIdle, sessionManager: sessionManager("coordinator-a"), ui: { notify() {}, setStatus() {} } };
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	handlers.get("agent_settled")?.({}, session);
	const report = async (prefix: string) => {
		await waitUntilAsync(async () => (await readCalls(calls)).some((call) => call.some((arg) => arg.startsWith(`idle=${prefix}`))));
		const call = (await readCalls(calls)).find((call) => call.some((arg) => arg.startsWith(`idle=${prefix}`)));
		assert.ok(call);
		const idle = call.find((arg) => arg.startsWith("idle="))?.slice(5);
		assert.ok(call.includes(`done=${idle}`));
		assert.ok(call.includes(`limen=${idle}`));
		assert.ok(!call.includes("--state"));
		assert.ok(!call.some((arg) => arg.startsWith("blocked=")), "native blockers must retain their evidence");
		return idle ?? "";
	};
	assert.match(await report("4 RUNNING · 3 watched · 1 unwatched"), /a think b think c think \+1$/);
	// The overlay names the lead pane: an idle lead waits on its jobs, a working lead is never called waiting.
	assert.ok((await readCalls(calls)).some((call) => call.includes("Limen · waiting on 4 jobs")));
	leadIdle = false;
	await waitUntilAsync(async () => (await readCalls(calls)).some((call) => call.includes("Limen · 4 jobs")));
	leadIdle = true;
	await writeFile(join(jobs, "d/pid"), "99999999\n");
	await waitUntilAsync(async () => (await readCalls(calls)).some((call) => call.includes("⚠ Limen · 1 of 4 needs attention")));
	await writeFile(join(jobs, "d/pid"), `${worker.pid}\n`);
	await rm(join(jobs, "c/notify/subscribers/coordinator-a"));
	assert.match(await report("4 RUNNING · 2 watched · 2 unwatched"), /c think \(unwatched\)/);
	for (const id of ["a", "b", "c"]) await writeFile(join(jobs, id, "state"), "done\n");
	// Watched jobs that finished stay named; c lost its subscription, so it is not this coordinator's to report.
	assert.match(await report("1 RUNNING · 0 watched · 1 unwatched"), /d think \(unwatched\) · a done b done$/);
	await assert.rejects(readFile(join(jobs, "d/notify/subscribers/coordinator-a")), "visibility must not subscribe this session");
	assert.ok(!messages.some((message) => message.includes("(d)")), "unwatched work is not a completion wake for this session");
	await writeFile(join(jobs, "d/activity"), "wait\n");
	await waitUntilAsync(async () => (await readCalls(calls)).some((call) => call.some((arg) => /idle=.*d wait \(unwatched\) · a done b done$/.test(arg))));
	await writeFile(join(jobs, "d/pid"), "99999999\n");
	await waitUntilAsync(async () => (await readCalls(calls)).some((call) => call.some((arg) => /idle=.*d dead \(unwatched\) · a done b done$/.test(arg))));
	assert.ok(
		(await readCalls(calls)).some((call) => call.includes("⚠ Limen · 1 of 1 needs attention")),
		"dead evidence must not be relabeled waiting",
	);
	await writeFile(join(jobs, "d/state"), "stopped\n");
	assert.match(await report("0 RUNNING · 0 watched · 0 unwatched"), / · a done b done$/);
	// A retired record leaves the line after the next coordinator turn.
	for (const id of ["a", "b"]) await rm(join(jobs, id), { recursive: true });
	handlers.get("agent_settled")?.({}, session);
	await waitUntilAsync(async () => (await readCalls(calls)).some((call) => call.includes("--clear-state-labels")));
});

test("same-feature jobs retain useful names and only a mismatched wrapper identity needs attention", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "HERDR_TAB_ID", undefined);
	const root = await mkdtemp(join(tmpdir(), "limen-footer-identity-"));
	context.after(() => rm(root, { recursive: true, force: true }));
	const calls = join(root, "calls");
	await mkdir(calls);
	const fake = join(root, "herdr");
	await writeFile(fake, `#!/bin/sh\nprintf '%s\\n' "$@" > "${calls}/call.$$"\n`);
	await chmod(fake, 0o755);
	stashEnv(context, "LIMEN_HERDR", fake);
	stashEnv(context, "HERDR_ENV", "1");
	stashEnv(context, "HERDR_PANE_ID", "w1:p1");
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const identity = await processInfo(process.pid);
	assert.equal(identity.kind, "present");
	if (identity.kind !== "present") throw new Error("test process identity unavailable");
	for (let index = 0; index < 14; index += 1) {
		const id = `job-${String(index).padStart(2, "0")}`;
		await mkdir(join(jobs, id), { recursive: true });
		const label = index === 0 ? "F773-styleguide-quality-scan team-1 coordinator" : `team-${index + 1} coordinator · F773`;
		await writeFile(join(jobs, id, "label"), `${label}\n`);
		await writeFile(join(jobs, id, "state"), "running\n");
		await writeFile(join(jobs, id, "pid"), `${process.pid}\n`);
		await writeFile(join(jobs, id, "born"), index === 0 ? "another process birth\n" : `${identity.process.born}\n`);
		await writeFile(join(jobs, id, "activity"), index === 1 ? "tool\n" : "think\n");
		if (index === 1) await writeFile(join(jobs, id, "last-tool"), "read\n");
	}
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const statuses: string[] = [];
	limenWake({
		on: (event, handler) => handlers.set(event, handler),
		sendUserMessage() {},
	});
	const session = {
		cwd: root,
		isIdle: () => true,
		sessionManager: sessionManager("coordinator-a"),
		ui: {
			notify() {},
			setStatus(_key: string, value: string | undefined) {
				if (value) statuses.push(value);
			},
		},
	};
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	await waitUntil(() => statuses.some((status) => status.includes("team-1 coordinator · F773 dead")));
	assert.match(statuses.at(-1) ?? "", /team-2 coordinator · F773 tool:read/);
	assert.match(statuses.at(-1) ?? "", /team-3 coordinator · F773 think/);
	await waitUntilAsync(async () => (await readCalls(calls)).some((call) => call.includes("⚠ Limen · 1 of 14 needs attention")));
	const reports = await readCalls(calls);
	assert.ok(reports.some((call) => call.includes("Limen · 14 jobs · team-1 coordinator · F773 team-2 coordinator · F773 team-3 coordinator · F773")));
	assert.ok(!reports.some((call) => call[0] === "agent"), "the footer does not ask Herdr whether its wrapper is alive");
	await writeFile(join(jobs, "job-00/born"), `${identity.process.born}\n`);
	await waitUntil(() => statuses.some((status) => status.includes("team-1 coordinator · F773 think")));
	await writeFile(join(jobs, "job-01/label"), "footer liveness repair\n");
	await waitUntil(() => statuses.some((status) => status.includes("footer liveness repair tool:read")));
	await writeFile(join(jobs, "job-00/state"), "done\n");
	await waitUntilAsync(async () => (await readCalls(calls)).some((call) => call.includes("Limen · waiting on 13 jobs")));
});

test("the coordinator tab keeps running and finished counts on its stem; an owner turn clears the finished count", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-tab-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	const calls = join(root, "herdr-calls");
	await mkdir(calls);
	const label = join(root, "tab-label");
	await writeFile(label, "chat settings");
	const fake = join(root, "herdr");
	await writeFile(
		fake,
		`#!/bin/sh\nprintf '%s\\n' "$@" > "${calls}/call.$$"\ncase "$1 $2" in\n'tab get') printf '{"result":{"tab":{"label":"%s"}}}' "$(cat ${label})" ;;\n'tab rename') printf '%s' "$4" > "${label}" ;;\nesac\n`,
	);
	await chmod(fake, 0o755);
	stashEnv(context, "LIMEN_HERDR", fake);
	stashEnv(context, "HERDR_ENV", "1");
	stashEnv(context, "HERDR_PANE_ID", "w1:p1");
	stashEnv(context, "HERDR_TAB_ID", "w1:t1");
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage() {},
	});
	const session = { cwd: root, isIdle: () => true, sessionManager: sessionManager("coordinator-a"), ui: { notify() {}, setStatus() {} } };
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	const plant = async (id: string, tab: string) => {
		await mkdir(join(jobs, id), { recursive: true });
		await writeFile(join(jobs, id, "label"), `${id} work\n`);
		await writeFile(join(jobs, id, "branch"), "candidate\n");
		await writeFile(join(jobs, id, "origin-tab"), `${tab}\n`);
		await subscribe(jobs, id, "coordinator-a");
		await writeFile(join(jobs, id, "state"), "running\n");
	};
	const renames = async (): Promise<string[]> => (await readCalls(calls)).filter((call) => call[0] === "tab" && call[1] === "rename").map((call) => call[3] ?? "");
	await plant("one", "w1:t1");
	await waitUntilAsync(async () => (await renames()).includes("chat settings · 1 running"));
	await plant("two", "w1:t1");
	await waitUntilAsync(async () => (await renames()).includes("chat settings · 2 running"));
	// A job another tab spawned is not this conversation's count.
	await plant("three", "w9:t9");
	await writeFile(join(jobs, "one/finished-at"), `${new Date().toISOString()}\n`);
	await writeFile(join(jobs, "one/state"), "done\n");
	await waitUntilAsync(async () => (await renames()).includes("chat settings · 1 running · 1 finished"));
	await writeFile(join(jobs, "two/finished-at"), `${new Date().toISOString()}\n`);
	await writeFile(join(jobs, "two/state"), "failed\n");
	const current = () => readFile(label, "utf8");
	await waitUntilAsync(async () => (await current()) === "chat settings · 2 finished");
	// A Limen wake is not the owner speaking. Absence of a rename needs one sweep interval (500 ms) to pass.
	handlers.get("message_start")?.({ message: { role: "user", content: [{ type: "text", text: 'Limen job "two work" is failed (two).' }] } }, session);
	await new Promise((resolve) => setTimeout(resolve, 600));
	assert.equal(await current(), "chat settings · 2 finished");
	handlers.get("message_start")?.({ message: { role: "user", content: [{ type: "text", text: "what is left?" }] } }, session);
	await waitUntilAsync(async () => (await current()) === "chat settings");
	assert.equal(await readFile(label, "utf8"), "chat settings", "the stem survives every tail rewrite");
	assert.ok(
		(await renames()).every((name) => !/running.*running|finished.*finished/.test(name)),
		"a tail is replaced, never stacked",
	);
});

test("a finished job leaves the coordinator title and job line once it lands or its feature closes", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	const root = await mkdtemp(join(tmpdir(), "limen-finished-"));
	context.after(() => rm(root, { recursive: true, force: true }));
	const git = (...args: string[]) => execFileSync("git", ["-c", "user.email=t@example.com", "-c", "user.name=t", ...args], { cwd: root, stdio: "ignore" });
	git("init", "-q", "-b", "main");
	git("commit", "-q", "--allow-empty", "-m", "base");
	git("checkout", "-q", "-b", "limen/land");
	await writeFile(join(root, "landed.txt"), "work\n");
	git("add", "landed.txt");
	git("commit", "-q", "-m", "work to land");
	git("checkout", "-q", "main");
	const label = join(root, "tab-label");
	await writeFile(label, "chat settings");
	const fake = join(root, "herdr");
	await writeFile(
		fake,
		`#!/bin/sh\ncase "$1 $2" in\n'tab get') printf '{"result":{"tab":{"label":"%s"}}}' "$(cat ${label})" ;;\n'tab rename') printf '%s' "$4" > "${label}" ;;\nesac\n`,
	);
	await chmod(fake, 0o755);
	stashEnv(context, "LIMEN_HERDR", fake);
	stashEnv(context, "HERDR_ENV", "1");
	stashEnv(context, "HERDR_PANE_ID", "w1:p1");
	stashEnv(context, "HERDR_TAB_ID", "w1:t1");
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	for (const [id, jobLabel, branch, commits] of [
		["close", "F901 closing work", "limen/close", ""],
		["land", "landing work", "limen/land", "abc1234 work to land\n"],
	] as const) {
		await mkdir(join(jobs, id), { recursive: true });
		await writeFile(join(jobs, id, "label"), `${jobLabel}\n`);
		await writeFile(join(jobs, id, "branch"), `${branch}\n`);
		await writeFile(join(jobs, id, "commits"), commits);
		await writeFile(join(jobs, id, "origin-tab"), "w1:t1\n");
		await subscribe(jobs, id, "coordinator-a");
		await writeFile(join(jobs, id, "state"), "done\n");
	}
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const statuses: Array<string | undefined> = [];
	limenWake({ on: (event, handler) => handlers.set(event, handler), sendUserMessage() {} });
	const session = {
		cwd: root,
		isIdle: () => true,
		sessionManager: sessionManager("coordinator-a"),
		ui: { notify() {}, setStatus: (_key: string, value: string | undefined) => statuses.push(value) },
	};
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	const current = () => readFile(label, "utf8");
	await waitUntilAsync(async () => (await current()) === "chat settings · 2 finished");
	git("merge", "-q", "--ff-only", "limen/land");
	handlers.get("agent_settled")?.({}, session);
	await waitUntilAsync(async () => (await current()) === "chat settings · 1 finished");
	await mkdir(join(root, "spec/features/done/2026-10/F901-closing-work"), { recursive: true });
	handlers.get("agent_settled")?.({}, session);
	await waitUntilAsync(async () => (await current()) === "chat settings");
	assert.equal(statuses.at(-1), undefined);
});

test("limen close and the job line agree on a job whose label names two features", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	const root = await mkdtemp(join(tmpdir(), "limen-two-features-"));
	context.after(() => rm(root, { recursive: true, force: true }));
	const label = join(root, "tab-label");
	const closedTabs = join(root, "closed-tabs");
	await writeFile(label, "chat settings");
	const fake = join(root, "herdr");
	await writeFile(
		fake,
		`#!/bin/sh\ncase "$1 $2" in\n'tab get') printf '{"result":{"tab":{"label":"%s"}}}' "$(cat ${label})" ;;\n'tab rename') printf '%s' "$4" > "${label}" ;;\n'tab close') echo "$3" >> "${closedTabs}" ;;\nesac\n`,
	);
	await chmod(fake, 0o755);
	stashEnv(context, "LIMEN_HERDR", fake);
	stashEnv(context, "HERDR_ENV", "1");
	stashEnv(context, "HERDR_PANE_ID", "w1:p1");
	stashEnv(context, "HERDR_TAB_ID", "w1:t1");
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	await mkdir(join(root, "spec/features/done/2026-10/F099-first-work"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const job = join(jobs, "follow-up");
	await mkdir(join(job, "herdr"), { recursive: true });
	await writeFile(join(job, "label"), "F100 follow-up for F099\n");
	await writeFile(join(job, "commits"), "");
	await writeFile(join(job, "origin-tab"), "w1:t1\n");
	for (const [name, value] of [
		["workspace", "w1"],
		["tab", "w1:t9"],
		["pane", "w1:p9"],
		["mode", "log"],
	] as const)
		await writeFile(join(job, "herdr", name), `${value}\n`);
	await subscribe(jobs, "follow-up", "coordinator-a");
	await writeFile(join(job, "state"), "done\n");
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	limenWake({ on: (event, handler) => handlers.set(event, handler), sendUserMessage() {} });
	const session = { cwd: root, isIdle: () => true, sessionManager: sessionManager("coordinator-a"), ui: { notify() {}, setStatus() {} } };
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	const current = () => readFile(label, "utf8");
	// F100 is still open: the job stays on the line, and closing F099 leaves its tab.
	await waitUntilAsync(async () => (await current()) === "chat settings · 1 finished");
	assert.equal(await closeFeatureTabs({ root, feature: "F099" }), "closed 0 leftover tabs for F099");
	await mkdir(join(root, "spec/features/done/2026-10/F100-follow-up"), { recursive: true });
	handlers.get("agent_settled")?.({}, session);
	await waitUntilAsync(async () => (await current()) === "chat settings");
	assert.equal(await closeFeatureTabs({ root, feature: "F099" }), "closed 1 leftover tab for F099");
	assert.equal(await readFile(closedTabs, "utf8"), "w1:t9\n");
});

test("a tab still carrying herdr's own number is never decorated", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-tab-unnamed-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	const calls = join(root, "herdr-calls");
	await mkdir(calls);
	const fake = join(root, "herdr");
	await writeFile(fake, `#!/bin/sh\nprintf '%s\\n' "$@" > "${calls}/call.$$"\n[ "$1 $2" = 'tab get' ] && printf '{"result":{"tab":{"label":"4"}}}'\nexit 0\n`);
	await chmod(fake, 0o755);
	stashEnv(context, "LIMEN_HERDR", fake);
	stashEnv(context, "HERDR_ENV", "1");
	stashEnv(context, "HERDR_PANE_ID", "w1:p1");
	stashEnv(context, "HERDR_TAB_ID", "w1:t1");
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage() {},
	});
	const session = { cwd: root, isIdle: () => true, sessionManager: sessionManager("coordinator-a"), ui: { notify() {}, setStatus() {} } };
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	await mkdir(join(jobs, "one"), { recursive: true });
	await writeFile(join(jobs, "one/label"), "one work\n");
	await writeFile(join(jobs, "one/branch"), "candidate\n");
	await writeFile(join(jobs, "one/origin-tab"), "w1:t1\n");
	await subscribe(jobs, "one", "coordinator-a");
	await writeFile(join(jobs, "one/state"), "running\n");
	await waitUntilAsync(async () => (await readCalls(calls)).some((call) => call[0] === "tab" && call[1] === "get"));
	assert.equal((await readCalls(calls)).filter((call) => call[0] === "tab" && call[1] === "rename").length, 0);
});

function stashEnv(context: { after(fn: () => void): void }, name: string, value: string | undefined): void {
	const inherited = process.env[name];
	if (value === undefined) delete process.env[name];
	else process.env[name] = value;
	context.after(() => {
		if (inherited === undefined) delete process.env[name];
		else process.env[name] = inherited;
	});
}

async function readCalls(directory: string): Promise<string[][]> {
	const { readdir } = await import("node:fs/promises");
	const names = await readdir(directory).catch(() => [] as string[]);
	const calls = await Promise.all(names.sort().map((name) => readFile(join(directory, name), "utf8").catch(() => "")));
	return calls.filter((call) => call !== "").map((call) => call.split("\n").filter((line) => line !== ""));
}

async function waitUntilAsync(predicate: () => Promise<boolean>): Promise<void> {
	const deadline = Date.now() + 5_000;
	while (!(await predicate()) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 20));
	assert.ok(await predicate(), "timed out waiting for herdr call");
}

test("muting holds job notices and wakes until the conversation is unmuted", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-herdr-mute-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	const calls = join(root, "herdr-calls");
	await mkdir(calls);
	const fake = join(root, "herdr");
	await writeFile(fake, `#!/bin/sh\nout="${calls}/call.$$"\nprintf '%s\\n' "$@" > "$out"\n`);
	await chmod(fake, 0o755);
	stashEnv(context, "LIMEN_HERDR", fake);
	stashEnv(context, "HERDR_ENV", "1");
	stashEnv(context, "HERDR_PANE_ID", "w1:p1");
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	let command: ((args: string, context: { ui: { notify(message: string, level: "info"): void } }) => void) | undefined;
	const messages: string[] = [];
	const notifications: string[] = [];
	const statuses: Array<string | undefined> = [];
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage(content) {
			messages.push(content);
		},
		registerCommand(_name, options) {
			command = options.handler;
		},
	});
	assert.ok(command);
	const commandUi = { ui: { notify() {} } };
	const session = {
		cwd: root,
		isIdle: () => true,
		sessionManager: sessionManager("coordinator-a"),
		ui: { notify: (message: string) => notifications.push(message), setStatus: (_key: string, value: string | undefined) => statuses.push(value) },
	};
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	command("off", commandUi);
	await mkdir(join(jobs, "new"), { recursive: true });
	await writeFile(join(jobs, "new/label"), "F001 implementation\n");
	await writeFile(join(jobs, "new/branch"), "candidate\n");
	await subscribe(jobs, "new", "coordinator-a");
	await writeFile(join(jobs, "new/state"), "running\n");
	assert.deepEqual(
		statuses.filter((value) => value !== undefined),
		[],
		"the muted footer must stay clear while herdr still gets the token",
	);
	assert.deepEqual(notifications, [], "a muted session must not show start notices");
	await writeFile(join(jobs, "new/state"), "done\n");
	await new Promise((resolve) => setTimeout(resolve, 200));
	assert.equal((await readCalls(calls)).filter((call) => call[0] === "notification").length, 0, "mute must silence herdr toasts");
	assert.deepEqual(messages, [], "a muted session must not receive wakes");
	command("on", commandUi);
	await waitUntil(() => messages.length === 1);
	assert.match(messages[0] ?? "", /F001 implementation.*is done/);
	await waitUntilAsync(async () => (await readCalls(calls)).some((call) => call[0] === "notification"));
	assert.equal((await readCalls(calls)).filter((call) => call[0] === "notification").length, 1, "unmute delivers the herdr toast once");
});

test("a concretely missing hosted job is reaped once and wakes while a pidless young job keeps grace", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_REAP_CONFIRM_MS", "30");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-wake-reap-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	const herdr = join(root, "herdr");
	await writeFile(
		herdr,
		`#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "agent" && args[1] === "get") {
  console.log(JSON.stringify({error: {code: "agent_not_found", message: "fixture agent is gone"}}));
  process.exit(1);
}
const result = args[0] === "agent" && args[1] === "list" ? {agents: []}
  : args[0] === "pane" && args[1] === "process-info" ? {process_info: {foreground_processes: []}} : {};
console.log(JSON.stringify({result}));
`,
		{ mode: 0o755 },
	);
	stashEnv(context, "LIMEN_HERDR", herdr);
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const messages: string[] = [];
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage(content) {
			messages.push(content);
		},
	});
	const session = { cwd: root, isIdle: () => true, sessionManager: sessionManager("coordinator-a"), ui: { notify() {}, setStatus() {} } };
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	const young = join(jobs, "young");
	await mkdir(young, { recursive: true });
	await writeFile(join(young, "label"), "F025 young\n");
	await writeFile(join(young, "branch"), "limen/young\n");
	await writeFile(join(young, "started-at"), `${new Date(Date.now() - 60_000).toISOString()}\n`);
	await writeFile(join(young, "log"), "");
	await subscribe(jobs, "young", "coordinator-a");
	await writeFile(join(young, "state"), "running\n");
	const gone = join(jobs, "gone");
	await mkdir(join(gone, "session"), { recursive: true });
	await writeFile(join(gone, "label"), "F025 gone\n");
	await writeFile(join(gone, "branch"), "limen/gone\n");
	await writeFile(join(gone, "pid"), "999999999\n");
	await writeFile(join(gone, "started-at"), `${new Date(Date.now() - 60 * 60_000).toISOString()}\n`);
	await writeFile(join(gone, "log"), "");
	await writeFile(join(gone, "hosted"), "hosted\n");
	await mkdir(join(gone, "herdr"));
	await writeFile(join(gone, "herdr/agent"), "w1:p1\n");
	await writeFile(
		join(gone, "session", "2026-08-19.jsonl"),
		`${JSON.stringify({
			type: "message",
			message: { role: "assistant", content: [{ type: "text", text: "worker final" }], stopReason: "error", errorMessage: "usage limit reached" },
		})}\n`,
	);
	await subscribe(jobs, "gone", "coordinator-a");
	await writeFile(join(gone, "state"), "running\n");
	await waitUntil(() => messages.some((message) => message.includes("is failed (gone)")));
	assert.equal(await readFile(join(young, "state"), "utf8"), "running\n");
	assert.equal(await readFile(join(gone, "state"), "utf8"), "failed\n");
	assert.equal(await readFile(join(gone, "result"), "utf8"), "worker final\n");
	assert.equal(await readFile(join(gone, "stop-reason"), "utf8"), "error: usage limit reached\n");
	const wake = messages.find((message) => message.includes("is failed (gone)")) ?? "";
	assert.match(wake, /Stop reason: error: usage limit reached/);
	assert.match(wake, /Final message:\nworker final/);
	assert.equal(messages.filter((message) => message.includes("is failed (gone)")).length, 1);
	await new Promise((resolve) => setTimeout(resolve, 200));
	assert.equal(messages.filter((message) => message.includes("is failed (gone)")).length, 1, "a reaped job must wake once");
});

test("an idle advisory wakes once, stays running, and does not block completion", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-wake-advisory-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const messages: Array<{ content: string; deliverAs?: string }> = [];
	const notifications: string[] = [];
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage(content, options) {
			messages.push({ content, ...(options ? { deliverAs: options.deliverAs } : {}) });
		},
	});
	const session = {
		cwd: root,
		isIdle: () => true,
		sessionManager: sessionManager("coordinator-a"),
		ui: { notify: (message: string) => notifications.push(message), setStatus() {} },
	};
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	await mkdir(join(jobs, "stall"), { recursive: true });
	await writeFile(join(jobs, "stall/label"), "F027 stall\n");
	await writeFile(join(jobs, "stall/branch"), "limen/stall\n");
	await subscribe(jobs, "stall", "coordinator-a");
	await writeFile(join(jobs, "stall/state"), "running\n");
	await writeFile(join(jobs, "stall/result"), "hosted stall summary\n");
	await writeFile(join(jobs, "stall/commits"), "abc1234 stall work\n");
	await writeFile(join(jobs, "stall/advisory"), "idle 10m after 14 tool calls, session still open\n");
	await waitUntil(() => messages.length === 1);
	assert.equal(messages[0]?.deliverAs, undefined);
	assert.match(messages[0]?.content ?? "", /still running \(stall\).*idle 10m after 14 tool calls, session still open/);
	assert.match(messages[0]?.content ?? "", /Inspect the job record and continue the loop; steer; or open the tab and exit if you mean the session to end/);
	assert.match(messages[0]?.content ?? "", /Final message:\nhosted stall summary/);
	assert.match(messages[0]?.content ?? "", /Commits:\nabc1234 stall work/);
	assert.ok(notifications.some((value) => value.includes("is idle (stall)")));
	assert.equal(await readFile(join(jobs, "stall/state"), "utf8"), "running\n");
	emitWakeTurn(handlers, session, messages[0]?.content ?? "");
	await writeFile(join(jobs, "stall/state"), "done\n");
	await waitUntil(() => messages.length === 2);
	assert.match(messages[1]?.content ?? "", /is done \(stall\)/);
	assert.doesNotMatch(messages[1]?.content ?? "", /continue the loop/);
	emitWakeTurn(handlers, session, messages[1]?.content ?? "");
	const { existsSync } = await import("node:fs");
	assert.equal(existsSync(join(jobs, "stall/notify/delivered/coordinator-a")), true);
	assert.equal(existsSync(join(jobs, "stall/notify/delivered/_advisory.coordinator-a")), true);
});

test("an errored advisory wake says the last turn failed", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-wake-errored-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const messages: string[] = [];
	const notifications: string[] = [];
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage(content) {
			messages.push(content);
		},
	});
	const session = {
		cwd: root,
		isIdle: () => true,
		sessionManager: sessionManager("coordinator-a"),
		ui: { notify: (message: string) => notifications.push(message), setStatus() {} },
	};
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	await mkdir(join(jobs, "fail"), { recursive: true });
	await writeFile(join(jobs, "fail/label"), "F057 fail\n");
	await writeFile(join(jobs, "fail/branch"), "limen/fail\n");
	await subscribe(jobs, "fail", "coordinator-a");
	await writeFile(join(jobs, "fail/state"), "running\n");
	await writeFile(join(jobs, "fail/advisory"), "errored: last turn failed with error: usage limit reached, session still open\n");
	await waitUntil(() => messages.length === 1);
	assert.match(messages[0] ?? "", /last turn failed with error: usage limit reached/);
	assert.doesNotMatch(messages[0] ?? "", /is idle/);
	assert.ok(notifications.some((value) => value.includes("last turn failed (fail)")));
	assert.equal(
		notifications.some((value) => value.includes("is idle")),
		false,
	);
});

test("first idle wake in a sweep is a real turn; later wakes are followUp", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-wake-followup-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	for (const id of ["one", "two"]) {
		await mkdir(join(jobs, id), { recursive: true });
		await writeFile(join(jobs, id, "label"), `F027 ${id}\n`);
		await writeFile(join(jobs, id, "branch"), `limen/${id}\n`);
		await subscribe(jobs, id, "coordinator-a");
		await writeFile(join(jobs, id, "state"), "done\n");
	}
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const messages: Array<{ content: string; deliverAs?: string }> = [];
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage(content, options) {
			messages.push({ content, ...(options ? { deliverAs: options.deliverAs } : {}) });
		},
	});
	const session = { cwd: root, isIdle: () => true, sessionManager: sessionManager("coordinator-a"), ui: { notify() {}, setStatus() {} } };
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	await waitUntil(() => messages.length === 2);
	assert.equal(messages.filter((message) => message.deliverAs === undefined).length, 1);
	assert.equal(messages.filter((message) => message.deliverAs === "followUp").length, 1);
	assert.ok(messages.some((message) => message.content.includes("is done (one)") && !message.content.includes("is done (two)")));
	assert.ok(messages.some((message) => message.content.includes("is done (two)") && !message.content.includes("is done (one)")));
});

test("one assistant response confirms every batched followUp wake in the turn", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-wake-batched-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	for (const id of ["one", "two"]) {
		await mkdir(join(jobs, id), { recursive: true });
		await writeFile(join(jobs, id, "label"), `F042 ${id}\n`);
		await writeFile(join(jobs, id, "branch"), `limen/${id}\n`);
		await subscribe(jobs, id, "coordinator-a");
		await writeFile(join(jobs, id, "state"), "done\n");
	}
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const messages: string[] = [];
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage(content) {
			messages.push(content);
		},
	});
	const session = { cwd: root, isIdle: () => false, sessionManager: sessionManager("coordinator-a"), ui: { notify() {}, setStatus() {} } };
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	await waitUntil(() => messages.length === 2);
	for (const content of messages) {
		handlers.get("message_start")?.({ message: { role: "user", content: [{ type: "text", text: content }] } }, session);
	}
	handlers.get("message_end")?.({ message: { role: "assistant", content: [{ type: "text", text: "both acknowledged" }], stopReason: "stop" } }, session);
	handlers.get("agent_settled")?.({}, session);
	const { existsSync } = await import("node:fs");
	assert.equal(existsSync(join(jobs, "one/notify/delivered/coordinator-a")), true);
	assert.equal(existsSync(join(jobs, "two/notify/delivered/coordinator-a")), true);
	await new Promise((resolve) => setTimeout(resolve, 650));
	assert.equal(messages.length, 2, "confirmed batched wakes must not be injected again");
});

test("a busy session injects every wake as followUp", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-wake-busy-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	await mkdir(join(jobs, "busy"), { recursive: true });
	await writeFile(join(jobs, "busy/label"), "F027 busy\n");
	await writeFile(join(jobs, "busy/branch"), "limen/busy\n");
	await subscribe(jobs, "busy", "coordinator-a");
	await writeFile(join(jobs, "busy/state"), "done\n");
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const messages: Array<{ content: string; deliverAs?: string }> = [];
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage(content, options) {
			messages.push({ content, ...(options ? { deliverAs: options.deliverAs } : {}) });
		},
	});
	const session = { cwd: root, isIdle: () => false, sessionManager: sessionManager("coordinator-a"), ui: { notify() {}, setStatus() {} } };
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	await waitUntil(() => messages.length === 1);
	assert.equal(messages[0]?.deliverAs, "followUp");
});

test("a rejected injection releases the claim and the next sweep retries", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-wake-retry-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const messages: string[] = [];
	let rejectNext = true;
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage(content) {
			if (rejectNext) return Promise.reject(new Error("Cannot submit a prompt while compaction is in progress."));
			messages.push(String(content));
			return Promise.resolve();
		},
	});
	const session = {
		cwd: root,
		isIdle: () => true,
		sessionManager: sessionManager("coordinator-a"),
		ui: {
			notify() {},
			setStatus() {},
		},
	};
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	await mkdir(join(jobs, "new"), { recursive: true });
	await writeFile(join(jobs, "new/label"), "F031 retry\n");
	await writeFile(join(jobs, "new/branch"), "candidate\n");
	await subscribe(jobs, "new", "coordinator-a");
	await writeFile(join(jobs, "new/state"), "running\n");
	await new Promise((resolve) => setTimeout(resolve, 150));
	await writeFile(join(jobs, "new/state"), "done\n");
	// The injection rejects mid-compaction; the claim must be released, never delivered.
	const { existsSync } = await import("node:fs");
	await waitUntilAsync(() =>
		readFile(join(jobs, "new/log"), "utf8")
			.then((logText) => logText.includes("wake injection failed"))
			.catch(() => false),
	);
	assert.equal(existsSync(join(jobs, "new/notify/delivered/coordinator-a")), false, "a failed injection must not mark delivered");
	// Once pi can accept turns again, a later sweep delivers without any human nudge.
	rejectNext = false;
	await waitUntil(() => messages.length >= 1);
	assert.equal(existsSync(join(jobs, "new/notify/delivered/coordinator-a")), false, "acceptance alone is not confirmation");
	emitWakeTurn(handlers, session, messages[0] ?? "");
	assert.ok(existsSync(join(jobs, "new/notify/delivered/coordinator-a")));
	assert.match(messages[0] ?? "", /F031 retry.*is done/);
	handlers.get("session_shutdown")?.({}, session);
});

test("an accepted wake is recovered after shutdown when no turn ran", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-wake-recover-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const job = join(jobs, "recover");
	await mkdir(job, { recursive: true });
	await writeFile(join(job, "label"), "F042 recover\n");
	await writeFile(join(job, "branch"), "limen/recover\n");
	await subscribe(jobs, "recover", "coordinator-a");
	await writeFile(join(job, "state"), "done\n");
	const firstHandlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const firstMessages: string[] = [];
	limenWake({
		on(event, handler) {
			firstHandlers.set(event, handler);
		},
		sendUserMessage(content) {
			firstMessages.push(content);
		},
	});
	const firstSession = { cwd: root, isIdle: () => false, sessionManager: sessionManager("coordinator-a"), ui: { notify() {}, setStatus() {} } };
	firstHandlers.get("session_start")?.({}, firstSession);
	await waitUntil(() => firstMessages.length === 1);
	const claim = join(job, "notify/claims/coordinator-a");
	assert.equal((await readFile(join(claim, "accepted"), "utf8")).trim(), "1");
	const stale = new Date(Date.now() - 31_000);
	await utimes(claim, stale, stale);
	await new Promise((resolve) => setTimeout(resolve, 550));
	assert.equal(firstMessages.length, 1, "a live owner protects a long-running accepted claim from stale recovery");
	firstHandlers.get("session_shutdown")?.({}, firstSession);

	const secondHandlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const secondMessages: string[] = [];
	limenWake({
		on(event, handler) {
			secondHandlers.set(event, handler);
		},
		sendUserMessage(content) {
			secondMessages.push(content);
		},
	});
	const secondSession = { cwd: root, isIdle: () => true, sessionManager: sessionManager("coordinator-a"), ui: { notify() {}, setStatus() {} } };
	secondHandlers.get("session_start")?.({}, secondSession);
	context.after(() => secondHandlers.get("session_shutdown")?.({}, secondSession));
	await waitUntil(() => secondMessages.length === 1);
	assert.match(secondMessages[0] ?? "", /F042 recover.*is done/);
	emitWakeTurn(secondHandlers, secondSession, secondMessages[0] ?? "");
	const { existsSync } = await import("node:fs");
	assert.equal(existsSync(join(job, "notify/delivered/coordinator-a")), true);
	assert.equal(existsSync(claim), false);
});

test("another listener does not recover a live accepted claim", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-wake-live-claim-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const job = join(jobs, "live");
	await mkdir(job, { recursive: true });
	await writeFile(join(job, "label"), "F042 live claim\n");
	await writeFile(join(job, "branch"), "limen/live\n");
	await subscribe(jobs, "live", "coordinator-a");
	await writeFile(join(job, "state"), "done\n");
	const firstHandlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const firstMessages: string[] = [];
	limenWake({
		on(event, handler) {
			firstHandlers.set(event, handler);
		},
		sendUserMessage(content) {
			firstMessages.push(content);
		},
	});
	const firstSession = { cwd: root, isIdle: () => false, sessionManager: sessionManager("coordinator-a"), ui: { notify() {}, setStatus() {} } };
	firstHandlers.get("session_start")?.({}, firstSession);
	context.after(() => firstHandlers.get("session_shutdown")?.({}, firstSession));
	await waitUntil(() => firstMessages.length === 1);
	const claim = join(job, "notify/claims/coordinator-a");
	const stale = new Date(Date.now() - 31_000);
	await utimes(claim, stale, stale);

	const secondHandlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const secondMessages: string[] = [];
	limenWake({
		on(event, handler) {
			secondHandlers.set(event, handler);
		},
		sendUserMessage(content) {
			secondMessages.push(content);
		},
	});
	const secondSession = { cwd: root, isIdle: () => false, sessionManager: sessionManager("coordinator-a"), ui: { notify() {}, setStatus() {} } };
	secondHandlers.get("session_start")?.({}, secondSession);
	context.after(() => secondHandlers.get("session_shutdown")?.({}, secondSession));
	await new Promise((resolve) => setTimeout(resolve, 650));
	assert.equal(secondMessages.length, 0, "the live claimant's heartbeat protects its accepted claim");
	emitWakeTurn(firstHandlers, firstSession, firstMessages[0] ?? "");
	const { existsSync } = await import("node:fs");
	assert.equal(existsSync(join(job, "notify/delivered/coordinator-a")), true);
});

for (const failure of [false, true]) {
	test(`competing subscribers ${failure ? "share two failures without a late confirmation reset" : "still fan out successful wakes"}`, async (context) => {
		stashEnv(context, "LIMEN_JOB", undefined);
		stashEnv(context, "LIMEN_HERDR", "0");
		const root = await mkdtemp(join(tmpdir(), "limen-wake-competing-"));
		context.after(() => rm(root, { recursive: true, force: true }));
		await mkdir(join(root, ".agents/limen"), { recursive: true });
		const jobs = join(root, ".limen/jobs");
		const job = join(jobs, "shared");
		for (const id of ["a", "b", "c"]) await subscribe(jobs, "shared", id);
		await writeFile(join(job, "state"), "done\n");
		const listeners = ["a", "b", "c"].map((id) => {
			const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
			const messages: string[] = [];
			limenWake({
				on: (event, handler) => handlers.set(event, handler),
				sendUserMessage: (message) => {
					messages.push(message);
				},
			});
			const session = { cwd: root, isIdle: () => true, sessionManager: sessionManager(id), ui: { notify() {}, setStatus() {} } };
			context.after(() => handlers.get("session_shutdown")?.({}, session));
			return { handlers, session, messages };
		});
		for (const listener of listeners) listener.handlers.get("session_start")?.({}, listener.session);
		const count = () => listeners.reduce((sum, listener) => sum + listener.messages.length, 0);
		await waitUntil(() => count() === 2);
		for (const listener of listeners.filter((listener) => listener.messages.length)) {
			emitWakeTurn(listener.handlers, listener.session, listener.messages[0] ?? "", failure ? "error" : "stop");
		}
		if (!failure) {
			await waitUntil(() => count() === 3);
			for (const listener of listeners) emitWakeTurn(listener.handlers, listener.session, listener.messages[0] ?? "");
			const { readdir } = await import("node:fs/promises");
			assert.deepEqual((await readdir(join(job, "notify/delivered"))).sort(), ["a", "b", "c"]);
		} else {
			for (const listener of listeners) {
				emitWakeTurn(listener.handlers, listener.session, listener.messages[0] ?? "");
				listener.handlers.get("session_shutdown")?.({}, listener.session);
				listener.handlers.get("session_start")?.({}, listener.session);
			}
			await new Promise((resolve) => setTimeout(resolve, 1100));
			assert.equal(count(), 2, "a different subscriber cannot gain a third attempt");
			assert.equal(await readFile(join(job, "notify/unconfirmed/_completion"), "utf8"), "1\n1\n");
		}
	});
}

test("provider-error turns exhaust the allowance after two failures", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-wake-error-turn-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const job = join(jobs, "error-turn");
	await mkdir(job, { recursive: true });
	await writeFile(join(job, "label"), "F042 error turn\n");
	await writeFile(join(job, "branch"), "limen/error-turn\n");
	await subscribe(jobs, "error-turn", "coordinator-a");
	await writeFile(join(job, "state"), "done\n");
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const messages: string[] = [];
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage(content) {
			messages.push(content);
		},
	});
	const session = { cwd: root, isIdle: () => true, sessionManager: sessionManager("coordinator-a"), ui: { notify() {}, setStatus() {} } };
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	await waitUntil(() => messages.length === 1);
	emitWakeTurn(handlers, session, messages[0] ?? "", "error");
	const { existsSync } = await import("node:fs");
	assert.equal(existsSync(join(job, "notify/delivered/coordinator-a")), false);
	assert.equal(await readFile(join(job, "notify/unconfirmed/_completion"), "utf8"), "1\n", "error spends an attempt");
	await waitUntil(() => messages.length === 2);
	emitWakeTurn(handlers, session, messages[1] ?? "", "error");
	assert.equal(existsSync(join(job, "notify/delivered/coordinator-a")), false);
	assert.equal(await readFile(join(job, "notify/unconfirmed/_completion"), "utf8"), "1\n1\n");
	assert.match(await readFile(join(job, "notify/claims/coordinator-a/blocked"), "utf8"), /automatic retries stopped/);
	assert.match(await readFile(join(job, "log"), "utf8"), /claim retained for human recovery/);
	handlers.get("session_shutdown")?.({}, session);
	handlers.get("session_start")?.({}, session);
	emitWakeTurn(handlers, session, messages[1] ?? "");
	await new Promise((resolve) => setTimeout(resolve, 1100));
	assert.equal(messages.length, 2, "reload, late confirmation and further sweeps cannot reopen exhaustion");
	assert.equal(existsSync(join(job, "notify/delivered/coordinator-a")), false);
});

test("a footer failure leaves completion delivery and sweeps alive", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-wake-footer-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const job = join(jobs, "footer");
	await mkdir(job, { recursive: true });
	await writeFile(join(job, "label"), "F042 footer\n");
	await writeFile(join(job, "branch"), "limen/footer\n");
	await subscribe(jobs, "footer", "coordinator-a");
	await writeFile(join(job, "state"), "running\n");
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const messages: string[] = [];
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage(content) {
			messages.push(content);
		},
	});
	const session = {
		cwd: root,
		isIdle: () => true,
		sessionManager: sessionManager("coordinator-a"),
		ui: {
			notify() {},
			setStatus() {
				throw new Error("stale footer");
			},
		},
	};
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	await waitUntilAsync(() =>
		readFile(join(root, ".limen/log"), "utf8")
			.then((value) => value.includes("footer disabled"))
			.catch(() => false),
	);
	await writeFile(join(job, "state"), "done\n");
	await waitUntil(() => messages.length === 1);
	emitWakeTurn(handlers, session, messages[0] ?? "");
	assert.match(messages[0] ?? "", /F042 footer.*is done/);
	const notes = (await readFile(join(root, ".limen/log"), "utf8")).split("footer disabled").length - 1;
	assert.equal(notes, 1, "one durable footer-death note");
});

test("session start delivers a standing advisory before a completion", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-wake-order-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	for (const id of ["a-completion", "z-advisory"]) {
		await mkdir(join(jobs, id), { recursive: true });
		await writeFile(join(jobs, id, "label"), `F042 ${id}\n`);
		await writeFile(join(jobs, id, "branch"), `limen/${id}\n`);
		await subscribe(jobs, id, "coordinator-a");
	}
	await writeFile(join(jobs, "a-completion/state"), "done\n");
	await writeFile(join(jobs, "z-advisory/state"), "running\n");
	await writeFile(join(jobs, "z-advisory/advisory"), "blocked while session remains open\n");
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const messages: string[] = [];
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage(content) {
			messages.push(content);
		},
	});
	const session = { cwd: root, isIdle: () => true, sessionManager: sessionManager("coordinator-a"), ui: { notify() {}, setStatus() {} } };
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	await waitUntil(() => messages.length === 2);
	assert.match(messages[0] ?? "", /still running \(z-advisory\)/);
	assert.match(messages[1] ?? "", /is done \(a-completion\)/);
});

test("an open coordinator stamps last-sweep and shutdown stops refreshing it", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-last-sweep-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage() {},
	});
	const session = { cwd: root, isIdle: () => true, sessionManager: sessionManager("coordinator-stamp"), ui: { notify() {}, setStatus() {} } };
	handlers.get("session_start")?.({}, session);
	const stamp = join(root, ".limen/last-sweep");
	await waitUntilAsync(() =>
		readFile(stamp, "utf8")
			.then((value) => value.includes("coordinator-stamp"))
			.catch(() => false),
	);
	const first = await readFile(stamp, "utf8");
	assert.ok(Number.isFinite(Date.parse(first.split("\n")[0] ?? "")));
	handlers.get("session_shutdown")?.({}, session);
});

test("a stop-marked session receives no completion wake", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-wake-stop-echo-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const messages: string[] = [];
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage(content) {
			messages.push(content);
		},
	});
	const session = { cwd: root, isIdle: () => true, sessionManager: sessionManager("coordinator-a"), ui: { notify() {}, setStatus() {} } };
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	await mkdir(join(jobs, "ended"), { recursive: true });
	await writeFile(join(jobs, "ended/label"), "F055 ended\n");
	await writeFile(join(jobs, "ended/branch"), "limen/ended\n");
	await subscribe(jobs, "ended", "coordinator-a");
	await mkdir(join(jobs, "ended/notify/delivered/coordinator-a"), { recursive: true });
	await writeFile(join(jobs, "ended/result"), "handoff from the worker\n");
	await writeFile(join(jobs, "ended/state"), "done\n");
	await new Promise((resolve) => setTimeout(resolve, 200));
	assert.equal(messages.length, 0);
	await subscribe(jobs, "ended", "coordinator-b");
	const other = new Map<string, (event: unknown, context: TestContext) => void>();
	const otherMessages: string[] = [];
	limenWake({
		on(event, handler) {
			other.set(event, handler);
		},
		sendUserMessage(content) {
			otherMessages.push(content);
		},
	});
	const sessionB = { cwd: root, isIdle: () => true, sessionManager: sessionManager("coordinator-b"), ui: { notify() {}, setStatus() {} } };
	other.get("session_start")?.({}, sessionB);
	context.after(() => other.get("session_shutdown")?.({}, sessionB));
	await waitUntil(() => otherMessages.length === 1);
	assert.match(otherMessages[0] ?? "", /Final message:\nhandoff from the worker/);
	assert.equal(messages.length, 0);
});

test("fallback waits out the grace window and skips sessions that own no jobs", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	stashEnv(context, "LIMEN_WAKE_FALLBACK_MS", "60000");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-wake-grace-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const handlersA = new Map<string, (event: unknown, context: TestContext) => void>();
	const handlersB = new Map<string, (event: unknown, context: TestContext) => void>();
	const handlersC = new Map<string, (event: unknown, context: TestContext) => void>();
	const messagesA: string[] = [];
	const messagesB: string[] = [];
	const messagesC: string[] = [];
	for (const [handlers, messages] of [
		[handlersA, messagesA],
		[handlersB, messagesB],
		[handlersC, messagesC],
	] as const) {
		limenWake({
			on(event, handler) {
				handlers.set(event, handler);
			},
			sendUserMessage(content) {
				messages.push(content);
			},
		});
	}
	const sessionA = { cwd: root, isIdle: () => false, sessionManager: sessionManager("coordinator-a"), ui: { notify() {}, setStatus() {} } };
	const sessionB = { cwd: root, isIdle: () => true, sessionManager: sessionManager("coordinator-b"), ui: { notify() {}, setStatus() {} } };
	const sessionC = { cwd: root, isIdle: () => true, sessionManager: sessionManager("coordinator-c"), ui: { notify() {}, setStatus() {} } };
	handlersA.get("session_start")?.({}, sessionA);
	handlersB.get("session_start")?.({}, sessionB);
	handlersC.get("session_start")?.({}, sessionC);
	context.after(() => {
		handlersA.get("session_shutdown")?.({}, sessionA);
		handlersB.get("session_shutdown")?.({}, sessionB);
		handlersC.get("session_shutdown")?.({}, sessionC);
	});
	await mkdir(join(jobs, "mine"), { recursive: true });
	await writeFile(join(jobs, "mine/label"), "F056 mine\n");
	await writeFile(join(jobs, "mine/branch"), "limen/mine\n");
	await subscribe(jobs, "mine", "coordinator-a");
	await writeFile(join(jobs, "mine/state"), "running\n");
	await mkdir(join(jobs, "other"), { recursive: true });
	await writeFile(join(jobs, "other/label"), "F056 other\n");
	await writeFile(join(jobs, "other/branch"), "limen/other\n");
	await subscribe(jobs, "other", "coordinator-b");
	await writeFile(join(jobs, "other/state"), "running\n");
	await writeFile(join(jobs, "mine/state"), "done\n");
	await waitUntil(() => messagesA.some((message) => message.includes("is done (mine)")));
	await new Promise((resolve) => setTimeout(resolve, 250));
	assert.equal(messagesB.filter((message) => message.includes("is done (mine)")).length, 0, "an idle helper must not take fallback inside the grace window");
	assert.equal(messagesC.length, 0);
	await mkdir(join(jobs, "orphan"), { recursive: true });
	await writeFile(join(jobs, "orphan/label"), "F056 orphan\n");
	await writeFile(join(jobs, "orphan/branch"), "limen/orphan\n");
	await subscribe(jobs, "orphan", "closed-session");
	await writeFile(join(jobs, "orphan/finished-at"), "2000-01-01T00:00:00.000Z\n");
	await writeFile(join(jobs, "orphan/state"), "done\n");
	await waitUntil(() => messagesB.some((message) => message.includes("is done (orphan)")));
	assert.match(messagesB.find((message) => message.includes("is done (orphan)")) ?? "", /subscribed coordinator is busy/);
	assert.equal(messagesC.filter((message) => message.includes("is done (orphan)")).length, 0, "a session with no subscriber or watch record must not take fallback");
});

test("a wake opens with label and task and ends with the instruction", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(process.env.TMPDIR ?? "/tmp", "limen-wake-order-text-")));
	context.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs");
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const messages: string[] = [];
	limenWake({
		on(event, handler) {
			handlers.set(event, handler);
		},
		sendUserMessage(content) {
			messages.push(content);
		},
	});
	const session = { cwd: root, isIdle: () => true, sessionManager: sessionManager("coordinator-a"), ui: { notify() {}, setStatus() {} } };
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	await mkdir(join(jobs, "order"), { recursive: true });
	await writeFile(join(jobs, "order/label"), "F056 order\n");
	await writeFile(join(jobs, "order/branch"), "limen/order\n");
	await writeFile(join(jobs, "order/task.md"), "Implement the routing truth. Then inspect the rest of the ticket.\n");
	await writeFile(join(jobs, "order/commits"), "abc1234 routing work\n");
	await writeFile(join(jobs, "order/result"), "worker final\n");
	await subscribe(jobs, "order", "coordinator-a");
	await writeFile(join(jobs, "order/state"), "done\n");
	await waitUntil(() => messages.length === 1);
	const wake = messages[0] ?? "";
	const labelAt = wake.indexOf("F056 order");
	const taskAt = wake.indexOf("Implement the routing truth.");
	const stateAt = wake.indexOf("is done (order)");
	const commitsAt = wake.indexOf("Commits:");
	const excerptAt = wake.indexOf("Final message:");
	const instructionAt = wake.indexOf("Inspect the job record");
	assert.ok(
		labelAt >= 0 && labelAt < taskAt && taskAt < stateAt && stateAt < commitsAt && commitsAt < excerptAt && excerptAt < instructionAt,
		"label, task sentence, state, commits, excerpt, then instruction",
	);
	assert.doesNotMatch(wake, /Then inspect the rest of the ticket/);
	emitWakeTurn(handlers, session, wake);
	await new Promise((resolve) => setTimeout(resolve, 650));
	assert.equal(messages.length, 1, "two sweeps cannot deliver one completion twice to one session");
});

test("standing uncertainty waits one minute and delivers once across transitions and listener restart; real failure and completion still deliver", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const root = await mkdtemp(join(tmpdir(), "limen-uncertainty-wake-"));
	context.after(() => rm(root, { recursive: true, force: true }));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs"),
		job = join(jobs, "uncertain");
	await mkdir(job, { recursive: true });
	await writeFile(join(job, "label"), "ownership proof\n");
	await writeFile(join(job, "state"), "running\n");
	await subscribe(jobs, "uncertain", "coordinator-a");
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const messages: Array<{ content: string; deliverAs?: string }> = [];
	limenWake({
		on: (event, handler) => handlers.set(event, handler),
		sendUserMessage(content, options) {
			messages.push({ content, ...(options ? { deliverAs: options.deliverAs } : {}) });
		},
	});
	const session = { cwd: root, isIdle: () => true, sessionManager: sessionManager("coordinator-a"), ui: { notify() {}, setStatus() {} } };
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	const since = Date.now();
	await writeFile(join(job, "ownership-uncertainty"), JSON.stringify({ since, root: true, child: false }));
	await new Promise((resolve) => setTimeout(resolve, 650));
	assert.equal(messages.length, 0, "transient observations do not wake");
	const standing = since - 61_000;
	await writeFile(join(job, "ownership-uncertainty"), JSON.stringify({ since: standing, root: true, child: false }));
	await waitUntil(() => messages.length === 1);
	assert.match(messages[0]!.content, /ownership observation unavailable/);
	assert.doesNotMatch(messages[0]!.content, /is idle/);
	assert.equal(messages[0]!.deliverAs, undefined, "uncertainty never enters followUp");
	emitWakeTurn(handlers, session, messages[0]!.content);
	await waitUntilAsync(async () => (await readFile(join(job, "notify/delivered/_uncertainty.coordinator-a/accepted"), "utf8").catch(() => "")) === "1\n");
	for (let i = 0; i < 20; i++) {
		await writeFile(join(job, "activity"), i % 2 ? "think\n" : "tool\n");
		await writeFile(join(job, "ownership-uncertainty"), JSON.stringify({ since: standing, root: Boolean(i % 2), child: true }));
	}
	handlers.get("session_shutdown")?.({}, session);
	handlers.get("session_start")?.({}, session);
	await new Promise((resolve) => setTimeout(resolve, 650));
	assert.equal(messages.length, 1, "one standing condition stays heard after reload");
	await writeFile(join(job, "advisory"), "errored: last turn failed with error: real failure, session still open\n");
	await waitUntil(() => messages.length === 2);
	assert.match(messages[1]!.content, /real failure/);
	emitWakeTurn(handlers, session, messages[1]!.content);
	await writeFile(join(job, "state"), "failed\n");
	await waitUntil(() => messages.length === 3);
	assert.match(messages[2]!.content, /is failed/);
});

test("uncertainty does not queue into a busy recipient or consume failure and completion attempts", async (context) => {
	stashEnv(context, "LIMEN_JOB", undefined);
	stashEnv(context, "LIMEN_HERDR", "0");
	const root = await mkdtemp(join(tmpdir(), "limen-uncertainty-busy-"));
	context.after(() => rm(root, { recursive: true, force: true }));
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	const jobs = join(root, ".limen/jobs"),
		job = join(jobs, "busy");
	await mkdir(join(job, "notify/unconfirmed"), { recursive: true });
	await writeFile(join(job, "notify/unconfirmed/_uncertainty"), "1\n1\n");
	await subscribe(jobs, "busy", "coordinator-a");
	await writeFile(join(job, "state"), "running\n");
	await writeFile(join(job, "ownership-uncertainty"), JSON.stringify({ since: Date.now() - 61_000, root: true, child: false }));
	const handlers = new Map<string, (event: unknown, context: TestContext) => void>();
	const messages: string[] = [];
	let idle = false;
	limenWake({
		on: (event, handler) => handlers.set(event, handler),
		sendUserMessage(content) {
			messages.push(content);
		},
	});
	const session = { cwd: root, isIdle: () => idle, sessionManager: sessionManager("coordinator-a"), ui: { notify() {}, setStatus() {} } };
	handlers.get("session_start")?.({}, session);
	context.after(() => handlers.get("session_shutdown")?.({}, session));
	await new Promise((resolve) => setTimeout(resolve, 650));
	assert.equal(messages.length, 0);
	idle = true;
	handlers.get("agent_settled")?.({}, session);
	await new Promise((resolve) => setTimeout(resolve, 650));
	assert.equal(messages.length, 0, "exhausted uncertainty stays stopped");
	await writeFile(join(job, "advisory"), "blocked after 3 tool calls, session still open\n");
	await waitUntil(() => messages.length === 1);
	assert.match(messages[0]!, /blocked/);
	emitWakeTurn(handlers, session, messages[0]!);
	await rm(join(job, "advisory"));
	idle = false;
	await rm(join(job, "notify/unconfirmed/_uncertainty"));
	await new Promise((resolve) => setTimeout(resolve, 650));
	assert.equal(messages.length, 1, "busy uncertainty is not accepted or queued");
	await writeFile(join(job, "state"), "done\n");
	await waitUntil(() => messages.length === 2);
	idle = true;
	emitWakeTurn(handlers, session, messages[1]!);
	await new Promise((resolve) => setTimeout(resolve, 650));
	assert.equal(messages.length, 2, "busy-to-terminal has no stale running wake");
	assert.match(messages[1]!, /is done/);
});

function emitWakeTurn(handlers: Map<string, (event: unknown, context: TestContext) => void>, session: TestContext, content: string, stopReason = "stop"): void {
	const user = { role: "user", content: [{ type: "text", text: content }] };
	handlers.get("message_start")?.({ message: user }, session);
	handlers.get("message_end")?.({ message: { role: "assistant", content: [{ type: "text", text: "acknowledged" }], stopReason } }, session);
	handlers.get("agent_settled")?.({}, session);
}

function sessionManager(id: string): { getSessionId(): string } {
	return { getSessionId: () => id };
}

async function subscribe(jobs: string, id: string, session: string): Promise<void> {
	await mkdir(join(jobs, id, "notify/subscribers"), { recursive: true });
	await writeFile(join(jobs, id, `notify/subscribers/${session}`), "1\n");
	await writeFile(join(jobs, id, "notify/ready"), "1\n");
}

async function waitUntil(predicate: () => boolean): Promise<void> {
	const deadline = Date.now() + 3_000;
	while (!predicate() && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 20));
	assert.ok(predicate(), "timed out waiting for wake event");
}
