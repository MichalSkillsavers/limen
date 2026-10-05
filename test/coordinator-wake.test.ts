import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { limenWithEnv, onlyJobId, type Scratch, scratchRepo, waitForState } from "./scratch.ts";

// A fake Herdr that records every prompt and answers `agent prompt` the way the real CLI does for the given outcome.
async function fakeHerdr(scratch: Scratch, prompt: "observed" | "stalled" | "missing" | "flaky"): Promise<string> {
	const path = join(scratch.fakeBin, "herdr");
	const observed = `console.log(JSON.stringify({ result: { status: "working" } }));`;
	const missing = `console.error("pane_not_found"); process.exit(1);`;
	const answer =
		prompt === "observed"
			? observed
			: prompt === "stalled"
				? `console.error("agent_prompt_stalled: no working state observed"); process.exit(1);`
				: prompt === "missing"
					? missing
					: `if (require("node:fs").readFileSync(${JSON.stringify(join(scratch.root, "herdr-prompts"))}, "utf8").trim().split("\\n").length === 1) { ${missing} } ${observed}`;
	await writeFile(
		path,
		`#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "agent" && args[1] === "prompt") {
  require("node:fs").appendFileSync(${JSON.stringify(join(scratch.root, "herdr-prompts"))}, JSON.stringify(args) + "\\n");
  ${answer}
} else console.log(JSON.stringify({ result: {} }));
`,
	);
	await chmod(path, 0o755);
	return path;
}

async function receipt(job: string): Promise<string> {
	const deadline = Date.now() + 10_000;
	for (;;) {
		const value = (await readFile(join(job, "notify/herdr-prompt"), "utf8").catch(() => "")).trim();
		if (value && !value.startsWith("attempting")) return value;
		if (Date.now() > deadline) throw new Error(`no settled Herdr wake receipt; last ${JSON.stringify(value)}`);
		await new Promise((resolve) => setTimeout(resolve, 50));
	}
}

