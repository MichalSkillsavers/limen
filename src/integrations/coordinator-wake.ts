import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { appendLimenLog, atomicWrite, textFile } from "../job/record.ts";

const PROMPT_MS = 15_000;
const ATTEMPTS = 2;

/**
 * Start a turn on the Herdr pane that spawned this job. Only jobs whose coordinator had no Pi session record
 * `origin-pane`; Pi coordinators keep their in-process wake. Claimed once per job by `notify/herdr-prompt`, which
 * keeps one line per attempt. Two unsuccessful attempts stop automatic delivery; recovery is then deliberate.
 * `notify/delivered/_herdr` is written only when Herdr observed the pane working after submission.
 */
export async function promptCoordinator(jobDir: string, shutdownDeadline = Number.POSITIVE_INFINITY): Promise<void> {
	const pane = await textFile(`${jobDir}/origin-pane`);
	const herdr = process.env.LIMEN_HERDR || "herdr";
	if (!pane || herdr === "0" || shutdownDeadline - Date.now() < 1_000) return;
	await mkdir(`${jobDir}/notify`, { recursive: true });
	try {
		await writeFile(`${jobDir}/notify/herdr-prompt`, `attempting ${pane} ${new Date().toISOString()}\n`, { flag: "wx", flush: true });
	} catch {
		return; // Another finalizer already owns this wake.
	}
	const message = await wakeText(jobDir);
	const lines: string[] = [];
	for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
		const budget = Math.min(PROMPT_MS, shutdownDeadline - Date.now());
		if (budget < 1_000) {
			lines.push("no shutdown budget for another attempt; inspect the job and wake the coordinator deliberately");
			break;
		}
		const wait = String(Math.max(budget - 2_000, 1_000));
		const outcome = await run(herdr, ["agent", "prompt", pane, message, "--wait", "--until", "working", "--until", "blocked", "--timeout", wait], budget);
		const result = outcome.ok
			? `turn observed on ${pane}`
			: /agent_prompt_stalled/.test(outcome.detail)
				? `submitted to ${pane}; no turn observed`
				: `failed on ${pane}: ${outcome.detail}`;
		lines.push(`attempt ${attempt}: ${result} ${new Date().toISOString()}`);
		await appendLimenLog(jobDir, `coordinator wake via Herdr: attempt ${attempt}: ${result}`);
		if (outcome.ok) {
			await mkdir(`${jobDir}/notify/delivered`, { recursive: true });
			await writeFile(`${jobDir}/notify/delivered/_herdr`, `${new Date().toISOString()}\n`, { flag: "wx", flush: true }).catch(() => {});
			break;
		}
		if (attempt < ATTEMPTS) await atomicWrite(`${jobDir}/notify/herdr-prompt`, `attempting ${pane}\n${lines.join("\n")}\n`);
		else lines.push(`automatic delivery stopped after ${ATTEMPTS} unsuccessful attempts; inspect the job and wake the coordinator deliberately`);
	}
	await atomicWrite(`${jobDir}/notify/herdr-prompt`, `${lines.join("\n")}\n`);
}

async function wakeText(jobDir: string): Promise<string> {
	const [label, state, branch, repo] = await Promise.all(["label", "state", "branch", "repo"].map((name) => textFile(`${jobDir}/${name}`)));
	const id = jobDir.split("/").at(-1) ?? "";
	const location = repo ? ` in repository ${repo}` : "";
	const meaning =
		state === "done"
			? "Job done. Next step: land it after you check its diff, commits, final message, and checks. If a check still blocks landing, name that check and resume a focused fix."
			: "Inspect the failure in its log and session before deciding whether to resume work; do not treat it as a new-spawn or release signal.";
	return `Limen job ${JSON.stringify(label || id)} is ${state} (${id}) on branch ${branch}${location}. ${meaning} Start with \`limen jobs ${id}\`. Keep the user informed; ask only when a genuine product decision needs them.`;
}

function run(binary: string, args: readonly string[], timeout: number): Promise<{ readonly ok: boolean; readonly detail: string }> {
	const { promise, resolve } = Promise.withResolvers<{ readonly ok: boolean; readonly detail: string }>();
	execFile(binary, args, { encoding: "utf8", timeout }, (error, stdout, stderr) => {
		// error.message repeats the full argv, wake text included; the receipt keeps Herdr's own first line instead.
		const said = `${stderr || ""}${stdout || ""}`.trim().split("\n")[0] ?? "";
		const detail = error?.killed ? `herdr exceeded ${timeout}ms` : said || (error ? `herdr exited ${error.code ?? "abnormally"}` : "");
		resolve({ ok: !error, detail });
	});
	return promise;
}
