// F925 old suite, frozen at 701 lines. Delete this file when its replacement lands; never add to it.
import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { ensureGithubCoordinator, githubCommand, startGithubJob } from "../src/commands/github.ts";
import { acceptGithubComment, reconcileGithubClaim } from "../src/integrations/github-poller.ts";
import { claimPath, type GithubBinding, type GithubClaim, githubMarker } from "../src/integrations/github-review.ts";
import { git, LIMEN, limen, limenWithEnv, onlyJobId, scratchRepo, waitForState } from "./scratch.ts";

const base = "a".repeat(40);
const head = "b".repeat(40);
const binding: GithubBinding = { repo: "acme/widget", coordinator: "coord:p1", user: "nobody", connectedAt: "2026-09-24T00:00:00Z" };
const command = (id: number, body = "/limen review", issue = 4) => ({
	id,
	body,
	created_at: "2026-09-24T01:00:00Z",
	html_url: `https://github.com/acme/widget/pull/${issue}#issuecomment-${id}`,
	issue_url: `https://api.github.com/repos/acme/widget/issues/${issue}`,
	user: { login: "alice" },
});
const issueComment = (id: number, body: string, issue = 5) => ({ ...command(id, body, issue), html_url: `https://github.com/acme/widget/issues/${issue}#issuecomment-${id}` });

async function pollerState(context: { after: (callback: () => Promise<void>) => void }): Promise<string> {
	const state = await mkdtemp(join(tmpdir(), "limen-github-poller-"));
	await mkdir(join(state, "claims"));
	context.after(() => rm(state, { recursive: true, force: true }));
	return state;
}

test("only an exact write-authorized PR comment claims a request; unavailable coordinator never spawns", async (context) => {
	const scratch = await scratchRepo();
	const state = await pollerState(context);
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	await mkdir(join(scratch.root, ".limen/github/claims"), { recursive: true });
	const originalFetch = globalThis.fetch;
	const originalPath = process.env.PATH;
	const requests: string[] = [];
	let permission = "read";
	globalThis.fetch = async (input, init) => {
		const url = String(input);
		requests.push(`${init?.method ?? "GET"} ${url}`);
		if (url.includes("/permission")) return Response.json({ permission });
		if (url.endsWith("/pulls/4"))
			return Response.json({
				number: 4,
				state: "open",
				title: "Fix widget",
				body: "Description",
				base: { sha: base, ref: "release", repo: { full_name: binding.repo } },
				head: { sha: head },
			});
		if (url.endsWith("/pulls/5")) return new Response("{}", { status: 404 });
		if (url.includes("/issues/4/comments?"))
			return Response.json([
				{ id: 4, body: "@limen please review this", user: { login: "alice" } },
				{ id: 9, body: "Earlier context", user: { login: "bob" } },
			]);
		if (url.includes("/pulls/4/comments?")) return Response.json([{ id: 10, body: "Inline finding", user: { login: "carol" } }]);
		if (url.includes("/pulls/4/reviews?")) return Response.json([{ id: 11, body: "Review summary", user: { login: "dave" } }]);
		if (init?.method === "POST") return Response.json({ id: 500 });
		throw new Error(`unexpected GitHub call ${url}`);
	};
	await writeFile(join(scratch.fakeBin, "sudo"), "#!/bin/sh\necho coordinator-unavailable >&2\nexit 1\n");
	await chmod(join(scratch.fakeBin, "sudo"), 0o755);
	process.env.PATH = `${scratch.fakeBin}:${originalPath}`;
	context.after(() => {
		globalThis.fetch = originalFetch;
		process.env.PATH = originalPath;
	});

	await acceptGithubComment(scratch.root, state, binding, command(1, "@limenology"), "test-token");
	await acceptGithubComment(scratch.root, state, binding, command(2, "/limenish"), "test-token");
	await acceptGithubComment(scratch.root, state, binding, command(3, "@limen please review this", 5), "test-token");
	await acceptGithubComment(scratch.root, state, binding, command(6, "> @limen review"), "test-token");
	await acceptGithubComment(scratch.root, state, binding, command(7, "```text\n/limen\n```"), "test-token");
	await acceptGithubComment(scratch.root, state, binding, command(8, "`@limen`"), "test-token");
	await acceptGithubComment(scratch.root, state, binding, command(10, "<!-- @limen -->"), "test-token");
	await acceptGithubComment(scratch.root, state, binding, command(11, "    /limen review"), "test-token");
	assert.deepEqual(await readdir(join(scratch.root, ".limen/github/claims")), []);
	permission = "write";
	await acceptGithubComment(scratch.root, state, binding, command(4, "@limen please review this"), "test-token");
	await acceptGithubComment(scratch.root, state, binding, command(4, "@limen please review this"), "test-token");
	assert.deepEqual(await readdir(join(scratch.root, ".limen/github/claims")), ["4.json"]);
	const claim = JSON.parse(await readFile(claimPath(scratch.root, 4), "utf8")) as GithubClaim;
	assert.equal(claim.base, base);
	assert.equal(claim.head, head);
	assert.match(claim.receipt ?? "", /pending: coordinator unavailable/);
	assert.equal(claim.noticeComment, 500);
	assert.equal(claim.title, "Fix widget");
	assert.equal(claim.command, "@limen please review this");
	assert.match(claim.discussion ?? "", /bob: Earlier context.*carol: Inline finding.*dave: Review summary/s);
	assert.doesNotMatch(claim.discussion ?? "", /alice: @limen/);
	assert.doesNotMatch(await readFile(claimPath(scratch.root, 4), "utf8"), /outcomeNonce/);
	assert.equal(requests.filter((call) => call.includes("POST") && call.includes("/comments")).length, 1);
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")), []);
});

