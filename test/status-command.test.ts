import assert from "node:assert/strict";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { git, limen, limenWithEnv, scratchRepo, scratchWorkspace } from "./scratch.ts";

async function job(root: string, id: string, fields: Record<string, string>): Promise<string> {
	const dir = join(root, ".limen/jobs", id);
	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, "task.md"), "job\n");
	await writeFile(join(dir, "log"), "job\n");
	for (const [name, value] of Object.entries(fields)) {
		if (name.includes("/")) await mkdir(join(dir, name.slice(0, name.lastIndexOf("/"))), { recursive: true });
		await writeFile(join(dir, name), `${value}\n`);
	}
	return dir;
}

test("plant plate shows working coordinator outside worker workspace, live hosted tool, and unmerged branch", async (context) => {
	const scratch = await scratchWorkspace();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "workspace", "init").status, 0);
	const repo = scratch.repositories.api;
	git(repo, "branch", "limen/finished");
	git(repo, "switch", "limen/finished");
	await writeFile(join(repo, "change.txt"), "changed\n");
	git(repo, "add", "change.txt");
	git(repo, "commit", "-m", "finished work");
	git(repo, "switch", "main");
	const base = git(repo, "rev-parse", "HEAD");
	await job(scratch.root, "completed", { state: "done", label: "finished change", branch: "limen/finished", repo: "api", base });
	await job(scratch.root, "worker", {
		state: "running",
		label: "live OMP worker",
		branch: "limen/worker",
		repo: "api",
		engine: "omp",
		hosted: "weaker guarantees",
		pid: "1",
		activity: "tool",
		"last-tool": "bash: git status",
		advisory: "blocked after 3 tool calls, session still open",
		"herdr/agent": "wSC:p1",
		"herdr/tab": "wSC:t1",
		worktree: join(scratch.root, ".limen-worktrees/worker"),
		"started-at": new Date().toISOString(),
	});
	const herdr = join(scratch.fakeBin, "herdr");
	await writeFile(
		herdr,
		`#!/usr/bin/env node
const args = process.argv.slice(2);
const ok = (result) => console.log(JSON.stringify({ result }));
if (args[0] === "agent" && args[1] === "get") ok({ agent: { agent_status: "working", pane_id: "wSC:p1" } });
else if (args[0] === "agent" && args[1] === "list") ok({ agents: [
  { cwd: ${JSON.stringify(repo)}, tab_id: "wNF:t19", pane_id: "wNF:p19", agent_status: "working", name: "api-coordinator", terminal_title: "π - api" },
  { cwd: ${JSON.stringify(repo)}, tab_id: "wNF:t2", pane_id: "wNF:p2", agent_status: "idle", terminal_title: "π - api" },
  { cwd: ${JSON.stringify(join(scratch.root, ".limen-worktrees/worker"))}, tab_id: "wSC:t1", pane_id: "wSC:p1", agent_status: "done" }
] });
else if (args[0] === "tab" && args[1] === "list" && process.env.TABS !== "fail") ok({ tabs: [
  { tab_id: "wNF:t19", number: 19, label: "API billing migration · F701", agent_status: "working" },
  { tab_id: "wNF:t2", number: 2, label: "2", agent_status: "idle" }
] });
else process.exit(1);
`,
	);
	await chmod(herdr, 0o755);
	const env = { LIMEN_HERDR: herdr };
	const jobs = limenWithEnv(scratch, env, "jobs", "--running");
	const status = limenWithEnv(scratch, env, "status");
	assert.equal(jobs.status, 0, jobs.stderr);
	assert.equal(status.status, 0, status.stderr);
	assert.match(jobs.stdout, /tool.*bash: git status/);
	assert.match(status.stdout, /Running \(1\):[\s\S]*live OMP worker.*wSC:t1 · \d+m · tool · blocked after 3 tool calls, session still open · bash: git status/);
	assert.match(status.stdout, /Candidates to inspect \(1\):\n  finished change \(completed\) · limen\/finished · repo api/);
	assert.doesNotMatch(status.stdout, /Ready to land/);
	assert.match(status.stdout, /Coordinator tabs:[\s\S]*\n  API billing migration · F701 · handle api-coordinator · working · wNF:t19 wNF:p19 · /);
	assert.match(status.stdout, /\n  unlabeled tab · no handle · idle · wNF:t2 wNF:p2 · /);
	assert.doesNotMatch(status.stdout, /π - api/);
	assert.doesNotMatch(status.stdout.slice(status.stdout.indexOf("Coordinator tabs:")), /wSC:t1/);
	const unlabeled = limenWithEnv(scratch, { ...env, TABS: "fail" }, "status");
	assert.equal(unlabeled.status, 0, unlabeled.stderr);
	assert.match(unlabeled.stdout, /\n  tab label unknown · handle api-coordinator · working · wNF:t19 /);
});

