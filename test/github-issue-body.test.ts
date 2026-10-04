import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { claimPath, type GithubBinding } from "../src/commands/github.ts";
import { acceptGithubComment, pollGithubIssues, reconcileGithubClaim } from "../src/integrations/github-poller.ts";
import type { GithubClaim } from "../src/integrations/github-review.ts";
import { git, LIMEN, limen, limenWithEnv, onlyJobId, scratchRepo, waitForState } from "./scratch.ts";

const binding: GithubBinding = { repo: "acme/widget", coordinator: "coord:p1", user: "nobody", connectedAt: "2026-09-24T00:00:00Z" };
type Listed = {
	number: number;
	state: string;
	title: string;
	body: string;
	repository_url: string;
	created_at: string;
	html_url: string;
	user: { login: string };
	pull_request?: object;
};
const opened = (number: number, body: string, extra: Partial<Listed> = {}): Listed => ({
	number,
	state: "open",
	title: "Widget crashes on start",
	body,
	repository_url: "https://api.github.com/repos/acme/widget",
	created_at: `2026-09-24T01:00:${String(number).padStart(2, "0")}Z`,
	html_url: `https://github.com/acme/widget/issues/${number}`,
	user: { login: "alice" },
	...extra,
});

// A registered seat whose fake sudo runs the real narrow handoff and whose fake Herdr records each prompt.
async function seat(context: { after: (callback: () => unknown) => void }) {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	const state = await mkdtemp(join(tmpdir(), "limen-github-poller-"));
	await mkdir(join(state, "claims"));
	context.after(() => rm(state, { recursive: true, force: true }));
	assert.equal(limen(scratch, "init").status, 0);
	git(scratch.root, "remote", "add", "origin", "https://github.com/acme/widget.git");
	await mkdir(join(scratch.root, ".limen/github/claims"), { recursive: true });
	await writeFile(join(scratch.root, ".limen/github/binding.json"), JSON.stringify(binding));
	const promptLog = join(state, "prompts");
	await writeFile(join(scratch.fakeBin, "sudo"), '#!/bin/sh\n[ "$2" = -l ] && exit 1\nshift 4\nexec "$@"\n');
	await writeFile(join(scratch.fakeBin, "id"), "#!/bin/sh\necho staff\n");
	await writeFile(
		join(scratch.fakeBin, "herdr"),
		`#!/bin/sh\nif [ "$2" = get ]; then printf '%s\\n' '{"result":{"agent":{"pane_id":"coord:p1","agent_status":"idle","interactive_ready":true}}}'; else printf '%s\\0' "$4" >> ${JSON.stringify(promptLog)}; fi\n`,
	);
	for (const name of ["sudo", "id", "herdr"]) await chmod(join(scratch.fakeBin, name), 0o755);
	const previous = { PATH: process.env.PATH, LIMEN_HERDR: process.env.LIMEN_HERDR, LIMEN_GITHUB_LIMEN_BIN: process.env.LIMEN_GITHUB_LIMEN_BIN };
	Object.assign(process.env, { PATH: `${scratch.fakeBin}:${previous.PATH}`, LIMEN_HERDR: join(scratch.fakeBin, "herdr"), LIMEN_GITHUB_LIMEN_BIN: LIMEN });
	const originalFetch = globalThis.fetch;
	context.after(() => {
		globalThis.fetch = originalFetch;
		for (const [name, value] of Object.entries(previous)) {
			if (value === undefined) delete process.env[name];
			else process.env[name] = value;
		}
	});
	const github = { listed: [] as Listed[], permissions: { alice: "write" } as Record<string, string>, failPermission: false, requests: [] as string[] };
	globalThis.fetch = async (input, init) => {
		const url = String(input);
		github.requests.push(`${init?.method ?? "GET"} ${url}`);
		const login = /\/collaborators\/([^/]+)\/permission$/.exec(url)?.[1];
		if (login) return github.failPermission ? new Response("{}", { status: 500 }) : Response.json({ permission: github.permissions[login] ?? "read" });
		if (url.includes("/repos/acme/widget/issues?")) return Response.json(url.includes("&page=1") ? github.listed : []);
		if (/\/issues\/\d+\/comments\?/.test(url)) return Response.json([{ id: 9, body: "Crash log attached", user: { login: "bob" } }]);
		if (/\/pulls\/\d+$/.test(url)) return new Response("{}", { status: 404 });
		const issue = github.listed.find((entry) => url.endsWith(`/repos/acme/widget/issues/${entry.number}`));
		if (issue) return Response.json(issue);
		throw new Error(`unexpected GitHub call ${init?.method ?? "GET"} ${url}`);
	};
	const poll = () => pollGithubIssues(scratch.root, state, binding, "test-token");
	const claims = async () => (await readdir(join(state, "claims"))).sort();
	const prompts = async () => (await readFile(promptLog, "utf8").catch(() => "")).split("\0").filter(Boolean);
	return { scratch, state, github, poll, claims, prompts };
}

