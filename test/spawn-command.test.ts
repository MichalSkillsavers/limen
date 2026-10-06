// F925 old suite, frozen at 1013 lines. Delete this file when its replacement lands; never add to it.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs, { existsSync } from "node:fs";
import { access, chmod, mkdir, readdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { defaultFakePi, git, limen, limenWithEnv, limenWithInput, limenWithSession, onlyJobId, scratchRepo, waitForState } from "./scratch.ts";

test("planning source is persistent, defaults to committed, and private ordinary descendants keep canonical pointers", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	assert.equal(limen(scratch, "planning").stdout.trim(), "committed");
	assert.equal(limen(scratch, "planning", "invalid").status, 1);
	assert.equal(limen(scratch, "planning", "private").stdout.trim(), "private");
	assert.equal(limen(scratch, "planning").stdout.trim(), "private");
	assert.equal(await readFile(`${scratch.root}/.limen/planning-source`, "utf8"), "private\n");
	const ticket = "spec/features/active/F001-private/ticket.md";
	await mkdir(`${scratch.root}/spec/features/active/F001-private`, { recursive: true });
	await writeFile(`${scratch.root}/${ticket}`, "PRIVATE TICKET CONTENT\n");
	await writeFile(`${scratch.root}/.gitignore`, "/spec/\n/.limen/\n");
	git(scratch.root, "add", ".");
	git(scratch.root, "commit", "-m", "ignore private planning");
	const input = `Read the ticket. (Ticket:  ${ticket}).\n`;
	const launched = limenWithInput(scratch, input, "spawn", "--task-file", "-", "--engine", "pi", "--detached");
	assert.equal(launched.status, 0, launched.stderr);
	const id = onlyJobId(launched.stdout);
	await waitForState(scratch.root, id, "done");
	const job = `${scratch.root}/.limen/jobs/${id}`;
	const worktree = (await readFile(`${job}/worktree`, "utf8")).trim();
	assert.equal(await readFile(`${job}/task.md`, "utf8"), `Read the ticket. (Ticket:  ${scratch.root}/${ticket}).\n`);
	assert.equal(await readFile(`${job}/planning-source`, "utf8"), "private\n");
	assert.equal(existsSync(`${worktree}/spec`), false);
	assert.equal(git(scratch.root, "ls-tree", "-r", "--name-only", "HEAD", "--", "spec"), "");
	assert.equal(limen(scratch, "planning", "committed").status, 0);
	const env = { LIMEN_JOB: "1", LIMEN_JOB_ID: id, LIMEN_CONTEXT_ROOT: scratch.root };
	const member = { ...scratch, root: worktree };
	const child = limenWithEnv(member, env, "spawn", `Next slice. Ticket: ${ticket}`, "--detached");
	assert.equal(child.status, 0, child.stderr);
	const childId = onlyJobId(child.stdout);
	await waitForState(scratch.root, childId, "done");
	assert.equal(await readFile(`${scratch.root}/.limen/jobs/${childId}/planning-source`, "utf8"), "private\n");
	assert.ok((await readFile(`${scratch.root}/.limen/jobs/${childId}/task.md`, "utf8")).includes(`Ticket: ${scratch.root}/${ticket}`));
	assert.equal(existsSync(`${worktree}/.limen/jobs`), false);
});

test("private spawn rejects missing, unreadable, traversal and symlink ticket escapes before publication", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	assert.equal(limen(scratch, "planning", "private").status, 0);
	const launch = (ticket: string) => limen(scratch, "spawn", `Read. Ticket: ${ticket}`, "--detached");
	assert.equal(launch("spec/missing.md").status, 1);
	await writeFile(`${scratch.root}/spec/blocked.md`, "blocked\n", { mode: 0o000 });
	assert.match(launch("spec/blocked.md").stderr, /not readable/);
	await writeFile(`${scratch.root}/../outside.md`, "outside\n");
	await symlink(`${scratch.root}/../outside.md`, `${scratch.root}/spec/escape.md`);
	for (const ticket of ["spec/escape.md", "../outside.md", `${scratch.root}/../outside.md`, `${scratch.root}/../outside.md/../repo/spec/vision.md`]) {
		const result = launch(ticket);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /canonical root/);
	}
	assert.deepEqual(await readdir(`${scratch.root}/.limen/jobs`).catch(() => []), []);
	assert.equal(git(scratch.root, "worktree", "list", "--porcelain").split("worktree ").length, 2);
});