async function prompts(scratch: Scratch): Promise<string[][]> {
	const raw = await readFile(join(scratch.root, "herdr-prompts"), "utf8").catch(() => "");
	return raw
		.split("\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line) as string[]);
}

function wipe(scratch: Scratch): void {
	spawnSync("/bin/rm", ["-rf", dirname(scratch.root)], { stdio: "ignore" });
}

const herdrCoordinator = (herdr: string) => ({ HERDR_ENV: "1", HERDR_PANE_ID: "w1:p7", HERDR_TAB_ID: "w1:t3", LIMEN_HERDR: herdr, LIMEN_COORDINATOR: "1" });

test("a job spawned from a Herdr coordinator without a Pi session starts a turn on that pane when it ends", async (context) => {
	const scratch = await scratchRepo();
	context.after(() => wipe(scratch));
	const herdr = await fakeHerdr(scratch, "observed");
	limenWithEnv(scratch, {}, "init");
	const launched = limenWithEnv(scratch, herdrCoordinator(herdr), "spawn", "--detached", "--label", "omp wake", "make commit");
	assert.equal(launched.status, 0, launched.stderr);
	const id = onlyJobId(launched.stdout);
	const job = join(scratch.root, ".limen/jobs", id);
	assert.equal((await readFile(join(job, "origin-pane"), "utf8")).trim(), "w1:p7");
	await waitForState(scratch.root, id, "done");
	assert.match(await receipt(job), /^attempt 1: turn observed on w1:p7 \S+$/);
	const sent = await prompts(scratch);
	assert.equal(sent.length, 1, "an observed turn ends automatic delivery");
	const [verb, sub, target, text, ...flags] = sent[0] ?? [];
	assert.deepEqual([verb, sub, target], ["agent", "prompt", "w1:p7"]);
	assert.match(text ?? "", new RegExp(`limen jobs ${id}`));
	assert.match(text ?? "", /Commits:\n[0-9a-f]+ candidate/);
	assert.match(text ?? "", /Final message:\nfake pi completed/);
	assert.ok(flags.includes("--wait") && flags.includes("working"), "the prompt must wait for an observed turn");
	// The observed turn settles the in-process wake hook so no Pi fallback repeats it.
	assert.ok((await readFile(join(job, "notify/delivered/_herdr"), "utf8")).trim());
	assert.match(await readFile(join(job, "log"), "utf8"), /coordinator wake via Herdr: attempt 1: turn observed on w1:p7/);
	const detail = limenWithEnv(scratch, {}, "jobs", id);
	assert.equal(detail.status, 0, detail.stderr);
	assert.match(detail.stdout, /herdr-wake:\n {4}attempt 1: turn observed on w1:p7/);
});

test("one failed Herdr prompt is retried once and the observed retry delivers", async (context) => {
	const scratch = await scratchRepo();
	context.after(() => wipe(scratch));
	const herdr = await fakeHerdr(scratch, "flaky");
	limenWithEnv(scratch, {}, "init");
	const id = onlyJobId(limenWithEnv(scratch, herdrCoordinator(herdr), "spawn", "--detached", "do work").stdout);
	const job = join(scratch.root, ".limen/jobs", id);
	await waitForState(scratch.root, id, "done");
	assert.match(await receipt(job), /^attempt 1: failed on w1:p7: pane_not_found \S+\nattempt 2: turn observed on w1:p7 \S+$/);
	assert.equal((await prompts(scratch)).length, 2);
	assert.ok((await readFile(join(job, "notify/delivered/_herdr"), "utf8")).trim());
});

test("two stalled Herdr prompts stop automatic delivery and leave the wake undelivered", async (context) => {
	const scratch = await scratchRepo();
	context.after(() => wipe(scratch));
	const herdr = await fakeHerdr(scratch, "stalled");
	limenWithEnv(scratch, {}, "init");
	const id = onlyJobId(limenWithEnv(scratch, herdrCoordinator(herdr), "spawn", "--detached", "do work").stdout);
	const job = join(scratch.root, ".limen/jobs", id);
	await waitForState(scratch.root, id, "done");
	assert.match(
		await receipt(job),
		/^attempt 1: submitted to w1:p7; no turn observed \S+\nattempt 2: submitted to w1:p7; no turn observed \S+\nautomatic delivery stopped after 2 unsuccessful attempts/,
	);
	assert.equal((await prompts(scratch)).length, 2, "no third automatic attempt");
	await assert.rejects(readFile(join(job, "notify/delivered/_herdr")));
});

test("a missing coordinator pane fails the Herdr wake visibly without blocking the terminal state", async (context) => {
	const scratch = await scratchRepo();
	context.after(() => wipe(scratch));
	const herdr = await fakeHerdr(scratch, "missing");
	limenWithEnv(scratch, {}, "init");
	const id = onlyJobId(limenWithEnv(scratch, herdrCoordinator(herdr), "spawn", "--detached", "do work").stdout);
	const job = join(scratch.root, ".limen/jobs", id);
	await waitForState(scratch.root, id, "done");
	assert.match(await receipt(job), /^attempt 1: failed on w1:p7: pane_not_found \S+\nattempt 2: failed on w1:p7: pane_not_found \S+\nautomatic delivery stopped/);
	await assert.rejects(readFile(join(job, "notify/delivered/_herdr")));
});

test("a Pi coordinator keeps its in-process wake route and records no Herdr pane", async (context) => {
	const scratch = await scratchRepo();
	context.after(() => wipe(scratch));
	const herdr = await fakeHerdr(scratch, "observed");
	limenWithEnv(scratch, {}, "init");
	const id = onlyJobId(limenWithEnv(scratch, { ...herdrCoordinator(herdr), PI_SESSION_ID: "pi-session" }, "spawn", "--detached", "do work").stdout);
	const job = join(scratch.root, ".limen/jobs", id);
	// Wake routing keys on origin-pane alone: without it finalize never prompts Herdr.
	await assert.rejects(readFile(join(job, "origin-pane")));
	assert.ok(await readFile(join(job, "notify/subscribers/pi-session"), "utf8"));
});
