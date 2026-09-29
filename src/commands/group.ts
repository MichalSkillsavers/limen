import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { processAlive } from "../contain.ts";
import { preflightEngine, resolveSpawnEngine } from "../engine.ts";
import { cleanWorktree, commitHasFile, headCommit, repoRoot } from "../git.ts";
import type { GroupIdentity, GroupRun } from "../group-cabinet.ts";
import { groupIdentity, groupLock, groupPath, memberLive, readRun, runs, saveJson } from "../group-cabinet.ts";
import { acceptBatch, acceptTransport, groupEvents, publishEvent, syncLifecycle } from "../group-events.ts";
import { herdrAvailable } from "../herdr.ts";
import { parseDuration } from "../job.ts";
import { spawnCommand } from "./spawn.ts";
import { stopCommand } from "./stop.ts";

export async function startGroup(args: readonly string[], cwd: string): Promise<GroupRun> {
	if (process.env.LIMEN_GROUP_ID || process.env.LIMEN_JOB === "1") throw new Error("only the owner-facing lead may start a group");
	const featureArgument = args[0];
	if (!featureArgument || featureArgument.startsWith("--")) throw new Error("group start requires a feature directory");
	const flags = new Map<string, string>();
	let newRun = false,
		mode: GroupRun["mode"] = "auto";
	for (let index = 1; index < args.length; index++) {
		const flag = args[index];
		if (flag === "--new-run") {
			newRun = true;
			continue;
		}
		if (flag === "--tab" || flag === "--detached") {
			if (mode !== "auto") throw new Error("select only one group transport");
			mode = flag === "--tab" ? "tab" : "detached";
			continue;
		}
		const value = args[++index];
		if (!flag || !value || value.startsWith("--") || flags.has(flag)) throw new Error("invalid group start arguments");
		if (!["--teams", "--workers-per-team", "--timeout", "--worker-timeout", "--engine", "--provider", "--model", "--thinking", "--worker-thinking"].includes(flag))
			throw new Error(`unknown group flag ${flag}`);
		flags.set(flag, value);
	}
	const required = (key: string): string => {
		const value = flags.get(key);
		if (!value) throw new Error(`group start requires ${key}`);
		return value;
	};
	const count = (key: string): number => {
		const value = required(key);
		if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error(`${key} must be a positive integer`);
		return Number(value);
	};
	// Deliberately ignore inherited LIMEN_CONTEXT_ROOT for new activation.
	const root = repoRoot(cwd);
	const feature = relative(root, resolve(cwd, featureArgument));
	if (feature.startsWith("..") || !feature.startsWith("spec/features/")) throw new Error("feature must be inside this repository's spec/features");
	const lead = process.env.PI_SESSION_ID ?? "";
	if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(lead)) throw new Error("group start requires an interactive lead session with the group hook loaded");
	const listener = Number(await readFile(`${root}/.limen/group-leads/${lead}`, "utf8").catch(() => ""));
	if (listener <= 0 || !processAlive(listener)) throw new Error("group lead hook is not running; load hook/group-peer.ts and retry");
	const teams = Array.from({ length: count("--teams") }, (_, index) => `team-${index + 1}`);
	const workersPerTeam = count("--workers-per-team");
	const timeout = parseDuration(required("--timeout"));
	const workerTimeoutMs = parseDuration(required("--worker-timeout"));
	const profile = resolveSpawnEngine(required("--engine"));
	const provider = required("--provider"),
		model = required("--model");
	const thinking = required("--thinking"),
		workerThinking = required("--worker-thinking");
	for (const level of [thinking, workerThinking]) if (!["off", "minimal", "low", "medium", "high", "xhigh"].includes(level)) throw new Error("unsupported group reasoning level");
	if (timeout <= 60_000 || workerTimeoutMs <= 0) throw new Error("group timeout must leave a 60-second wrap-up reserve");
	if (mode === "tab" && !herdrAvailable()) throw new Error("hosted group requires Herdr");
	for (const path of [`${feature}/ticket.md`, `${feature}/group/brief.md`, ...teams.map((team) => `${feature}/group/teams/${team}.md`)]) {
		await readFile(`${root}/${path}`, "utf8");
		if (!commitHasFile(root, headCommit(root), path)) throw new Error(`commit group prerequisite ${path} before starting`);
	}
	preflightEngine(profile, model, provider);
	const cabinet = `${root}/.limen/groups`;
	const activated = await groupLock(cabinet, async () => {
		const previous = (await runs(root)).filter((run) => run.feature === feature);
		if (!newRun && previous.length) return { run: previous.at(-1) as GroupRun, created: false };
		for (const prior of previous) {
			if (!prior.stopped && !prior.closed) throw new Error(`prior group ${prior.id} is live; stop it before --new-run`);
			for (const member of prior.members) if (await memberLive(root, member)) throw new Error(`prior group ${prior.id} still has a live or uncertain member ${member.id}`);
		}
		const run: GroupRun = {
			id: randomUUID(),
			root,
			feature,
			lead,
			startedAt: Date.now(),
			teams,
			workersPerTeam,
			engine: profile.id,
			provider,
			model,
			thinking,
			workerThinking,
			deadline: Date.now() + timeout,
			workerTimeoutMs,
			reserveMs: 60_000,
			stopped: false,
			closed: false,
			mode,
			members: [],
		};
		await mkdir(groupPath(run));
		await saveJson(`${groupPath(run)}/run.json`, run);
		return { run, created: true };
	});
	if (activated.created) {
		for (const team of teams) {
			try {
				await spawnCommand(
					[
						`Pursue the feature with your team. Ticket: ${feature}/ticket.md`,
						"--label",
						`${feature.split("/").at(-1)} ${team} coordinator`,
						"--engine",
						profile.id,
						"--provider",
						provider,
						"--model",
						model,
						"--thinking",
						thinking,
						...(mode === "auto" ? [] : [`--${mode}`]),
					],
					root,
					{ run: activated.run, team },
				);
			} catch (error) {
				await saveJson(`${groupPath(activated.run)}/activation-error.json`, { team, error: error instanceof Error ? error.message : String(error) });
				throw new Error(`partial group ${activated.run.id}: ${String(error)}; inspect and stop before --new-run; roster is not repaired automatically`);
			}
		}
	}
	return readRun(root, activated.run.id);
}
export async function waitGroup(identity: GroupIdentity, requestedMs = 20_000): Promise<string> {
	const until = Date.now() + Math.max(0, Math.min(20_000, requestedMs));
	while (true) {
		const run = await readRun(identity.run.root, identity.run.id);
		if (run.stopped || run.closed) return "group stopped or closed; preserve work and return to the lead";
		if (Date.now() >= (identity.member?.deadline ?? run.deadline)) return "group member deadline expired";
		const batch = await acceptBatch(identity);
		if (batch) return batch.text;
		if (Date.now() >= until) return "group wait timed out normally; re-enter bounded wait while your collaboration or children remain live";
		await delay(Math.min(100, until - Date.now()));
	}
}
export async function groupCommand(args: readonly string[], cwd: string): Promise<void> {
	// Bound the actual CLI process even if a cabinet lock or filesystem operation stalls.
	if (args[0] !== "wait") {
		await runGroupCommand(args, cwd);
		return;
	}
	const cap = setTimeout(() => {
		console.log("group wait timed out normally after the 20-second CLI cap; inspect any uncertain delivery receipt before retrying");
		process.exit(0);
	}, 20_000);
	cap.unref();
	try {
		await runGroupCommand(args, cwd);
	} finally {
		clearTimeout(cap);
	}
}
async function runGroupCommand(args: readonly string[], cwd: string): Promise<void> {
	const [command, ...rest] = args;
	if (command === "start") {
		console.log((await startGroup(rest, cwd)).id);
		return;
	}
	const explicit = process.env.LIMEN_GROUP_ID ? undefined : rest.shift();
	const identity = await groupIdentity(cwd, explicit);
	if (!identity) throw new Error("group command requires a group id for the lead, or recorded member environment");
	if (command === "publish") {
		let target: string | undefined;
		if (rest[0] === "--team") {
			rest.shift();
			target = rest.shift();
			if (!target) throw new Error("--team requires a team");
		}
		console.log((await publishEvent(identity, rest.join(" "), "finding", target)).id);
		return;
	}
	if (command === "wait") {
		if (rest.length > 2 || (rest.length && rest[0] !== "--timeout")) throw new Error("group wait accepts --timeout DURATION");
		const output = await waitGroup(identity, rest[1] ? parseDuration(rest[1]) : 20_000);
		console.log(output);
		const token = /\[limen-group-delivery:([a-f0-9-]+)\]/.exec(output)?.[1];
		if (token) await acceptTransport(identity, token);
		return;
	}
	if (command === "status") {
		await syncLifecycle(identity.run);
		const run = await readRun(identity.run.root, identity.run.id);
		const members = await Promise.all(
			run.members.map(async (member) => ({ ...member, state: (await readFile(`${run.root}/.limen/jobs/${member.id}/state`, "utf8").catch(() => "launch uncertain")).trim() })),
		);
		console.log(JSON.stringify({ ...run, members, events: await groupEvents(run), receipts: await allReceipts(run) }, null, 2));
		return;
	}
	if (identity.member) throw new Error("only the recorded lead may stop or close a group");
	if (command === "stop") {
		await groupLock(groupPath(identity.run), async () => {
			const run = await readRun(identity.run.root, identity.run.id);
			run.stopped = true;
			await saveJson(`${groupPath(run)}/run.json`, run);
		});
		const run = await groupLock(`${groupPath(identity.run)}/launch`, () => readRun(identity.run.root, identity.run.id));
		const failures: string[] = [];
		for (const member of run.members) {
			const dir = `${run.root}/.limen/jobs/${member.id}`;
			if (!(await readFile(`${dir}/state`, "utf8").catch(() => ""))) {
				// The launch lock has drained: a reserved slot without a published state cannot launch later.
				await mkdir(dir, { recursive: true });
				await writeFile(`${dir}/group`, `${run.id}\n`);
				await writeFile(`${dir}/team`, `${member.team}\n`);
				await writeFile(`${dir}/state`, "stopped\n");
				await writeFile(`${dir}/finished-at`, `${new Date().toISOString()}\n`);
			}
			if (!(await memberLive(run.root, member))) continue;
			try {
				await stopCommand([member.id, "group stopped by lead"], run.root);
				const until = Date.now() + 6_000;
				while ((await memberLive(run.root, member)) && Date.now() < until) await delay(100);
				if (await memberLive(run.root, member)) failures.push(`${member.id}: process is still live or uncertain`);
			} catch (error) {
				failures.push(`${member.id}: ${String(error)}`);
			}
		}
		await saveJson(`${groupPath(run)}/stop-report.json`, { at: Date.now(), failures });
		if (failures.length) throw new Error(`group stopped launches; recovery required:\n${failures.join("\n")}`);
		console.log("group stopped; recovery work and unread events retained until close");
		return;
	}
	if (command === "close") {
		await groupLock(`${groupPath(identity.run)}/launch`, async () => {
			const run = await readRun(identity.run.root, identity.run.id);
			for (const member of run.members) {
				if (await memberLive(run.root, member)) throw new Error(`close refused: ${member.id} is live or launch is uncertain`);
				const tree = (await readFile(`${run.root}/.limen/jobs/${member.id}/worktree`, "utf8").catch(() => "")).trim();
				if (tree && existsSync(tree) && !cleanWorktree(tree)) throw new Error(`close refused: dirty member worktree ${tree}; commit or recover it deliberately`);
			}
			run.closed = true;
			run.stopped = true;
			await saveJson(`${groupPath(run)}/run.json`, run);
		});
		console.log("group closed; clean member paths released for ordinary pruning");
		return;
	}
	throw new Error("group requires start, status, publish, wait, stop, or close");
}
async function allReceipts(run: GroupRun): Promise<unknown[]> {
	const receipts: unknown[] = [];
	for (const recipient of await readdir(`${groupPath(run)}/receipts`).catch(() => []))
		for (const name of await readdir(`${groupPath(run)}/receipts/${recipient}`))
			receipts.push(JSON.parse(await readFile(`${groupPath(run)}/receipts/${recipient}/${name}`, "utf8")));
	return receipts;
}