test("spawn creates isolated branch, canonical record, defaults to omp, and resumes its worktree", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const inheritedHerdr = { HERDR_ENV: process.env.HERDR_ENV, HERDR_PANE_ID: process.env.HERDR_PANE_ID };
	process.env.HERDR_ENV = "1";
	process.env.HERDR_PANE_ID = "w0:p0";
	context.after(() => {
		for (const [name, value] of Object.entries(inheritedHerdr)) {
			if (value === undefined) delete process.env[name];
			else process.env[name] = value;
		}
	});
	const launched = limenWithSession(scratch, "coordinator-a", "spawn", "--label", "F001 implementation", "make commit");
	assert.equal(launched.status, 0, launched.stderr);
	assert.match(launched.stdout, /started F001 implementation/);
	const id = onlyJobId(launched.stdout);
	assert.match(id, /^\d{4}-\d{2}-\d{2}-f001-implementation-[0-9a-f]{8}$/);
	await waitForState(scratch.root, id, "done");
	const job = join(scratch.root, ".limen/jobs", id);
	assert.equal(await readFile(join(job, "branch"), "utf8"), `limen/${id}\n`);
	assert.equal(await readFile(join(job, "task.md"), "utf8"), "make commit\n");
	assert.equal(await readFile(join(job, "label"), "utf8"), "F001 implementation\n");
	assert.equal(await readFile(join(job, "role"), "utf8"), "worker\n");
	assert.equal(await readFile(join(job, "origin-session"), "utf8"), "coordinator-a\n");
	await access(join(job, "notify/subscribers/coordinator-a"));
	assert.equal(await readFile(join(job, "notify/ready"), "utf8"), "1\n");
	assert.equal(await readFile(join(job, "engine"), "utf8"), "omp\n");
	assert.equal(await readFile(join(job, "versions"), "utf8"), "omp 0.0.0-test\n");
	assert.match(limen(scratch, "jobs", id).stdout, /versions:\n    omp 0\.0\.0-test/);
	assert.doesNotMatch(limen(scratch, "jobs", id).stdout, /herdr/);
	assert.ok(Number.isFinite(Date.parse((await readFile(join(job, "started-at"), "utf8")).trim())));
	assert.ok(Number.isFinite(Date.parse((await readFile(join(job, "finished-at"), "utf8")).trim())));
	await assert.rejects(readFile(join(job, "pid")));
	// F017: the wake carries what landed — base at spawn, commits and the final assistant message at finalize.
	assert.equal((await readFile(join(job, "base"), "utf8")).trim(), git(scratch.root, "rev-parse", "main"));
	assert.equal(await readFile(join(job, "result"), "utf8"), "fake pi completed\n");
	const commits = await readFile(join(job, "commits"), "utf8");
	assert.match(commits, /^[0-9a-f]+ candidate\n$/);
	const worktreeLine = git(scratch.root, "worktree", "list", "--porcelain")
		.split("\n")
		.find((line) => line.includes(id));
	assert.ok(worktreeLine);
	const worktree = worktreeLine.slice("worktree ".length);
	assert.equal(await readFile(join(worktree, "candidate.txt"), "utf8"), "candidate\n");
	const childEnvironment = JSON.parse(await readFile(join(worktree, "pi-env.json"), "utf8")) as {
		internal?: string;
		job?: string;
		id?: string;
		label?: string;
		contextRoot?: string;
		herdr?: string[];
		pi?: string[];
	};
	assert.deepEqual(childEnvironment, { job: "1", id, label: "F001 implementation", contextRoot: await realpath(scratch.root), herdr: [], pi: [] });
	const argv = JSON.parse(await readFile(join(worktree, "pi-args.json"), "utf8")) as string[];
	assert.match(argv[argv.indexOf("--session-dir") + 1] ?? "", /\.limen\/jobs\/[^/]+\/session$/);
	assert.match(argv[argv.indexOf("--extension") + 1] ?? "", /hook\/steering\.ts$/);
	assert.equal(argv[argv.indexOf("--append-system-prompt") + 1], await readFile(new URL("../templates/worker.md", import.meta.url), "utf8"));
	assert.equal(await readFile(join(job, "last-tool"), "utf8"), "bash\n");
	assert.equal(await readFile(join(job, "tool-calls"), "utf8"), "1\n");
	const log = await readFile(join(job, "log"), "utf8");
	assert.match(log, /worker started/);
	assert.match(log, /^think$/m);
	assert.match(log, /^bash git status$/m);
	assert.notEqual(worktree, scratch.root);
	await writeFile(join(worktree, "uncommitted.txt"), "keep me\n");
	const resumed = limen(scratch, "spawn", "continue work", "--branch", `limen/${id}`);
	assert.equal(resumed.status, 0, resumed.stderr);
	const resumedId = onlyJobId(resumed.stdout);
	await waitForState(scratch.root, resumedId, "done");
	assert.equal((await readFile(join(scratch.root, ".limen/jobs", resumedId, "base"), "utf8")).trim(), git(scratch.root, "rev-parse", `limen/${id}`));
	assert.equal(await readFile(join(worktree, "uncommitted.txt"), "utf8"), "keep me\n");
});

test("OMP jobs build legacy skills from the selected branch without changing its files", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	await mkdir(join(scratch.root, ".pi/skills"), { recursive: true });
	await mkdir(join(scratch.root, ".agents/skills/shared"), { recursive: true });
	await writeFile(join(scratch.root, ".pi/skills/old.md"), "# Old\n");
	await writeFile(join(scratch.root, ".pi/skills/shared.md"), "# Shadow\n");
	await writeFile(join(scratch.root, ".agents/skills/shared/SKILL.md"), "# Native\n");
	git(scratch.root, "add", ".");
	git(scratch.root, "commit", "-m", "project skills");
	const first = limen(scratch, "spawn", "--detached", "--engine", "omp", "inspect skills");
	assert.equal(first.status, 0, first.stderr);
	const id = onlyJobId(first.stdout);
	await waitForState(scratch.root, id, "done");
	const job = join(scratch.root, ".limen/jobs", id);
	const worktree = (await readFile(join(job, "worktree"), "utf8")).trim();
	const argv = JSON.parse(await readFile(join(worktree, "pi-args.json"), "utf8")) as string[];
	assert.equal(await realpath(argv[argv.indexOf("--config") + 1] ?? ""), await realpath(join(job, "skills-config.yml")));
	assert.deepEqual(await readdir(join(job, "skills")), ["old"]);
	assert.equal(await readFile(join(job, "skills/old/SKILL.md"), "utf8"), "# Old\n");
	assert.equal(git(worktree, "status", "--porcelain", "--", ".pi", ".agents"), "", "the skill view must stay outside the worktree");
	await writeFile(join(worktree, ".pi/skills/added.md"), "# Added\n");
	const resumed = limen(scratch, "spawn", "--detached", "--branch", `limen/${id}`, "inspect again");
	assert.equal(resumed.status, 0, resumed.stderr);
	const resumedId = onlyJobId(resumed.stdout);
	await waitForState(scratch.root, resumedId, "done");
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs", resumedId, "skills")), ["added", "old"]);
});

test("failure is durable and detailed jobs render facts", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const id = onlyJobId(limen(scratch, "spawn", "fail now").stdout);
	await waitForState(scratch.root, id, "failed");
	const jobs = limen(scratch, "jobs", "--all");
	assert.equal(jobs.status, 0, jobs.stderr);
	assert.match(jobs.stdout, new RegExp(`FAILED fail now · id ${id}`));
	assert.match(jobs.stdout, /tools 1 · bash/);
	assert.match(jobs.stdout, /worker exited with code 7/);
	assert.match(jobs.stdout, /fake pi completed/);
});

