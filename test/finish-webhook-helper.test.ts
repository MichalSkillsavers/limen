// F925 old suite, frozen at 428 lines. Delete this file when its replacement lands; never add to it.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HELPER = fileURLToPath(new URL("../bin/tony-finish-ping.sh", import.meta.url));
const AUTH = "Bearer synthetic-secret._~+/-==";
const DESTINATION = "https://finish.example.test/private-destination";

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), "limen-finish-"));
	const home = join(root, "home");
	await mkdir(home);
	const capture = join(root, "request.json");
	const preload = join(root, "transport.mjs");
	await writeFile(
		preload,
		`import { appendFileSync, writeFileSync } from 'node:fs';
const setTimer = globalThis.setTimeout;
globalThis.setTimeout = (callback, ms, ...args) => {
  writeFileSync(process.env.CAPTURE + '.timeout', String(ms));
  return setTimer(callback, ['timeout', 'mixed-timeout'].includes(process.env.TRANSPORT) ? 35 : ms, ...args);
};
globalThis.fetch = async (url, options) => {
  appendFileSync(process.env.CAPTURE + '.requests', JSON.stringify({ url: String(url), headers: options.headers, body: options.body }) + '\\n');
  writeFileSync(process.env.CAPTURE, JSON.stringify({
    url: String(url), method: options.method, redirect: options.redirect,
    headers: options.headers, body: options.body, argv: process.argv,
    hasSignal: options.signal instanceof AbortSignal,
  }));
  if (String(url).endsWith('/stall')) return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  if (process.env.TRANSPORT === 'timeout') return new Promise(() => {});
  if (process.env.TRANSPORT === 'error' || String(url).endsWith('/error')) throw new Error(options.headers.Authorization + ' ' + url);
  return {
    status: String(url).endsWith('/reject') ? 503 : Number(process.env.HTTP_STATUS ?? '204'),
    get body() { throw new Error('response bodies must not be read'); },
    async text() { writeFileSync(process.env.CAPTURE + '.response-read', '1'); return process.env.RECEIVER_BODY ?? ''; },
    async json() { writeFileSync(process.env.CAPTURE + '.response-read', '1'); return { error: process.env.RECEIVER_BODY }; },
  };
};
`,
	);
	const env: NodeJS.ProcessEnv = {
		PATH: `${dirname(process.execPath)}:/usr/bin:/bin`,
		HOME: home,
		GIT_CONFIG_NOSYSTEM: "1",
		GIT_CONFIG_GLOBAL: "/dev/null",
		NODE_OPTIONS: `--import=${preload}`,
		CAPTURE: capture,
	};
	return {
		root,
		home,
		capture,
		env,
		async config(path: string, content = `LIMEN_FINISH_WEBHOOK_URL='${DESTINATION}'\nexport LIMEN_FINISH_WEBHOOK_AUTH="${AUTH}"\n`) {
			await mkdir(dirname(path), { recursive: true });
			await writeFile(path, content, { mode: 0o600 });
			return path;
		},
		git(cwd: string, ...args: readonly string[]) {
			return execFileSync("git", args, { cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
		},
		run(override: NodeJS.ProcessEnv = {}, cwd = root, args = ["label", "done", "topic"]) {
			const result = spawnSync(HELPER, args, { cwd, env: { ...env, ...override }, encoding: "utf8", timeout: 4000 });
			assert.ifError(result.error);
			assert.equal(result.signal, null);
			assert.doesNotMatch(result.stdout + result.stderr, /synthetic-secret|private-destination|finish\.example\.test/);
			return result;
		},
		request() {
			return JSON.parse(readFileSync(capture, "utf8"));
		},
		cleanup: () => rm(root, { recursive: true, force: true }),
	};
}

test("helper safely encodes all CLI fields, sends Bearer in memory, and reports only HTTP acceptance", async (t) => {
	const f = await fixture();
	t.after(f.cleanup);
	const path = await f.config(join(f.root, "private config.env"));
	const args = ['job "quoted"\\\n\t🙂', "done\r\n", 'feature/\\branch"\n'];
	const result = f.run({ LIMEN_FINISH_WEBHOOK_ENV: path }, f.root, args);
	assert.equal(result.status, 0, result.stderr);
	assert.equal(result.stdout, "finish webhook: accepted (HTTP 204)\n");
	assert.equal(result.stderr, "");
	const request = f.request();
	const body = JSON.parse(request.body);
	assert.deepEqual({ job: body.job, status: body.status, branch: body.branch }, { job: args[0], status: args[1], branch: args[2] });
	assert.deepEqual(request.headers, { Authorization: AUTH, "Content-Type": "application/json" });
	assert.equal(request.url, DESTINATION);
	assert.equal(request.method, "POST");
	assert.equal(request.redirect, "manual");
	assert.equal(request.hasSignal, true);
	assert.deepEqual(request.argv.slice(2), args);
	assert.ok(!request.argv.join(" ").includes(AUTH));
	assert.equal(readFileSync(`${f.capture}.timeout`, "utf8"), "10000");
});

test("failed and stopped sender payloads direct inspection without a landing signal", async (t) => {
	const f = await fixture();
	t.after(f.cleanup);
	const path = await f.config(join(f.root, "failure.env"));
	for (const status of ["failed", "stopped"]) {
		const result = f.run({ LIMEN_FINISH_WEBHOOK_ENV: path }, f.root, ["worker", status, "candidate"]);
		assert.equal(result.status, 0, result.stderr);
		const body = JSON.parse(f.request().body);
		assert.equal(body.status, status);
		assert.equal(body.jobState, undefined);
	}
});

test("event fields ride the payload as one-line data; a non-terminal event names its own handoff", async (t) => {
	const f = await fixture();
	t.after(f.cleanup);
	const path = await f.config(join(f.root, "events.env"));
	const event = {
		LIMEN_FINISH_WEBHOOK_ENV: path,
		LIMEN_FINISH_KIND: "coordinator.blocked",
		LIMEN_FINISH_PLANT: "chilly",
		LIMEN_FINISH_ID: "01a10d85-session",
		LIMEN_FINISH_REASON: "todo blocked: Land F781\n(needs owner)",
		LIMEN_FINISH_HANDOFF: "Coordinator is blocked. Next step: answer it or remove the blocker.",
	};
	assert.equal(f.run(event, f.root, ["F781 lead", "blocked", "main"]).status, 0);
	const body = JSON.parse(f.request().body);
	assert.deepEqual(
		{ event: body.event, plant: body.plant, title: body.title, jobId: body.jobId, reason: body.reason, status: body.status, handoff: body.handoff, jobState: body.jobState },
		{
			event: "coordinator.blocked",
			plant: "chilly",
			title: "F781 lead",
			jobId: "01a10d85-session",
			reason: "todo blocked: Land F781 (needs owner)",
			status: "blocked",
			handoff: event.LIMEN_FINISH_HANDOFF,
			jobState: undefined,
		},
	);
	// A manual job ping still names its kind from the state and carries no invented plant, id or reason.
	assert.equal(f.run({ LIMEN_FINISH_WEBHOOK_ENV: path, LIMEN_FINISH_KIND: "not a kind" }, f.root, ["worker", "failed", "candidate"]).status, 0);
	const manual = JSON.parse(f.request().body);
	assert.equal(manual.event, "job.failed");
	assert.deepEqual([manual.plant, manual.jobId, manual.reason], [undefined, undefined, undefined]);
});

test("explicit targets fan out to two routes without an implicit single-target recipient", async (t) => {
	const f = await fixture();
	t.after(f.cleanup);
	const targets = [
		{ url: "https://finish.example.test/grok-one", auth: AUTH },
		{ url: "https://finish.example.test/grok-two", auth: "Bearer second-synthetic-secret" },
	];
	const path = await f.config(
		join(f.root, "multi.env"),
		`LIMEN_FINISH_WEBHOOK_TARGETS='${JSON.stringify(targets)}'\nLIMEN_FINISH_WEBHOOK_URL='${DESTINATION}'\nLIMEN_FINISH_WEBHOOK_AUTH='${AUTH}'\n`,
	);
	const result = f.run({ LIMEN_FINISH_WEBHOOK_ENV: path });
	assert.equal(result.status, 0, result.stderr);
	const requests = readFileSync(`${f.capture}.requests`, "utf8")
		.trim()
		.split("\n")
		.map((line) => JSON.parse(line));
	assert.deepEqual(
		requests.map(({ url, headers }) => ({ url, auth: headers.Authorization })),
		targets,
	);
	for (const request of requests) {
		const body = JSON.parse(request.body);
		assert.equal(body.status, "waiting");
		assert.equal(body.jobState, "done");
		assert.equal(body.branch, "topic");
	}
	assert.match(result.stdout, /target 1 accepted \(HTTP 204\); owner wake unobserved/);
	assert.match(result.stdout, /target 2 accepted \(HTTP 204\); owner wake unobserved/);
});

test("a failed or stalled first bot does not block the second bot; acceptance is never called a wake", async (t) => {
	for (const route of ["error", "reject", "stall"]) {
		await t.test(route, async (t) => {
			const f = await fixture();
			t.after(f.cleanup);
			const targets = [
				{ url: `https://finish.example.test/${route}`, auth: AUTH },
				{ url: "https://finish.example.test/grok-two", auth: "Bearer second-synthetic-secret" },
			];
			const path = await f.config(join(f.root, "multi.env"), `LIMEN_FINISH_WEBHOOK_TARGETS='${JSON.stringify(targets)}'\n`);
			const result = f.run({ LIMEN_FINISH_WEBHOOK_ENV: path, TRANSPORT: "mixed-timeout" });
			assert.equal(result.status, 1);
			const expected = route === "error" ? "request failed" : route === "reject" ? "HTTP 503 rejected" : "request timed out after 10000ms";
			assert.ok(result.stdout.includes(`target 1 ${expected}; owner wake unobserved`), result.stdout);
			assert.match(result.stdout, /target 2 accepted \(HTTP 204\); owner wake unobserved/);
			assert.equal(result.stdout.trim().split("\n").length, 2, "timeout and abort rejection must not produce duplicate results");
			assert.equal(readFileSync(`${f.capture}.requests`, "utf8").trim().split("\n").length, 2);
		});
	}
});

test("invalid explicit target lists fail before all transport and never fall back to the single target", async (t) => {
	const valid = { url: DESTINATION, auth: AUTH };
	const invalid = [
		"not-json",
		"[]",
		JSON.stringify([valid, { ...valid, auth: "synthetic-secret" }]),
		JSON.stringify([valid, { ...valid, url: "http://finish.example.test" }]),
		JSON.stringify([valid, { url: DESTINATION }]),
		JSON.stringify([valid, { ...valid, bot: "grok-two" }]),
		JSON.stringify(Array.from({ length: 65 }, () => valid)),
	];
	for (const [index, value] of invalid.entries()) {
		await t.test(`invalid selection ${index + 1}`, async (t) => {
			const f = await fixture();
			t.after(f.cleanup);
			const path = await f.config(
				join(f.root, "invalid.env"),
				`LIMEN_FINISH_WEBHOOK_TARGETS='${value}'\nLIMEN_FINISH_WEBHOOK_URL='${DESTINATION}'\nLIMEN_FINISH_WEBHOOK_AUTH='${AUTH}'\n`,
			);
			assert.equal(f.run({ LIMEN_FINISH_WEBHOOK_ENV: path }).status, 1);
			assert.equal(existsSync(`${f.capture}.requests`), false);
		});
	}
});

test("legacy-only configuration fails closed and names the new key before any request", async (t) => {
	const f = await fixture();
	t.after(f.cleanup);
	// Retired names appear only as rejection inputs, never as supported configuration.
	const path = await f.config(join(f.root, "legacy.env"), `TONY_FINISH_WEBHOOK_URL='${DESTINATION}'\nTONY_FINISH_WEBHOOK_AUTH='${AUTH}'\n`);
	const result = f.run({ LIMEN_FINISH_WEBHOOK_ENV: path });
	assert.equal(result.status, 1);
	assert.equal(result.stderr, "finish webhook: LIMEN_FINISH_WEBHOOK_AUTH must be a complete Bearer value\n");
	assert.equal(existsSync(`${f.capture}.requests`), false);
});

test("the retired env-path override cannot select a destination", async (t) => {
	const f = await fixture();
	t.after(f.cleanup);
	const path = await f.config(join(f.root, "ignored.env"));
	await f.config(join(f.home, ".overment", "tony-finish-webhook.env"), "# no target selected\n");
	const result = f.run({ TONY_FINISH_WEBHOOK_ENV: path });
	assert.equal(result.status, 1);
	assert.match(result.stderr, /LIMEN_FINISH_WEBHOOK_AUTH/);
	assert.equal(existsSync(`${f.capture}.requests`), false);
});

test("helper rejects missing, raw, Basic and malformed Bearer auth before transport", async (t) => {
	const invalid = [
		undefined,
		"synthetic-secret",
		"Basic synthetic-secret",
		"bearer synthetic-secret",
		"Bearer ",
		"Bearer synthetic-secret extra",
		"Bearer synthetic-secret\r\nX-Evil: yes",
		"Bearer sécret",
	];
	for (const auth of invalid) {
		await t.test(JSON.stringify(auth) ?? "missing", async (t) => {
			const f = await fixture();
			t.after(f.cleanup);
			const path = await f.config(join(f.root, "invalid.env"), `LIMEN_FINISH_WEBHOOK_URL='${DESTINATION}'\n${auth === undefined ? "" : `LIMEN_FINISH_WEBHOOK_AUTH='${auth}'`}\n`);
			const result = f.run({ LIMEN_FINISH_WEBHOOK_ENV: path, LIMEN_FINISH_WEBHOOK_AUTH: AUTH });
			assert.equal(result.status, 1);
			assert.match(result.stderr, /must be a complete Bearer value/);
			assert.equal(existsSync(f.capture), false);
		});
	}
});

test("helper rejects missing or unsafe destinations without revealing their contents", async (t) => {
	for (const url of ["", "http://finish.example.test", "https://user:synthetic-secret@finish.example.test", "https://finish.example.test/#synthetic-secret"]) {
		await t.test(url, async (t) => {
			const f = await fixture();
			t.after(f.cleanup);
			const path = await f.config(join(f.root, "invalid.env"), `LIMEN_FINISH_WEBHOOK_AUTH='${AUTH}'\nLIMEN_FINISH_WEBHOOK_URL='${url}'\n`);
			assert.equal(f.run({ LIMEN_FINISH_WEBHOOK_ENV: path }).status, 1);
			assert.equal(existsSync(f.capture), false);
		});
	}
});

test("helper fails redirects, non-2xx, transport errors and a bounded stalled request", async (t) => {
	for (const status of [200, 299, 302, 500]) {
		await t.test(`HTTP ${status}`, async (t) => {
			const f = await fixture();
			t.after(f.cleanup);
			const path = await f.config(join(f.root, "config.env"));
			const result = f.run({ LIMEN_FINISH_WEBHOOK_ENV: path, HTTP_STATUS: String(status) });
			assert.equal(result.status, status < 300 ? 0 : 1);
			assert.match(result.stdout + result.stderr, new RegExp(`HTTP ${status}`));
			assert.equal(f.request().redirect, "manual");
		});
	}
	for (const transport of ["error", "timeout"]) {
		await t.test(transport, async (t) => {
			const f = await fixture();
			t.after(f.cleanup);
			const path = await f.config(join(f.root, "config.env"));
			const result = f.run({ LIMEN_FINISH_WEBHOOK_ENV: path, TRANSPORT: transport });
			assert.equal(result.status, 1);
			assert.match(result.stderr, transport === "timeout" ? /timed out after 10000ms/ : /request failed/);
			assert.equal(readFileSync(`${f.capture}.timeout`, "utf8"), "10000");
		});
	}
});

test("an unauthenticated receiver body is not a sender diagnosis or a wake acknowledgement", async (t) => {
	const f = await fixture();
	t.after(f.cleanup);
	const path = await f.config(join(f.root, "config.env"));
	for (const status of [200, 401, 403]) {
		const result = f.run({ LIMEN_FINISH_WEBHOOK_ENV: path, HTTP_STATUS: String(status), RECEIVER_BODY: "[unauthenticated] Error synthetic-secret" });
		assert.equal(result.status, status === 200 ? 0 : 1);
		assert.equal(result.stdout + result.stderr, `finish webhook: ${status === 200 ? "accepted (HTTP 200)" : `HTTP ${status} rejected`}\n`);
		assert.equal(existsSync(`${f.capture}.response-read`), false, "receiver response content must not become a sender receipt");
		assert.deepEqual(f.request().headers, { Authorization: AUTH, "Content-Type": "application/json" });
	}
});

test("absolute override wins; missing, empty and relative overrides never fall back", async (t) => {
	const f = await fixture();
	t.after(f.cleanup);
	await f.config(join(f.home, ".overment", "tony-finish-webhook.env"));
	const selected = await f.config(join(f.root, "explicit.env"), `LIMEN_FINISH_WEBHOOK_URL='https://explicit.example.test'\nLIMEN_FINISH_WEBHOOK_AUTH='${AUTH}'\n`);
	assert.equal(f.run({ LIMEN_FINISH_WEBHOOK_ENV: selected }).status, 0);
	assert.equal(f.request().url, "https://explicit.example.test/");
	await rm(f.capture);
	for (const override of ["", "explicit.env", join(f.root, "missing.env"), f.root]) {
		assert.equal(f.run({ LIMEN_FINISH_WEBHOOK_ENV: override }).status, 1);
		assert.equal(existsSync(f.capture), false);
	}
});

test("Git common directory selects the canonical project's config from an external worktree", async (t) => {
	const f = await fixture();
	t.after(f.cleanup);
	const repo = join(f.root, "canonical repo");
	await mkdir(repo);
	f.git(repo, "init", "-b", "main");
	f.git(repo, "-c", "user.name=Synthetic", "-c", "user.email=synthetic@example.test", "commit", "--allow-empty", "-m", "initial");
	const worktree = join(f.root, "outside checkout");
	f.git(repo, "worktree", "add", "-b", "topic", worktree);
	const nested = join(worktree, "nested");
	await mkdir(nested);
	await f.config(join(f.home, ".overment", "tony-finish-webhook.env"));
	await f.config(join(worktree, ".limen", "finish-webhook.env"));
	assert.equal(f.run({}, nested).status, 1, "missing canonical config must not use worktree or home config");
	assert.equal(existsSync(f.capture), false);
	const canonical = await f.config(join(repo, ".limen", "finish-webhook.env"), `LIMEN_FINISH_WEBHOOK_URL='https://canonical.example.test'\nLIMEN_FINISH_WEBHOOK_AUTH='${AUTH}'\n`);
	assert.equal(f.run({}, nested).status, 0);
	assert.equal(f.request().url, "https://canonical.example.test/");
	assert.equal(f.run({}, repo).status, 0);
	assert.equal(f.request().url, "https://canonical.example.test/");
	const selected = await f.config(join(f.root, "selected.env"));
	assert.equal(f.run({ LIMEN_FINISH_WEBHOOK_ENV: selected }, nested).status, 0);
	assert.equal(f.request().url, DESTINATION);
	await f.config(canonical, "# empty config\n");
	await rm(f.capture);
	assert.equal(f.run({}, nested).status, 1);
	assert.equal(existsSync(f.capture), false);
});

test("legacy home config is available only for manual invocation outside Git, not inherited credentials", async (t) => {
	const f = await fixture();
	t.after(f.cleanup);
	assert.equal(
		f.run({ LIMEN_FINISH_WEBHOOK_URL: DESTINATION, LIMEN_FINISH_WEBHOOK_AUTH: AUTH, LIMEN_FINISH_WEBHOOK_TARGETS: JSON.stringify([{ url: DESTINATION, auth: AUTH }]) }).status,
		1,
	);
	assert.equal(existsSync(f.capture), false);
	await f.config(join(f.home, ".overment", "tony-finish-webhook.env"));
	assert.equal(f.run().status, 0);
	assert.equal(f.request().url, DESTINATION);
});

test("env files are data, never shell scripts", async (t) => {
	const f = await fixture();
	t.after(f.cleanup);
	const marker = join(f.root, "executed");
	const path = await f.config(join(f.root, "shell.env"), `touch '${marker}'\nLIMEN_FINISH_WEBHOOK_URL='${DESTINATION}'\nLIMEN_FINISH_WEBHOOK_AUTH="Bearer $(touch '${marker}')"\n`);
	assert.equal(f.run({ LIMEN_FINISH_WEBHOOK_ENV: path }).status, 1);
	assert.equal(existsSync(marker), false);
	assert.equal(existsSync(f.capture), false);
});

test("invalid author maps and target references send nothing", async (t) => {
	const targets = [
		{ url: DESTINATION, auth: AUTH },
		{ url: "https://finish.example.test/grok-two", auth: "Bearer second-synthetic-secret" },
	];
	const cases = ["not-json", "[]", '{"alice":[1]}', '{"@Alice":[1]}', '{"@alice":[]}', '{"@alice":[1,1]}', '{"@alice":[0]}'];
	for (const [index, value] of cases.entries()) {
		await t.test(`invalid map ${index + 1}`, async (t) => {
			const f = await fixture();
			t.after(f.cleanup);
			const path = await f.config(join(f.root, "invalid-map.env"), `LIMEN_FINISH_WEBHOOK_TARGETS='${JSON.stringify(targets)}'\nLIMEN_FINISH_WEBHOOK_AUTHOR_TARGETS='${value}'\n`);
			const result = f.run({ LIMEN_FINISH_WEBHOOK_ENV: path, LIMEN_FINISH_WEBHOOK_AUTHOR: "@alice" });
			assert.equal(result.status, 1);
			assert.equal(existsSync(`${f.capture}.requests`), false);
		});
	}
	await t.test("empty object skips rather than broadcasting", async (t) => {
		const f = await fixture();
		t.after(f.cleanup);
		const path = await f.config(join(f.root, "empty-map.env"), `LIMEN_FINISH_WEBHOOK_TARGETS='${JSON.stringify(targets)}'\nLIMEN_FINISH_WEBHOOK_AUTHOR_TARGETS='{}'\n`);
		const result = f.run({ LIMEN_FINISH_WEBHOOK_ENV: path, LIMEN_FINISH_WEBHOOK_AUTHOR: "@alice" });
		assert.equal(result.status, 0);
		assert.match(result.stdout, /not sent: no author route/);
		assert.equal(existsSync(`${f.capture}.requests`), false);
	});
	await t.test("single URL/AUTH is target 1", async (t) => {
		const f = await fixture();
		t.after(f.cleanup);
		const path = await f.config(
			join(f.root, "single.env"),
			`LIMEN_FINISH_WEBHOOK_URL='${DESTINATION}'\nLIMEN_FINISH_WEBHOOK_AUTH='${AUTH}'\nLIMEN_FINISH_WEBHOOK_AUTHOR_TARGETS='${JSON.stringify({ "@alice": [1] })}'\n`,
		);
		const result = f.run({ LIMEN_FINISH_WEBHOOK_ENV: path, LIMEN_FINISH_WEBHOOK_AUTHOR: "@alice" });
		assert.equal(result.status, 0, result.stderr);
		assert.match(result.stdout, /target 1 accepted/);
		assert.equal(f.request().url, DESTINATION);
	});
});
