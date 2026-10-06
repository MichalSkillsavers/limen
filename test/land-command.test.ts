// F925 old suite, frozen at 241 lines. Delete this file when its replacement lands; never add to it.
import assert from "node:assert/strict";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { git, limen, onlyJobId, type Scratch, scratchRepo, waitForState } from "./scratch.ts";

function commitProject(root: string): void {
	git(root, "add", ".");
	git(root, "commit", "-m", "init");
}

test("land --yes fast-forwards a done job onto the current branch", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	commitProject(scratch.root);
	const before = git(scratch.root, "rev-parse", "HEAD");
	const id = onlyJobId(limen(scratch, "spawn", "--label", "F717 land", "make commit").stdout);
	await waitForState(scratch.root, id, "done");
	const job = join(scratch.root, ".limen/jobs", id);
	const branch = (await readFile(join(job, "branch"), "utf8")).trim();
	const tip = git(scratch.root, "rev-parse", branch);
	// Finalize removes pid and born just after publishing state; compare only what land could touch.
	const settled = async () => (await readdir(job)).filter((name) => name !== "pid" && name !== "born").sort();
	const files = await settled();
	const state = await readFile(join(job, "state"), "utf8");
	assert.notEqual(tip, before);

	const landed = limen(scratch, "land", id, "--yes");
	assert.equal(landed.status, 0, landed.stderr);
	assert.match(landed.stdout, new RegExp(`landed ${id} onto main`));
	assert.equal(git(scratch.root, "rev-parse", "HEAD"), tip);
	assert.equal(await readFile(join(scratch.root, "candidate.txt"), "utf8"), "candidate\n");
	assert.equal(await readFile(join(job, "state"), "utf8"), state);
	assert.deepEqual(await settled(), files);
});

test("land --yes merges when the target has moved", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	commitProject(scratch.root);
	const id = onlyJobId(limen(scratch, "spawn", "--label", "F717 merge", "make commit").stdout);
	await waitForState(scratch.root, id, "done");
	const job = join(scratch.root, ".limen/jobs", id);
	const branch = (await readFile(join(job, "branch"), "utf8")).trim();
	const tip = git(scratch.root, "rev-parse", branch);
	await writeFile(join(scratch.root, "main-only.txt"), "main\n");
	git(scratch.root, "add", "main-only.txt");
	git(scratch.root, "commit", "-m", "main moves");

	const landed = limen(scratch, "land", id, "--onto", "main", "--yes");
	assert.equal(landed.status, 0, landed.stderr);
	assert.match(landed.stdout, new RegExp(`landed ${id} onto main`));
	assert.match(git(scratch.root, "log", "-1", "--format=%P"), / /);
	git(scratch.root, "merge-base", "--is-ancestor", tip, "HEAD");
	assert.equal(await readFile(join(scratch.root, "candidate.txt"), "utf8"), "candidate\n");
	assert.equal(await readFile(join(scratch.root, "main-only.txt"), "utf8"), "main\n");
});

