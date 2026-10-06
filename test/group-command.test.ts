// F925 old suite, frozen at 881 lines. Delete this file when its replacement lands; never add to it.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { chmod, mkdir, readdir, readFile, rm, symlink, utimes, writeFile } from "node:fs/promises";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import groupPeer from "../hook/group-peer.ts";
import { waitGroup } from "../src/commands/group.ts";
import type { GroupIdentity, GroupRun } from "../src/job/group-cabinet.ts";
import { claimMember, groupLock, groupPath, readRun, saveJson } from "../src/job/group-cabinet.ts";
import { acceptBatch, acceptTransport, groupEvents, observeBatch, publishEvent, releaseBatch, syncLifecycle } from "../src/job/group-events.ts";
import { finalizeJob } from "../src/job/record.ts";
import { noteHostedIdle } from "../src/runtime/supervisor.ts";
import type { Scratch } from "./scratch.ts";
import { git, LIMEN, limen, limenWithEnv, onlyJobId, scratchRepo, waitForState, writeFakePi } from "./scratch.ts";

const settings = [
	"--teams",
	"2",
	"--workers-per-team",
	"1",
	"--timeout",
	"30m",
	"--worker-timeout",
	"20m",
	"--engine",
	"omp",
	"--provider",
	"openai-codex",
	"--model",
	"gpt-6.1-sol",
	"--thinking",
	"xhigh",
	"--worker-thinking",
	"high",
	"--detached",
];
const workerSettings = ["--engine", "omp", "--provider", "openai-codex", "--model", "gpt-6.1-sol", "--thinking", "high", "--detached"];
const lead = { PI_SESSION_ID: "group-lead" };
const fake = `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const dir = args[args.indexOf('--session-dir') + 1];
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'session.jsonl'), '{"type":"session","id":"fake"}\\n');
console.log(JSON.stringify({ type: 'message_end', message: { role: 'assistant', content: [{ type: 'text', text: 'fixture completed' }] } }));
`;
async function fixture(privatePacket = false): Promise<Scratch & { feature: string }> {
	const scratch = await scratchRepo(fake);
	assert.equal(limen(scratch, "init").status, 0);
	const feature = "spec/features/active/F001-example";
	await mkdir(`${scratch.root}/${feature}/group/teams`, { recursive: true });
	for (const path of ["ticket.md", "group/brief.md", "group/teams/team-1.md", "group/teams/team-2.md"]) await writeFile(`${scratch.root}/${feature}/${path}`, `# ${path}\n`);
	if (privatePacket) await writeFile(`${scratch.root}/.gitignore`, "/spec/\n/.limen/\n");
	git(scratch.root, "add", ".");
	git(scratch.root, "commit", "-m", "group packet");
	await mkdir(`${scratch.root}/.limen/group-leads`, { recursive: true });
	await writeFile(`${scratch.root}/.limen/group-leads/group-lead`, `${process.pid}\n`);
	return { ...scratch, feature };
}
async function activate(scratch: Scratch & { feature: string }): Promise<GroupRun> {
	const result = limenWithEnv(scratch, lead, "group", "start", scratch.feature, ...settings);
	assert.equal(result.status, 0, result.stderr);
	const run = await readRun(scratch.root, onlyJobId(result.stdout));
	for (const member of run.members) await waitForState(scratch.root, member.id, "done");
	return run;
}
function environment(run: GroupRun, id = run.members[0]?.id): NodeJS.ProcessEnv {
	const member = run.members.find((member) => member.id === id);
	assert.ok(member);
	return { LIMEN_JOB: "1", LIMEN_JOB_ID: member.id, LIMEN_CONTEXT_ROOT: run.root, LIMEN_GROUP_ID: run.id, LIMEN_TEAM_ID: member.team };
}
async function launch(scratch: Scratch, added: NodeJS.ProcessEnv, ...args: string[]): Promise<{ status: number; stdout: string; stderr: string }> {
	const env: NodeJS.ProcessEnv = { ...process.env, ...added, PATH: `${scratch.fakeBin}:${process.env.PATH}`, LIMEN_HOME: scratch.root, LIMEN_HERDR: "0" };
	delete env.LIMEN_INTERNAL_RUN;
	delete env.LIMEN_INTERNAL_HOSTED;
	delete env.HERDR_ENV;
	delete env.LIMEN_OMP;
	delete env.LIMEN_PI;
	if (!added.LIMEN_JOB) delete env.LIMEN_JOB;
	const child = spawn(process.execPath, [LIMEN, ...args], { cwd: scratch.root, env, stdio: ["ignore", "pipe", "pipe"] });
	let stdout = "",
		stderr = "";
	child.stdout.on("data", (chunk: Buffer) => {
		stdout += chunk;
	});
	child.stderr.on("data", (chunk: Buffer) => {
		stderr += chunk;
	});
	const result = Promise.withResolvers<number>();
	child.once("error", result.reject);
	child.once("close", (code) => result.resolve(code ?? 1));
	return { status: await result.promise, stdout, stderr };
}

test("group status offers a short roster and opt-in full evidence without losing missing job slots", async (context) => {
	const scratch = await fixture();
	context.after(scratch.cleanup);
	const run = await activate(scratch);
	const reserved = await claimMember(run, "team-1", "worker", "reserved-worker");
	const status = limenWithEnv(scratch, lead, "group", "status", run.id);
	assert.equal(status.status, 0, status.stderr);
	assert.ok(status.stdout.includes(run.feature));
	assert.match(status.stdout, /Deadline: .+ · \d+ minutes left/);
	assert.match(status.stdout, /Stopped: no · Closed: no/);
	assert.ok(status.stdout.includes(`team-1 worker (${reserved.id}): no job record yet`));
	for (const member of run.members) assert.ok(status.stdout.includes(`${member.team} ${member.role} (${member.id}): done`));
	assert.equal(status.stdout.trim().split("\n").length, 3 + run.members.length + 1);
	const json = limenWithEnv(scratch, lead, "group", "status", run.id, "--json");
	assert.equal(json.status, 0, json.stderr);
	const record = JSON.parse(json.stdout);
	assert.equal(record.id, run.id);
	assert.equal(record.deadline, run.deadline);
	assert.equal(record.members.find((member: { id: string }) => member.id === reserved.id).state, "no job record yet");
	assert.ok(Array.isArray(record.events));
	assert.ok(Array.isArray(record.receipts));
	const refused = limenWithEnv(scratch, lead, "group", "close", run.id);
	assert.equal(refused.status, 1);
	assert.equal((await readRun(run.root, run.id)).closed, false);
	assert.equal(limenWithEnv(scratch, lead, "group", "stop", run.id).status, 0);
	assert.equal(limenWithEnv(scratch, lead, "group", "close", run.id).status, 0);
	const closed = limenWithEnv(scratch, lead, "group", "status", run.id);
	assert.match(closed.stdout, /Stopped: yes · Closed: yes/);
});