test("review gets fresh detached worktree and reviewer birth text", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const worker = onlyJobId(limen(scratch, "spawn", "make commit").stdout);
	await waitForState(scratch.root, worker, "done");
	const branch = `limen/${worker}`;
	const candidateSha = git(scratch.root, "rev-parse", branch);
	const review = onlyJobId(limen(scratch, "spawn", "--review", "--branch", branch, "inspect candidate").stdout);
	await waitForState(scratch.root, review, "done");
	const reviewJob = join(scratch.root, ".limen/jobs", review);
	await assert.rejects(readFile(join(reviewJob, "hosted")));
	assert.equal(await readFile(join(reviewJob, "candidate"), "utf8"), `${candidateSha}\n`);
	assert.equal(await readFile(join(reviewJob, "role"), "utf8"), "reviewer\n");
	assert.equal(await readFile(join(reviewJob, "engine"), "utf8"), "omp\n");
	const reviewTask = await readFile(join(reviewJob, "task.md"), "utf8");
	assert.equal(reviewTask, `inspect candidate\n\nCandidate commit: ${candidateSha}.\n`);
	await assert.rejects(readFile(join(scratch.root, ".limen/jobs", worker, "candidate")));
	assert.match(limen(scratch, "jobs", review).stdout, new RegExp(`candidate ${candidateSha}`));
	assert.equal((await readFile(join(reviewJob, "base"), "utf8")).trim(), git(scratch.root, "rev-parse", branch));
	assert.equal(await readFile(join(reviewJob, "commits"), "utf8"), "");
	const worktree = git(scratch.root, "worktree", "list", "--porcelain")
		.split("\n\n")
		.find((block) => block.includes(review));
	assert.match(worktree ?? "", /detached/);
	const reviewPath = worktree?.split("\n")[0]?.slice("worktree ".length);
	assert.ok(reviewPath);
	const argv = JSON.parse(await readFile(join(reviewPath, "pi-args.json"), "utf8")) as string[];
	const prompt = argv[argv.indexOf("--append-system-prompt") + 1];
	assert.equal(argv.includes("--no-context-files"), false);
	assert.match(prompt ?? "", /Review; do not rewrite/);
	assert.equal(git(reviewPath, "rev-parse", "HEAD"), git(scratch.root, "rev-parse", branch));
});

test("stage model defaults respect review roles and explicit overrides", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const inherited = { worker: process.env.LIMEN_WORKER_MODEL, reviewer: process.env.LIMEN_REVIEWER_MODEL };
	delete process.env.LIMEN_WORKER_MODEL;
	delete process.env.LIMEN_REVIEWER_MODEL;
	context.after(() => {
		if (inherited.worker === undefined) delete process.env.LIMEN_WORKER_MODEL;
		else process.env.LIMEN_WORKER_MODEL = inherited.worker;
		if (inherited.reviewer === undefined) delete process.env.LIMEN_REVIEWER_MODEL;
		else process.env.LIMEN_REVIEWER_MODEL = inherited.reviewer;
	});
	const packageDefault = onlyJobId(limen(scratch, "spawn", "package model default").stdout);
	await waitForState(scratch.root, packageDefault, "done");
	assert.equal(await modelForJob(scratch.root, packageDefault), "openai-codex/gpt-6-astra:high");
	const reviewDefault = onlyJobId(limen(scratch, "spawn", "--review", "--branch", `limen/${packageDefault}`, "requested review default").stdout);
	await waitForState(scratch.root, reviewDefault, "done");
	assert.equal(await modelForJob(scratch.root, reviewDefault), "openai-codex/gpt-6-astra:high");
	process.env.LIMEN_WORKER_MODEL = "worker-default";
	process.env.LIMEN_REVIEWER_MODEL = "reviewer-default";
	const worker = onlyJobId(limen(scratch, "spawn", "worker model default").stdout);
	await waitForState(scratch.root, worker, "done");
	assert.equal(await modelForJob(scratch.root, worker), "worker-default");
	const review = onlyJobId(limen(scratch, "spawn", "--review", "--branch", `limen/${worker}`, "reviewer model default").stdout);
	await waitForState(scratch.root, review, "done");
	assert.equal(await modelForJob(scratch.root, review), "reviewer-default");
	const explicit = onlyJobId(limen(scratch, "spawn", "--model", "ticket-specific", "explicit model").stdout);
	await waitForState(scratch.root, explicit, "done");
	assert.equal(await modelForJob(scratch.root, explicit), "ticket-specific");
});

async function modelForJob(root: string, id: string): Promise<string | undefined> {
	const worktree = git(root, "worktree", "list", "--porcelain")
		.split("\n")
		.find((line) => line.includes(id))
		?.slice("worktree ".length);
	assert.ok(worktree, `worktree for ${id} expected`);
	const args = JSON.parse(await readFile(join(worktree, "pi-args.json"), "utf8")) as string[];
	const index = args.indexOf("--model");
	return index < 0 ? undefined : args[index + 1];
}

test("prune drops a finished worktree and spawn keeps a resumed one", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const first = onlyJobId(limen(scratch, "spawn", "--label", "keep later", "make commit").stdout);
	await waitForState(scratch.root, first, "done");
	const worktree = git(scratch.root, "worktree", "list", "--porcelain")
		.split("\n")
		.find((line) => line.includes(first))
		?.slice("worktree ".length);
	assert.ok(worktree);
	await writeFile(join(worktree, "uncommitted.txt"), "keep me\n");
	const second = onlyJobId(limen(scratch, "spawn", "make commit").stdout);
	await waitForState(scratch.root, second, "done");
	assert.doesNotMatch(git(scratch.root, "worktree", "list", "--porcelain"), new RegExp(first));
	const resumed = limen(scratch, "spawn", "continue work", "--branch", `limen/${first}`);
	assert.equal(resumed.status, 0, resumed.stderr);
	const resumedId = onlyJobId(resumed.stdout);
	await waitForState(scratch.root, resumedId, "done");
	const kept = git(scratch.root, "worktree", "list", "--porcelain")
		.split("\n")
		.find((line) => line.includes(resumedId || first));
	assert.ok(kept);
	const pruned = limen(scratch, "prune");
	assert.equal(pruned.status, 0, pruned.stderr);
	assert.match(pruned.stdout, /pruned /);
	assert.doesNotMatch(git(scratch.root, "worktree", "list", "--porcelain"), /limen-worktrees/);
});

test("spawn prints failed when the wrapper dies before writing pid", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const launched = limenWithEnv(scratch, { LIMEN_OMP: "" }, "spawn", "--label", "boom", "do work");
	assert.equal(launched.status, 0, launched.stderr);
	assert.match(launched.stdout, /failed boom/);
	assert.doesNotMatch(launched.stdout, /started/);
	const id = onlyJobId(launched.stdout);
	assert.equal((await readFile(join(scratch.root, ".limen/jobs", id, "state"), "utf8")).trim(), "failed");
});

test("explicit pi spawn without pi on PATH fails before worktree add", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	await rm(join(scratch.fakeBin, "pi"));
	const launched = limenWithEnv(scratch, { PATH: "/nonexistent" }, "spawn", "--engine", "pi", "do work");
	assert.equal(launched.status, 1);
	assert.match(launched.stderr, /pi is not on PATH/);
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")).catch(() => []), []);
	assert.doesNotMatch(git(scratch.root, "worktree", "list"), /limen-worktrees/);
});

