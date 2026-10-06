import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { git, limen, onlyJobId, scratchRepo, waitForState } from "./scratch.ts";

const ROUTE = ["--engine", "pi", "--provider", "unused", "--model", "unused", "--thinking", "low"];
const TICKET = "spec/features/active/F001-keeper-proof/ticket.md";

async function project(root: string): Promise<void> {
	await mkdir(join(root, ".agents/limen"), { recursive: true });
	await writeFile(join(root, ".agents/limen/keeper.md"), "You are the spec keeper.\n");
	git(root, "add", ".");
	git(root, "commit", "-m", "init");
}

test("keeper refuses while a listed job is still running", async (context) => {
	const scratch = await scratchRepo(`#!/usr/bin/env node
process.on("SIGTERM", () => process.exit(0));
console.log("waiting");
setInterval(() => {}, 1000);
`);
	context.after(scratch.cleanup);
	limen(scratch, "init");
	await project(scratch.root);
	const id = onlyJobId(limen(scratch, "spawn", "--label", "F001 run", "wait").stdout);
	const refused = limen(scratch, "keeper", TICKET, "--job", id, ...ROUTE);
	assert.equal(refused.status, 1);
	assert.match(refused.stderr, new RegExp(`job ${id} is still running`));
	assert.equal(git(scratch.root, "branch", "--list", "limen/keeper-*"), "");
	assert.equal(limen(scratch, "stop", id).status, 0);
});

test("keeper starts a keeper job on a new branch at the candidate tip", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	await project(scratch.root);
	const id = onlyJobId(limen(scratch, "spawn", "--label", "F001 work", "make commit").stdout);
	await waitForState(scratch.root, id, "done");
	const job = join(scratch.root, ".limen/jobs", id);
	const branch = (await readFile(join(job, "branch"), "utf8")).trim();
	const worktree = (await readFile(join(job, "worktree"), "utf8")).trim();
	await mkdir(join(worktree, "spec/features/active/F001-keeper-proof"), { recursive: true });
	await writeFile(join(worktree, TICKET), "---\nopened: 2026-10-06\n---\n\n# F001 · Keeper proof\n");
	git(worktree, "add", ".");
	git(worktree, "commit", "-m", "ticket");
	const tip = git(scratch.root, "rev-parse", branch);

	const several = limen(scratch, "keeper", TICKET, "--job", id, "--job", id, ...ROUTE);
	assert.equal(several.status, 1);
	assert.match(several.stderr, /pass --candidate <integration branch>/);
	const missing = limen(scratch, "keeper", "spec/features/active/F009-absent/ticket.md", "--job", id, ...ROUTE);
	assert.equal(missing.status, 1);
	assert.match(missing.stderr, /ticket spec\/features\/active\/F009-absent\/ticket\.md is missing at/);

	const started = limen(scratch, "keeper", TICKET, "--job", id, ...ROUTE);
	assert.equal(started.status, 0, started.stderr);
	const keeperId = onlyJobId(started.stdout);
	const keeper = join(scratch.root, ".limen/jobs", keeperId);
	const keeperBranch = `limen/keeper-f001-${tip.slice(0, 7)}`;
	assert.equal((await readFile(join(keeper, "branch"), "utf8")).trim(), keeperBranch);
	assert.equal((await readFile(join(keeper, "base"), "utf8")).trim(), tip);
	assert.equal((await readFile(join(keeper, "role"), "utf8")).trim(), "keeper");
	const packet = await readFile(join(keeper, "task.md"), "utf8");
	assert.match(packet, new RegExp(`^Ticket: ${TICKET}$`, "m"));
	assert.match(packet, new RegExp(`^Candidate: ${branch} at ${tip}$`, "m"));
	assert.match(packet, new RegExp(`^Changed tickets: ${TICKET}$`, "m"));
	assert.match(packet, new RegExp(`^Job: ${id}$`, "m"));
	assert.match(packet, /^ {2}Session: none$/m);
	// The worker branch is untouched; a second keeper at the same tip is refused.
	assert.equal(git(scratch.root, "rev-parse", branch), tip);
	await waitForState(scratch.root, keeperId, "done");
	const again = limen(scratch, "keeper", TICKET, "--job", id, ...ROUTE);
	assert.equal(again.status, 1);
	assert.match(again.stderr, new RegExp(`keeper branch ${keeperBranch} already exists`));
});