test("unknown group commands are rejected before group lookup and missing records are explained", async (context) => {
	const scratch = await fixture();
	context.after(scratch.cleanup);
	for (const args of [[], ["frobnicate", "unknown-group"], ["status", "unknown-group"]]) {
		const result = limenWithEnv(scratch, lead, "group", ...args);
		assert.equal(result.status, 1);
		assert.doesNotMatch(result.stderr, /ENOENT|run\.json/);
		assert.match(result.stderr, /run limen group/);
	}
	assert.deepEqual(await readdir(`${scratch.root}/.limen/groups`).catch(() => []), []);
});

test("private planning admits an ignored packet without copying it, and pins descendants and continuations", async (context) => {
	const scratch = await fixture(true);
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "planning", "private").status, 0);
	await writeFile(`${scratch.root}/${scratch.feature}/group/teams/team-1.md`, "PRIVATE APPROACH CONTENT\n");
	const run = await activate(scratch);
	assert.equal(run.planningSource, "private");
	assert.equal(git(scratch.root, "ls-tree", "-r", "--name-only", "HEAD", "--", "spec"), "");
	const coordinator = run.members[0];
	assert.ok(coordinator);
	const job = `${scratch.root}/.limen/jobs/${coordinator.id}`;
	const worktree = (await readFile(`${job}/worktree`, "utf8")).trim();
	assert.equal(existsSync(`${worktree}/spec`), false);
	const task = await readFile(`${job}/task.md`, "utf8");
	assert.ok(task.includes(`Ticket: ${scratch.root}/${scratch.feature}/ticket.md`));
	assert.ok(task.includes(`Brief: ${scratch.root}/${scratch.feature}/group/brief.md`));
	assert.ok(task.includes(`Approach note: ${scratch.root}/${scratch.feature}/group/teams/team-1.md`));
	assert.doesNotMatch(task, /PRIVATE APPROACH CONTENT/);
	assert.equal(limen(scratch, "planning", "committed").status, 0);
	const repeat = limenWithEnv(scratch, lead, "group", "start", scratch.feature, ...settings);
	assert.equal(repeat.status, 0, repeat.stderr);
	assert.equal(onlyJobId(repeat.stdout), run.id);
	run.workersPerTeam = 2;
	await saveJson(`${groupPath(run)}/run.json`, run);
	const child = limenWithEnv({ ...scratch, root: worktree }, environment(run), "spawn", `Read canonical packet. Ticket: ${scratch.feature}/ticket.md`, ...workerSettings);
	assert.equal(child.status, 0, child.stderr);
	const childId = onlyJobId(child.stdout);
	await waitForState(scratch.root, childId, "done");
	const childJob = `${scratch.root}/.limen/jobs/${childId}`;
	assert.equal((await readFile(`${childJob}/planning-source`, "utf8")).trim(), "private");
	assert.ok((await readFile(`${childJob}/task.md`, "utf8")).includes(`Ticket: ${scratch.root}/${scratch.feature}/ticket.md`));
	const childTree = (await readFile(`${childJob}/worktree`, "utf8")).trim();
	assert.equal(existsSync(`${childTree}/spec`), false);
	const continued = limenWithEnv(scratch, lead, "continue", childId, "Check again", ...workerSettings);
	assert.equal(continued.status, 0, continued.stderr);
	const continuedId = onlyJobId(continued.stdout);
	await waitForState(scratch.root, continuedId, "done");
	assert.equal((await readFile(`${scratch.root}/.limen/jobs/${continuedId}/planning-source`, "utf8")).trim(), "private");
	assert.ok((await readFile(`${scratch.root}/.limen/jobs/${continuedId}/task.md`, "utf8")).includes(`Ticket: ${scratch.root}/${scratch.feature}/ticket.md`));
});

test("private packet failures occur before activation, and default mode still requires committed prerequisites", async (context) => {
	const scratch = await fixture(true);
	context.after(scratch.cleanup);
	const start = (feature = scratch.feature) => limenWithEnv(scratch, lead, "group", "start", feature, ...settings);
	assert.equal(start().status, 1);
	assert.equal(limen(scratch, "planning", "private").status, 0);
	const note = `${scratch.root}/${scratch.feature}/group/teams/team-2.md`;
	await rm(note);
	assert.equal(start().status, 1);
	await writeFile(note, "unreadable\n", { mode: 0o000 });
	assert.match(start().stderr, /not readable/);
	await chmod(note, 0o600);
	await rm(note);
	await writeFile(`${scratch.root}/../outside.md`, "outside\n");
	await symlink(`${scratch.root}/../outside.md`, note);
	assert.match(start().stderr, /escapes canonical root/);
	assert.equal(start(`${scratch.feature}/../F001-example`).status, 1);
	assert.match(start("../outside").stderr, /inside this repository/);
	assert.equal(existsSync(`${scratch.root}/.limen/groups`), false);
	assert.deepEqual(await readdir(`${scratch.root}/.limen/jobs`).catch(() => []), []);
});