test("plant plate does not leave merged, empty or deleted branches waiting; Herdr absence is unknown", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const base = git(scratch.root, "rev-parse", "HEAD");
	git(scratch.root, "branch", "limen/empty");
	git(scratch.root, "branch", "limen/pending");
	git(scratch.root, "switch", "limen/pending");
	await writeFile(join(scratch.root, "candidate.txt"), "candidate\n");
	git(scratch.root, "add", "candidate.txt");
	git(scratch.root, "commit", "-m", "candidate");
	git(scratch.root, "switch", "main");
	await job(scratch.root, "pending", { state: "done", label: "pending", branch: "limen/pending", base });
	await job(scratch.root, "empty", { state: "done", label: "empty", branch: "limen/empty", base });
	await job(scratch.root, "gone", { state: "done", label: "gone", branch: "limen/gone", base });
	await job(scratch.root, "detached", {
		state: "running",
		label: "Pi detached",
		branch: "limen/detached",
		engine: "pi",
		"started-at": new Date().toISOString(),
		advisory: "tool stall observation uncertain: CPU or process identity unavailable",
	});
	const before = limen(scratch, "status");
	assert.equal(before.status, 0, before.stderr);
	assert.match(before.stdout, /Running \(1\):[\s\S]*Pi detached.*starting · ownership: tool stall observation uncertain/);
	assert.match(before.stdout, /Candidates to inspect \(1\):\n  pending \(pending\) · limen\/pending\n/);
	assert.doesNotMatch(before.stdout, /empty \(empty\)|gone \(gone\)/);
	assert.match(before.stdout, /Coordinator tabs:\n  unknown \(Herdr unavailable\)/);
	git(scratch.root, "merge", "--ff-only", "limen/pending");
	const after = limen(scratch, "status");
	assert.equal(after.status, 0, after.stderr);
	assert.match(after.stdout, /Candidates to inspect \(0\):/);
	assert.doesNotMatch(after.stdout, /pending \(pending\)/);
});

test("missing Git repository stays unconfirmed, not clear", async (context) => {
	const scratch = await scratchWorkspace();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "workspace", "init").status, 0);
	await job(scratch.root, "missing", { state: "done", label: "lost repo", branch: "limen/missing", repo: "missing" });
	const result = limen(scratch, "status");
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /Unconfirmed jobs:[\s\S]*lost repo.*Git unknown/);
	assert.match(result.stdout, /Candidates to inspect \(0\):/);
});