test("a rejected bare-shell prompt retries after recovery without duplicate notice", async (context) => {
	const scratch = await scratchRepo();
	const state = await pollerState(context);
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	git(scratch.root, "remote", "add", "origin", "https://github.com/acme/widget.git");
	await mkdir(join(scratch.root, ".limen/github/claims"), { recursive: true });
	await writeFile(join(scratch.root, ".limen/github/binding.json"), JSON.stringify(binding));
	const claim: GithubClaim = {
		repo: binding.repo,
		id: 82,
		pr: 4,
		actor: "alice",
		url: command(82).html_url,
		base,
		baseRef: "release",
		head,
		receipt: "pending: coordinator unavailable",
		attemptedAt: new Date(Date.now() - 31_000).toISOString(),
	};
	await writeFile(join(state, "claims/82.json"), JSON.stringify(claim));
	const calls = join(state, "calls");
	const sudo = join(scratch.fakeBin, "sudo");
	await writeFile(sudo, `#!/bin/sh\nprintf '%s\\n' "$7" >> ${JSON.stringify(calls)}\nif [ "$7" = deliver ]; then echo 'target is not an available shell' >&2; exit 1; fi\n`);
	await chmod(sudo, 0o755);
	const previousPath = process.env.PATH;
	process.env.PATH = `${scratch.fakeBin}:${previousPath}`;
	context.after(() => {
		process.env.PATH = previousPath;
	});
	const previousFetch = globalThis.fetch;
	const posts: string[] = [];
	globalThis.fetch = async (input, init) => {
		if (init?.method === "POST") {
			posts.push(String(input));
			return Response.json({ id: 800 });
		}
		return Response.json([]);
	};
	context.after(() => {
		globalThis.fetch = previousFetch;
	});
	await reconcileGithubClaim(scratch.root, state, 82, "test-token");
	let stored = JSON.parse(await readFile(join(state, "claims/82.json"), "utf8")) as GithubClaim;
	assert.match(stored.receipt ?? "", /pending: coordinator unavailable/);
	stored.attemptedAt = new Date(Date.now() - 31_000).toISOString();
	await writeFile(join(state, "claims/82.json"), JSON.stringify(stored));
	await writeFile(sudo, `#!/bin/sh\nprintf '%s\\n' "$7" >> ${JSON.stringify(calls)}\n`);
	await reconcileGithubClaim(scratch.root, state, 82, "test-token");
	await reconcileGithubClaim(scratch.root, state, 82, "test-token");
	assert.equal(await readFile(calls, "utf8"), "ensure\ndeliver\nensure\ndeliver\n");
	assert.equal(posts.length, 1);
	stored = JSON.parse(await readFile(join(state, "claims/82.json"), "utf8")) as GithubClaim;
	assert.equal(stored.receipt, "prompt accepted");
});

