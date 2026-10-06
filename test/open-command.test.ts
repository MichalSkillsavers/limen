// F925 old suite, frozen at 253 lines. Delete this file when its replacement lands; never add to it.
import assert from "node:assert/strict";
import { access, chmod, mkdir, readFile, realpath, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { openDiffTab, openHostedTab, openJobPlace, openWatchTab } from "../src/integrations/herdr.ts";
import { limen, limenWithEnv, onlyJobId, scratchRepo, waitForState } from "./scratch.ts";

test("open focuses a recorded tab while running and recreates a log tab once terminal", async (context) => {
	const scratch = await scratchRepo(`#!/usr/bin/env node
process.on("SIGTERM", () => process.exit(0));
setInterval(() => {}, 1000);
`);
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const herdr = await installFakeHerdr(scratch.root, scratch.fakeBin);
	const env = herdrEnv(herdr);
	const launched = limenWithEnv(scratch, env, "spawn", "--detached", "--label", "F012 spaces", "long work");
	assert.equal(launched.status, 0, launched.stderr);
	const id = onlyJobId(launched.stdout);
	const job = join(scratch.root, ".limen/jobs", id);
	const deadline = Date.now() + 5_000;
	while (!(await readFile(join(job, "herdr/tab"), "utf8").catch(() => "")) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 25));
	assert.equal(await readFile(join(job, "herdr/tab"), "utf8"), "w1:t1\n");
	assert.match(await readFile(herdr.calls, "utf8"), /workspace create .*--label repo workers/);
	const focused = limenWithEnv(scratch, env, "open", id);
	assert.equal(focused.status, 0, focused.stderr);
	assert.match(focused.stdout, /focused F012 spaces/);
	assert.match(await readFile(herdr.calls, "utf8"), /tab focus w1:t1/);
	// F035: reaching terminal state closes the tab; open then recreates a log view.
	limen(scratch, "stop", id, "probe finished");
	await waitForState(scratch.root, id, "stopped");
	const closeDeadline = Date.now() + 2_000;
	let calls = "";
	while (Date.now() < closeDeadline) {
		calls = await readFile(herdr.calls, "utf8").catch(() => "");
		if (/tab close w1:t1/.test(calls)) break;
		await new Promise((resolve) => setTimeout(resolve, 25));
	}
	assert.match(calls, /tab close w1:t1/);
	const reopened = limenWithEnv(scratch, env, "open", id);
	assert.equal(reopened.status, 0, reopened.stderr);
	assert.match(reopened.stdout, /opened F012 spaces/);
	assert.equal(await readFile(join(job, "herdr/tab"), "utf8"), "w1:t2\n");
	assert.equal(await readFile(join(job, "herdr/mode"), "utf8"), "log\n");
	assert.equal([...(await readFile(herdr.calls, "utf8")).matchAll(/^workspace create /gm)].length, 1);
	assert.match(await readFile(herdr.calls, "utf8"), /tab create .*--label F012 spaces · stopped/);
	assert.match(await readFile(herdr.calls, "utf8"), /pane run w1:p2 tail -n \+1 /);
	assert.doesNotMatch(await readFile(herdr.calls, "utf8"), /pane run w1:p2 tail -f /);
});

test("open recreates a live watch tab and says why when herdr is missing", async (context) => {
	const scratch = await scratchRepo(`#!/usr/bin/env node
process.on("SIGTERM", () => process.exit(0));
setInterval(() => {}, 1000);
`);
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const herdr = await installFakeHerdr(scratch.root, scratch.fakeBin);
	const env = herdrEnv(herdr);
	const id = onlyJobId(limenWithEnv(scratch, env, "spawn", "--detached", "--label", "F012 watch", "long work").stdout);
	assert.equal(await readFile(join(scratch.root, ".limen/jobs", id, "herdr/tab"), "utf8"), "w1:t1\n");
	await closeFakeTab(herdr, "w1:t1");
	const reopened = limenWithEnv(scratch, env, "open", id);
	assert.equal(reopened.status, 0, reopened.stderr);
	assert.equal(await readFile(join(scratch.root, ".limen/jobs", id, "herdr/tab"), "utf8"), "w1:t2\n");
	assert.equal(await readFile(join(scratch.root, ".limen/jobs", id, "herdr/mode"), "utf8"), "watch\n");
	assert.match(await readFile(herdr.calls, "utf8"), /pane run w1:p2 tail -f /);
	const missing = limen(scratch, "open", id);
	assert.equal(missing.status, 1);
	assert.match(missing.stderr, /herdr is not available/);
	limen(scratch, "stop", id, "test cleanup");
	await waitForState(scratch.root, id, "stopped");
});

