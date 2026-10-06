// F925 old suite, frozen at 175 lines. Delete this file when its replacement lands; never add to it.
import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { acceptGithubComment, pollGithubIssues } from "../src/integrations/github-poller.ts";
import { claimPath, type GithubBinding, type GithubClaim } from "../src/integrations/github-review.ts";
import { git, LIMEN, limen, scratchRepo } from "./scratch.ts";

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