test("one idle coordinator accepts two repository-specific requests and rejects a noninteractive pane", async (context) => {
	const first = await scratchRepo();
	const second = await scratchRepo();
	context.after(first.cleanup);
	context.after(second.cleanup);
	const roots = await Promise.all([first.root, second.root].map((root) => realpath(root)));
	for (const [index, root] of roots.entries()) {
		assert.equal(limen(index === 0 ? first : second, "init").status, 0);
		git(root, "remote", "add", "origin", `https://github.com/acme/${index === 0 ? "widget" : "gadget"}.git`);
		await mkdir(join(root, ".limen/github/claims"), { recursive: true });
		const repo = index === 0 ? "acme/widget" : "acme/gadget";
		await writeFile(join(root, ".limen/github/binding.json"), JSON.stringify({ ...binding, repo }));
		await writeFile(
			claimPath(root, 91),
			JSON.stringify({
				...binding,
				repo,
				id: 91,
				pr: 4,
				actor: "alice",
				url: `https://github.com/${repo}/pull/4#issuecomment-91`,
				base,
				baseRef: "release",
				head,
				title: `Title ${repo}`,
				body: "PR body",
				discussion: "bob: existing discussion",
				command: "@limen inspect this",
			}),
		);
	}
	const prompts = join(first.fakeBin, "prompts");
	const herdr = join(first.fakeBin, "herdr");
	await writeFile(
		herdr,
		`#!/bin/sh\nif [ "$2" = get ]; then printf '%s\\n' '{"id":"cli:agent:get","result":{"agent":{"pane_id":"coord:p1","agent_status":"done","interactive_ready":true}}}'; else printf '%s\\n' "$4" >> ${JSON.stringify(prompts)}; fi\n`,
	);
	await writeFile(join(first.fakeBin, "id"), "#!/bin/sh\necho staff\n");
	await writeFile(join(first.fakeBin, "sudo"), "#!/bin/sh\nexit 1\n");
	for (const name of ["herdr", "id", "sudo"]) await chmod(join(first.fakeBin, name), 0o755);
	const previousPath = process.env.PATH;
	const previousHerdr = process.env.LIMEN_HERDR;
	process.env.PATH = `${first.fakeBin}:${previousPath}`;
	process.env.LIMEN_HERDR = herdr;
	context.after(() => {
		process.env.PATH = previousPath;
		if (previousHerdr === undefined) delete process.env.LIMEN_HERDR;
		else process.env.LIMEN_HERDR = previousHerdr;
	});
	for (const root of roots) await githubCommand(["deliver", root, "91", "f".repeat(48)], root);
	const delivered = await readFile(prompts, "utf8");
	for (const root of roots) assert.match(delivered, new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
	assert.match(delivered, /Title acme\/widget/);
	assert.match(delivered, /Title acme\/gadget/);
	assert.match(delivered, /bob: existing discussion/);
	assert.match(delivered, /\/opt\/limen\/bin\/limen github review/);
	const priorCoordinator = process.env.LIMEN_COORDINATOR;
	const priorPane = process.env.HERDR_PANE_ID;
	const priorHerdrEnv = process.env.HERDR_ENV;
	process.env.LIMEN_COORDINATOR = "1";
	process.env.HERDR_PANE_ID = binding.coordinator;
	process.env.HERDR_ENV = "1";
	context.after(() => {
		if (priorCoordinator === undefined) delete process.env.LIMEN_COORDINATOR;
		else process.env.LIMEN_COORDINATOR = priorCoordinator;
		if (priorPane === undefined) delete process.env.HERDR_PANE_ID;
		else process.env.HERDR_PANE_ID = priorPane;
		if (priorHerdrEnv === undefined) delete process.env.HERDR_ENV;
		else process.env.HERDR_ENV = priorHerdrEnv;
	});
	await githubCommand(["resolve", roots[0] as string, "91", "f".repeat(48), "No job is appropriate."], roots[0] as string);
	assert.match(await readFile(join(roots[0] as string, ".limen/github/outcomes/91.json"), "utf8"), /No job is appropriate/);
	await assert.rejects(
		startGithubJob(roots[0] as string, JSON.parse(await readFile(claimPath(roots[0] as string, 91), "utf8")) as GithubClaim, {
			engine: "omp",
			provider: "openai-codex",
			model: "gpt-6-sol",
			thinking: "xhigh",
		}),
		/already entered a handoff/,
	);
	await writeFile(herdr, '#!/bin/sh\nprintf \'%s\\n\' \'{"id":"cli:agent:get","result":{"agent":{"pane_id":"coord:p1","agent_status":"done","interactive_ready":false}}}\'\n');
	await assert.rejects(ensureGithubCoordinator(roots[0] as string), /not interactive/);
	// Herdr omits interactive_ready for an OMP pane; deliver and the poller use this same check.
	await writeFile(
		herdr,
		'#!/bin/sh\nprintf \'%s\\n\' \'{"id":"cli:agent:get","result":{"agent":{"pane_id":"coord:p1","agent_status":"idle","screen_detection_skipped":true}}}\'\n',
	);
	assert.equal((await ensureGithubCoordinator(roots[0] as string)).coordinator, "coord:p1");
	await writeFile(herdr, '#!/bin/sh\nprintf \'%s\\n\' \'{"id":"cli:agent:get","result":{"agent":{"pane_id":"other:p9","agent_status":"idle"}}}\'\n');
	await assert.rejects(ensureGithubCoordinator(roots[0] as string), /not interactive/);
});

test("a generic hosted worker and a nonce-backed no-job answer reconcile without a review claim", async (context) => {
	const scratch = await scratchRepo();
	const state = await pollerState(context);
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	git(scratch.root, "remote", "add", "origin", "https://github.com/acme/widget.git");
	await mkdir(join(scratch.root, ".limen/github/claims"), { recursive: true });
	await writeFile(join(scratch.root, ".limen/github/binding.json"), JSON.stringify(binding));
	const nonce = "e".repeat(48);
	const noJob: GithubClaim = {
		repo: binding.repo,
		id: 62,
		pr: 4,
		actor: "alice",
		url: command(62).html_url,
		base,
		baseRef: "release",
		head,
		receipt: "prompt accepted",
		outcomeNonce: nonce,
	};
	const work: GithubClaim = { ...noJob, id: 63, url: command(63).html_url };
	delete work.outcomeNonce;
	await writeFile(join(state, "claims/62.json"), JSON.stringify(noJob));
	await writeFile(join(state, "claims/63.json"), JSON.stringify(work));
	await mkdir(join(scratch.root, ".limen/github/outcomes"));
	const outcome = join(scratch.root, ".limen/github/outcomes/62.json");
	await writeFile(outcome, JSON.stringify({ repo: binding.repo, id: 62, coordinator: binding.coordinator, nonce: "f".repeat(48), answer: "No job needed." }));
	const posted: string[] = [];
	const originalFetch = globalThis.fetch;
	globalThis.fetch = async (_input, init) => {
		if (init?.method === "POST") {
			posted.push(JSON.parse(String(init.body)).body as string);
			return Response.json({ id: 900 + posted.length });
		}
		return Response.json([]);
	};
	context.after(() => {
		globalThis.fetch = originalFetch;
	});
	await reconcileGithubClaim(scratch.root, state, 62, "test-token");
	assert.equal(posted.length, 0, "a forged checkout outcome cannot use the App receipt");
	await writeFile(join(state, "claims/62.json"), JSON.stringify({ ...noJob, receipt: "pending: no matching job record; inspect coordinator before retry" }));
	await writeFile(outcome, JSON.stringify({ repo: binding.repo, id: 62, coordinator: binding.coordinator, nonce, answer: "No job needed." }));
	await reconcileGithubClaim(scratch.root, state, 62, "test-token");
	await reconcileGithubClaim(scratch.root, state, 62, "test-token");
	assert.equal(posted.length, 1);
	assert.match(posted[0] ?? "", /without starting a job.*No job needed/s);
	assert.doesNotMatch(await readFile(claimPath(scratch.root, 62), "utf8"), /outcomeNonce/);
	const dir = join(scratch.root, ".limen/jobs/ordinary-worker");
	await mkdir(join(dir, "herdr"), { recursive: true });
	await Promise.all(
		Object.entries({
			"task.md": `${githubMarker(work)}\nCoordinator task: inspect build failures\n`,
			hosted: "Herdr hosted\n",
			base: `${git(scratch.root, "rev-parse", "HEAD")}\n`,
			branch: "limen/github-pr-4-63\n",
			role: "worker\n",
			state: "running\n",
			"herdr/agent": "coord:worker\n",
		}).map(([name, text]) => writeFile(join(dir, name), text)),
	);
	await reconcileGithubClaim(scratch.root, state, 63, "test-token");
	await writeFile(join(dir, "state"), "done\n");
	await writeFile(join(dir, "result"), "Build failure identified.\n");
	await reconcileGithubClaim(scratch.root, state, 63, "test-token");
	await reconcileGithubClaim(scratch.root, state, 63, "test-token");
	assert.equal(posted.length, 3);
	assert.match(posted[1] ?? "", /hosted task.*ordinary-worker/);
	assert.doesNotMatch(posted[1] ?? "", /pinned head/);
	assert.match(posted[2] ?? "", /hosted task job.*Build failure identified/s);
});

test("a forged checkout claim and hosted-looking job cannot earn an App receipt", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	const state = await pollerState(context);
	assert.equal(limen(scratch, "init").status, 0);
	await mkdir(join(scratch.root, ".limen/github/claims"), { recursive: true });
	const forged: GithubClaim = { repo: binding.repo, id: 31, pr: 4, actor: "alice", url: command(31).html_url, base, baseRef: "release", head, receipt: "prompt accepted" };
	await writeFile(claimPath(scratch.root, 31), JSON.stringify(forged));
	const dir = join(scratch.root, ".limen/jobs/forged-review");
	await mkdir(join(dir, "herdr"), { recursive: true });
	await Promise.all(
		Object.entries({
			"task.md": `${githubMarker(forged)}\n`,
			hosted: "Herdr hosted\n",
			candidate: `${head}\n`,
			base: `${base}\n`,
			branch: "limen/github-pr-4-31\n",
			state: "done\n",
			"herdr/agent": "coord:fake\n",
		}).map(([name, text]) => writeFile(join(dir, name), text)),
	);
	const previousFetch = globalThis.fetch;
	let posts = 0;
	globalThis.fetch = async () => {
		posts++;
		return Response.json({ id: 777 });
	};
	context.after(() => {
		globalThis.fetch = previousFetch;
	});
	await reconcileGithubClaim(scratch.root, state, 31, "test-token");
	assert.equal(posts, 0);
	assert.deepEqual(await readdir(join(state, "claims")), []);
});