test("group start refuses a hosted job and points at the Herdr coordinator lead recipe", async (context) => {
	const scratch = await fixture();
	context.after(scratch.cleanup);
	const asJob = limenWithEnv(scratch, { ...lead, LIMEN_JOB: "1", LIMEN_JOB_ID: "pretend-lead" }, "group", "start", scratch.feature, ...settings);
	assert.equal(asJob.status, 1);
	assert.match(asJob.stderr, /LIMEN_COORDINATOR=1/);
	assert.match(asJob.stderr, /LIMEN_JOB=1/);
	assert.match(asJob.stderr, /group-peer/);
	assert.equal(existsSync(`${scratch.root}/.limen/groups`), false);
	const asMemberRole = limen(scratch, "spawn", "--detached", "--role", "coordinator", "--label", "fake group lead", "pretend to own the group");
	assert.equal(asMemberRole.status, 1);
	assert.match(asMemberRole.stderr, /LIMEN_COORDINATOR=1/);
	assert.match(asMemberRole.stderr, /group start/);
	assert.deepEqual(await readdir(`${scratch.root}/.limen/jobs`).catch(() => []), []);
});

test("group start refuses a lead registration that no running hook refreshes, and names the reload fix", async (context) => {
	const scratch = await fixture();
	context.after(scratch.cleanup);
	// The process is alive, but a registration the hook stopped refreshing (or that was written by hand) is not a lead.
	const registration = `${scratch.root}/.limen/group-leads/group-lead`;
	const old = new Date(Date.now() - 60_000);
	await utimes(registration, old, old);
	const refused = limenWithEnv(scratch, lead, "group", "start", scratch.feature, ...settings);
	assert.equal(refused.status, 1);
	assert.match(refused.stderr, /group lead hook is not running in this pane/);
	assert.match(refused.stderr, /Reload this interactive Herdr coordinator .*hook\/group-peer\.ts/);
	assert.match(refused.stderr, /Do not write \.limen\/group-leads by hand/);
	assert.equal(existsSync(`${scratch.root}/.limen/groups`), false);
	const now = new Date();
	await utimes(registration, now, now);
	assert.equal(limenWithEnv(scratch, lead, "group", "start", scratch.feature, ...settings).status, 0);
});

test("duplicate and concurrent activation start one fixed roster, never repair or add agents", async (context) => {
	const scratch = await fixture();
	context.after(scratch.cleanup);
	const results = await Promise.all([launch(scratch, lead, "group", "start", scratch.feature, ...settings), launch(scratch, lead, "group", "start", scratch.feature, ...settings)]);
	for (const result of results) assert.equal(result.status, 0, result.stderr);
	assert.equal(onlyJobId(results[0]?.stdout ?? ""), onlyJobId(results[1]?.stdout ?? ""));
	const run = await readRun(scratch.root, onlyJobId(results[0]?.stdout ?? ""));
	for (const member of run.members) await waitForState(scratch.root, member.id, "done");
	assert.deepEqual(run.teams, ["team-1", "team-2"]);
	assert.equal(run.workersPerTeam, 1);
	assert.equal(run.members.filter((member) => member.role === "coordinator").length, 2);
	const repeat = limenWithEnv(scratch, lead, "group", "start", scratch.feature, ...settings);
	assert.equal(repeat.status, 0, repeat.stderr);
	assert.equal(onlyJobId(repeat.stdout), run.id);
	assert.equal((await readdir(`${scratch.root}/.limen/jobs`)).length, 2);
	assert.equal(limenWithEnv(scratch, lead, "group", "start", scratch.feature, ...settings, "--new-run").status, 1);
});

test("invalid activation creates no group and ignores inherited plant roots", async (context) => {
	const scratch = await fixture();
	context.after(scratch.cleanup);
	const invalid = limenWithEnv(scratch, lead, "group", "start", scratch.feature, ...settings.filter((_, index) => index !== 2 && index !== 3));
	assert.equal(invalid.status, 1);
	assert.match(invalid.stderr, /--workers-per-team/);
	assert.equal(existsSync(`${scratch.root}/.limen/groups`), false);
	const launched = limenWithEnv(scratch, { ...lead, LIMEN_CONTEXT_ROOT: "/not-the-selected-plant" }, "group", "start", scratch.feature, ...settings);
	assert.equal(launched.status, 0, launched.stderr);
	const run = await readRun(scratch.root, onlyJobId(launched.stdout));
	assert.equal(run.root, scratch.root);
	for (const member of run.members) await waitForState(scratch.root, member.id, "done");
});