test("explicit provider reaches authentication preflight without a fallback job", async (context) => {
	const scratch = await scratchRepo(`#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "auth") {
  require("node:fs").writeFileSync("auth-args.json", JSON.stringify(args));
  console.error("requested provider refused");
  process.exit(2);
}
process.exit(0);
`);
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const launched = limenWithEnv(
		scratch,
		{ LIMEN_PREFLIGHT: "auth" },
		"spawn",
		"--engine",
		"pi",
		"--provider",
		"openai-codex",
		"--model",
		"gpt-6-astra",
		"--thinking",
		"high",
		"do work",
	);
	assert.equal(launched.status, 1);
	assert.match(launched.stderr, /requested provider refused/);
	assert.deepEqual(JSON.parse(await readFile(join(scratch.root, "auth-args.json"), "utf8")), ["auth", "check", "--provider", "openai-codex", "--model", "gpt-6-astra"]);
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")).catch(() => []), []);
});

test("LIMEN_PREFLIGHT=auth proceeds when check passes", async (context) => {
	const scratch = await scratchRepo(defaultFakePi.replace('if (args[0] === "auth") process.exit(1);', 'if (args[0] === "auth") process.exit(0);'));
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const launched = limenWithEnv(scratch, { LIMEN_PREFLIGHT: "auth" }, "spawn", "--engine", "pi", "--model", "ticket-specific", "no model default");
	assert.equal(launched.status, 0, launched.stderr);
	const id = onlyJobId(launched.stdout);
	await waitForState(scratch.root, id, "done");
	assert.equal(await readFile(join(scratch.root, ".limen/jobs", id, "versions"), "utf8"), "pi 0.0.0-test\n");
});

test("task-file and stdin write task.md bytes untouched", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const bytes = Buffer.from("do `echo` and $(date)\n\nkeep trailing\n");
	await writeFile(join(scratch.root, "hand.md"), bytes);
	const fromFile = limen(scratch, "spawn", "--task-file", "hand.md", "--label", "file task");
	assert.equal(fromFile.status, 0, fromFile.stderr);
	const fileId = onlyJobId(fromFile.stdout);
	await waitForState(scratch.root, fileId, "done");
	assert.deepEqual(await readFile(join(scratch.root, ".limen/jobs", fileId, "task.md")), bytes);
	const fromStdin = limenWithInput(scratch, bytes.toString("utf8"), "spawn", "--task-file", "-", "--label", "stdin task");
	assert.equal(fromStdin.status, 0, fromStdin.stderr);
	const stdinId = onlyJobId(fromStdin.stdout);
	await waitForState(scratch.root, stdinId, "done");
	assert.equal(await readFile(join(scratch.root, ".limen/jobs", stdinId, "task.md"), "utf8"), bytes.toString("utf8"));
});

test("spawn warns on a number-only or live-duplicate label and still starts", async (context) => {
	const scratch = await scratchRepo(`#!/usr/bin/env node
process.on("SIGTERM", () => process.exit(0));
setInterval(() => {}, 1000);
`);
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const numberOnly = limen(scratch, "spawn", "--label", "F068", "do work");
	assert.equal(numberOnly.status, 0, numberOnly.stderr);
	assert.match(numberOnly.stdout, /warning: label is only a feature number/);
	assert.match(numberOnly.stdout, /started F068/);
	const numberId = onlyJobId(numberOnly.stdout);
	assert.match(numberId, /^\d{4}-\d{2}-\d{2}-f068-[0-9a-f]{8}$/);
	const label = "idle backstop · F065";
	const first = limen(scratch, "spawn", "--label", label, "long work");
	assert.equal(first.status, 0, first.stderr);
	assert.doesNotMatch(first.stdout, /already holds this label/);
	const firstId = onlyJobId(first.stdout);
	assert.match(firstId, /^\d{4}-\d{2}-\d{2}-f065-idle-backstop-[0-9a-f]{8}$/);
	const duplicate = limen(scratch, "spawn", "--label", label, "long work");
	assert.equal(duplicate.status, 0, duplicate.stderr);
	assert.match(duplicate.stdout, /warning: a live job already holds this label/);
	assert.match(duplicate.stdout, /started idle backstop · F065/);
	assert.doesNotMatch(duplicate.stdout, /only a feature number/);
	const duplicateId = onlyJobId(duplicate.stdout);
	assert.notEqual(duplicateId, firstId);
	assert.match(duplicateId, /^\d{4}-\d{2}-\d{2}-f065-idle-backstop-[0-9a-f]{8}$/);
	const refused = limen(scratch, "spawn", "--branch", "main", "--label", label, "long work");
	assert.equal(refused.status, 1);
	assert.equal(refused.stdout, "", "a refused spawn prints no running-job note or label warning");
	assert.match(refused.stderr, /primary worktree.*omit --branch/);
	for (const id of [numberId, firstId, duplicateId]) {
		assert.equal(limen(scratch, "stop", id, "test cleanup").status, 0);
		await waitForState(scratch.root, id, "stopped");
	}
});

test("spawn --role loads that overlay preamble and persists the name", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	await writeFile(join(scratch.root, ".agents/limen/researcher.md"), "RESEARCH PREAMBLE\n");
	const launched = limen(scratch, "spawn", "--role", "researcher", "--label", "F069 research", "look around");
	assert.equal(launched.status, 0, launched.stderr);
	const id = onlyJobId(launched.stdout);
	await waitForState(scratch.root, id, "done");
	const job = join(scratch.root, ".limen/jobs", id);
	assert.equal(await readFile(join(job, "role"), "utf8"), "researcher\n");
	const worktree = (await readFile(join(job, "worktree"), "utf8")).trim();
	const argv = JSON.parse(await readFile(join(worktree, "pi-args.json"), "utf8")) as string[];
	assert.equal(argv[argv.indexOf("--append-system-prompt") + 1], "RESEARCH PREAMBLE\n");
});

test("spawn refuses --role coordinator/lead before planting a job", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	for (const role of ["coordinator", "lead"] as const) {
		const refused = limen(scratch, "spawn", "--detached", "--role", role, "--label", `fake ${role}`, "pretend to own the group");
		assert.equal(refused.status, 1, refused.stderr);
		assert.match(refused.stderr, /LIMEN_COORDINATOR=1/);
		assert.match(refused.stderr, /group-peer/);
	}
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")), []);
});

test("spawn --role without a preamble or with --review plants no job", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const missing = limen(scratch, "spawn", "--role", "ghost", "look around");
	assert.equal(missing.status, 1);
	assert.match(missing.stderr, /no preamble for role ghost/);
	const combined = limen(scratch, "spawn", "--role", "researcher", "--review", "--branch", "limen/ghost", "inspect candidate");
	assert.equal(combined.status, 1);
	assert.match(combined.stderr, /--role and --review cannot be combined/);
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")).catch(() => []), []);
	assert.doesNotMatch(git(scratch.root, "worktree", "list"), /limen-worktrees/);
});

