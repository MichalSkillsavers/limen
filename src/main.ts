import { closeCommand } from "./commands/close.ts";
import { continueCommand } from "./commands/continue.ts";
import { diffCommand } from "./commands/diff.ts";
import { githubCommand } from "./commands/github.ts";
import { groupCommand } from "./commands/group.ts";
import { initCommand, workspaceCommand } from "./commands/init.ts";
import { jobsCommand } from "./commands/jobs.ts";
import { landCommand } from "./commands/land.ts";
import { linearCommand } from "./commands/linear.ts";
import { openCommand } from "./commands/open.ts";
import { pictureCommand } from "./commands/picture.ts";
import { planningCommand } from "./commands/planning-source.ts";
import { pruneCommand } from "./commands/prune.ts";
import { spawnCommand } from "./commands/spawn.ts";
import { statusCommand } from "./commands/status.ts";
import { steerCommand } from "./commands/steer.ts";
import { stopCommand } from "./commands/stop.ts";
import { sweepCommand } from "./commands/sweep.ts";
import { ticketAuthorCommand } from "./commands/ticket-author.ts";
import { waitCommand } from "./commands/wait.ts";
import { unwatchCommand, watchCommand } from "./commands/watch.ts";
import { webhookCommand } from "./commands/webhook.ts";
import { runHostedSupervisor } from "./runtime/supervisor.ts";
import { failInternalJob, runInternalJob } from "./runtime/wrapper.ts";

type Command = (args: readonly string[], cwd: string) => Promise<void>;
const COMMANDS = {
	init: initCommand,
	workspace: workspaceCommand,
	planning: planningCommand,
	github: githubCommand,
	group: groupCommand,
	spawn: spawnCommand,
	continue: continueCommand,
	diff: diffCommand,
	steer: steerCommand,
	stop: stopCommand,
	wait: waitCommand,
	land: landCommand,
	jobs: jobsCommand,
	status: statusCommand,
	prune: pruneCommand,
	watch: watchCommand,
	unwatch: unwatchCommand,
	open: openCommand,
	picture: pictureCommand,
	close: closeCommand,
	sweep: sweepCommand,
	linear: linearCommand,
	"ticket-author": ticketAuthorCommand,
	webhook: webhookCommand,
} as const satisfies Record<
	| "init"
	| "workspace"
	| "planning"
	| "spawn"
	| "continue"
	| "github"
	| "group"
	| "diff"
	| "steer"
	| "stop"
	| "wait"
	| "land"
	| "jobs"
	| "status"
	| "prune"
	| "watch"
	| "unwatch"
	| "open"
	| "picture"
	| "close"
	| "sweep"
	| "linear"
	| "ticket-author"
	| "webhook",
	Command