test("concurrent worktree spawns consume one total slot and never create a second cabinet", async (context) => {
	const scratch = await fixture();
	context.after(scratch.cleanup);
	const run = await activate(scratch);
	const coordinator = run.members[0];
	assert.ok(coordinator);
	const worktree = (await readFile(`${scratch.root}/.limen/jobs/${coordinator.id}/worktree`, "utf8")).trim();
	const memberScratch = { ...scratch, root: worktree };
	const results = await Promise.all([
		launch(memberScratch, environment(run), "spawn", "candidate", ...workerSettings),
		launch(memberScratch, environment(run), "spawn", "another candidate", ...workerSettings),
	]);
	assert.deepEqual(results.map((result) => result.status).sort(), [0, 1]);
	const worker = onlyJobId(results.find((result) => result.status === 0)?.stdout ?? "");
	await waitForState(scratch.root, worker, "done");
	assert.equal(existsSync(`${worktree}/.limen/jobs`), false);
	const childTree = (await readFile(`${scratch.root}/.limen/jobs/${worker}/worktree`, "utf8")).trim();
	assert.notEqual(childTree, worktree);
	const peer = environment(run, run.members[1]?.id);
	assert.equal(limenWithEnv(memberScratch, peer, "jobs", worker).status, 0);
	assert.equal(limenWithEnv(memberScratch, peer, "diff", worker).status, 0);
	const refused = limenWithEnv(memberScratch, peer, "stop", worker);
	assert.equal(refused.status, 1);
	assert.match(refused.stderr, /cannot stop, steer, continue, watch, or land another team's job/);
	assert.match(limenWithEnv(memberScratch, environment(run), "land", worker, "--yes").stderr, /lead owns landing/);
	const continued = limenWithEnv(scratch, lead, "continue", worker, "more evidence", ...workerSettings);
	assert.equal(continued.status, 1);
	assert.match(limenWithEnv(scratch, lead, "continue", coordinator.id, "more coordination", ...workerSettings).stderr, /coordinator continuation/);
});

test("worker continuation inherits membership and deadline but consumes another slot", async (context) => {
	const scratch = await fixture();
	context.after(scratch.cleanup);
	const run = await activate(scratch);
	run.workersPerTeam = 2;
	await saveJson(`${groupPath(run)}/run.json`, run);
	const launched = limenWithEnv(scratch, environment(run), "spawn", "candidate", ...workerSettings);
	assert.equal(launched.status, 0, launched.stderr);
	const worker = onlyJobId(launched.stdout);
	await waitForState(scratch.root, worker, "done");
	const continued = limenWithEnv(scratch, lead, "continue", worker, "follow-up", ...workerSettings);
	assert.equal(continued.status, 0, continued.stderr);
	const id = onlyJobId(continued.stdout);
	await waitForState(scratch.root, id, "done");
	const current = await readRun(run.root, run.id);
	const entry = current.members.find((member) => member.id === id);
	assert.ok(entry);
	assert.equal(entry.parent, worker);
	assert.equal(entry.team, "team-1");
	assert.ok(entry.deadline <= run.deadline - run.reserveMs);
	assert.equal((await readFile(`${run.root}/.limen/jobs/${id}/group`, "utf8")).trim(), run.id);
	const again = limenWithEnv(scratch, lead, "continue", id, "another wave", ...workerSettings);
	assert.equal(again.status, 1);
});

test("informational delivery is per recipient, bounded, deduplicated and preserved across continuation", async (context) => {
	const scratch = await fixture();
	context.after(scratch.cleanup);
	const run = await activate(scratch);
	const authorMember = run.members[0],
		recipientMember = run.members[1];
	assert.ok(authorMember);
	assert.ok(recipientMember);
	const author: GroupIdentity = { run, member: authorMember, recipient: authorMember.id };
	const recipient: GroupIdentity = { run, member: recipientMember, recipient: recipientMember.id };
	for (let index = 0; index < 15; index++) await publishEvent(author, `counterexample ${index}`);
	const batches = await Promise.all([acceptBatch(recipient), acceptBatch(recipient)]);
	const events = batches.flatMap((batch) => batch?.events ?? []);
	assert.equal(new Set(events.map((event) => event.id)).size, events.length);
	for (const batch of batches) {
		assert.ok(batch);
		assert.ok(batch.events.length <= 8);
		assert.ok(batch.text.length < 12_000);
		await observeBatch(recipient, batch.token, false);
		const path = `${groupPath(run)}/receipts/${recipient.recipient}/${batch.events[0]?.id}.json`;
		const accepted = JSON.parse(await readFile(path, "utf8"));
		assert.equal(accepted.state, "accepted");
		assert.ok(accepted.observedAt);
		await observeBatch(recipient, batch.token, true);
	}
	let batch = await acceptBatch(recipient);
	while (batch) {
		await observeBatch(recipient, batch.token, true);
		batch = await acceptBatch(recipient);
	}
	assert.equal(await acceptBatch(recipient), undefined);
	const child = { id: "continued-recipient", team: "team-2", role: "worker" as const, parent: recipient.recipient, deadline: run.deadline };
	const inherited = await acceptBatch({ run, member: child, recipient: child.id });
	assert.equal(inherited, undefined);
	const other = limen(scratch, "spawn", "ordinary isolated job", "--detached");
	assert.equal(other.status, 0, other.stderr);
	const otherId = onlyJobId(other.stdout);
	await waitForState(scratch.root, otherId, "done");
	assert.equal(existsSync(`${groupPath(run)}/receipts/${otherId}`), false);
});

test("lifecycle advisories repeat after clearing without duplicates from concurrent synchronization", async (context) => {
	const scratch = await fixture();
	context.after(scratch.cleanup);
	const run = await activate(scratch);
	const author = run.members[0];
	assert.ok(author);
	const advisory = `${run.root}/.limen/jobs/${author.id}/advisory`;
	const text = `${author.role} ${author.id}: advisory blocked on test evidence`;
	await writeFile(advisory, "blocked on test evidence\n");
	await Promise.all([syncLifecycle(run), syncLifecycle(run)]);
	const first = (await groupEvents(run)).filter((event) => event.text === text);
	assert.equal(first.length, 1);
	await syncLifecycle(run);
	assert.deepEqual(
		(await groupEvents(run)).filter((event) => event.text === text),
		first,
	);
	await writeFile(advisory, "");
	await Promise.all([syncLifecycle(run), syncLifecycle(run)]);
	await writeFile(advisory, "blocked on test evidence\n");
	await Promise.all([syncLifecycle(run), syncLifecycle(run)]);
	const occurrences = (await groupEvents(run)).filter((event) => event.text === text);
	assert.equal(occurrences.length, 2);
	assert.notEqual(occurrences[0]?.id, occurrences[1]?.id);
	for (const recipient of [`lead-${run.lead}`, ...run.members.filter((member) => member.id !== author.id).map((member) => member.id)]) {
		for (const event of occurrences) {
			const record = JSON.parse(await readFile(`${groupPath(run)}/receipts/${recipient}/${event.id}.json`, "utf8"));
			assert.equal(record.state, "queued");
		}
	}
});

test("lifecycle recovery completes an interrupted occurrence before observing a changed advisory", async (context) => {
	const scratch = await fixture();
	context.after(scratch.cleanup);
	const run = await activate(scratch);
	const author = run.members[0],
		peer = run.members[1];
	assert.ok(author);
	assert.ok(peer);
	const advisory = `${run.root}/.limen/jobs/${author.id}/advisory`;
	const marker = `${groupPath(run)}/${author.id}-advisory.json`;
	// Existing cabinets stored only the observed string.
	await saveJson(marker, "");
	await writeFile(advisory, "blocked on test evidence\n");
	await syncLifecycle(run);
	const event = (await groupEvents(run)).find((event) => event.text === `${author.role} ${author.id}: advisory blocked on test evidence`);
	assert.ok(event);
	const lead = { run, recipient: `lead-${run.lead}` };
	const batch = await acceptBatch(lead);
	assert.ok(batch);
	assert.ok(batch.events.some((queued) => queued.id === event.id));
	await observeBatch(lead, batch.token, true);
	const leadReceipt = `${groupPath(run)}/receipts/${lead.recipient}/${event.id}.json`;
	const processed = JSON.parse(await readFile(leadReceipt, "utf8"));
	assert.equal(processed.state, "processed");
	// Retain the event and one processed receipt, but interrupt before the peer receipt and final marker.
	await rm(`${groupPath(run)}/receipts/${peer.id}/${event.id}.json`);
	await saveJson(marker, { value: "blocked on test evidence", event });
	await writeFile(advisory, "");
	await Promise.all([syncLifecycle(run), syncLifecycle(run)]);
	const events = await groupEvents(run);
	assert.deepEqual(
		events.filter((candidate) => candidate.text === event.text),
		[event],
	);
	assert.deepEqual(JSON.parse(await readFile(leadReceipt, "utf8")), processed);
	const recovered = JSON.parse(await readFile(`${groupPath(run)}/receipts/${peer.id}/${event.id}.json`, "utf8"));
	assert.equal(recovered.state, "queued");
	assert.equal(recovered.attempts, 0);
	const cleared = await acceptBatch(lead);
	assert.ok(cleared);
	assert.deepEqual(
		cleared.events.map((event) => event.text),
		[`${author.role} ${author.id}: advisory cleared`],
	);
	await observeBatch(lead, cleared.token, true);
	assert.equal(await acceptBatch(lead), undefined);
	assert.deepEqual(await groupEvents(run), events);
});

test("ambiguous acceptance retries at most twice independently for each recipient", async (context) => {
	const scratch = await fixture();
	context.after(scratch.cleanup);
	const run = await activate(scratch);
	const recipient = { run, recipient: `lead-${run.lead}` };
	const first = await acceptBatch(recipient);
	assert.ok(first);
	await acceptTransport(recipient, first.token);
	await releaseBatch(recipient, first.token);
	const second = await acceptBatch(recipient);
	assert.ok(second);
	await acceptTransport(recipient, second.token);
	assert.deepEqual(
		first.events.map((event) => event.id),
		second.events.map((event) => event.id),
	);
	await releaseBatch(recipient, second.token);
	assert.equal(await acceptBatch(recipient), undefined);
	const independent = await acceptBatch({ run, recipient: run.members[1]?.id ?? "" });
	assert.ok(independent);
	const record = JSON.parse(await readFile(`${groupPath(run)}/receipts/${recipient.recipient}/${first.events[0]?.id}.json`, "utf8"));
	assert.equal(record.attempts, 2);
	assert.equal(record.state, "accepted");
	assert.equal(record.uncertain, true);
});

test("bounded waiting returns events, normal timeout, stopped state and expired deadline", async (context) => {
	const scratch = await fixture();
	context.after(scratch.cleanup);
	const run = await activate(scratch);
	const identity = { run, recipient: `lead-${run.lead}` };
	let batch = await acceptBatch(identity);
	while (batch) {
		await observeBatch(identity, batch.token, true);
		batch = await acceptBatch(identity);
	}
	const started = Date.now();
	assert.match(await waitGroup(identity, 20), /timed out normally/);
	assert.ok(Date.now() - started < 1_000);
	await publishEvent({ run, recipient: run.members[0]?.id ?? "" }, "edge-case finding");
	assert.match(await waitGroup(identity, 1_000), /edge-case finding/);
	run.deadline = Date.now() - 1;
	await saveJson(`${groupPath(run)}/run.json`, run);
	assert.match(await waitGroup(identity), /deadline expired/);
	run.stopped = true;
	await saveJson(`${groupPath(run)}/run.json`, run);
	assert.match(await waitGroup(identity), /stopped or closed/);
	await assert.rejects(claimMember(run, "team-1", "worker", "too-late"), /stopped, closed, or past/);
});

test("stop serializes with launch, dirty close refuses and pruning stays protected until deliberate clean close", async (context) => {
	const scratch = await fixture();
	context.after(scratch.cleanup);
	const run = await activate(scratch);
	const tree = (await readFile(`${run.root}/.limen/jobs/${run.members[0]?.id}/worktree`, "utf8")).trim();
	await writeFile(`${tree}/recovery.txt`, "preserve me\n");
	const started = await groupLock(`${groupPath(run)}/launch`, async () => {
		const stop = launch(scratch, lead, "group", "stop", run.id);
		// Separate CLI processes use the platform clock; wait for the durable stop fence, not a guessed sleep.
		const until = Date.now() + 5_000;
		while (!(await readRun(run.root, run.id)).stopped && Date.now() < until) await delay(25);
		assert.equal((await readRun(run.root, run.id)).stopped, true);
		await assert.rejects(claimMember(run, "team-1", "worker", "fenced-spawn"), /stopped, closed, or past/);
		return { stop };
	});
	const stopped = await started.stop;
	assert.equal(stopped.status, 0, stopped.stderr);
	const refused = limenWithEnv(scratch, lead, "group", "close", run.id);
	assert.equal(refused.status, 1);
	assert.equal((await readRun(run.root, run.id)).closed, false);
	assert.equal(limen(scratch, "prune").status, 0);
	assert.equal(limen(scratch, "prune", "--retire").status, 0);
	assert.equal(await readFile(`${tree}/recovery.txt`, "utf8"), "preserve me\n");
	assert.equal(limenWithEnv(scratch, environment(run), "spawn", "too late", ...workerSettings).status, 1);
	git(tree, "add", "recovery.txt");
	git(tree, "commit", "-m", "retain recovery");
	const closed = limenWithEnv(scratch, lead, "group", "close", run.id);
	assert.equal(closed.status, 0, closed.stderr);
	assert.equal(limen(scratch, "prune").status, 0);
	assert.equal(existsSync(tree), false);
});

test("group hook proves processing only after peer data entered context and an assistant responded", async (context) => {
	const scratch = await fixture();
	context.after(scratch.cleanup);
	const run = await activate(scratch);
	const old = Object.fromEntries(Object.keys(environment(run)).map((key) => [key, process.env[key]]));
	Object.assign(process.env, environment(run, run.members[1]?.id));
	context.after(() => {
		for (const [key, value] of Object.entries(old)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	});
	type Handler = (event: never, context: never) => unknown;
	const handlers: Record<string, Handler> = {};
	groupPeer({
		on: (name: string, handler: Handler) => {
			handlers[name] = handler;
		},
		sendMessage: () => {
			throw new Error("members never receive user messages");
		},
	} as Parameters<typeof groupPeer>[0]);
	const emit = async (name: string, event: unknown) =>
		handlers[name]?.(event as never, { cwd: scratch.root, sessionManager: { getSessionId: () => "member" }, ui: { notify: () => {} } } as never);
	const author = run.members[0];
	assert.ok(author);
	await publishEvent({ run, recipient: author.id, member: author }, "counterexample: conflicting same revision");
	const patched = (await emit("tool_result", { content: [{ type: "text", text: "ordinary tool result" }] })) as { content: { type: string; text: string }[] };
	assert.match(patched.content.map((part) => part.text).join("\n"), /Informational peer data/);
	await emit("message_end", { message: { role: "toolResult", content: patched.content } });
	await emit("message_end", { message: { role: "assistant" } });
	const identity = { run, recipient: run.members[1]?.id ?? "" };
	const receiptNames = await readdir(`${groupPath(run)}/receipts/${identity.recipient}`);
	let record = JSON.parse(await readFile(`${groupPath(run)}/receipts/${identity.recipient}/${receiptNames[0]}`, "utf8"));
	assert.equal(record.state, "accepted");
	await emit("context", { messages: [{ role: "toolResult", content: patched.content }] });
	await emit("message_end", { message: { role: "assistant", stopReason: "stop" } });
	record = JSON.parse(await readFile(`${groupPath(run)}/receipts/${identity.recipient}/${receiptNames[0]}`, "utf8"));
	assert.equal(record.state, "processed");
	assert.ok(record.observedAt);
	assert.equal(
		(await groupEvents(run)).some((event) => /receipt|acknowledg/.test(event.text)),
		false,
	);
	assert.deepEqual(await emit("tool_call", { toolName: "task" }), { block: true, reason: "group helpers must use the recorded limen worker allowance, not built-in subagents" });
	await emit("session_shutdown", {});
});

test("detached role deadlines stop a real child and hosted supervision enforces the same recorded deadline", async (context) => {
	const scratch = await fixture();
	context.after(scratch.cleanup);
	const run = await activate(scratch);
	await writeFakePi(
		scratch.fakeBin,
		`#!/usr/bin/env node
const fs = require('node:fs');
fs.writeFileSync(process.env.LIMEN_CONTEXT_ROOT + '/.limen/jobs/' + process.env.LIMEN_JOB_ID + '/engine-launched', 'yes');
setInterval(() => {}, 1000);
`,
	);
	// Spawn and wrapper startup count against the deadline. Under heavy load they can use all of it before the
	// engine writes its marker; that run proves nothing, so try again with a longer deadline.
	const budgets = [2_000, 6_000, 15_000];
	let id = "";
	for (const workerTimeoutMs of budgets) {
		const current = await readRun(run.root, run.id);
		await saveJson(`${groupPath(run)}/run.json`, { ...current, workersPerTeam: budgets.length, workerTimeoutMs });
		const launched = limenWithEnv(scratch, environment(run), "spawn", "deadline probe", ...workerSettings);
		assert.equal(launched.status, 0, launched.stderr);
		id = onlyJobId(launched.stdout);
		await waitForState(scratch.root, id, "failed", workerTimeoutMs + 10_000);
		if (existsSync(`${run.root}/.limen/jobs/${id}/engine-launched`)) break;
	}
	assert.equal(await readFile(`${run.root}/.limen/jobs/${id}/engine-launched`, "utf8"), "yes");
	assert.match(await readFile(`${run.root}/.limen/jobs/${id}/log`, "utf8"), /timeout after/);
	const current = await readRun(run.root, run.id);
	const worker = current.members.find((member) => member.id === id);
	assert.ok(worker);
	worker.deadline = Date.now() - 1;
	await saveJson(`${groupPath(run)}/run.json`, current);
	const dir = `${run.root}/.limen/jobs/${id}`;
	await writeFile(`${dir}/state`, "running\n");
	const supervised = limenWithEnv(scratch, { LIMEN_INTERNAL_HOSTED: "1", LIMEN_JOB_DIR: dir, LIMEN_HOSTED_TARGET: "fixture-agent" });
	assert.equal(supervised.status, 0, supervised.stderr);
	assert.equal((await readFile(`${dir}/state`, "utf8")).trim(), "failed");
	assert.match(await readFile(`${dir}/log`, "utf8"), /group deadline or stop/);
});

test("hosted coordinators retain live children; unread findings never keep a clean finished worker alive", async (context) => {
	const scratch = await fixture();
	context.after(scratch.cleanup);
	const run = await activate(scratch);
	const coordinator = run.members[0];
	assert.ok(coordinator);
	const worker = await claimMember(run, coordinator.team, "worker", "idle-worker");
	const dir = `${run.root}/.limen/jobs/${worker.id}`;
	await mkdir(`${dir}/session`, { recursive: true });
	await writeFile(`${dir}/group`, `${run.id}\n`);
	await writeFile(`${dir}/state`, "running\n");
	await writeFile(`${dir}/worktree`, `${run.root}\n`);
	await writeFile(`${dir}/activity`, "wait\n");
	await writeFile(`${dir}/session/run.jsonl`, `${JSON.stringify({ type: "message", message: { role: "assistant", content: [{ type: "text", text: "checked handoff" }] } })}\n`);
	const parent = `${run.root}/.limen/jobs/${coordinator.id}`;
	await writeFile(`${parent}/activity`, "wait\n");
	await writeFile(
		`${parent}/session/run.jsonl`,
		`${JSON.stringify({ type: "message", message: { role: "assistant", content: [{ type: "text", text: "waiting for child" }] } })}\n`,
	);
	const watching = { leftWorkingAt: 0, armed: true };
	assert.equal(await noteHostedIdle(parent, "idle", watching, 1_000, 10), undefined);
	await publishEvent({ run, recipient: run.members[1]?.id ?? "" }, "late peer finding");
	assert.equal(await noteHostedIdle(dir, "idle", { leftWorkingAt: 0, armed: true }, 1_000, 10), "closed a clean idle session");
});

test("automatic lead updates stay agent-attributed and only processed context suppresses replay", async (context) => {
	const scratch = await fixture();
	context.after(scratch.cleanup);
	const run = await activate(scratch);
	const before = { LIMEN_JOB: process.env.LIMEN_JOB, PI_SESSION_ID: process.env.PI_SESSION_ID };
	delete process.env.LIMEN_JOB;
	type Handler = (event: never, context: never) => unknown;
	const handlers: Record<string, Handler> = {};
	const message = Promise.withResolvers<{ content: string; attribution: string }>();
	groupPeer({
		on: (name: string, handler: Handler) => {
			handlers[name] = handler;
		},
		sendMessage: (payload: { content: string; attribution: string }, options: { deliverAs: string; triggerTurn: boolean }) => {
			// Pi parks nextTurn on an idle lead even with triggerTurn, and steer would interrupt a busy one; only followUp does both jobs.
			if (options.deliverAs === "followUp" && options.triggerTurn) message.resolve(payload);
		},
	} as Parameters<typeof groupPeer>[0]);
	const ctx = { cwd: scratch.root, sessionManager: { getSessionId: () => run.lead }, ui: { notify: () => {} } };
	try {
		await handlers.session_start?.({} as never, ctx as never);
		const delivered = await Promise.race([
			message.promise,
			delay(5_000).then(() => {
				throw new Error("automatic group update did not arrive");
			}),
		]);
		assert.equal(delivered.attribution, "agent");
		assert.match(delivered.content, /Informational peer data/);
		assert.doesNotMatch(delivered.content, /limen land/);
		await handlers.context?.({ messages: [{ role: "custom", content: delivered.content }] } as never, ctx as never);
		await handlers.message_end?.({ message: { role: "assistant", stopReason: "stop" } } as never, ctx as never);
		const names = await readdir(`${groupPath(run)}/receipts/lead-${run.lead}`);
		for (const name of names) assert.equal(JSON.parse(await readFile(`${groupPath(run)}/receipts/lead-${run.lead}/${name}`, "utf8")).state, "processed");
	} finally {
		await handlers.session_shutdown?.({} as never, ctx as never);
		for (const [key, value] of Object.entries(before))
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
	}
});

test("an OMP lead without PI_SESSION_ID is recognized only through its registered ancestor process", async (context) => {
	const scratch = await fixture();
	context.after(scratch.cleanup);
	// A live listener that is not an ancestor of the command must not grant lead authority.
	const bystander = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60_000)"], { stdio: "ignore" });
	context.after(() => {
		bystander.kill("SIGKILL");
	});
	await rm(`${scratch.root}/.limen/group-leads/group-lead`);
	await writeFile(`${scratch.root}/.limen/group-leads/impostor`, `${bystander.pid}\n`);
	const refused = limen(scratch, "group", "start", scratch.feature, ...settings);
	assert.equal(refused.status, 1);
	assert.deepEqual(
		(await readdir(`${scratch.root}/.limen/groups`).catch(() => [])).filter((name) => !name.startsWith(".")),
		[],
	);

	await writeFile(`${scratch.root}/.limen/group-leads/omp-lead`, `${process.pid}\n`);
	const started = limen(scratch, "group", "start", scratch.feature, ...settings);
	assert.equal(started.status, 0, started.stderr);
	const run = await readRun(scratch.root, onlyJobId(started.stdout));
	assert.equal(run.lead, "omp-lead");
	for (const member of run.members) await waitForState(scratch.root, member.id, "done");
	const status = limen(scratch, "group", "status", run.id);
	assert.equal(status.status, 0, status.stderr);
	const other = limenWithEnv(scratch, { PI_SESSION_ID: "someone-else" }, "group", "status", run.id);
	assert.equal(other.status, 1);
});

test("per-team models route each coordinator and gate that team's worker launches", async (context) => {
	const scratch = await fixture();
	context.after(scratch.cleanup);
	const unknown = limenWithEnv(scratch, lead, "group", "start", scratch.feature, ...settings, "--team-model", "team-9=anthropic/claude-opus-5-5");
	assert.equal(unknown.status, 1);
	assert.match(unknown.stderr, /not in the roster/);
	const result = limenWithEnv(scratch, lead, "group", "start", scratch.feature, ...settings, "--team-model", "team-2=anthropic/claude-opus-5-5");
	assert.equal(result.status, 0, result.stderr);
	const run = await readRun(scratch.root, onlyJobId(result.stdout));
	assert.deepEqual(run.teamModels, { "team-2": { provider: "anthropic", model: "claude-opus-5-5" } });
	for (const member of run.members) await waitForState(scratch.root, member.id, "done");
	const second = run.members.find((member) => member.team === "team-2");
	assert.ok(second);
	const wrong = limenWithEnv(scratch, environment(run, second.id), "spawn", "build", ...workerSettings);
	assert.equal(wrong.status, 1);
	assert.match(wrong.stderr, /recorded engine\/provider\/model/);
	const right = limenWithEnv(
		scratch,
		environment(run, second.id),
		"spawn",
		"build",
		"--engine",
		"omp",
		"--provider",
		"anthropic",
		"--model",
		"claude-opus-5-5",
		"--thinking",
		"high",
		"--detached",
	);
	assert.equal(right.status, 0, right.stderr);
	await waitForState(scratch.root, onlyJobId(right.stdout), "done");
});

test("uncertain stall observations stay out of group lifecycle while real advisories are shared", async (context) => {
	const scratch = await fixture();
	context.after(scratch.cleanup);
	const run = await activate(scratch);
	const author = run.members[0];
	assert.ok(author);
	const advisory = `${run.root}/.limen/jobs/${author.id}/advisory`;
	await writeFile(advisory, "tool stall observation uncertain: engine or child ownership requires attention\n");
	await syncLifecycle(run);
	await writeFile(advisory, "");
	await syncLifecycle(run);
	assert.deepEqual(
		(await groupEvents(run)).filter((event) => event.text.includes(": advisory")),
		[],
	);
	await writeFile(advisory, "blocked on test evidence\n");
	await syncLifecycle(run);
	assert.deepEqual(
		(await groupEvents(run)).filter((event) => event.text.includes(": advisory")).map((event) => event.text),
		[`${author.role} ${author.id}: advisory blocked on test evidence`],
	);
});

test("busy cabinet never blocks finalization or loses its deferred lifecycle event", async (context) => {
	const scratch = await fixture();
	context.after(scratch.cleanup);
	const run = await activate(scratch);
	await syncLifecycle(run);
	const member = run.members[0];
	assert.ok(member);
	const dir = `${run.root}/.limen/jobs/${member.id}`;
	await writeFile(`${dir}/state`, "running\n");
	await syncLifecycle(run);
	const peer = run.members[1];
	assert.ok(peer);
	const identity = { run, member: peer, recipient: peer.id };
	await groupLock(groupPath(run), async () => {
		// Native lock deadlines use the platform clock; fake time cannot exercise the live-owner wait.
		await syncLifecycle(run); // Unchanged markers must return even while another member owns the lock.
		assert.equal(await acceptBatch(identity, Date.now(), "skip"), undefined);
		const finalized = finalizeJob(dir, "done", "real completion").then(
			() => undefined,
			(error: unknown) => error,
		);
		await delay(11_000);
		assert.equal(await finalized, undefined);
		assert.equal((await readFile(`${dir}/state`, "utf8")).trim(), "done");
		assert.equal((await groupEvents(run)).filter((event) => event.text === `${member.role} ${member.id}: state done`).length, 1);
	});
	const batch = await acceptBatch(identity);
	assert.ok(batch);
	const events = (await groupEvents(run)).filter((event) => event.text === `${member.role} ${member.id}: state done`);
	assert.equal(events.length, 2);
	assert.notEqual(events[0]?.id, events[1]?.id);
	assert.equal(
		batch.events.some((event) => event.id === events[1]?.id),
		true,
	);
});

for (const command of ["spawn", "continue"] as const) {
	test(`a ${command} waits beyond ten seconds for a real sibling launch without half-claimed members`, async (context) => {
		const scratch = await fixture();
		context.after(scratch.cleanup);
		const run = await activate(scratch);
		run.workersPerTeam = 3;
		await saveJson(`${groupPath(run)}/run.json`, run);
		let parent = "";
		if (command === "continue") {
			const seeded = await launch(scratch, environment(run), "spawn", "predecessor", ...workerSettings);
			assert.equal(seeded.status, 0, seeded.stderr);
			parent = onlyJobId(seeded.stdout);
			await waitForState(run.root, parent, "done");
		}
		const hooks = `${scratch.fakeBin}/hooks`;
		const marker = `${scratch.root}/.limen/slow-checkout`;
		await mkdir(hooks);
		// A real Git subprocess holds the launch lock; fake timers cannot advance its platform-clock wait.
		await writeFile(
			`${hooks}/post-checkout`,
			`#!/usr/bin/env node
const fs = require('node:fs');
try { fs.writeFileSync(${JSON.stringify(marker)}, 'started', { flag: 'wx' }); }
catch (error) { if (error.code === 'EEXIST') process.exit(0); throw error; }
setTimeout(() => {}, 12_000);
`,
			{ mode: 0o755 },
		);
		git(scratch.root, "config", "core.hooksPath", hooks);
		const first = launch(scratch, environment(run), "spawn", "slow sibling", ...workerSettings);
		const until = Date.now() + 5_000;
		while (!existsSync(marker) && Date.now() < until) await delay(25);
		assert.equal(existsSync(marker), true, "the first real launch entered its checkout hook");
		const started = Date.now();
		const second = launch(scratch, command === "continue" ? lead : environment(run), command, ...(parent ? [parent] : []), "queued sibling", ...workerSettings);
		const [left, right] = await Promise.all([first, second]);
		assert.equal(left.status, 0, left.stderr);
		assert.equal(right.status, 0, right.stderr);
		assert.ok(Date.now() - started > 10_000, "the second launch actually waited beyond the old deadline");
		const ids = [onlyJobId(left.stdout), onlyJobId(right.stdout)];
		const current = await readRun(run.root, run.id);
		assert.equal(current.members.length, run.members.length + 2 + (parent ? 1 : 0));
		for (const id of ids) {
			await waitForState(run.root, id, "done");
			assert.equal(
				current.members.some((member) => member.id === id),
				true,
			);
			assert.equal((await readFile(`${run.root}/.limen/jobs/${id}/group`, "utf8")).trim(), run.id);
		}
		if (parent) assert.equal(current.members.find((member) => member.id === ids[1])?.parent, parent);
	});
}

test("cabinet recovery reclaims a dead owner but never displaces an aged live owner", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	const cabinet = `${scratch.root}/cabinet`;
	const lock = `${cabinet}/.lock`;
	await mkdir(lock, { recursive: true });
	await writeFile(`${lock}/owner`, `${process.pid}\n`);
	const old = new Date(Date.now() - 60_000);
	await utimes(lock, old, old);
	assert.equal(await groupLock(cabinet, async () => "evicted", "skip"), undefined);
	assert.equal((await readFile(`${lock}/owner`, "utf8")).trim(), String(process.pid));
	const owner = spawn(process.execPath, ["-e", "process.exit(0)"]);
	await once(owner, "exit");
	assert.ok(owner.pid);
	await writeFile(`${lock}/owner`, `${owner.pid}\n`);
	await utimes(lock, old, old);
	assert.equal(await groupLock(cabinet, async () => "recovered", "wait"), "recovered");
	assert.equal(existsSync(lock), false);
});