test("LIMEN_PREPARE runs in the worktree before Pi and is logged", async (context) => {
	const scratch = await scratchRepo(`#!/usr/bin/env node
const { existsSync } = require("node:fs");
if (!existsSync("prepared")) process.exit(9);
console.log(JSON.stringify({ type: "agent_start" }));
console.log(JSON.stringify({ type: "message_end", message: { role: "assistant", content: [{ type: "text", text: "ok" }] } }));
`);
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const launched = limenWithEnv(scratch, { LIMEN_PREPARE: "touch prepared" }, "spawn", "--label", "prep", "do work");
	assert.equal(launched.status, 0, launched.stderr);
	const id = onlyJobId(launched.stdout);
	await waitForState(scratch.root, id, "done");
	const worktree = (await readFile(join(scratch.root, ".limen/jobs", id, "worktree"), "utf8")).trim();
	await access(join(worktree, "prepared"));
	assert.match(await readFile(join(scratch.root, ".limen/jobs", id, "log"), "utf8"), /prepare: touch prepared/);
});

test("spawn accepts --engine omp and LIMEN_ENGINE, and refuses claude before a job exists", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const launched = limen(scratch, "spawn", "--engine", "omp", "--detached", "--label", "omp job", "do work");
	assert.equal(launched.status, 0, launched.stderr);
	const id = onlyJobId(launched.stdout);
	await waitForState(scratch.root, id, "done");
	const job = join(scratch.root, ".limen/jobs", id);
	assert.equal(await readFile(join(job, "engine"), "utf8"), "omp\n");
	assert.equal(await readFile(join(job, "versions"), "utf8"), "omp 0.0.0-test\n");
	for (const engine of ["pi", "omp"]) {
		const fromEnv = limenWithEnv(scratch, { LIMEN_ENGINE: engine }, "spawn", "--detached", "--label", `env ${engine}`, "do work");
		assert.equal(fromEnv.status, 0, fromEnv.stderr);
		const envId = onlyJobId(fromEnv.stdout);
		await waitForState(scratch.root, envId, "done");
		assert.equal(await readFile(join(scratch.root, ".limen/jobs", envId, "engine"), "utf8"), `${engine}\n`);
		assert.match(await readFile(join(scratch.root, ".limen/jobs", envId, "log"), "utf8"), new RegExp(`done: ${engine} exited 0`));
	}
	const override = limenWithEnv(scratch, { LIMEN_ENGINE: "omp" }, "spawn", "--engine", "pi", "--detached", "--label", "flag wins", "do work");
	assert.equal(override.status, 0, override.stderr);
	const overrideId = onlyJobId(override.stdout);
	await waitForState(scratch.root, overrideId, "done");
	assert.equal(await readFile(join(scratch.root, ".limen/jobs", overrideId, "engine"), "utf8"), "pi\n");
	for (const args of [
		["--engine", "claude", "--detached", "do work"],
		["--engine", "gpt", "look"],
	]) {
		const refused = limen(scratch, "spawn", ...args);
		assert.equal(refused.status, 1);
		assert.match(refused.stderr, /--engine must be pi or omp/);
	}
	const envClaude = limenWithEnv(scratch, { LIMEN_ENGINE: "claude" }, "spawn", "--detached", "look");
	assert.equal(envClaude.status, 1);
	assert.match(envClaude.stderr, /--engine must be pi or omp/);
	assert.equal((await readdir(join(scratch.root, ".limen/jobs"))).length, 4);
});

test("bare and explicit omp spawns fail before a job exists when omp is missing", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	await rm(join(scratch.fakeBin, "omp"));
	for (const flags of [[], ["--engine", "omp"]]) {
		const launched = limenWithEnv(scratch, { PATH: scratch.fakeBin }, "spawn", ...flags, "do work");
		assert.equal(launched.status, 1);
		assert.match(launched.stderr, /omp is not on PATH/);
		assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")).catch(() => []), []);
	}
	assert.doesNotMatch(git(scratch.root, "worktree", "list"), /limen-worktrees/);
});

test("LIMEN_PREFLIGHT=auth does not probe omp", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const launched = limenWithEnv(scratch, { LIMEN_PREFLIGHT: "auth" }, "spawn", "--engine", "omp", "--detached", "do work");
	assert.equal(launched.status, 0, launched.stderr);
	await waitForState(scratch.root, onlyJobId(launched.stdout), "done");
});

test("spawn refuses a ticket missing from the base commit and starts when it is committed", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const path = "spec/features/active/F714-spawn-fails-closed-without-ticket/ticket.md";
	const task = `do work (Ticket:  ${path}).`;
	const missing = limen(scratch, "spawn", task);
	assert.equal(missing.status, 1);
	assert.match(missing.stderr, /ticket spec\/features\/active\/F714-spawn-fails-closed-without-ticket\/ticket\.md is missing from the base commit/);
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")), []);
	assert.doesNotMatch(git(scratch.root, "worktree", "list"), /limen-worktrees/);
	assert.doesNotMatch(git(scratch.root, "branch"), /limen\//);
	await mkdir(join(scratch.root, "spec/features/active/F714-spawn-fails-closed-without-ticket"), { recursive: true });
	await writeFile(join(scratch.root, path), "outcome\n");
	const untracked = limen(scratch, "spawn", task);
	assert.equal(untracked.status, 1);
	assert.match(untracked.stderr, /missing from the base commit/);
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")), []);
	assert.doesNotMatch(git(scratch.root, "worktree", "list"), /limen-worktrees/);
	assert.doesNotMatch(git(scratch.root, "branch"), /limen\//);
	git(scratch.root, "add", path);
	git(scratch.root, "commit", "-m", "ticket");
	const committed = limen(scratch, "spawn", task);
	assert.equal(committed.status, 0, committed.stderr);
	await waitForState(scratch.root, onlyJobId(committed.stdout), "done");
});

test("spawn --branch checks the ticket against that branch, not the caller's tree", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const first = onlyJobId(limen(scratch, "spawn", "make commit").stdout);
	await waitForState(scratch.root, first, "done");
	const branch = `limen/${first}`;
	const jobsBefore = await readdir(join(scratch.root, ".limen/jobs"));
	const worktreesBefore = git(scratch.root, "worktree", "list");
	const path = "spec/features/active/F714-resume/ticket.md";
	await mkdir(join(scratch.root, "spec/features/active/F714-resume"), { recursive: true });
	await writeFile(join(scratch.root, path), "dirty\n");
	const dirty = limen(scratch, "spawn", "--branch", branch, `continue Ticket: ${path}`);
	assert.equal(dirty.status, 1);
	assert.match(dirty.stderr, /ticket spec\/features\/active\/F714-resume\/ticket\.md is missing from the base commit/);
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")), jobsBefore);
	assert.equal(git(scratch.root, "worktree", "list"), worktreesBefore);
	const worktree = (await readFile(join(scratch.root, ".limen/jobs", first, "worktree"), "utf8")).trim();
	await mkdir(join(worktree, "spec/features/active/F714-resume"), { recursive: true });
	await writeFile(join(worktree, path), "on branch\n");
	git(worktree, "add", path);
	git(worktree, "commit", "-m", "ticket on branch");
	const resumed = limen(scratch, "spawn", "--branch", branch, `continue Ticket: ${path}`);
	assert.equal(resumed.status, 0, resumed.stderr);
	await waitForState(scratch.root, onlyJobId(resumed.stdout), "done");
});