test("inbox hides cherry-picked and empty work, routes stopped work to a decision, and keeps old records behind --all", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const base = git(scratch.root, "rev-parse", "HEAD");
	const branchWith = async (branch: string, file: string) => {
		git(scratch.root, "switch", "-c", branch, base);
		await writeFile(join(scratch.root, file), `${file}\n`);
		git(scratch.root, "add", file);
		git(scratch.root, "commit", "-m", file);
		git(scratch.root, "switch", "main");
	};
	await branchWith("limen/picked", "picked.txt");
	await branchWith("limen/stopped", "stopped.txt");
	await branchWith("limen/failed", "failed.txt");
	await branchWith("limen/old", "old.txt");
	git(scratch.root, "branch", "limen/idle", base);
	await writeFile(join(scratch.root, "main.txt"), "main moved on\n");
	git(scratch.root, "add", "main.txt");
	git(scratch.root, "commit", "-m", "main moved on");
	git(scratch.root, "cherry-pick", "limen/picked");
	const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
	await job(scratch.root, "picked", { state: "done", label: "picked work", branch: "limen/picked", base });
	await job(scratch.root, "stopped", { state: "stopped", label: "stopped work", branch: "limen/stopped", base });
	await job(scratch.root, "failed", { state: "failed", label: "failed work", branch: "limen/failed", base });
	await job(scratch.root, "idle", { state: "failed", label: "idle failure", branch: "limen/idle", base });
	await job(scratch.root, "old", { state: "done", label: "old work", branch: "limen/old", base, "finished-at": eightDaysAgo });
	const status = limen(scratch, "status");
	assert.equal(status.status, 0, status.stderr);
	assert.match(
		status.stdout,
		/Candidates to inspect \(0\):\n  none\nNeeds a decision \(2\):\n  failed work \(failed\) · failed · limen\/failed\n  stopped work \(stopped\) · stopped · limen\/stopped\n/,
	);
	assert.doesNotMatch(status.stdout, /picked work|idle failure|old work/);
	assert.match(status.stdout, /Older: 1 record \(limen status --all\)/);
	const everything = limen(scratch, "status", "--all");
	assert.equal(everything.status, 0, everything.stderr);
	assert.match(everything.stdout, /Candidates to inspect \(1\):\n  old work \(old\) · limen\/old\n/);
	assert.doesNotMatch(everything.stdout, /picked work|idle failure|Older:/);
	const retire = limen(scratch, "prune", "--retire", "--dry-run");
	assert.equal(retire.status, 0, retire.stderr);
	assert.equal(retire.stdout.trim(), "would retire idle\nwould retire picked");
});

test("recorded origin stays visible when global Herdr agent discovery times out", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	await job(scratch.root, "worker", {
		state: "running",
		label: "active worker",
		branch: "limen/worker",
		pid: "1",
		activity: "tool",
		"started-at": new Date().toISOString(),
		"origin-tab": "w9:t1",
		"herdr/tab": "w9:t2",
	});
	const herdr = join(scratch.fakeBin, "herdr");
	await writeFile(
		herdr,
		`#!/usr/bin/env node
if (process.argv[2] === "agent") process.exit(1);
console.log(JSON.stringify({ result: { tabs: [
  { tab_id: "w9:t1", number: 1, label: "Release coordinator", agent_status: "working" },
  { tab_id: "w9:t2", agent_status: "working" }
] } }));
`,
	);
	await chmod(herdr, 0o755);
	const status = limenWithEnv(scratch, { LIMEN_HERDR: herdr }, "status");
	assert.equal(status.status, 0, status.stderr);
	assert.match(status.stdout, /Running \(1\):[\s\S]*active worker/);
	assert.match(status.stdout, /Coordinator tabs:[\s\S]*Release coordinator · working · w9:t1/);
	assert.doesNotMatch(status.stdout, /w9:t2 · working/);
	assert.match(status.stdout, /origin tabs only/);
});