test("close leftover tabs for a proven feature and leaves job files", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const herdr = await installFakeHerdr(scratch.root, scratch.fakeBin);
	const env = { ...herdrEnv(herdr), HERDR_TAB_ID: "coord:tab" };
	const keep = onlyJobId(limenWithEnv(scratch, env, "spawn", "--detached", "--label", "F012 spaces", "make commit").stdout);
	const other = onlyJobId(limenWithEnv(scratch, env, "spawn", "--detached", "--label", "F010 other", "make commit").stdout);
	await Promise.all([waitForState(scratch.root, keep, "done"), waitForState(scratch.root, other, "done")]);
	const active = limenWithEnv(scratch, env, "close", "F012");
	assert.equal(active.status, 1);
	assert.match(active.stderr, /not in done\/ or dropped/);
	await mkdir(join(scratch.root, "spec/features/done/2026-08/F012-herdr-job-spaces"), { recursive: true });
	// F035: terminal jobs auto-close, so the sweep exercises a recreated log tab.
	const reopened = limenWithEnv(scratch, env, "open", keep);
	assert.match(reopened.stdout, /opened F012 spaces/);
	const swept = limenWithEnv(scratch, env, "close", "F012");
	assert.equal(swept.status, 0, swept.stderr);
	assert.match(swept.stdout, /closed 1 leftover tab for F012/);
	assert.doesNotMatch(await readFile(herdr.calls, "utf8"), /tab close coord:tab/);
	await access(join(scratch.root, ".limen/jobs", keep, "task.md"));
	await access(join(scratch.root, ".limen/jobs", other, "task.md"));
});