test("overlapping starts keep both worktrees; prune still drops a genuine leftover", { timeout: 120_000 }, async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const waitingRoot = join(scratch.root, "prepare-waiting");
	const gate = join(scratch.root, "prepare-gate");
	const prepareScript = join(scratch.root, "wait-prepare.cjs");
	await writeFile(
		prepareScript,
		`const { writeFileSync, existsSync, mkdirSync } = require("node:fs");
const { basename, join } = require("node:path");
mkdirSync(${JSON.stringify(waitingRoot)}, { recursive: true });
writeFileSync(join(${JSON.stringify(waitingRoot)}, basename(process.cwd())), "1");
while (!existsSync(${JSON.stringify(gate)})) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
`,
	);
	const prepare = `node ${JSON.stringify(prepareScript)}`;
	const first = startLimen(scratch, ["spawn", "--prepare", prepare, "--label", "first start", "do work"]);
	let second: ReturnType<typeof startLimen> | undefined;
	context.after(async () => {
		await writeFile(gate, "1\n").catch(() => {});
		await Promise.race([
			Promise.all([first.output, second?.output ?? Promise.resolve()]).then(
				() => undefined,
				() => undefined,
			),
			delay(10_000),
		]);
		await first.settle();
		await second?.settle();
	});
	const firstId = await waitForInFlightJob(scratch.root);
	await waitFor("first start did not reach prepare", async () => existsSync(join(waitingRoot, firstId)), 30_000);
	const firstJob = join(scratch.root, ".limen/jobs", firstId);
	const firstWorktree = (await readFile(join(firstJob, "worktree"), "utf8")).trim();
	await access(firstWorktree);
	await assert.rejects(access(join(firstJob, "state")));
	second = startLimen(scratch, ["spawn", "--prepare", prepare, "--label", "second start", "do work"]);
	await waitFor("second start did not reach prepare", async () => (await readdir(waitingRoot).catch(() => [])).length >= 2, 30_000);
	await access(firstJob);
	await access(firstWorktree);
	assert.equal(await readFile(join(firstJob, "task.md"), "utf8"), "do work\n");
	const secondId = (await readdir(join(scratch.root, ".limen/jobs"))).find((id) => id !== firstId);
	assert.ok(secondId, "second job record missing after overlapping start");
	const secondJob = join(scratch.root, ".limen/jobs", secondId);
	const secondWorktree = (await readFile(join(secondJob, "worktree"), "utf8")).trim();
	await access(secondWorktree);
	const leftover = join(scratch.root, ".limen/jobs/half-written");
	await mkdir(leftover);
	await writeFile(join(leftover, "task.md"), "half\n");
	const staleId = "2000-01-01-stale-start-aaaaaaaa";
	const staleJob = join(scratch.root, ".limen/jobs", staleId);
	const staleWorktree = join(dirname(scratch.root), `.${basename(scratch.root)}-limen-worktrees`, staleId);
	await mkdir(staleJob);
	await writeFile(join(staleJob, "task.md"), "interrupted\n");
	await writeFile(join(staleJob, "started-at"), "2000-01-01T00:00:00.000Z\n");
	await writeFile(join(staleJob, "worktree"), `${staleWorktree}\n`);
	git(scratch.root, "worktree", "add", "--detach", staleWorktree, "HEAD");
	const pruned = limen(scratch, "prune");
	assert.equal(pruned.status, 0, pruned.stderr);
	await access(firstJob);
	await access(firstWorktree);
	await access(secondJob);
	await access(secondWorktree);
	await assert.rejects(access(join(firstJob, "state")));
	await assert.rejects(access(leftover));
	await assert.rejects(access(staleJob));
	await assert.rejects(access(staleWorktree));
	await writeFile(gate, "1\n");
	assert.ok(second);
	const [firstResult, secondResult] = await Promise.all([first.output, second.output]);
	assert.equal(firstResult.status, 0, firstResult.stderr);
	assert.equal(secondResult.status, 0, secondResult.stderr);
	assert.equal(onlyJobId(firstResult.stdout), firstId);
	assert.equal(onlyJobId(secondResult.stdout), secondId);
	await Promise.all([waitForState(scratch.root, firstId, "done"), waitForState(scratch.root, secondId, "done")]);
	await access(firstJob);
	await access(secondJob);
});

