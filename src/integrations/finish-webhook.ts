import { spawn } from "node:child_process";
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, delimiter, dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appendLimenLog, atomicWrite, textFile } from "../job/record.ts";
import { currentBranch, listWorktrees, ticketAuthor, workspaceRoot } from "../project/git.ts";
import { ticketPointers } from "../project/planning.ts";
import { finishEvent, parseFinishReceipt, parseFinishSelection } from "./finish-receipt.ts";

const SENDER = fileURLToPath(new URL("../../bin/tony-finish-ping.sh", import.meta.url));
// Leave time inside the detached wrapper's 5s termination grace to record the outcome.
const SEND_MS = 3_000;
const DELIVERY_MS = 4_000;
export function finishWebhookEnv(root: string, cwd: string, explicit = process.env.LIMEN_FINISH_WEBHOOK_ENV): string {
	if (explicit !== undefined) return explicit.trim() ? resolve(cwd, explicit) : "";
	const project = workspaceRoot(root) ? root : (listWorktrees(root)[0]?.path ?? root);
	const path = resolve(project, ".limen/finish-webhook.env");
	return existsSync(path) ? path : "";
}
export function captureFinishAuthor(cwd: string, task: string, workspace = false): string {
	if (workspace) return "unavailable\nnon-Git workspace ticket";
	const tickets = ticketPointers(task);
	const ticket = tickets.length === 1 ? tickets[0]?.path : undefined;
	if (!ticket) return `unavailable\n${tickets.length ? "ambiguous Ticket: pointer" : "missing Ticket: pointer"}`;
	try {
		const author = ticketAuthor(cwd, ticket);
		const login = /^(?:\d+\+)?([a-z\d](?:[a-z\d-]{0,37}[a-z\d])?)@users\.noreply\.github\.com$/i.exec(author.email)?.[1];
		return login ? `@${login.toLowerCase()}\n${author.commit}` : `unavailable\nordinary email\n${author.commit}`;
	} catch (error) {
		const message = error instanceof Error ? error.message : "";
		const reason = message.includes("shallow")
			? "shallow history"
			: message.includes("not a committed file")
				? "uncommitted ticket"
				: message.includes("must be a file inside")
					? "ticket path outside repository"
					: message.includes("no creation author")
						? "no creation author"
						: "lookup failed";
		return `unavailable\n${reason}`;
	}
}
export async function deliverFinishWebhook(jobDir: string, shutdownDeadline = Number.POSITIVE_INFINITY): Promise<void> {
	const config = await textFile(`${jobDir}/finish-webhook-env`);
	if (!config) return;
	const state = await textFile(`${jobDir}/state`);
	if (!["done", "failed", "stopped"].includes(state)) return;
	try {
		// Never reclaim: a crash after HTTP acceptance but before recording it is ambiguous.
		await writeFile(`${jobDir}/finish-webhook-attempt`, `${state} ${new Date().toISOString()}\n`, { flag: "wx", mode: 0o600, flush: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "EEXIST") return;
		throw error;
	}
	// A skip consumes the same claim: later results cannot re-arm automatic delivery.
	const emptyResult =
		state !== "done" &&
		(await readFile(`${jobDir}/result`, "utf8").then(
			(result) => !result.trim(),
			(error: NodeJS.ErrnoException) => error.code === "ENOENT",
		));
	if (emptyResult) {
		const skipped = `skipped: ${state} with empty result; not sent`;
		await atomicWrite(`${jobDir}/finish-webhook`, `${skipped} ${new Date().toISOString()}\n`);
		await appendLimenLog(jobDir, `finish webhook: ${skipped}`);
		return;
	}
	const manual =
		"Manual finish-ping retry: inspect finish-webhook-attempt and finish-webhook; use bin/tony-finish-ping.sh with this job's finish-webhook-env, label, state and branch. Acceptance is not proof of owner wake; an interrupted attempt may already have sent.";
	await atomicWrite(`${jobDir}/finish-webhook`, `attempting ${new Date().toISOString()}\n${manual}\n`);
	await appendLimenLog(jobDir, "finish webhook: attempting; inspect finish-webhook for status and manual finish-ping retry");
	const label = await textFile(`${jobDir}/label`);
	const branch = await textFile(`${jobDir}/branch`);
	const deadline = Math.min(shutdownDeadline, Date.now() + DELIVERY_MS);
	const login = (await textFile(`${jobDir}/finish-webhook-author`)).split("\n")[0] ?? "";
	const author = /^@[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(login) ? login.toLowerCase() : "";
	const timeoutMs = Math.min(SEND_MS, deadline - Date.now());
	let result = !isAbsolute(config)
		? "failed: config path is not absolute"
		: timeoutMs <= 0
			? "failed: no shutdown time remains; not sent"
			: await send(jobDir, config, label, state, branch, timeoutMs, author);
	const attempts: string[] = [];
	if (result.startsWith("failed: sender exceeded ")) {
		attempts.push(`attempt 1: ${result} ${new Date().toISOString()}`);
		await appendLimenLog(jobDir, `finish webhook: ${attempts[0]}`);
		if (deadline > Date.now()) {
			await atomicWrite(`${jobDir}/finish-webhook`, `attempting retry ${new Date().toISOString()}\n${attempts.join("\n")}\n${manual}\n`);
			await appendLimenLog(jobDir, "finish webhook: attempting retry");
		}
		const remaining = Math.min(SEND_MS, deadline - Date.now());
		if (remaining > 0) {
			result = await send(jobDir, config, label, state, branch, remaining, author);
			attempts.push(`attempt 2: ${result} ${new Date().toISOString()}`);
			await appendLimenLog(jobDir, `finish webhook: ${attempts[1]}`);
		} else {
			attempts.push("retry: not retried; shutdown deadline reached");
			await appendLimenLog(jobDir, `finish webhook: ${attempts[1]}`);
		}
	}
	await atomicWrite(
		`${jobDir}/finish-webhook`,
		`${result} ${new Date().toISOString()}\n${attempts.length ? `${attempts.join("\n")}\n` : ""}${result.startsWith("skipped:") ? "" : `${manual}\n`}`,
	);
	await appendLimenLog(jobDir, `finish webhook: ${result}${result.startsWith("skipped:") ? "" : "; inspect finish-webhook for manual finish-ping retry"}`);
}
/** A finished lead group step sends through the job sender once; its directory under the group cabinet is the receipt. */
export async function deliverLeadStepWebhook(stepDir: string, root: string, feature: string, step: "synthesis" | "close"): Promise<void> {
	const config = finishWebhookEnv(root, root);
	if (!config) return;
	await mkdir(stepDir, { recursive: true });
	try {
		await writeFile(`${stepDir}/finish-webhook-attempt`, `done ${new Date().toISOString()}\n`, { flag: "wx", mode: 0o600, flush: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "EEXIST") return;
		throw error;
	}
	const name = basename(feature);
	const label = `${/^F\d+/.exec(name)?.[0] ?? name} lead ${step}`;
	// Group packets say "Do not land" in the brief as often as in the ticket; the lead handoff never suggests landing.
	const packet = await Promise.all([`${feature}/ticket.md`, `${feature}/group/brief.md`].map((path) => readFile(`${root}/${path}`, "utf8").catch(() => "")));
	const next = step === "close" ? "owner decision" : "owner decision on group/synthesis.md, or close the group";
	const handoff = `Lead step done: ${label}. Next step: ${next}.${/\b(?:do not|don't|never|not to) land\b/i.test(packet.join("\n")) ? " The feature says do not land." : ""}`;
	const login = captureFinishAuthor(root, `Ticket: ${feature}/ticket.md`).split("\n")[0] ?? "";
	let branch = "HEAD";
	try {
		branch = currentBranch(root);
	} catch {
		// A detached plant root has no branch name; the payload still names HEAD.
	}
	const result = isAbsolute(config)
		? await send(stepDir, config, label, "done", branch, SEND_MS, login.startsWith("@") ? login : "", handoff)
		: "failed: config path is not absolute";
	await atomicWrite(`${stepDir}/finish-webhook`, `${result} ${new Date().toISOString()}\n`);
}
function send(jobDir: string, config: string, label: string, state: string, branch: string, timeoutMs: number, author: string, handoff?: string): Promise<string> {
	return new Promise((resolve) => {
		const child = spawn(SENDER, [label, state, branch], {
			env: {
				...process.env,
				PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ""}`,
				LIMEN_FINISH_WEBHOOK_ENV: config,
				LIMEN_FINISH_EVENT: finishEvent(jobDir),
				LIMEN_FINISH_WEBHOOK_AUTHOR: author,
				// Undefined drops any inherited override, so a job always sends the job handoff.
				LIMEN_FINISH_HANDOFF: handoff,
			},
			stdio: ["ignore", "ignore", "ignore", "pipe"],
			detached: true,
		});
		// Dedicated channel: never retain sender stdout/stderr or unvalidated bytes.
		let pending = "";
		let bytes = 0;
		let selection = "";
		const seen = new Map<number, string>();
		child.stdio[3]?.on("data", (chunk: Buffer) => {
			bytes += chunk.length;
			if (bytes > 32_768) return;
			pending += chunk.toString("utf8");
			const lines = pending.split("\n");
			pending = lines.pop() ?? "";
			for (const line of lines) {
				const routed = parseFinishSelection(line);
				if (routed && !selection) {
					selection = routed;
					writeFileSync(`${jobDir}/finish-webhook-route`, `${routed}\n`, { mode: 0o600, flush: true });
					continue;
				}
				const receipt = parseFinishReceipt(line);
				if (!receipt || (seen.has(receipt.target) && (seen.get(receipt.target) !== "pending" || receipt.transport === "pending"))) continue;
				seen.set(receipt.target, receipt.transport);
				appendFileSync(`${jobDir}/finish-webhook-targets`, `${JSON.stringify(receipt)}\n`, { mode: 0o600, flush: true });
			}
		});
		const timer = setTimeout(() => {
			if (child.pid) {
				try {
					process.kill(-child.pid, "SIGKILL");
				} catch (error) {
					if ((error as NodeJS.ErrnoException).code !== "ESRCH") child.kill("SIGKILL");
				}
			}
			finish(`failed: sender exceeded ${timeoutMs}ms; acceptance unknown`);
		}, timeoutMs);
		const finish = (result: string) => {
			clearTimeout(timer);
			resolve(result);
		};
		child.once("error", () => finish("failed: sender could not start"));
		child.once("close", (code, signal) =>
			finish(
				selection === "not sent: no author route"
					? "skipped: not sent: no author route"
					: selection === "invalid author map"
						? "failed: invalid author map; not sent"
						: code === 0
							? "accepted: sender exited 0 (owner wake unobserved)"
							: `failed: sender ${signal ? "interrupted" : `exited ${code ?? "unknown"}`}`,
			),
		);
	});
}
