import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { herdrAvailable } from "../integrations/herdr.ts";
import type { GroupIdentity, GroupRun } from "../job/group-cabinet.ts";
import { groupIdentity, groupLock, groupPath, leadSession, memberLive, readRun, runs, saveJson, teamRoute } from "../job/group-cabinet.ts";
import { acceptBatch, acceptTransport, groupEvents, publishEvent, syncLifecycle } from "../job/group-events.ts";
import { parseDuration } from "../job/job.ts";
import { cleanWorktree, commitHasFile, headCommit, repoRoot } from "../project/git.ts";
import { planningSource, privatePlanningFile } from "../project/planning.ts";
import { processAlive } from "../runtime/contain.ts";
import { preflightEngine, resolveSpawnEngine } from "../runtime/engine.ts";
import { spawnCommand } from "./spawn.ts";
import { stopCommand } from "./stop.ts";

export async function startGroup(args: readonly string[], cwd: string): Promise<GroupRun> {
	if (process.env.LIMEN_GROUP_ID || process.env.LIMEN_JOB === "1")
		throw new Error(
			"only the owner-facing lead may start a group: run limen group start from the plant's interactive Herdr coordinator pane (LIMEN_COORDINATOR=1) with hook/group-peer.ts loaded — a hosted limen job (LIMEN_JOB=1) cannot register as lead or start groups",
		);
	const featureArgument = args[0];
	if (!featureArgument || featureArgument.startsWith("--")) throw new Error("group start requires a feature directory");
	const flags = new Map<string, string>();
	const teamModels: Record<string, { provider: string; model: string }> = {};
	let newRun = false,
		mode: GroupRun["mode"] = "auto";
	for (let index = 1; index < args.length; index++) {
		const flag = args[index];
		if (flag === "--team-model") {
			const route = /^(team-[1-9]\d*)=([^/\s]+)\/(\S+)$/.exec(args[++index] ?? "");
			if (!route?.[1] || !route[2] || !route[3]) throw new Error("--team-model requires team-N=provider/model");
			if (teamModels[route[1]]) throw new Error(`${route[1]} model supplied twice`);
			teamModels[route[1]] = { provider: route[2], model: route[3] };
			continue;
		}
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
	// A repeated start resumes the prior run, so it keeps that run's planning source.
	const priorRun = newRun ? undefined : (await runs(root)).filter((run) => run.feature === feature).at(-1);
	const source = priorRun ? (priorRun.planningSource ?? "committed") : planningSource(root);
	if (source === "private" && featureArgument.split(/[\\/]/).includes("..")) throw new Error("private planning feature path must not contain traversal");
	const lead = (await leadSession(root)) ?? "";
	if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(lead))
		throw new Error(
			"group start requires the interactive Herdr coordinator pane (LIMEN_COORDINATOR=1) with hook/group-peer.ts loaded and registered under .limen/group-leads — reload that pane after updating the package; a hosted limen job never registers as lead",
		);
	const listener = Number(await readFile(`${root}/.limen/group-leads/${lead}`, "utf8").catch(() => ""));
	if (listener <= 0 || !processAlive(listener))
		throw new Error(
			"group lead hook is not running in this pane: load hook/group-peer.ts on the interactive Herdr coordinator (LIMEN_COORDINATOR=1) and retry — do not spawn a hosted job as lead",
		);
	const teams = Array.from({ length: count("--teams") }, (_, index) => `team-${index + 1}`);
	for (const team of Object.keys(teamModels)) if (!teams.includes(team)) throw new Error(`--team-model names ${team}, which is not in the roster`);
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
	// Check the packet before activation: readable inside the canonical root when private, committed at HEAD otherwise.
	for (const path of [`${feature}/ticket.md`, `${feature}/group/brief.md`, ...teams.map((team) => `${feature}/group/teams/${team}.md`)]) {
		if (source === "private") {
			await privatePlanningFile(root, path);
			continue;
		}
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
			planningSource: source,
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
			teamModels,
		};
		await mkdir(groupPath(run));
		await saveJson(`${groupPath(run)}/run.json`, run);
		return { run, created: true };
	});
	if (activated.created) {
		const ticket = source === "private" ? `${root}/${feature}/ticket.md` : `${feature}/ticket.md`;
		for (const team of teams) {
			try {
				await spawnCommand(
					[
						`Pursue the feature with your team. Ticket: ${ticket}`,
						"--label",
						`${feature.split("/").at(-1)} ${team} coordinator`,
						"--engine",
						profile.id,
						"--provider",
						teamRoute(activated.run, team).provider,
						"--model",
						teamRoute(activated.run, team).model,
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
		const batch = await acceptBatch(identity, Date.now(), "skip");
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
		await syncLifecycle(identity.run, "skip");
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
		const run = await groupLock(`${groupPath(identity.run)}/launch`, () => readRun(identity.run.root, identity.run.id), "wait");
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
		await groupLock(
			`${groupPath(identity.run)}/launch`,
			async () => {
				const run = await readRun(identity.run.root, identity.run.id);
				for (const member of run.members) {
					if (await memberLive(run.root, member)) throw new Error(`close refused: ${member.id} is live or launch is uncertain`);
					const tree = (await readFile(`${run.root}/.limen/jobs/${member.id}/worktree`, "utf8").catch(() => "")).trim();
					if (tree && existsSync(tree) && !cleanWorktree(tree)) throw new Error(`close refused: dirty member worktree ${tree}; commit or recover it deliberately`);
				}
				run.closed = true;
				run.stopped = true;
				await saveJson(`${groupPath(run)}/run.json`, run);
			},
			"wait",
		);
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