test("a second spawn cannot delete a worktree still being added", { timeout: 120_000 }, async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const delayFile = join(scratch.root, "delay-worktree");
	const addedFile = join(scratch.root, "worktree-added");
	await writeFile(delayFile, "1\n");
	const realGit = ["/usr/bin/git", "/usr/local/bin/git", "/opt/homebrew/bin/git"].find((path) => existsSync(path));
	assert.ok(realGit, "real git binary not found");
	await writeFile(
		join(scratch.fakeBin, "git"),
		`#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const { existsSync, writeFileSync } = require("node:fs");
const result = spawnSync(${JSON.stringify(realGit)}, process.argv.slice(2), { encoding: "utf8" });
process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");
if (result.status === 0 && process.argv.includes("worktree") && process.argv.includes("add") && existsSync(${JSON.stringify(delayFile)}) && !existsSync(${JSON.stringify(addedFile)})) {
  writeFileSync(${JSON.stringify(addedFile)}, "1");
  while (existsSync(${JSON.stringify(delayFile)})) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
}
process.exit(result.status ?? 1);
`,
	);
	await chmod(join(scratch.fakeBin, "git"), 0o755);
	const first = startLimen(scratch, ["spawn", "--label", "worktree first", "do work"]);
	context.after(async () => {
		await rm(delayFile, { force: true }).catch(() => {});
		await Promise.race([
			first.output.then(
				() => undefined,
				() => undefined,
			),
			delay(10_000),
		]);
		await first.settle();
	});
	await waitFor(
		`first worktree add never paused\n${addedFile}`,
		async () =>
			access(addedFile).then(
				() => true,
				() => false,
			),
		30_000,
	);
	const worktreeRoot = join(dirname(scratch.root), `.${basename(scratch.root)}-limen-worktrees`);
	const planted = (await readdir(worktreeRoot)).filter((name) => !name.startsWith("."));
	assert.equal(planted.length, 1, `expected one in-flight worktree, got ${planted.join(",")}`);
	const firstWorktree = join(worktreeRoot, planted[0] ?? "");
	await access(firstWorktree);
	const second = limen(scratch, "spawn", "--label", "worktree second", "do work");
	assert.equal(second.status, 0, second.stderr);
	const secondId = onlyJobId(second.stdout);
	await waitForState(scratch.root, secondId, "done");
	await access(firstWorktree);
	assert.match(git(scratch.root, "worktree", "list", "--porcelain"), new RegExp(planted[0] ?? ""));
	await rm(delayFile);
	const firstResult = await first.output;
	assert.equal(firstResult.status, 0, firstResult.stderr);
	const firstId = onlyJobId(firstResult.stdout);
	await waitForState(scratch.root, firstId, "done");
	await access(join(scratch.root, ".limen/jobs", firstId));
	await access(join(scratch.root, ".limen/jobs", secondId));
});

test("prune between job-directory creation and marker writes cannot delete the start", { timeout: 120_000 }, async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const root = await realpath(scratch.root);
	const jobsRoot = `${root}/.limen/jobs`;
	const originalMkdir = fs.promises.mkdir;
	const originalRename = fs.promises.rename;
	let interleaved = 0;
	const previousEnv = { ...process.env };
	const pruneAfterPublish = async (jobDir: string) => {
		interleaved += 1;
		const { pruneFinishedWorktrees } = await import("../src/commands/prune.ts");
		await pruneFinishedWorktrees(root);
		assert.ok(existsSync(jobDir), `prune deleted in-flight job directory ${jobDir}`);
		assert.ok(existsSync(`${jobDir}/started-at`) && existsSync(`${jobDir}/worktree`), `prune stripped in-flight markers from ${jobDir}`);
	};
	try {
		process.env.PATH = `${scratch.fakeBin}:${process.env.PATH}`;
		process.env.LIMEN_HERDR = "0";
		process.env.LIMEN_HUNK = "0";
		process.env.LIMEN_FINISH_WEBHOOK_ENV = "";
		delete process.env.LIMEN_OMP;
		delete process.env.LIMEN_PI;
		for (const name of Object.keys(process.env)) {
			if (name.startsWith("HERDR_") || name === "PI_SESSION_ID" || name === "PI_SESSION_FILE") delete process.env[name];
		}
		fs.promises.mkdir = (async (path: Parameters<typeof originalMkdir>[0], options?: Parameters<typeof originalMkdir>[1]) => {
			const result = await originalMkdir(path, options as never);
			const text = String(path);
			if (text.startsWith(`${jobsRoot}/`) && !text.slice(jobsRoot.length + 1).includes("/") && options === undefined) await pruneAfterPublish(text);
			return result;
		}) as typeof originalMkdir;
		fs.promises.rename = (async (from: Parameters<typeof originalRename>[0], to: Parameters<typeof originalRename>[1]) => {
			const result = await originalRename(from, to);
			const text = String(to);
			if (text.startsWith(`${jobsRoot}/`) && !text.slice(jobsRoot.length + 1).includes("/")) await pruneAfterPublish(text);
			return result;
		}) as typeof originalRename;
		syncBuiltinESMExports();
		const { spawnCommand } = await import("../src/commands/spawn.ts");
		await spawnCommand(["--detached", "--label", "publication probe", "do work"], root);
		assert.ok(interleaved > 0, "spawn published no job directory for prune to interleave");
		const ids = await readdir(jobsRoot);
		assert.equal(ids.length, 1);
		const id = ids[0];
		assert.ok(id);
		await waitForState(root, id, "done");
	} finally {
		fs.promises.mkdir = originalMkdir;
		fs.promises.rename = originalRename;
		syncBuiltinESMExports();
		for (const name of Object.keys(process.env)) {
			if (!(name in previousEnv)) delete process.env[name];
		}
		Object.assign(process.env, previousEnv);
	}
});

function startLimen(scratch: { readonly root: string; readonly fakeBin: string }, args: readonly string[], env: NodeJS.ProcessEnv = {}) {
	const child = spawn(
		process.execPath,
		[
			"--input-type=module",
			"-e",
			`import { limenWithEnv } from ${JSON.stringify(new URL("./scratch.ts", import.meta.url).href)};
const result = limenWithEnv(${JSON.stringify({ root: scratch.root, fakeBin: scratch.fakeBin })}, ${JSON.stringify(env)}, ...${JSON.stringify(args)});
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exit(result.status);`,
		],
		{ stdio: ["ignore", "pipe", "pipe"] },
	);
	let stdout = "";
	let stderr = "";
	child.stdout?.setEncoding("utf8");
	child.stderr?.setEncoding("utf8");
	child.stdout?.on("data", (chunk) => {
		stdout += chunk;
	});
	child.stderr?.on("data", (chunk) => {
		stderr += chunk;
	});
	const output = new Promise<{ readonly stdout: string; readonly stderr: string; readonly status: number }>((resolve, reject) => {
		child.once("error", reject);
		child.once("close", (status) => resolve({ stdout, stderr, status: status ?? 1 }));
	});
	const settle = async () => {
		const pid = child.pid;
		const tree = pid ? [pid, ...descendantPids(pid)] : [];
		for (const target of tree) {
			try {
				process.kill(target, "SIGTERM");
			} catch {}
		}
		await Promise.race([
			output.then(
				() => undefined,
				() => undefined,
			),
			delay(1_000),
		]);
		for (const target of new Set([...tree, ...(pid ? descendantPids(pid) : [])])) {
			try {
				process.kill(target, "SIGKILL");
			} catch {}
		}
		await Promise.race([
			output.then(
				() => undefined,
				() => undefined,
			),
			delay(1_000),
		]);
	};
	return { child, output, settle };
}