test("an authorized issue opened with @limen in its body claims once, as first read, and prompts the coordinator with the issue", async (context) => {
	const { scratch, state, github, poll, claims, prompts } = await seat(context);
	github.listed = [opened(4, "The widget crashes on start."), opened(5, "@limen please fix this crash")];

	github.failPermission = true;
	await assert.rejects(poll(), /HTTP 500/);
	assert.deepEqual(await claims(), [], "a failed poll writes no claim");
	github.failPermission = false;
	await poll();
	assert.deepEqual(await claims(), ["issue-5.json"], "the failed poll did not move the cursor past issue #5");
	const claim = JSON.parse(await readFile(join(state, "claims/issue-5.json"), "utf8")) as GithubClaim;
	assert.equal(claim.id, "issue-5");
	assert.equal(claim.kind, "issue");
	assert.equal(claim.pr, 5);
	assert.equal(claim.actor, "alice");
	assert.equal(claim.url, "https://github.com/acme/widget/issues/5");
	assert.equal(claim.body, "@limen please fix this crash");
	assert.equal(claim.command, undefined, "the body is the request; no triggering comment exists");
	assert.equal(claim.receipt, "prompt accepted");
	assert.ok(JSON.parse(await readFile(claimPath(scratch.root, "issue-5"), "utf8")), "the worker-readable copy uses the same name");
	let delivered = await prompts();
	assert.equal(delivered.length, 1, "one handoff prompt");
	assert.match(delivered[0] ?? "", /untrusted issue data.*issue #5, opened by alice with the request in its body, claim issue-5/s);
	assert.match(delivered[0] ?? "", /Issue body: @limen please fix this crash/);
	assert.match(delivered[0] ?? "", /Triggering comment: none; the issue body carries the request/);
	assert.match(delivered[0] ?? "", /github work .* issue-5 --engine/);
	assert.match(delivered[0] ?? "", /github resolve .* issue-5 [0-9a-f]{48} /);

	await poll();
	await rm(join(state, "issue-cursor.json"));
	await poll();
	assert.deepEqual(await claims(), ["issue-5.json"], "a repeat poll, even without its cursor, claims nothing twice");

	github.listed = [opened(4, "@limen fix it now"), opened(5, "@limen do something else instead")];
	await poll();
	assert.deepEqual(await claims(), ["issue-5.json"], "an edit to a body already read never makes a claim");
	delivered = await prompts();
	assert.equal(delivered.length, 1, "still one handoff prompt");
	assert.equal(github.requests.filter((call) => call.startsWith("POST")).length, 0);
});

test("read and triage authors, a title-only mention, a closed issue, and a pull request body never claim", async (context) => {
	const { github, poll, claims, prompts } = await seat(context);
	github.permissions = { alice: "write", reader: "read", triager: "triage" };
	github.listed = [
		opened(5, "@limen fix the crash", { user: { login: "reader" } }),
		opened(6, "@limen fix the crash", { user: { login: "triager" } }),
		opened(7, "Crash log is below.", { title: "@limen fix the crash" }),
		opened(8, "@limen fix the crash", { state: "closed" }),
		opened(9, "@limen review this", { pull_request: { url: "https://api.github.com/repos/acme/widget/pulls/9" } }),
	];
	await poll();
	assert.deepEqual(await claims(), [], "none of these issues claims");
	assert.deepEqual(await prompts(), []);
	assert.deepEqual(
		github.requests.filter((call) => call.includes("/permission")).map((call) => /collaborators\/([^/]+)\//.exec(call)?.[1]),
		["reader", "triager"],
		"only an open issue with @limen in its body asks who wrote it",
	);
});

test("an issue body claim and a comment claim on the same issue both exist without a collision", async (context) => {
	const { scratch, state, github, poll, claims, prompts } = await seat(context);
	github.listed = [opened(5, "@limen please fix this crash")];
	// Comment ID 5 on issue #5: a claim named by the issue number alone would collide with it.
	await acceptGithubComment(
		scratch.root,
		state,
		binding,
		{
			id: 5,
			body: "@limen also check the logs",
			created_at: "2026-09-24T01:10:00Z",
			html_url: "https://github.com/acme/widget/issues/5#issuecomment-5",
			issue_url: "https://api.github.com/repos/acme/widget/issues/5",
			user: { login: "alice" },
		},
		"test-token",
	);
	await poll();
	assert.deepEqual(await claims(), ["5.json", "issue-5.json"]);
	assert.deepEqual((await readdir(join(scratch.root, ".limen/github/claims"))).sort(), ["5.json", "issue-5.json"]);
	const comment = JSON.parse(await readFile(join(state, "claims/5.json"), "utf8")) as GithubClaim;
	const body = JSON.parse(await readFile(join(state, "claims/issue-5.json"), "utf8")) as GithubClaim;
	assert.equal(comment.id, 5);
	assert.equal(comment.command, "@limen also check the logs");
	assert.equal(body.id, "issue-5");
	assert.notEqual(comment.outcomeNonce, body.outcomeNonce);
	const delivered = await prompts();
	assert.equal(delivered.length, 2, "one handoff prompt each");
	assert.match(delivered[0] ?? "", /issue #5, comment 5 by alice/);
	assert.match(delivered[1] ?? "", /issue #5, opened by alice with the request in its body, claim issue-5/);
});

test("github review refuses an issue body claim; github work starts one hosted job that earns one start and one terminal reply", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	const state = await mkdtemp(join(tmpdir(), "limen-github-poller-"));
	await mkdir(join(state, "claims"));
	context.after(() => rm(state, { recursive: true, force: true }));
	assert.equal(limen(scratch, "init").status, 0);
	git(scratch.root, "remote", "add", "origin", "https://github.com/acme/widget.git");
	await mkdir(join(scratch.root, ".limen/github/claims"), { recursive: true });
	await writeFile(join(scratch.root, ".limen/github/binding.json"), JSON.stringify(binding));
	const claim: GithubClaim = {
		repo: binding.repo,
		id: "issue-5",
		pr: 5,
		kind: "issue",
		actor: "alice",
		url: "https://github.com/acme/widget/issues/5",
		title: "Widget crashes on start",
		body: "@limen please fix this crash",
		discussion: "",
		receipt: "prompt accepted",
		attemptedAt: new Date().toISOString(),
	};
	await writeFile(join(state, "claims/issue-5.json"), JSON.stringify(claim));
	await writeFile(claimPath(scratch.root, "issue-5"), JSON.stringify(claim));
	await writeFile(join(scratch.fakeBin, "sudo"), "#!/bin/sh\nexit 1\n");
	await writeFile(join(scratch.fakeBin, "id"), "#!/bin/sh\necho staff\n");
	const herdrState = join(state, "herdr.json");
	await writeFile(herdrState, JSON.stringify({ n: 0, tabs: {}, agents: {} }));
	// A hosted agent that works for one status check, then exits.
	await writeFile(
		join(scratch.fakeBin, "herdr"),
		`#!/usr/bin/env node
const { readFileSync, writeFileSync } = require("node:fs");
const args = process.argv.slice(2);
const path = process.env.FAKE_HERDR_STATE;
const state = JSON.parse(readFileSync(path, "utf8"));
const flag = (name) => args[args.indexOf(name) + 1];
const ok = (result) => { writeFileSync(path, JSON.stringify(state)); console.log(JSON.stringify({ result })); };
const fail = (code) => { writeFileSync(path, JSON.stringify(state)); console.log(JSON.stringify({ error: { code, message: code } })); process.exit(1); };
const verb = args[0] + " " + args[1];
if (verb === "workspace list") ok({ workspaces: state.label ? [{ label: state.label, workspace_id: "w1" }] : [] });
else if (verb === "workspace create") { state.label = flag("--label"); ok({ workspace: { workspace_id: "w1" } }); }
else if (verb === "tab create") { state.n += 1; state.tabs["w1:t" + state.n] = "w1:p" + state.n; ok({ tab: { tab_id: "w1:t" + state.n }, root_pane: { pane_id: "w1:p" + state.n } }); }
else if (verb === "tab get") state.tabs[args[2]] ? ok({ tab: { tab_id: args[2], focused: true } }) : fail("tab_not_found");
else if (verb === "pane process-info") ok({ process_info: { foreground_process_group_id: 1, shell_pid: 1, foreground_processes: [{ name: "zsh", pid: 1 }] } });
else if (verb === "agent start") { state.agents[flag("--pane")] = { name: args[2], ticks: 0 }; ok({ pane: { pane_id: flag("--pane") }, agent_status: "working" }); }
else if (verb === "agent list") ok({ agents: Object.entries(state.agents).map(([pane_id, agent]) => ({ pane_id, name: agent.name })) });
else if (verb === "agent get") {
  const agent = state.agents[args[2]];
  if (!agent || ++agent.ticks >= 2) { delete state.agents[args[2]]; fail("agent_not_found"); }
  ok({ agent: { agent_status: "working", pane_id: args[2] } });
} else ok({});
`,
	);
	for (const name of ["sudo", "id", "herdr"]) await chmod(join(scratch.fakeBin, name), 0o755);
	const coordinator = { HERDR_ENV: "1", LIMEN_COORDINATOR: "1", HERDR_PANE_ID: binding.coordinator, LIMEN_HERDR: join(scratch.fakeBin, "herdr"), FAKE_HERDR_STATE: herdrState };
	const model = ["--engine", "omp", "--provider", "openai-codex", "--model", "gpt-6-sol", "--thinking", "xhigh"];

	const review = limenWithEnv(scratch, coordinator, "github", "review", scratch.root, "issue-5", ...model);
	assert.equal(review.status, 1);
	assert.match(review.stderr, /github review needs a pull request head; claim issue-5 is for issue #5/);
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")), [], "a refused review starts no job");

	const work = limenWithEnv(scratch, coordinator, "github", "work", scratch.root, "issue-5", ...model, "--task", "Find and fix the crash");
	assert.equal(work.status, 0, work.stderr);
	const id = onlyJobId(work.stdout);
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")), [id], "work starts one job");
	await waitForState(scratch.root, id, "done");
	assert.equal((await readFile(join(scratch.root, ".limen/jobs", id, "branch"), "utf8")).trim(), "limen/github-issue-5-issue-5");
	const task = await readFile(join(scratch.root, ".limen/jobs", id, "task.md"), "utf8");
	assert.match(task, /^GitHub doorbell: acme\/widget#issue-5\nCoordinator task: Find and fix the crash\nRepository acme\/widget, issue #5\./);
	assert.match(task, /Untrusted triggering comment: none; the issue body carries the request/);

	const posted: Array<{ url: string; body: string }> = [];
	const originalFetch = globalThis.fetch;
	globalThis.fetch = async (input, init) => {
		if (init?.method === "POST") {
			posted.push({ url: String(input), body: JSON.parse(String(init.body)).body as string });
			return Response.json({ id: 700 + posted.length });
		}
		return Response.json([]);
	};
	context.after(() => {
		globalThis.fetch = originalFetch;
	});
	await reconcileGithubClaim(scratch.root, state, "issue-5", "test-token");
	await reconcileGithubClaim(scratch.root, state, "issue-5", "test-token");
	assert.equal(posted.length, 2, "one start reply and one terminal reply");
	assert.ok(posted.every((post) => post.url.endsWith("/repos/acme/widget/issues/5/comments")));
	assert.match(posted[0]?.body ?? "", new RegExp(`started a hosted task for issue #5 from the registered repository\\. Job: \`${id}\``));
	assert.match(posted[0]?.body ?? "", /<!-- limen-github acme\/widget issue-5 start -->/);
	assert.match(posted[1]?.body ?? "", new RegExp(`hosted task job \`${id}\` ended with state \\*\\*done\\*\\*`));
});