>;
const HELP = `limen — isolated coding jobs with files and git
usage:
  limen init
  limen init --drop-leftovers
  limen workspace init
  limen planning [committed|private]                # inspect or persist the project planning source; default committed
  limen group start FEATURE --teams N --workers-per-team N --timeout D --worker-timeout D --engine E --provider P --model M --thinking T --worker-thinking T [--detached|--tab] [--new-run]
  limen group status|publish|wait|stop|close [GROUP-ID]  # members inherit verified membership; lead supplies ID
  limen spawn "Implement FNNN: <outcome>. Start by writing <slice>. Ticket: spec/features/active/FNNN-slug/ticket.md" [--label L] [--engine pi|omp] [--model X] [--branch B] [--role NAME] [--timeout 20m; default 90m] [--task-file F|-] [--prepare CMD]
  limen spawn "Short title" --task-file F|-         # the file is the task; the positional words become the label
  limen spawn "…" [--label L] [--provider P] [--model X] [--thinking T]  # selected engine's flags; in Herdr: hosted, else detached
  limen spawn --tab "…"                            # force hosted (requires Herdr; no --timeout)
  limen spawn --detached "…"                       # force background worker + log-tail tab
  limen spawn --repo R "Implement FNNN: <outcome>. Ticket: spec/features/active/FNNN-slug/ticket.md" [--label L] [--model X]
  limen spawn --review --branch B --label L "Review the FNNN candidate against spec/features/active/FNNN-slug/ticket.md"
  limen continue <id|suffix|label> "follow-up instruction" [--review] [--label L] [--engine pi|omp] [--provider P] [--model X] [--thinking T] [--tab|--detached]
                                  # resume a finished job in its own engine session — full context, same worktree; Herdr default is hosted
  limen steer <id|suffix|label> | --running "correction"
  limen diff <id|suffix|label>
  limen wait <id|suffix|label>
  limen land <id|suffix|label> [--onto BRANCH] [--yes]  # merge a done job onto the current branch
  limen stop <id|suffix|label> [reason]
  limen jobs [--running|--active|--all|--label PREFIX|<id|suffix|label>]
  limen status [--all]                          # plant inbox: running, candidates to inspect, needs a decision (last 7 days), coordinator tabs
  limen prune [--retire [--dry-run]]           # retire finished job records whose branches are landed (ancestry or cherry-pick) or gone
  limen watch <id|suffix|label> | --running
  limen unwatch <id|suffix|label> | --all
  limen open <id|suffix|label>
  limen close <FNNN>
  limen ticket-author <ticket-path>                 # creation-commit author, following Git renames
  limen sweep [--install|--uninstall]
  limen webhook test                             # send one test ping to this plant's finish webhook targets
  limen linear [on [--team T --project P]|off|status]   # Linear mirror toggle — renames spec/linear.md ↔ .off; --team/--project write a fresh config
  limen github connect|disconnect|status|doctor  # bind projects and diagnose seat safety
  limen picture build [--dir D] [--out F] [--json F] [--strict]  # local offline architecture map, no model call
  limen picture tick [--dir D] [--branch B] [--dry-run] --engine E --provider P --model M --thinking T  # quiet one-tip pass
  limen picture watch [off | on [--branch B] [--dir D] --engine E --provider P --model M --thinking T]  # per-project, off by default: one tick when the top branch moves
  limen github ensure [registered-root]       # require a live registered Herdr coordinator
  limen github poll                           # run one polling pass as the isolated App user
  limen github review <root> <claim-id> --engine E --provider P --model M --thinking T  # hosted review for one doorbell claim
  limen github work <root> <claim-id> --engine E --provider P --model M --thinking T --task "…"  # hosted task for one doorbell claim
  limen github resolve <root> <claim-id> <handoff-nonce> "answer"  # explicit no-job answer for one doorbell claim
Pass a short coordinator instruction, not $(cat ticket.md). The ticket is a pointer, not the prompt.`;
export async function main(args: readonly string[], cwd = process.cwd()): Promise<void> {
	try {
		if (process.env.LIMEN_INTERNAL_RUN === "1") {
			await runInternalJob();
			return;
		}
		if (process.env.LIMEN_INTERNAL_HOSTED === "1") {
			await runHostedSupervisor();
			return;
		}
		const [name, ...rest] = args;
		if (!name || name === "--help" || name === "-h" || name === "help") {
			console.log(HELP);
			return;
		}
		if (!(name in COMMANDS)) throw new Error(`unknown command ${JSON.stringify(name)}\n\n${HELP}`);
		const flags = rest.slice(0, rest.includes("--") ? rest.indexOf("--") : undefined);
		if (flags.includes("--help") || flags.includes("-h")) {
			console.log(HELP);
			return;
		}
		await COMMANDS[name as keyof typeof COMMANDS](rest, cwd);
	} catch (error) {
		if (process.env.LIMEN_INTERNAL_RUN === "1" || process.env.LIMEN_INTERNAL_HOSTED === "1") await failInternalJob(error);
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	}
}