test("reconciliation posts start and terminal once for matching hosted pinned job, never approval", async (context) => {
	const scratch = await scratchRepo();
	const state = await pollerState(context);
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	await mkdir(join(scratch.root, ".limen/github/claims"), { recursive: true });
	const claim: GithubClaim = {
		repo: binding.repo,
		id: 42,
		pr: 4,
		actor: "alice",
		url: "https://github.com/acme/widget/pull/4#issuecomment-42",
		base,
		baseRef: "release",
		head,
		receipt: "prompt accepted",
	};
	await writeFile(join(state, "claims/42.json"), JSON.stringify(claim));
	const originalFetch = globalThis.fetch;
	const posted: string[] = [];
	globalThis.fetch = async (input, init) => {
		if (init?.method === "POST") {
			posted.push(JSON.parse(String(init.body)).body as string);
			return Response.json({ id: 600 + posted.length });
		}
		if (String(input).includes("/comments?")) return Response.json([{ id: 599, body: "<!-- limen-github acme/widget 42 start -->", performed_via_github_app: null }]); // a human cannot forge the App receipt
		throw new Error(`unexpected GitHub call ${input}`);
	};
	context.after(() => {
		globalThis.fetch = originalFetch;
	});
	const dir = join(scratch.root, ".limen/jobs/hosted-review");
	await mkdir(dir);
	await Promise.all(
		Object.entries({
			"task.md": `${githubMarker(claim)}\n`,
			hosted: "Herdr hosted\n",
			candidate: `${head}\n`,
			base: `${base}\n`,
			branch: "limen/github-pr-4-42\n",
			state: "running\n",
		}).map(([field, text]) => writeFile(join(dir, field), text)),
	);
	await reconcileGithubClaim(scratch.root, state, 42, "test-token");
	assert.equal(posted.length, 0, "a job directory without an actual hosted agent is not a start receipt");
	await mkdir(join(dir, "herdr"));
	await writeFile(join(dir, "herdr/agent"), "coord:worker-pane\n");
	await reconcileGithubClaim(scratch.root, state, 42, "test-token");
	assert.equal(posted.length, 1);
	assert.match(posted[0] ?? "", /hosted review.*Job: `hosted-review`/);
	await writeFile(join(dir, "state"), "done\n");
	await writeFile(join(dir, "result"), "Checked the release diff; one failure found.\n");
	await reconcileGithubClaim(scratch.root, state, 42, "test-token");
	await reconcileGithubClaim(scratch.root, state, 42, "test-token");
	assert.equal(posted.length, 2);
	assert.match(posted[1] ?? "", /done.*not review approval.*one failure found/s);
	assert.equal((JSON.parse(await readFile(claimPath(scratch.root, 42), "utf8")) as GithubClaim).terminalComment, 602);
});