test("land refuses running job, empty commits, an uncommitted file in the merge, and unconfirmed merge", async (context) => {
	const scratch = await scratchRepo(`#!/usr/bin/env node
process.on("SIGTERM", () => process.exit(0));
console.log("waiting");
setInterval(() => {}, 1000);
`);
	context.after(scratch.cleanup);
	limen(scratch, "init");
	commitProject(scratch.root);
	const main = git(scratch.root, "rev-parse", "HEAD");

	const runningId = onlyJobId(limen(scratch, "spawn", "--label", "F717 run", "wait").stdout);
	const running = limen(scratch, "land", runningId, "--yes");
	assert.equal(running.status, 1);
	assert.match(running.stderr, /land requires a done job/);
	assert.equal(git(scratch.root, "rev-parse", "HEAD"), main);
	assert.equal(limen(scratch, "stop", runningId).status, 0);

	const emptyScratch = await scratchRepo();
	context.after(emptyScratch.cleanup);
	limen(emptyScratch, "init");
	commitProject(emptyScratch.root);
	const emptyMain = git(emptyScratch.root, "rev-parse", "HEAD");
	const emptyId = onlyJobId(limen(emptyScratch, "spawn", "--label", "F717 empty", "do work").stdout);
	await waitForState(emptyScratch.root, emptyId, "done");
	const empty = limen(emptyScratch, "land", emptyId, "--yes");
	assert.equal(empty.status, 1);
	assert.match(empty.stderr, /has no commits to land/);
	assert.equal(git(emptyScratch.root, "rev-parse", "HEAD"), emptyMain);

	const dirtyScratch = await scratchRepo();
	context.after(dirtyScratch.cleanup);
	limen(dirtyScratch, "init");
	commitProject(dirtyScratch.root);
	const dirtyId = onlyJobId(limen(dirtyScratch, "spawn", "--label", "F717 dirty", "make commit").stdout);
	await waitForState(dirtyScratch.root, dirtyId, "done");
	const dirtyMain = git(dirtyScratch.root, "rev-parse", "HEAD");
	// The job adds candidate.txt; an uncommitted copy in the checkout belongs to another session.
	await writeFile(join(dirtyScratch.root, "candidate.txt"), "another session\n");
	const dirty = limen(dirtyScratch, "land", dirtyId, "--yes");
	assert.equal(dirty.status, 1);
	assert.match(dirty.stderr, /target main has uncommitted changes in files this land would change: candidate\.txt/);
	assert.equal(git(dirtyScratch.root, "rev-parse", "HEAD"), dirtyMain);
	assert.equal(await readFile(join(dirtyScratch.root, "candidate.txt"), "utf8"), "another session\n");

	const confirmScratch = await scratchRepo();
	context.after(confirmScratch.cleanup);
	limen(confirmScratch, "init");
	commitProject(confirmScratch.root);
	const confirmId = onlyJobId(limen(confirmScratch, "spawn", "--label", "F717 confirm", "make commit").stdout);
	await waitForState(confirmScratch.root, confirmId, "done");
	const confirmMain = git(confirmScratch.root, "rev-parse", "HEAD");
	git(confirmScratch.root, "branch", "other");
	const unconfirmed = limen(confirmScratch, "land", confirmId);
	assert.equal(unconfirmed.status, 1);
	assert.match(unconfirmed.stderr, /land requires a TTY confirm, or pass --yes/);
	assert.equal(git(confirmScratch.root, "rev-parse", "HEAD"), confirmMain);
	const onto = limen(confirmScratch, "land", confirmId, "--onto", "other", "--yes");
	assert.equal(onto.status, 1);
	assert.match(onto.stderr, /checkout other first/);
	assert.equal(git(confirmScratch.root, "rev-parse", "HEAD"), confirmMain);
	assert.equal(git(confirmScratch.root, "rev-parse", "other"), confirmMain);
});

test("land merges beside another session's uncommitted files and never touches them", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	await writeFile(join(scratch.root, "shared.txt"), "committed\n");
	commitProject(scratch.root);
	const id = onlyJobId(limen(scratch, "spawn", "--label", "F925 beside", "make commit").stdout);
	await waitForState(scratch.root, id, "done");
	const branch = (await readFile(join(scratch.root, ".limen/jobs", id, "branch"), "utf8")).trim();
	await writeFile(join(scratch.root, "main-only.txt"), "main\n");
	git(scratch.root, "add", "main-only.txt");
	git(scratch.root, "commit", "-m", "main moves");
	await writeFile(join(scratch.root, "shared.txt"), "another session edits\n");
	await writeFile(join(scratch.root, "draft.txt"), "another session drafts\n");
	const staged = join(scratch.root, "staged.txt");
	await writeFile(staged, "staged\n");
	git(scratch.root, "add", "staged.txt");
	const refused = limen(scratch, "land", id, "--yes");
	assert.equal(refused.status, 1);
	assert.match(refused.stderr, /target main has staged changes.*staged\.txt/);
	git(scratch.root, "rm", "--cached", "--quiet", "staged.txt");
	const before = git(scratch.root, "status", "--porcelain");

	const landed = limen(scratch, "land", id, "--yes");
	assert.equal(landed.status, 0, landed.stderr);
	assert.match(landed.stdout, /3 uncommitted files .* stay untouched/);
	git(scratch.root, "merge-base", "--is-ancestor", branch, "HEAD");
	assert.equal(await readFile(join(scratch.root, "candidate.txt"), "utf8"), "candidate\n");
	const merged = git(scratch.root, "diff", "--name-only", "HEAD^1", "HEAD").split("\n");
	assert.ok(merged.includes("candidate.txt"), merged.join(", "));
	for (const name of ["shared.txt", "draft.txt", "staged.txt"]) assert.ok(!merged.includes(name), `${name} entered the merge`);
	assert.equal(git(scratch.root, "show", "HEAD:shared.txt"), "committed");
	assert.equal(git(scratch.root, "status", "--porcelain"), before);
	assert.equal(await readFile(join(scratch.root, "shared.txt"), "utf8"), "another session edits\n");
	assert.equal(await readFile(join(scratch.root, "draft.txt"), "utf8"), "another session drafts\n");
});

