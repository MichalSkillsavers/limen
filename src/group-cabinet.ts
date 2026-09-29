import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { processAlive, processInfo } from "./contain.ts";
import { limenRoot } from "./git.ts";
import { hostedAgentStatus } from "./herdr.ts";

export type GroupMember = { id: string; team: string; role: "coordinator" | "worker"; parent?: string; deadline: number };
export type GroupRun = {
	id: string;
	root: string;
	feature: string;
	lead: string;
	startedAt: number;
	teams: string[];
	workersPerTeam: number;
	engine: string;
	provider: string;
	model: string;
	thinking: string;
	workerThinking: string;
	deadline: number;
	workerTimeoutMs: number;
	reserveMs: number;
	stopped: boolean;
	closed: boolean;
	mode: "auto" | "detached" | "tab";
	members: GroupMember[];
};
export type GroupIdentity = { run: GroupRun; member?: GroupMember; recipient: string };
export const groupPath = (run: Pick<GroupRun, "root" | "id">): string => `${run.root}/.limen/groups/${run.id}`;
export async function readRun(root: string, id: string): Promise<GroupRun> {
	if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error("invalid group id");
	return JSON.parse(await readFile(`${root}/.limen/groups/${id}/run.json`, "utf8")) as GroupRun;
}
export async function saveJson(path: string, value: unknown): Promise<void> {
	const temporary = `${path}.${randomUUID()}.tmp`;
	await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", flush: true });
	await rename(temporary, path);
}
// Dead owners may be recovered; a live owner (including PID reuse) is never evicted.
export async function groupLock<T>(directory: string, operation: () => Promise<T>): Promise<T> {
	await mkdir(directory, { recursive: true });
	const path = `${directory}/.lock`;
	const deadline = Date.now() + 10_000;
	while (true) {
		try {
			await mkdir(path);
			break;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
			const pid = Number(await readFile(`${path}/owner`, "utf8").catch(() => ""));
			const identity = await stat(path).catch(() => undefined);
			if (!identity) continue;
			const age = Date.now() - identity.mtimeMs;
			if (age > 5_000 && (!pid || !processAlive(pid))) {
				const claim = `${path}.reclaimer.${identity.dev}.${identity.ino}`;
				let claimed = false;
				try {
					await writeFile(claim, `${process.pid}\n`, { flag: "wx" });
					claimed = true;
					const current = await stat(path).catch(() => undefined);
					const owner = Number(await readFile(`${path}/owner`, "utf8").catch(() => ""));
					if (current?.ino === identity.ino && current.dev === identity.dev && owner === pid) {
						const abandoned = `${path}.abandoned.${randomUUID()}`;
						await rename(path, abandoned);
						await rm(abandoned, { recursive: true, force: true });
					}
				} catch (claimError) {
					if (!["EEXIST", "ENOENT"].includes((claimError as NodeJS.ErrnoException).code ?? "")) throw claimError;
				} finally {
					if (claimed) await rm(claim, { force: true });
				}
			}
			if (Date.now() >= deadline) throw new Error(`group lock busy or uncertain: ${path}; inspect its owner before recovery`);
			await delay(25);
		}
	}
	try {
		await writeFile(`${path}/owner`, `${process.pid}\n`, { flag: "wx", flush: true });
		return await operation();
	} finally {
		await rm(path, { recursive: true, force: true });
	}
}
export async function runs(root: string): Promise<GroupRun[]> {
	const result: GroupRun[] = [];
	for (const id of await readdir(`${root}/.limen/groups`).catch(() => [])) {
		if (id.startsWith(".")) continue;
		result.push(await readRun(root, id));
	}
	return result.sort((left, right) => left.startedAt - right.startedAt);
}
export async function groupIdentity(cwd: string, explicitId?: string): Promise<GroupIdentity | undefined> {
	const memberId = process.env.LIMEN_JOB_ID;
	if (process.env.LIMEN_GROUP_ID) {
		const root = process.env.LIMEN_CONTEXT_ROOT;
		if (!root || !memberId) throw new Error("group member identity is incomplete");
		const run = await readRun(root, process.env.LIMEN_GROUP_ID);
		const member = run.members.find((entry) => entry.id === memberId);
		if (!member || member.team !== process.env.LIMEN_TEAM_ID || (explicitId && explicitId !== run.id)) throw new Error("group member identity does not match the cabinet");
		return { run, member, recipient: member.id };
	}
	if (!explicitId) return;
	const run = await readRun(limenRoot(cwd), explicitId);
	if (!run.lead || run.lead !== process.env.PI_SESSION_ID) throw new Error("group command requires its recorded lead session");
	return { run, recipient: `lead-${run.lead}` };
}
export async function commandRoot(cwd: string): Promise<string> {
	return (await groupIdentity(cwd))?.run.root ?? limenRoot(cwd);
}
export async function claimMember(run: GroupRun, team: string, role: GroupMember["role"], id: string, parent?: string): Promise<GroupMember> {
	return groupLock(groupPath(run), async () => {
		const current = await readRun(run.root, run.id);
		if (current.stopped || current.closed || Date.now() >= current.deadline) throw new Error("group is stopped, closed, or past its deadline");
		if (!current.teams.includes(team)) throw new Error("team is not in the recorded roster");
		const used = current.members.filter((entry) => entry.team === team && entry.role === role).length;
		if (used >= (role === "coordinator" ? 1 : current.workersPerTeam)) throw new Error(`${team} ${role} launch allowance exhausted; ask the lead`);
		const deadline = role === "coordinator" ? current.deadline : Math.min(Date.now() + current.workerTimeoutMs, current.deadline - current.reserveMs);
		if (deadline <= Date.now()) throw new Error("no worker time remains before the coordinator wrap-up reserve");
		const member: GroupMember = { id, team, role, deadline, ...(parent ? { parent } : {}) };
		current.members.push(member);
		await saveJson(`${groupPath(run)}/run.json`, current);
		return member;
	});
}
export async function jobMembership(jobDir: string): Promise<GroupIdentity | undefined> {
	const id = (await readFile(`${jobDir}/group`, "utf8").catch(() => "")).trim();
	if (!id) return;
	const root = dirname(dirname(dirname(jobDir)));
	const run = await readRun(root, id);
	const member = run.members.find((entry) => `${root}/.limen/jobs/${entry.id}` === jobDir);
	if (!member) throw new Error("job is absent from its group roster");
	return { run, member, recipient: member.id };
}
export async function retainedGroupJob(jobDir: string): Promise<boolean> {
	return Boolean((await jobMembership(jobDir))?.run.closed === false);
}
export async function memberLive(root: string, member: GroupMember): Promise<boolean> {
	const dir = `${root}/.limen/jobs/${member.id}`;
	const state = (await readFile(`${dir}/state`, "utf8").catch(() => "")).trim();
	if (state === "running") return true;
	const pid = Number(await readFile(`${dir}/pid`, "utf8").catch(() => ""));
	if (pid > 0 && (await processInfo(pid)).kind !== "absent") return true;
	const target = (await readFile(`${dir}/herdr/agent`, "utf8").catch(() => "")).trim();
	if (target && hostedAgentStatus(target) !== "missing") return true;
	const owner = JSON.parse(await readFile(`${dir}/group-owner.json`, "utf8").catch(() => "null")) as { pid: number; born: string } | null;
	if (owner) {
		const info = await processInfo(owner.pid);
		if (info.kind === "unavailable" || (info.kind === "present" && info.process.born === owner.born)) return true;
	}
	return !state && !existsSync(`${dir}/finished-at`);
}
export async function ownsLiveChildren(jobDir: string): Promise<boolean> {
	const identity = await jobMembership(jobDir);
	if (!identity?.member || identity.member.role !== "coordinator") return false;
	for (const member of identity.run.members) if (member.team === identity.member.team && member.role === "worker" && (await memberLive(identity.run.root, member))) return true;
	return false;
}