test("poller restart recognizes its own posted receipt after an interrupted write", async (context) => {
	const scratch = await scratchRepo();
	const state = await pollerState(context);
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	await mkdir(join(scratch.root, ".limen/github/claims"), { recursive: true });
	const claim: GithubClaim = { repo: binding.repo, id: 43, pr: 4, actor: "alice", url: command(43).html_url, base, baseRef: "release", head };
	await writeFile(join(state, "claims/43.json"), JSON.stringify(claim));
	const dir = join(scratch.root, ".limen/jobs/retained-review");
	await mkdir(join(dir, "herdr"), { recursive: true });
	await Promise.all(
		Object.entries({
			"task.md": `${githubMarker(claim)}\n`,
			hosted: "Herdr hosted\n",
			candidate: `${head}\n`,
			base: `${base}\n`,
			branch: "limen/github-pr-4-43\n",
			state: "running\n",
			"herdr/agent": "coord:p2\n",
		}).map(([field, text]) => writeFile(join(dir, field), text)),
	);
	const originalFetch = globalThis.fetch;
	const previousId = process.env.LIMEN_GITHUB_APP_ID;
	process.env.LIMEN_GITHUB_APP_ID = "7";
	let posts = 0;
	globalThis.fetch = async (_input, init) => {
		if (init?.method === "POST") {
			posts += 1;
			return Response.json({ id: 999 });
		}
		return Response.json([{ id: 777, body: "<!-- limen-github acme/widget 43 start -->", performed_via_github_app: { id: 7 } }]);
	};
	context.after(() => {
		globalThis.fetch = originalFetch;
		if (previousId === undefined) delete process.env.LIMEN_GITHUB_APP_ID;
		else process.env.LIMEN_GITHUB_APP_ID = previousId;
	});
	await reconcileGithubClaim(scratch.root, state, 43, "test-token");
	assert.equal(posts, 0);
	assert.equal((JSON.parse(await readFile(claimPath(scratch.root, 43), "utf8")) as GithubClaim).startComment, 777);
});