async function waitForInFlightJob(root: string): Promise<string> {
	const jobsRoot = join(root, ".limen/jobs");
	const deadline = Date.now() + 30_000;
	while (Date.now() < deadline) {
		for (const id of await readdir(jobsRoot).catch(() => [] as string[])) {
			const hasTask = await access(join(jobsRoot, id, "task.md")).then(
				() => true,
				() => false,
			);
			const hasState = await access(join(jobsRoot, id, "state")).then(
				() => true,
				() => false,
			);
			const hasWorktree = await access(join(jobsRoot, id, "worktree")).then(
				() => true,
				() => false,
			);
			if (hasTask && hasWorktree && !hasState) return id;
		}
		await new Promise((resolve) => setTimeout(resolve, 25));
	}
	throw new Error(`in-flight job with task.md and no state did not appear under ${jobsRoot}`);
}

async function waitFor(message: string, probe: () => Promise<boolean>, timeoutMs = 10_000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (await probe()) return;
		await new Promise((resolve) => setTimeout(resolve, 25));
	}
	throw new Error(message);
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function descendantPids(rootPid: number): number[] {
	const table: Array<{ pid: number; ppid: number }> = [];
	for (const line of (spawnSync("/bin/ps", ["-ax", "-o", "pid=,ppid="], { encoding: "utf8" }).stdout ?? "").split("\n")) {
		const [pid, ppid] = line.trim().split(/\s+/).map(Number);
		if (pid && ppid) table.push({ pid, ppid });
	}
	const found: number[] = [];
	const seen = new Set([rootPid]);
	const queue = [rootPid];
	for (let current = queue.shift(); current !== undefined; current = queue.shift()) {
		for (const row of table) {
			if (row.ppid !== current || seen.has(row.pid)) continue;
			seen.add(row.pid);
			found.push(row.pid);
			queue.push(row.pid);
		}
	}
	return found;
}

test("a positional title labels a task file, and a trailing period does not break the ticket pointer", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const path = "spec/features/active/F741-launch-ergonomics/ticket.md";
	await mkdir(join(scratch.root, "spec/features/active/F741-launch-ergonomics"), { recursive: true });
	await writeFile(join(scratch.root, path), "outcome\n");
	const bytes = `Build the slice.\n\nTicket: ${path}.\n`;
	await writeFile(join(scratch.root, "hand.md"), bytes);
	git(scratch.root, "add", ".");
	git(scratch.root, "commit", "-m", "ticket and task");

	const titled = limen(scratch, "spawn", "Build the slice", "--task-file", "hand.md");
	assert.equal(titled.status, 0, titled.stderr);
	const id = onlyJobId(titled.stdout);
	await waitForState(scratch.root, id, "done");
	assert.equal(await readFile(join(scratch.root, ".limen/jobs", id, "label"), "utf8"), "Build the slice\n");
	assert.equal(await readFile(join(scratch.root, ".limen/jobs", id, "task.md"), "utf8"), bytes);
});

test("review pins --base and --head given as a short SHA or a ref, and names a ref that is no commit", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const base = git(scratch.root, "rev-parse", "HEAD");
	git(scratch.root, "checkout", "-b", "limen/candidate");
	await writeFile(join(scratch.root, "candidate.txt"), "candidate\n");
	git(scratch.root, "add", "candidate.txt");
	git(scratch.root, "commit", "-m", "candidate");
	const head = git(scratch.root, "rev-parse", "HEAD");
	git(scratch.root, "checkout", "main");
	const missing = limen(scratch, "spawn", "--review", "--branch", "limen/candidate", "--head", "no-such-ref", "inspect");
	assert.equal(missing.status, 1);
	assert.match(missing.stderr, /--head "no-such-ref" names no commit/);
	const started = limen(scratch, "spawn", "--review", "--branch", "limen/candidate", "--base", "main", "--head", head.slice(0, 9), "inspect");
	assert.equal(started.status, 0, started.stderr);
	const id = onlyJobId(started.stdout);
	await waitForState(scratch.root, id, "done");
	assert.equal((await readFile(join(scratch.root, ".limen/jobs", id, "base"), "utf8")).trim(), base);
	assert.equal((await readFile(join(scratch.root, ".limen/jobs", id, "candidate"), "utf8")).trim(), head);
});

test("a review that is still starting records its spawner at once and lists as starting, never ORPHAN", { timeout: 120_000 }, async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	git(scratch.root, "checkout", "-b", "limen/slow-review");
	await writeFile(join(scratch.root, "candidate.txt"), "candidate\n");
	git(scratch.root, "add", "candidate.txt");
	git(scratch.root, "commit", "-m", "candidate");
	git(scratch.root, "checkout", "main");
	const gate = join(scratch.root, "prepare-gate");
	const reached = join(scratch.root, "prepare-reached");
	const prepareScript = join(scratch.root, "slow-prepare.cjs");
	await writeFile(
		prepareScript,
		`const { existsSync, writeFileSync } = require("node:fs");
writeFileSync(${JSON.stringify(reached)}, "1");
while (!existsSync(${JSON.stringify(gate)})) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
`,
	);
	const started = startLimen(scratch, [
		"spawn",
		"--review",
		"--branch",
		"limen/slow-review",
		"--prepare",
		`node ${JSON.stringify(prepareScript)}`,
		"--label",
		"slow review",
		"inspect",
	]);
	context.after(async () => {
		await writeFile(gate, "1\n").catch(() => {});
		await Promise.race([
			started.output.then(
				() => undefined,
				() => undefined,
			),
			delay(10_000),
		]);
		await started.settle();
	});
	const id = await waitForInFlightJob(scratch.root);
	await waitFor("review did not reach prepare", async () => existsSync(reached), 30_000);
	const job = join(scratch.root, ".limen/jobs", id);
	await assert.rejects(access(join(job, "state")));
	const spawner = Number((await readFile(join(job, "starting"), "utf8")).trim());
	assert.ok(Number.isSafeInteger(spawner) && spawner > 0, "starting names no spawner pid");
	const listed = limen(scratch, "jobs");
	assert.equal(listed.status, 0, listed.stderr);
	assert.doesNotMatch(listed.stdout, /ORPHAN/);
	assert.match(listed.stdout, new RegExp(`slow review.*starting|starting.*${id}`));
	const status = limen(scratch, "status");
	assert.equal(status.status, 0, status.stderr);
	assert.doesNotMatch(status.stdout, /unknown state/);
	assert.match(status.stdout, new RegExp(`slow review \\(${id}\\).*starting`));
	await writeFile(gate, "1\n");
	assert.equal((await started.output).status, 0);
	await waitForState(scratch.root, id, "done");
});
