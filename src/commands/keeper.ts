import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveJob } from "../job/lookup.ts";
import { branchCommit, branchExists, commitHasFile, limenRoot, workspaceRepository } from "../project/git.ts";
import { ownerAlive } from "../runtime/reap.ts";
import { landTicketCheck, TICKET_PATH } from "./land.ts";
import { spawnCommand } from "./spawn.ts";

type KeeperOptions = {
	readonly ticket: string;
	readonly jobs: readonly string[];
	readonly candidate?: string;
	readonly group?: string;
	readonly route: readonly string[];
	readonly timeout: string;
};

const ROUTE = ["--engine", "--provider", "--model", "--thinking"];

/** After the work: a short job on its own branch at the candidate tip fixes the ticket, board and map links. */
export async function keeperCommand(args: readonly string[], cwd: string): Promise<void> {
	if (process.env.LIMEN_GROUP_ID) throw new Error("group members cannot start a keeper; the team coordinator or the owner-facing lead does");
	const options = parseKeeperArgs(args);
	const code = TICKET_PATH.exec(options.ticket)?.[1];
	if (!code) throw new Error(`keeper needs a ticket path like spec/features/active/FNNN-slug/ticket.md, not ${options.ticket}`);
	const root = limenRoot(cwd);
	const jobs = [];
	for (const query of options.jobs) {
		const { id, jobDir } = await resolveJob(root, query, "control");
		const state = await text(`${jobDir}/state`);
		if (state === "running" || (await ownerAlive(jobDir))) throw new Error(`job ${id} is still running; a keeper never commits beside a live job; wait for it, or stop it`);
		jobs.push({ id, jobDir, state, branch: await text(`${jobDir}/branch`), repo: await text(`${jobDir}/repo`) });
	}
	const [first] = jobs;
	if (!first) throw new Error("keeper requires --job ID");
	if (!options.candidate && jobs.length > 1) throw new Error("several jobs need one candidate; pass --candidate <integration branch>");
	const candidate = options.candidate ?? first.branch;
	if (!candidate) throw new Error(`job ${first.id} has no recorded branch; pass --candidate BRANCH`);
	const repository = first.repo ? workspaceRepository(root, first.repo) : root;
	if (!branchExists(repository, candidate)) throw new Error(`candidate branch ${candidate} does not exist`);
	const tip = branchCommit(repository, candidate);
	if (!commitHasFile(repository, tip, options.ticket)) throw new Error(`ticket ${options.ticket} is missing at ${candidate} (${tip.slice(0, 7)})`);
	const keeperBranch = `limen/keeper-${code.toLowerCase()}-${tip.slice(0, 7)}`;
	if (branchExists(repository, keeperBranch)) throw new Error(`keeper branch ${keeperBranch} already exists; land or delete it first`);

	const gate = await landTicketCheck(repository, root, candidate, "HEAD", first.id);
	const map = `${root}/.limen/picture`;
	const blocks = [];
	for (const job of jobs) {
		const [label, base, worktree] = await Promise.all(["label", "base", "worktree"].map((name) => text(`${job.jobDir}/${name}`)));
		const jobTip = job.branch && branchExists(repository, job.branch) ? branchCommit(repository, job.branch) : "none";
		const sessions = (await readdir(`${job.jobDir}/session`).catch(() => [] as string[])).filter((name) => name.endsWith(".jsonl")).sort();
		const session = sessions.at(-1);
		blocks.push(
			[
				`Job: ${job.id}`,
				`  Label: ${label || job.id}`,
				`  State: ${job.state || "missing"}`,
				`  Branch: ${job.branch || "none"} (base ${base || "none"}, tip ${jobTip})`,
				`  Worktree: ${worktree || "none"}`,
				`  Session: ${session ? `${job.jobDir}/session/${session}` : "none"}`,
				`  Task: ${job.jobDir}/task.md`,
			].join("\n"),
		);
	}
	const packet = [
		`Spec keeper for ${code}. Fix the ticket, board and map links for this work; commit on this branch.`,
		"",
		`Ticket: ${options.ticket}`,
		"Board: spec/build.md",
		`Map: ${existsSync(map) ? map : "none"}`,
		`Group: ${options.group ?? "none"}`,
		`Candidate: ${candidate} at ${tip}`,
		`Changed tickets: ${gate.tickets.length ? gate.tickets.join(", ") : "none"}`,
		"Land check now:",
		...(gate.ok && gate.lines.length === 0 ? ["no error"] : gate.lines.map((line) => `  ${line}`)),
		"",
		...blocks,
		"",
	].join("\n");

	execFileSync("git", ["branch", keeperBranch, tip], { cwd: repository, stdio: "ignore" });
	const scratch = await mkdtemp(join(tmpdir(), "limen-keeper-"));
	try {
		const packetFile = `${scratch}/task.md`;
		await writeFile(packetFile, packet);
		await spawnCommand(
			[
				...options.route,
				"--role",
				"keeper",
				"--detached",
				"--branch",
				keeperBranch,
				"--timeout",
				options.timeout,
				"--label",
				`spec keeper · ${code}`,
				"--task-file",
				packetFile,
				...(first.repo ? ["--repo", first.repo] : []),
			],
			cwd,
		);
	} catch (error) {
		execFileSync("git", ["branch", "-D", keeperBranch], { cwd: repository, stdio: "ignore" });
		throw error;
	} finally {
		await rm(scratch, { recursive: true, force: true });
	}
}

function parseKeeperArgs(args: readonly string[]): KeeperOptions {
	const jobs: string[] = [];
	const route: string[] = [];
	const positional: string[] = [];
	let candidate: string | undefined;
	let group: string | undefined;
	let timeout = "20m";
	for (let index = 0; index < args.length; index += 1) {
		const value = args[index];
		if (!value) continue;
		if (!value.startsWith("--")) {
			positional.push(value);
			continue;
		}
		const next = args[index + 1];
		if (!["--job", "--candidate", "--group", "--timeout", ...ROUTE].includes(value)) throw new Error(`unknown keeper option ${value}`);
		if (!next || next.startsWith("--")) throw new Error(`${value} requires a value`);
		index += 1;
		if (value === "--job") jobs.push(next);
		else if (value === "--candidate") candidate = next;
		else if (value === "--group") group = next;
		else if (value === "--timeout") timeout = next;
		else route.push(value, next);
	}
	const [ticket, ...extra] = positional;
	if (!ticket || extra.length) throw new Error("keeper requires exactly one <ticket-path>");
	if (jobs.length === 0) throw new Error("keeper requires --job ID");
	for (const flag of ROUTE) if (!route.includes(flag)) throw new Error(`keeper requires --engine --provider --model --thinking; missing ${flag}`);
	return { ticket, jobs, route, timeout, ...(candidate ? { candidate } : {}), ...(group ? { group } : {}) };
}

function text(path: string): Promise<string> {
	return readFile(path, "utf8").then(
		(value) => value.trim(),
		() => "",
	);
}