test("review records an explicitly pinned base and refuses a moved head", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const actualBase = git(scratch.root, "rev-parse", "HEAD");
	git(scratch.root, "checkout", "-b", "limen/pr-head");
	await writeFile(join(scratch.root, "candidate.txt"), "candidate\n");
	git(scratch.root, "add", "candidate.txt");
	git(scratch.root, "commit", "-m", "candidate");
	const actualHead = git(scratch.root, "rev-parse", "HEAD");
	git(scratch.root, "checkout", "main");
	await writeFile(join(scratch.root, "other.txt"), "later main\n");
	git(scratch.root, "add", "other.txt");
	git(scratch.root, "commit", "-m", "main moved");
	const rejected = limen(scratch, "spawn", "--review", "--branch", "limen/pr-head", "--base", actualBase, "--head", head, "inspect pinned PR");
	assert.equal(rejected.status, 1);
	assert.match(rejected.stderr, /pinned review head moved/);
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")), []);
	const started = limen(scratch, "spawn", "--review", "--branch", "limen/pr-head", "--base", actualBase, "--head", actualHead, "inspect pinned PR");
	assert.equal(started.status, 0, started.stderr);
	const id = onlyJobId(started.stdout);
	await waitForState(scratch.root, id, "done");
	assert.equal((await readFile(join(scratch.root, ".limen/jobs", id, "base"), "utf8")).trim(), actualBase);
	assert.equal((await readFile(join(scratch.root, ".limen/jobs", id, "candidate"), "utf8")).trim(), actualHead);
});

