import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test, { type TestContext } from "node:test";
import groupPeer from "../hook/group-peer.ts";
import type { GroupRun } from "../src/job/group-cabinet.ts";
import { groupPath, saveJson } from "../src/job/group-cabinet.ts";
import { git, scratchRepo } from "./scratch.ts";

type Handler = (event: never, context: never) => unknown;
type Request = { url: string; body: Record<string, string> };
const FEATURE = "spec/features/active/F900-example";

// The real sender runs with fetch intercepted, so each test sees the exact payload a receiver would.
async function fixture(context: TestContext, options: { env?: NodeJS.ProcessEnv; config?: boolean; brief?: string } = {}) {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	const parent = dirname(scratch.root);
	await mkdir(join(scratch.root, FEATURE, "group"), { recursive: true });
	await writeFile(join(scratch.root, FEATURE, "ticket.md"), "# F900 · example\n");
	await writeFile(join(scratch.root, FEATURE, "group/brief.md"), options.brief ?? "# brief\n");
	git(scratch.root, "add", ".");
	git(scratch.root, "commit", "-q", "-m", "group packet");
	const capture = join(parent, "requests.jsonl");
	const preload = join(parent, "transport.mjs");
	await writeFile(
		preload,
		`import { appendFileSync } from 'node:fs';
globalThis.fetch = async (url, options) => {
  appendFileSync(${JSON.stringify(capture)}, JSON.stringify({ url: String(url), body: JSON.parse(options.body) }) + '\\n');
  return { status: 204 };
};
`,
	);
	await mkdir(join(scratch.root, ".limen"), { recursive: true });
	if (options.config !== false)
		await writeFile(
			join(scratch.root, ".limen/finish-webhook.env"),
			"LIMEN_FINISH_WEBHOOK_URL='https://synthetic.example.invalid/finish'\nLIMEN_FINISH_WEBHOOK_AUTH='Bearer synthetic-only'\n",
			{ mode: 0o600 },
		);
	const run: GroupRun = {
		id: randomUUID(),
		root: scratch.root,
		feature: FEATURE,
		lead: "group-lead",
		startedAt: Date.now() - 1_000,
		teams: ["team-1"],
		workersPerTeam: 1,
		engine: "omp",
		provider: "openai-codex",
		model: "gpt-6.1-sol",
		thinking: "xhigh",
		workerThinking: "high",
		deadline: Date.now() + 60_000,
		workerTimeoutMs: 60_000,
		reserveMs: 60_000,
		stopped: false,
		closed: false,
		mode: "detached",
		members: [],
	};
	await mkdir(groupPath(run), { recursive: true });
	await saveJson(`${groupPath(run)}/run.json`, run);
	const env: NodeJS.ProcessEnv = {
		LIMEN_COORDINATOR: "1",
		LIMEN_JOB: undefined,
		LIMEN_GROUP_ID: undefined,
		LIMEN_FINISH_WEBHOOK_ENV: undefined,
		PI_SESSION_ID: undefined,
		NODE_OPTIONS: `--import=${preload}`,
		...options.env,
	};
	const saved = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
	const apply = (values: NodeJS.ProcessEnv) => {
		for (const [key, value] of Object.entries(values))
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
	};
	apply(env);
	context.after(() => apply(saved));
	// One hook instance is one coordinator pane; a second instance is that pane after a reload.
	const pane = async () => {
		const handlers: Record<string, Handler> = {};
		groupPeer({
			on: (name: string, handler: Handler) => {
				handlers[name] = handler;
			},
			sendMessage: () => {},
		} as unknown as Parameters<typeof groupPeer>[0]);
		const ctx = { cwd: scratch.root, sessionManager: { getSessionId: () => run.lead }, ui: { notify: () => {} } };
		context.after(() => handlers.session_shutdown?.({} as never, ctx as never));
		await handlers.session_start?.({} as never, ctx as never);
		return (stopReason = "stop") => handlers.message_end?.({ message: { role: "assistant", stopReason } } as never, ctx as never);
	};
	return {
		root: scratch.root,
		run,
		pane,
		synthesis: (text: string) => writeFile(join(scratch.root, FEATURE, "group/synthesis.md"), text),
		close: () => saveJson(`${groupPath(run)}/run.json`, { ...run, stopped: true, closed: true }),
		requests: async (): Promise<Request[]> =>
			(await readFile(capture, "utf8").catch(() => ""))
				.split("\n")
				.filter(Boolean)
				.map((line) => JSON.parse(line)),
	};
}