test("open groups collapse unique member branches and closed groups leave the inbox", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const base = git(scratch.root, "rev-parse", "HEAD");
	for (const name of ["shared", "second", "solo-done", "solo-failed", "solo-stopped", "old"]) {
		git(scratch.root, "switch", "-c", `limen/${name}`, base);
		await writeFile(join(scratch.root, `${name}.txt`), `${name}\n`);
		git(scratch.root, "add", `${name}.txt`);
		git(scratch.root, "commit", "-m", name);
		git(scratch.root, "switch", "main");
	}
	const members = [
		{ id: "member-a", state: "done", branch: "limen/shared" },
		{ id: "member-b", state: "failed", branch: "limen/shared" },
		{ id: "member-c", state: "stopped", branch: "limen/second" },
		{ id: "member-old", state: "done", branch: "limen/old" },
	];
	for (const { id, ...fields } of members)
		await job(scratch.root, id, {
			...fields,
			group: "group-run",
			label: id,
			base,
			"finished-at": new Date(Date.now() - (id === "member-old" ? 8 * 24 * 60 * 60 * 1000 : 0)).toISOString(),
		});
	for (const state of ["done", "failed", "stopped"]) await job(scratch.root, `solo-${state}`, { state, label: `solo ${state}`, branch: `limen/solo-${state}`, base });
	const directory = join(scratch.root, ".limen/groups/group-run");
	await mkdir(directory, { recursive: true });
	const run = {
		id: "group-run",
		root: scratch.root,
		feature: "spec/features/active/F773-group-inbox",
		closed: false,
		members: members.map(({ id }) => ({ id, team: "team-1", role: "worker", deadline: Date.now() + 60_000 })),
	};
	await writeFile(join(directory, "run.json"), JSON.stringify(run));
	const open = limen(scratch, "status");
	assert.equal(open.status, 0, open.stderr);
	assert.match(
		open.stdout,
		/Candidates to inspect \(2\):\n  group spec\/features\/active\/F773-group-inbox: 2 member branches; the lead decides \(limen group status group-run\)\n  solo done \(solo-done\) · limen\/solo-done/,
	);
	assert.match(
		open.stdout,
		/Needs a decision \(2\):\n  solo failed \(solo-failed\) · failed · limen\/solo-failed\n  solo stopped \(solo-stopped\) · stopped · limen\/solo-stopped/,
	);
	assert.doesNotMatch(open.stdout, /member-[abc]|member-old|limen\/shared|limen\/second/);
	assert.match(open.stdout, /Older: 1 record/);
	const all = limen(scratch, "status", "--all");
	assert.equal(all.status, 0, all.stderr);
	assert.match(all.stdout, /group spec\/features\/active\/F773-group-inbox: 3 member branches/);
	await writeFile(join(directory, "run.json"), JSON.stringify({ ...run, closed: true }));
	const closed = limen(scratch, "status", "--all");
	assert.equal(closed.status, 0, closed.stderr);
	assert.match(closed.stdout, /Candidates to inspect \(1\):\n  solo done \(solo-done\) · limen\/solo-done/);
	assert.match(closed.stdout, /Needs a decision \(2\):/);
	assert.doesNotMatch(closed.stdout, /group-run|F773-group-inbox|member-|limen\/shared|limen\/second|limen\/old/);
});

test("unreadable and corrupt group records keep recoverable work visible", async (context) => {
	const scratch = await scratchWorkspace();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "workspace", "init").status, 0);
	const repo = scratch.repositories.api;
	git(repo, "switch", "-c", "limen/recover");
	await writeFile(join(repo, "recover.txt"), "recover\n");
	git(repo, "add", "recover.txt");
	git(repo, "commit", "-m", "recover");
	git(repo, "switch", "main");
	await job(scratch.root, "recover", { state: "done", label: "recover work", branch: "limen/recover", repo: "api", group: "broken-group" });
	await job(scratch.root, "unknown", { state: "failed", label: "unknown Git work", branch: "limen/unknown", repo: "missing", group: "broken-group" });
	const directory = join(scratch.root, ".limen/groups/broken-group");
	await mkdir(directory, { recursive: true });
	for (const record of [undefined, "{", JSON.stringify({ id: "broken-group", root: scratch.root, closed: true, members: [{ id: "recover" }, { id: "unknown" }] })]) {
		if (record !== undefined) await writeFile(join(directory, "run.json"), record);
		const result = limen(scratch, "status");
		assert.equal(result.status, 0, result.stderr);
		assert.match(result.stdout, /Candidates to inspect \(1\):\n  recover work \(recover\) · limen\/recover · repo api/);
		assert.match(result.stdout, /Unconfirmed jobs:[\s\S]*unknown Git work \(unknown\) · Git unknown:/);
		assert.doesNotMatch(result.stdout, /the lead decides/);
	}
});