test("role spaces distinguish two project roots with the same basename and reuse each root", async (context) => {
	const first = await scratchRepo();
	const second = await scratchRepo();
	context.after(first.cleanup);
	context.after(second.cleanup);
	const herdr = await installFakeHerdr(first.root, first.fakeBin);
	const previous = { HERDR_ENV: process.env.HERDR_ENV, LIMEN_HERDR: process.env.LIMEN_HERDR, FAKE_HERDR_STATE: process.env.FAKE_HERDR_STATE };
	Object.assign(process.env, herdrEnv(herdr));
	context.after(() => {
		for (const [key, value] of Object.entries(previous)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	});
	const open = async (root: string, name: string) => {
		const jobDir = join(root, name);
		await mkdir(jobDir);
		return openWatchTab({ jobDir, label: name, cwd: root, logPath: join(jobDir, "log"), role: "worker" });
	};
	const firstPlace = await open(first.root, "first");
	const secondPlace = await open(second.root, "second");
	assert.ok(firstPlace);
	assert.ok(secondPlace);
	assert.notEqual(firstPlace.workspace, secondPlace.workspace);
	assert.equal((await open(first.root, "first-again"))?.workspace, firstPlace.workspace);
	assert.equal((await open(second.root, "second-again"))?.workspace, secondPlace.workspace);
	const alias = join(second.root, "first-alias");
	await symlink(first.root, alias);
	assert.equal((await open(alias, "via-alias"))?.workspace, firstPlace.workspace);
	const hostedJob = join(first.root, "hosted");
	await mkdir(hostedJob);
	const hosted = await openHostedTab({ jobDir: hostedJob, label: "hosted", cwd: second.root, workspaceCwd: first.root, role: "worker", env: {} });
	assert.equal(hosted.workspace, firstPlace.workspace);
	assert.match(await readFile(herdr.calls, "utf8"), new RegExp(`tab create --workspace ${firstPlace.workspace} --label hosted · running --cwd ${second.root}`));
	const diffJob = join(first.root, "diff");
	await mkdir(diffJob);
	await openDiffTab({ jobDir: diffJob, label: "diff", cwd: second.root, workspaceCwd: first.root, hunk: "hunk", args: ["diff"] });
	assert.equal((await readFile(join(diffJob, "herdr/diff/workspace"), "utf8")).trim(), firstPlace.workspace);
	assert.equal([...(await readFile(herdr.calls, "utf8")).matchAll(/^workspace create /gm)].length, 2);
});

test("legacy spaces are not identity evidence, recorded places reopen, and duplicate qualifications stay ambiguous", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	const herdr = await installFakeHerdr(scratch.root, scratch.fakeBin);
	const previous = { HERDR_ENV: process.env.HERDR_ENV, LIMEN_HERDR: process.env.LIMEN_HERDR, FAKE_HERDR_STATE: process.env.FAKE_HERDR_STATE };
	Object.assign(process.env, herdrEnv(herdr));
	context.after(() => {
		for (const [key, value] of Object.entries(previous)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	});
	const statePath = join(herdr.dir, "state.json");
	const legacy = { workspace_id: "legacy", label: "repo workers" };
	const foreign = { workspace_id: "foreign", label: "repo workers", cwd: "/another/repo" };
	await writeFile(statePath, JSON.stringify({ tabs: { "legacy:t1": { label: "old job", pane: "legacy:p1" } }, workspaces: [legacy, foreign] }));
	const oldJob = join(scratch.root, "old-job");
	await mkdir(join(oldJob, "herdr"), { recursive: true });
	for (const [key, value] of Object.entries({ workspace: "legacy", tab: "legacy:t1", pane: "legacy:p1", mode: "log" })) {
		await writeFile(join(oldJob, "herdr", key), `${value}\n`);
	}
	assert.equal(await openJobPlace({ jobDir: oldJob, cwd: scratch.root, running: false }), "focused old-job");
	const jobDir = join(scratch.root, "new-job");
	await mkdir(jobDir);
	const input = { jobDir, label: "new", cwd: scratch.root, logPath: join(jobDir, "log"), role: "worker" };
	const place = await openWatchTab(input);
	assert.ok(place);
	assert.notEqual(place.workspace, "legacy");
	assert.notEqual(place.workspace, "foreign");
	const state = JSON.parse(await readFile(statePath, "utf8")) as { tabs: Record<string, unknown>; workspaces: { workspace_id: string; label: string }[] };
	assert.deepEqual(state.workspaces.slice(0, 2), [legacy, foreign]);
	state.workspaces.push({ workspace_id: "duplicate", label: `repo workers · ${await realpath(scratch.root)}` });
	await writeFile(statePath, JSON.stringify(state));
	const before = await readFile(herdr.calls, "utf8");
	assert.equal(await openWatchTab(input), undefined);
	assert.match(await readFile(join(jobDir, "log"), "utf8"), /ambiguous Herdr role space:.*\(2 matches\)/);
	assert.doesNotMatch((await readFile(herdr.calls, "utf8")).slice(before.length), /workspace create|tab create/);
});

async function installFakeHerdr(root: string, fakeBin: string): Promise<{ readonly dir: string; readonly bin: string; readonly calls: string }> {
	const dir = join(root, "fake-herdr");
	await mkdir(dir);
	await writeFile(join(dir, "state.json"), JSON.stringify({ tabs: {}, workspaces: [] }));
	const bin = join(fakeBin, "herdr");
	await writeFile(
		bin,
		`#!/usr/bin/env node
const { appendFileSync, readFileSync, writeFileSync } = require("node:fs");
const args = process.argv.slice(2);
const dir = process.env.FAKE_HERDR_STATE;
appendFileSync(dir + "/calls", args.join(" ") + "\\n");
const path = dir + "/state.json";
const state = JSON.parse(readFileSync(path, "utf8"));
const ok = (result) => console.log(JSON.stringify({ result }));
const fail = (code, message) => {
  console.log(JSON.stringify({ error: { code, message } }));
  process.exit(1);
};
if (args[0] === "workspace" && args[1] === "list") {
  ok({ type: "workspace_list", workspaces: state.workspaces });
} else if (args[0] === "workspace" && args[1] === "create") {
  const workspace = "w" + (state.workspaces.length + 1);
  state.workspaces.push({ workspace_id: workspace, label: args[args.indexOf("--label") + 1] });
  writeFileSync(path, JSON.stringify(state));
  ok({ type: "workspace_created", workspace: { workspace_id: workspace } });
} else if (args[0] === "tab" && args[1] === "create") {
  state.n = (state.n || 0) + 1;
  const workspace = args[args.indexOf("--workspace") + 1];
  const tab = workspace + ":t" + state.n;
  const pane = workspace + ":p" + state.n;
  const label = args.includes("--label") ? args[args.indexOf("--label") + 1] : "";
  state.tabs[tab] = { label, pane };
  writeFileSync(path, JSON.stringify(state));
  ok({ type: "tab_created", tab: { tab_id: tab, label }, root_pane: { pane_id: pane } });
} else if (args[0] === "tab" && args[1] === "get") {
  const tab = args[2];
  if (!state.tabs[tab]) fail("tab_not_found", "tab " + tab + " not found");
  ok({ type: "tab_info", tab: { tab_id: tab, label: state.tabs[tab].label } });
} else if (args[0] === "tab" && args[1] === "focus") {
  const tab = args[2];
  if (!state.tabs[tab]) fail("tab_not_found", "tab " + tab + " not found");
  ok({ type: "tab_focused", tab: { tab_id: tab } });
} else if (args[0] === "tab" && args[1] === "rename") {
  const tab = args[2];
  if (!state.tabs[tab]) fail("tab_not_found", "tab " + tab + " not found");
  state.tabs[tab].label = args.slice(3).join(" ");
  writeFileSync(path, JSON.stringify(state));
  ok({ type: "tab_renamed", tab: { tab_id: tab, label: state.tabs[tab].label } });
} else if (args[0] === "tab" && args[1] === "close") {
  const tab = args[2];
  if (!state.tabs[tab]) fail("tab_not_found", "tab " + tab + " not found");
  delete state.tabs[tab];
  writeFileSync(path, JSON.stringify(state));
  ok({ type: "tab_closed", tab: { tab_id: tab } });
} else if (args[0] === "pane" && args[1] === "run") {
  ok({ type: "pane_ran" });
}
`,
	);
	await chmod(bin, 0o755);
	return { dir, bin, calls: join(dir, "calls") };
}

function herdrEnv(herdr: { readonly bin: string; readonly dir: string }): NodeJS.ProcessEnv {
	return { HERDR_ENV: "1", LIMEN_HERDR: herdr.bin, FAKE_HERDR_STATE: herdr.dir };
}

async function closeFakeTab(herdr: { readonly dir: string }, tab: string): Promise<void> {
	const path = join(herdr.dir, "state.json");
	const state = JSON.parse(await readFile(path, "utf8")) as { tabs: Record<string, unknown> };
	delete state.tabs[tab];
	await writeFile(path, JSON.stringify(state));
}