test("a land that conflicts beside another session's files aborts and leaves them as they were", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	await writeFile(join(scratch.root, "shared.txt"), "committed\n");
	commitProject(scratch.root);
	const id = onlyJobId(limen(scratch, "spawn", "--label", "F925 conflict", "make commit").stdout);
	await waitForState(scratch.root, id, "done");
	await writeFile(join(scratch.root, "candidate.txt"), "main disagrees\n");
	git(scratch.root, "add", "candidate.txt");
	git(scratch.root, "commit", "-m", "main adds its own candidate");
	const main = git(scratch.root, "rev-parse", "HEAD");
	await writeFile(join(scratch.root, "shared.txt"), "another session edits\n");

	const landed = limen(scratch, "land", id, "--yes");
	assert.equal(landed.status, 1);
	assert.equal(git(scratch.root, "rev-parse", "HEAD"), main);
	assert.equal(git(scratch.root, "status", "--porcelain"), "M shared.txt");
	assert.equal(await readFile(join(scratch.root, "shared.txt"), "utf8"), "another session edits\n");
	assert.equal(await readFile(join(scratch.root, "candidate.txt"), "utf8"), "main disagrees\n");
});

async function writeMap(root: string): Promise<void> {
	const dir = join(root, ".limen/picture/nodes");
	await mkdir(dir, { recursive: true });
	await writeFile(
		join(dir, "sample.plant.md"),
		"---\nschema: architecture-map/1\nkind: plant\nid: sample.plant\nproject: sample\ntitle: Sample\nstatus: ready\nparent: null\n---\nSample plant.\n",
	);
	await writeFile(
		join(dir, "sample.worker.md"),
		"---\nschema: architecture-map/1\nkind: module\nid: sample.worker\nproject: sample\ntitle: Worker\nstatus: ready\nparent: sample.plant\nsources:\n  - spec/features/planned/F001-good-touch/ticket.md\n---\nThe worker runs the task.\n",
	);
}

async function ticketJob(scratch: Scratch, path: string, touch: string): Promise<string> {
	const id = onlyJobId(limen(scratch, "spawn", "--label", `ticket ${touch}`, "make commit").stdout);
	await waitForState(scratch.root, id, "done");
	const worktree = (await readFile(join(scratch.root, ".limen/jobs", id, "worktree"), "utf8")).trim();
	await mkdir(join(worktree, path, ".."), { recursive: true });
	await writeFile(join(worktree, path), `---\ntouches:\n  - ${touch}\nopened: 2026-10-06\n---\n\n# Ticket\n`);
	git(worktree, "add", ".");
	git(worktree, "commit", "-m", "ticket");
	return id;
}

test("land refuses tickets that fail the strict check, prints the keeper command, and lands a good ticket", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	commitProject(scratch.root);
	await writeMap(scratch.root);
	const main = git(scratch.root, "rev-parse", "HEAD");

	const badTicket = "spec/features/active/F002-bad-touch/ticket.md";
	const bad = await ticketJob(scratch, badTicket, "sample.nope");
	const refused = limen(scratch, "land", bad, "--yes");
	assert.equal(refused.status, 1);
	assert.match(refused.stderr, new RegExp(`^error ${badTicket}:3: unknown place id "sample.nope"`, "m"));
	assert.match(refused.stderr, new RegExp(`^fix: limen keeper ${badTicket} --job ${bad} --engine <engine> --provider <provider> --model <model> --thinking <level>$`, "m"));
	assert.equal(git(scratch.root, "rev-parse", "HEAD"), main);

	const good = await ticketJob(scratch, "spec/features/active/F001-good-touch/ticket.md", "sample.worker");
	const landed = limen(scratch, "land", good, "--yes");
	assert.equal(landed.status, 0, landed.stderr);
	assert.match(landed.stdout, new RegExp(`landed ${good} onto main`));
	// The board line and a moved map source only warn; the keeper or the coordinator fixes them.
	assert.match(landed.stdout, /^warn spec\/build\.md: no board line for F001; fix: add - `F001-good-touch` \(🟠 ACTIVE\)/m);
	assert.match(
		landed.stdout,
		/^warn .*\/\.limen\/picture\/nodes\/sample\.worker\.md:\d+: source "spec\/features\/planned\/F001-good-touch\/ticket\.md" does not exist at .*; fix: change it to spec\/features\/active\/F001-good-touch\/ticket\.md$/m,
	);

	// A new folder that reuses a number already on main is refused even when its fields are valid.
	const reuse = await ticketJob(scratch, "spec/features/planned/F001-second-use/ticket.md", "sample.worker");
	const duplicate = limen(scratch, "land", reuse, "--yes");
	assert.equal(duplicate.status, 1);
	assert.match(duplicate.stderr, /F001-second-use\/ticket\.md:1: F001 is also used by spec\/features\/active\/F001-good-touch\/ticket\.md/);
});