test("a lead turn that writes group/synthesis.md sends one finish webhook naming the feature and the lead step", async (context) => {
	const f = await fixture(context);
	const turn = await f.pane();
	await f.synthesis("# Synthesis\n\nTeam 2 wins.\n");
	await turn("toolUse");
	assert.deepEqual(await f.requests(), [], "a mid-turn assistant message is not the end of the lead turn");
	await turn();
	const requests = await f.requests();
	assert.equal(requests.length, 1);
	const body = requests[0]?.body ?? {};
	assert.equal(requests[0]?.url, "https://synthetic.example.invalid/finish");
	assert.equal(body.job, "F900 lead synthesis");
	assert.equal(body.status, "waiting");
	assert.equal(body.jobState, "done");
	assert.equal(body.branch, git(f.root, "symbolic-ref", "--short", "HEAD"));
	assert.match(body.finishEvent ?? "", /^limen-finish-[a-f0-9]{64}$/);
	assert.equal(body.handoff, "Lead step done: F900 lead synthesis. Next step: owner decision on group/synthesis.md, or close the group.");
});

test("a second idle turn with no file change sends nothing, even after the pane reloads", async (context) => {
	const f = await fixture(context);
	const turn = await f.pane();
	await f.synthesis("# Synthesis\n");
	await turn();
	await turn();
	assert.equal((await f.requests()).length, 1);
	const reloaded = await f.pane();
	await reloaded();
	assert.equal((await f.requests()).length, 1);
	await f.synthesis("# Synthesis\n\nRevised after owner review.\n");
	await reloaded();
	assert.deepEqual(
		(await f.requests()).map((request) => request.body.job),
		["F900 lead synthesis", "F900 lead synthesis"],
		"a changed synthesis is a new group step",
	);
});

test("a turn that closes the group sends one notice", async (context) => {
	const f = await fixture(context);
	const turn = await f.pane();
	await f.close();
	await turn();
	await turn();
	const requests = await f.requests();
	assert.equal(requests.length, 1);
	assert.equal(requests[0]?.body.job, "F900 lead close");
	assert.equal(requests[0]?.body.handoff, "Lead step done: F900 lead close. Next step: owner decision.");
	assert.match(await readFile(join(groupPath(f.run), "lead-steps", `${f.run.id}-close`, "finish-webhook"), "utf8"), /^accepted: sender exited 0/);
});

test("a hosted job with the same file change sends nothing from the lead path", async (context) => {
	const f = await fixture(context, { env: { LIMEN_JOB: "1" } });
	const turn = await f.pane();
	await f.synthesis("# Synthesis\n");
	await turn();
	await f.close();
	await turn();
	assert.deepEqual(await f.requests(), []);
	assert.equal(existsSync(join(groupPath(f.run), "lead-steps")), false);
});

test("a feature whose packet says do not land never gets a land-it handoff", async (context) => {
	const f = await fixture(context, { brief: "# Brief\n\n- Do not land. Commit notes only on your job branch.\n" });
	const turn = await f.pane();
	await f.synthesis("# Synthesis\n");
	await turn();
	await f.close();
	await turn();
	const handoffs = (await f.requests()).map((request) => request.body.handoff ?? "");
	assert.equal(handoffs.length, 2);
	for (const handoff of handoffs) {
		assert.doesNotMatch(handoff, /land it/i);
		assert.match(handoff, /^Lead step done: F900 lead (synthesis|close)\. Next step: owner decision.*\. The feature says do not land\.$/);
	}
});

test("a project without .limen/finish-webhook.env sends nothing and records no receipt", async (context) => {
	const f = await fixture(context, { config: false });
	const turn = await f.pane();
	await f.synthesis("# Synthesis\n");
	await turn();
	await f.close();
	await turn();
	assert.deepEqual(await f.requests(), []);
	assert.equal(existsSync(join(groupPath(f.run), "lead-steps")), false);
});