test("coordinator review refuses a changed PR head and never falls back to detached without Herdr", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	await mkdir(join(scratch.root, ".limen/github/claims"), { recursive: true });
	const originalBase = git(scratch.root, "rev-parse", "HEAD");
	const remote = join(scratch.root, "..", "remote.git");
	git(scratch.root, "init", "--bare", remote);
	git(scratch.root, "remote", "add", "origin", remote);
	git(scratch.root, "push", "origin", "main");
	git(scratch.root, "checkout", "-b", "pr-head");
	await writeFile(join(scratch.root, "candidate.txt"), "PR change\n");
	git(scratch.root, "add", "candidate.txt");
	git(scratch.root, "commit", "-m", "PR change");
	const actualHead = git(scratch.root, "rev-parse", "HEAD");
	git(scratch.root, "push", "origin", "HEAD:refs/pull/4/head");
	git(scratch.root, "checkout", "main");
	const oldHerdrEnv = process.env.HERDR_ENV;
	const oldHerdrBin = process.env.LIMEN_HERDR;
	delete process.env.HERDR_ENV;
	process.env.LIMEN_HERDR = "0";
	context.after(() => {
		if (oldHerdrEnv === undefined) delete process.env.HERDR_ENV;
		else process.env.HERDR_ENV = oldHerdrEnv;
		if (oldHerdrBin === undefined) delete process.env.LIMEN_HERDR;
		else process.env.LIMEN_HERDR = oldHerdrBin;
	});
	const request: GithubClaim = { repo: binding.repo, id: 90, pr: 4, actor: "alice", url: command(90).html_url, base: originalBase, baseRef: "main", head };
	const options = { engine: "omp", provider: "openai-codex", model: "gpt-6-sol", thinking: "xhigh" };
	await assert.rejects(startGithubJob(scratch.root, request, options), /PR head moved/);
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")), []);
	await assert.rejects(startGithubJob(scratch.root, { ...request, id: 91, head: actualHead }, options), /hosted spawn requires Herdr/);
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")), [], "never start a detached review");
	await assert.rejects(startGithubJob(scratch.root, { ...request, id: 92 }, options, "Inspect the build failure"), /hosted spawn requires Herdr/);
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")), [], "never start a detached worker");
});

test("an authorized comment on an open issue claims one request and prompts the coordinator with the issue", async (context) => {
	const scratch = await scratchRepo();
	const state = await pollerState(context);
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	git(scratch.root, "remote", "add", "origin", "https://github.com/acme/widget.git");
	await mkdir(join(scratch.root, ".limen/github/claims"), { recursive: true });
	await writeFile(join(scratch.root, ".limen/github/binding.json"), JSON.stringify(binding));
	// sudo runs the real narrow handoff as the coordinator; the fake Herdr records each prompt.
	const prompts = join(state, "prompts");
	await writeFile(join(scratch.fakeBin, "sudo"), '#!/bin/sh\n[ "$2" = -l ] && exit 1\nshift 4\nexec "$@"\n');
	await writeFile(join(scratch.fakeBin, "id"), "#!/bin/sh\necho staff\n");
	await writeFile(
		join(scratch.fakeBin, "herdr"),
		`#!/bin/sh\nif [ "$2" = get ]; then printf '%s\\n' '{"result":{"agent":{"pane_id":"coord:p1","agent_status":"idle","interactive_ready":true}}}'; else printf '%s\\0' "$4" >> ${JSON.stringify(prompts)}; fi\n`,
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
	const requests: string[] = [];
	let permission = "read";
	const issue = (number: number, open: boolean) => ({
		number,
		state: open ? "open" : "closed",
		title: "Widget crashes on start",
		body: "@limen please fix this crash",
		repository_url: "https://api.github.com/repos/acme/widget",
	});
	globalThis.fetch = async (input, init) => {
		const url = String(input);
		requests.push(`${init?.method ?? "GET"} ${url}`);
		if (url.includes("/permission")) return Response.json({ permission });
		if (/\/pulls\/\d+$/.test(url)) return new Response("{}", { status: 404 });
		if (url.endsWith("/issues/5")) return Response.json(issue(5, true));
		if (url.endsWith("/issues/6")) return Response.json(issue(6, false));
		if (url.includes("/issues/5/comments?"))
			return Response.json([
				{ id: 12, body: "@limen fix the crash", user: { login: "alice" } },
				{ id: 9, body: "Crash log attached", user: { login: "bob" } },
			]);
		throw new Error(`unexpected GitHub call ${init?.method ?? "GET"} ${url}`);
	};
	const claims = () => readdir(join(scratch.root, ".limen/github/claims"));

	await acceptGithubComment(scratch.root, state, binding, issueComment(12, "@limen fix the crash"), "test-token");
	permission = "triage";
	await acceptGithubComment(scratch.root, state, binding, issueComment(12, "@limen fix the crash"), "test-token");
	assert.deepEqual(await claims(), [], "read and triage collaborators cannot claim");
	permission = "write";
	const before = requests.length;
	await acceptGithubComment(scratch.root, state, binding, issueComment(13, "Thanks, the report above has the details."), "test-token");
	assert.equal(requests.length, before, "an @limen issue body without an @limen comment is never read as a request");
	await acceptGithubComment(scratch.root, state, binding, issueComment(14, "@limen fix this", 6), "test-token");
	assert.deepEqual(await claims(), [], "a closed issue does not count");

	await acceptGithubComment(scratch.root, state, binding, issueComment(12, "@limen fix the crash"), "test-token");
	await acceptGithubComment(scratch.root, state, binding, issueComment(12, "@limen fix the crash"), "test-token");
	assert.deepEqual(await claims(), ["12.json"]);
	const claim = JSON.parse(await readFile(join(state, "claims/12.json"), "utf8")) as GithubClaim;
	assert.equal(claim.kind, "issue");
	assert.equal(claim.pr, 5);
	assert.equal(claim.head, undefined);
	assert.equal(claim.base, undefined);
	assert.equal(claim.title, "Widget crashes on start");
	assert.equal(claim.command, "@limen fix the crash");
	assert.match(claim.discussion ?? "", /bob: Crash log attached/);
	assert.doesNotMatch(claim.discussion ?? "", /alice: @limen/);
	assert.equal(claim.receipt, "prompt accepted");
	assert.equal(requests.filter((call) => call.includes("/pulls/5/comments") || call.includes("/pulls/5/reviews")).length, 0, "an issue has no review threads");
	assert.equal(requests.filter((call) => call.startsWith("POST")).length, 0);
	const delivered = (await readFile(prompts, "utf8")).split("\0").filter(Boolean);
	assert.equal(delivered.length, 1, "one handoff prompt");
	assert.match(delivered[0] ?? "", /untrusted issue data.*issue #5, comment 12 by alice/s);
	assert.match(delivered[0] ?? "", /not a pull request: it has no base or head/);
	assert.match(delivered[0] ?? "", /Issue title: Widget crashes on start/);
	assert.match(delivered[0] ?? "", /github work .* 12 --engine/);
	assert.doesNotMatch(delivered[0] ?? "", /\b[0-9a-f]{40}\b/);
});

test("github review refuses an issue claim; github work starts one hosted job that earns one start and one terminal reply", async (context) => {
	const scratch = await scratchRepo();
	const state = await pollerState(context);
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	git(scratch.root, "remote", "add", "origin", "https://github.com/acme/widget.git");
	await mkdir(join(scratch.root, ".limen/github/claims"), { recursive: true });
	await writeFile(join(scratch.root, ".limen/github/binding.json"), JSON.stringify(binding));
	const claim: GithubClaim = {
		repo: binding.repo,
		id: 71,
		pr: 5,
		kind: "issue",
		actor: "alice",
		url: issueComment(71, "").html_url,
		title: "Widget crashes on start",
		body: "Steps to reproduce",
		discussion: "bob: Crash log attached",
		command: "@limen fix the crash",
		receipt: "prompt accepted",
		attemptedAt: new Date().toISOString(),
	};
	await writeFile(join(state, "claims/71.json"), JSON.stringify(claim));
	await writeFile(claimPath(scratch.root, 71), JSON.stringify(claim));
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

	const review = limenWithEnv(scratch, coordinator, "github", "review", scratch.root, "71", ...model);
	assert.equal(review.status, 1);
	assert.match(review.stderr, /github review needs a pull request head; claim 71 is for issue #5/);
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")), [], "a refused review starts no job");

	const work = limenWithEnv(scratch, coordinator, "github", "work", scratch.root, "71", ...model, "--task", "Find and fix the crash");
	assert.equal(work.status, 0, work.stderr);
	const id = onlyJobId(work.stdout);
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")), [id], "work starts one job");
	await waitForState(scratch.root, id, "done");
	assert.equal((await readFile(join(scratch.root, ".limen/jobs", id, "branch"), "utf8")).trim(), "limen/github-issue-5-71");
	assert.match(
		await readFile(join(scratch.root, ".limen/jobs", id, "task.md"), "utf8"),
		/Coordinator task: Find and fix the crash\nRepository acme\/widget, issue #5\. This is an issue, not a pull request/,
	);

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
	await reconcileGithubClaim(scratch.root, state, 71, "test-token");
	await reconcileGithubClaim(scratch.root, state, 71, "test-token");
	assert.equal(posted.length, 2, "one start reply and one terminal reply");
	assert.ok(posted.every((post) => post.url.endsWith("/repos/acme/widget/issues/5/comments")));
	assert.match(posted[0]?.body ?? "", new RegExp(`started a hosted task for issue #5 from the registered repository\\. Job: \`${id}\``));
	assert.match(posted[1]?.body ?? "", new RegExp(`hosted task job \`${id}\` ended with state \\*\\*done\\*\\*`));
});
