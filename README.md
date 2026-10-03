# limen

<a href="https://mega.dev/autonomous-product-development"><img src="https://res.cloudinary.com/mega-dev/image/upload/c_limit,w_536/b_black,c_pad,w_568,h_157/f_jpg/v1/art/landing-logo" alt="MEGA.dev" width="160"></a>

> **[Explore the full workflow → Towards Autonomous Product Development](https://mega.dev/autonomous-product-development)**
>
> This MEGA Drop explains the workflow behind limen. It includes a live video walkthrough with Pi, Herdr, and Grok Bot. [MEGA.dev](https://mega.dev) shares practical articles, repos, and tools for work with AI.

You talk to one coordinator in Herdr. The coordinator starts OMP or [Pi](https://pi.dev) workers and reviewers. Each worker and reviewer runs in its own Git worktree. Each job leaves a branch, a task, a log, a state, and a session. You decide what to build. You decide what to merge. The coordinator runs the harness.

![A coordinator starts workers and reviewers in isolated worktrees, then merges with ordinary Git](https://raw.githubusercontent.com/overment/limen/main/docs/limen.gif)

> **Experimental.** Commands, prompts, and project files can still change.

Limen requires macOS or Linux, Node.js 24 or later, Git, and the selected engine (`omp` or `pi`) on `PATH`. Limen does not support Windows. The last known-good versions are omp 18.4.4 and Herdr 0.9.1. Limen records the versions on each job. It does not refuse other versions.

Jobs can run on an always-on **seat**. A seat is a VPS on Tailscale. The seat owns the project copy and the job files. Your laptop is only a window. See [docs/remote.md](docs/remote.md) and the current [seat checklist](docs/seat/README.md). [docs/vps.md](docs/vps.md) is an old record of one setup pass.

Teams are opt-in. Several teams can work on the same feature with different approaches. Each team has a fixed worker allowance. Limen shares progress between the teams automatically, as information only. The interactive lead stays the only landing owner. [docs/groups.md](docs/groups.md) describes activation, bounded wait, delivery receipts, stop and close, recovery, and the disposable proof fixture.

## Finish webhooks (opt-in)

When a job gets to a terminal state (`done`, `failed`, or `stopped`), limen can send a POST with `{job, status, branch}` to one or more destinations. A bot or a routine can use it to wake. **This is off by default.** An install of limen does not turn it on for any project. The webhook is a side channel. It does not replace the coordinator's own wake (see below).

**Turn it on per project** with a private file that Git ignores:

```bash
# <project>/.limen/finish-webhook.env  (mode 600; never commit)
LIMEN_FINISH_WEBHOOK_TARGETS='[{"url":"https://api2.cursor.sh/automations/webhook/…","auth":"Bearer …"}]'
```

Put that file in the primary Git checkout. Linked worktrees use the canonical root. A new spawn records the file path on the job. A continuation uses the choice of its parent. Configuration in your home directory or in old locations does **not** turn on a project. The optional `LIMEN_FINISH_WEBHOOK_AUTHOR_TARGETS` map sends each finish only to the bots of the ticket author. Without that map, every target gets every finish.

**What "accepted" means.** HTTP 2xx means that the sender got to the endpoint. It does **not** mean that a bot finished a turn. Expect a delay. Confirm the wake in the bot chat or in the routine run. Use `limen jobs <id>` to see the records `finish-webhook-env`, `finish-webhook-attempt`, and `finish-webhook`.

Configuration uses only `LIMEN_FINISH_WEBHOOK_*` keys. The old bot-specific keys do not work now. Existing private files and launchers need the [migration steps](docs/finish-webhooks.md#migration-bot-agnostic-configuration-keys). The helper file still has the name `tony-finish-ping.sh`.

[docs/finish-webhooks.md](docs/finish-webhooks.md) has the full setup, notes for more than one target, deliberate retry, and troubleshooting.


## Trust boundary

A spawned Pi job runs `pi --approve` as you. An OMP job runs `omp --auto-approve`. A worktree and a process group keep jobs apart. They are not a security sandbox. A worker can do all that your account can do. Read the branch before you merge it. See [SECURITY.md](SECURITY.md).

## Install

You do this part. Do it one time:

```bash
git clone https://github.com/overment/limen.git
cd limen
npm install
npm link
```

`npm link` puts that clone on `PATH`. The binary reads `hook/` and `templates/` from the directory next to it. Projects do not copy those files. After `git pull` on the clone, `/reload` the coordinator.

Then, in each project:

```bash
cd /path/to/your-project
limen init
LIMEN_COORDINATOR=1 omp --provider <provider> --model <model> --thinking <level>
```

Get the engine, provider, model, and reasoning level from the project choices in `spec/build.md` (see [Models](#models)). A new plant has no choices until you record them. The coordinator and new jobs run on OMP.

`limen init` creates the files that the project owns: the vision, the board, the feature lanes, and the styleguide. It also creates package-hook stubs in `.pi/extensions/` and `.omp/extensions/`. A Herdr OMP coordinator needs the `.omp` stub for communication, wake, and steering. In an existing project, run `limen init` again before you start one. Init does not overwrite existing project files. Init deletes old `limen-*.ts` hook copies in both extension directories, so that they cannot load next to the stubs. `limen init --drop-leftovers` deletes only prompt copies that are still the same as the package.

That interactive session is the coordinator (`LIMEN_COORDINATOR=1`). It is not a spawned job. You talk in this session. You do not operate the job CLI. Ordinary `limen spawn` starts workers and reviewers. It does not start a coordinator. Only an explicit `limen group start` from this pane creates managed team coordinators, and the pane must have `group-peer` loaded. A hosted limen job (`LIMEN_JOB=1`) cannot be the group lead. Do not spawn a "lead" tab in its place. The same environment variable on a spawn shell does not change the role of the job. Use a Herdr space with the name of the plant (`limen`, or `alice limen`). Do not use a space with the name `workers` only. The coordinator gives its own tab the name of one stable subject (`chat settings`). Limen adds ` · N running` to that name while its jobs run. Worker tabs get their names from spawn labels. A label puts the outcome first and the feature number last. The inherited shop manual (`templates/agents.md`) has the same layout rules. A project `AGENTS.md` replaces it.

Put project skills in `.agents/skills/<name>/SKILL.md`. All engines find them there. OMP also finds its own `.omp/skills/<name>/SKILL.md` files. Pi finds its own `.pi/skills/<name>/SKILL.md` files and the older flat `.pi/skills/<name>.md` files. For OMP jobs, limen makes a per-job view of old Pi skills outside the worktree. Limen gives that view to OMP as a skill directory. When two skills have the same name, the skill in `.agents/skills` or `.omp/skills` wins over the old copy. This applies to workers, reviewers, and continuations in both launch modes. It also applies to jobs in a repository next to a non-Git coordinator workspace. The next launch finds new or changed old skills. The plant needs no links that you keep by hand. Pi finds skills the same way as before.

## How you work

Tell the coordinator the outcome that you want. The coordinator writes or moves the ticket. It keeps `spec/build.md` correct. It commits the ticket, so that the worker can see it. Then it starts a job. Stay in that conversation. A wake comes when a job ends. Speak only when something looks wrong, or when the coordinator asks you. The coordinator asks about product ambiguity, a real tradeoff, credentials, or a merge.

The type of coordinator controls how the wake comes. A Pi coordinator subscribes its session at spawn. The wake hook then puts the completion into that session. A Herdr coordinator without a Pi session (OMP) has its pane recorded on the job as `origin-pane`. When the job ends, limen runs `herdr agent prompt` on that pane. Then limen waits until Herdr sees the pane at work. `limen jobs <id>` shows the result as `herdr-wake`. The result is `turn observed`, `submitted …; no turn observed`, or `failed …`.

A good request names the outcome and the first artifact. It does not describe the whole repository. The coordinator changes the request into a short spawn with a `Ticket:` pointer. It does not paste the ticket into the prompt.

`done` means that the run ended cleanly. The selected engine exited 0, or a hosted session ended, and the last stop reason was not `error` or `aborted`. A run with a provider error records `failed` and the reason. Neither state means that the ticket is finished. Neither state means that the branch is safe to merge. The coordinator reads the record, the diff, and the checks. Then it merges, or resumes a repair, or asks you.

When a mistake would be expensive, the coordinator starts a new reviewer on the candidate. The reviewer gives a verdict. The reviewer does not change the branch. You still merge.

## What the coordinator runs

These commands are the harness. The coordinator types them. This list helps you recognize a job ID, a wake, or a recovery step. It is not a daily script.

```bash
limen spawn --label "session handler · F001" \
  'Implement F001: sign-in survives a restart. Start with the failing session test. One commit. Ticket: spec/features/active/F001-auth/ticket.md'

limen status
limen jobs
limen jobs <id|suffix|label>
git diff HEAD...<branch>

limen spawn --review --branch limen/<job-id> --label "session handler review 1 · F001" \
  'Review the F001 candidate against spec/features/active/F001-auth/ticket.md. Name the commit reviewed.'

limen steer <id> "stay on the session test; do not widen"
limen stop <id> "reason"
limen spawn --branch limen/<job-id> --label "session handler repair 1 · F001" 'Focused resume instruction'
limen continue <id> 'Follow-up instruction'
limen watch <id|label>
limen land <id>
```

The last line of `spawn` output is the durable job ID. A label names the change first and the feature number last. A repair label or a review label names its round. A running job reads a steer between tool calls. Stop a job only after it ignores a steer, or when it is clearly dead. Stop sends TERM, and then a stronger signal. A resume uses the same branch and worktree, with the uncommitted files. The coordinator reads that state first. To take over a job that another coordinator started, watch that job by name. `watch --running` subscribes to every running job. It is not a takeover. `land` merges a `done` job onto the current branch. But `done` only means that the run exited cleanly. The coordinator lands after it reads the diff and the checks, under the review policy of the project.

Finished jobs keep their files in `.limen/jobs/`. Their extra checkouts do not stay. The next spawn removes finished worktrees, and `limen prune` does the same when you run it. A resume with `--branch` keeps that checkout. `limen prune --retire` deletes the records of finished jobs whose branches are already merged or dropped. With `--dry-run`, it prints the IDs and removes nothing. Spawn and sweep never retire records.

To keep the conversation of a finished job, run `limen continue <job-id> "Follow-up instruction"`. If prune removed its checkout, Limen puts the checkout back at the recorded path from the local branch. Then Limen copies the saved session into a new linked job. Only committed branch contents come back. Uncommitted files that prune removed are lost. Recovery is not possible without the branch or the transcript. Limen does not take over a branch that is checked out in a different place.

A detached job has two limits: 90 minutes (change it with `--timeout 20m`) and 900 tool-start events (`LIMEN_MAX_TOOL_CALLS`). Hosted jobs have neither limit. In both modes, Limen fails a pending tool only in one case: an owned child process stays silent, and its process tree uses no new CPU time for three minutes. `LIMEN_TOOL_STALL_MS` changes that confirmation time. If the engine identity or the process snapshot is not certain, Limen records an advisory. It does not stop a process that is possibly not part of the job. A failed job keeps its worktree and transcript. A limit records `failed`. It does not finish the ticket. `limen wait` blocks until a job ends. So under `LIMEN_COORDINATOR=1`, it refuses. It tells you to use `limen jobs`, the `state` file of the job, and the completion wake.

`limen sweep` scans registered projects for terminal jobs that nobody heard and for hosted-stall advisories. Each event gets one seat notification, also across restarts and concurrent sweeps. Old timestamp receipts stay valid. When an advisory clears and a new one starts, the new one can ring again. The sweep records `notify/seat` before it sends. So if a notification fails in an unclear way, the sweep logs an error and does not send that event again automatically. Seat receipts do not use up coordinator wakes or finish webhooks.

## Architecture picture

The architecture map is a local file. `limen picture build` makes it from a Markdown dataset that Git ignores (default `.limen/picture/`). The output is one offline `map.html` in the same directory. The dataset and the map are not in Git. Nobody commits or lands them. A new clone has no map. Build never calls a model. It warns (`source.missing`) for each cited source path that does not exist in the project root. [templates/picture/CONTRACT.md](templates/picture/CONTRACT.md) has the dataset rules.

The map shows places and the edges between them. A list next to the map shows features and journeys. When you select one, the map lights exactly the places that it names in `touches` or `steps`. The panel for a place lists the features and journeys that name it, and a click on one lights it. The map never uses Git history to find places. The list shows where a feature touches the code. It is not a live feature list. It does not show if a feature is planned, active, or done. The board (`spec/build.md`) owns feature state.

The coordinator starts the first map by hand, as an interactive `--role picture` job (`--tab`). It uses `--detached` only when the interactive start fails. After that, `limen picture tick --engine E --provider P --model M --thinking T` does one quiet pass. It compares the commit recorded in the map with `HEAD`. It starts a detached refresh job only in two cases: files were added, deleted, or renamed, or a source that the map cites changed. A source cited only by a feature or a journey counts too. Changes to specs, docs, or the map only print nothing and cost nothing. So a change to the board only (`spec/build.md`) never refreshes the map. The tick tries each tip one time. `--dry-run` prints the decision in one line, also when the map is current or nothing relevant changed.

The tick runs by itself only in a project that turns on its watch. **This is off by default.** In the primary checkout, `limen picture watch on --engine E --provider P --model M --thinking T` installs one Git `reference-transaction` hook. Each time the top branch moves (a land, a merge, or a pull), the hook starts one tick in the background. Worker branches and other refs start nothing. The hook never makes a merge or a spawn wait. The refresh job wakes no conversation. `--branch` names the top branch when it is not the branch that is checked out. `limen picture watch` prints the state. `limen picture watch off` removes the hook. `.limen/picture-watch.log` records each move.

## Ticket authorship

Collaborators who share a project can run `limen ticket-author spec/features/active/F001-auth/ticket.md`. It shows the name, email, and commit that first added the ticket. It follows renames between lanes when Git recognizes them. Paths are relative to the current directory. Absolute paths in the repository also work. The lookup reads the committed `HEAD` of the current branch. It never reads the Git config or the GitHub session of the current operator. It writes nothing.

For a GitHub noreply email, the lookup also gives the recorded login. A usual email is still a usable identity, without a GitHub account or network access. The result is the **author** of the creation commit. It is not the committer or the latest editor. It is evidence from Git. It is not a verified human identity. Shared bot credentials identify the bot, not the person who asked the bot to file the ticket. If collaborators need different attribution, use different authors on filing commits.

Spawn records that creation `@login` on the job for finish routing. If no login is available, spawn records the reason. For uncommitted paths and shallow history, the lookup says that authorship is not available. It does not guess. Commit a new ticket before you look it up. Fetch the full history for a shallow clone. A move that Git cannot recognize, a squash, or changed history can lose the original attribution. If you delete a path and create it again, a new ticket history starts. Limen adds no author tags to ticket Markdown.

## Models

Project choices are in `spec/build.md`. They are not in a different policy file, and they are not in this README. The board records the engine, provider, model, and reasoning level for each role, and who reviews. A newer explicit instruction from the owner has priority over the board. The commands below use placeholders. Fill them in from the board.

Package fallbacks apply only when the board does not choose. New jobs run OMP. `--engine pi` or `LIMEN_ENGINE=pi` selects Pi. For the model, `--model` has priority. Then comes `LIMEN_WORKER_MODEL` (or `LIMEN_REVIEWER_MODEL` for `--review`). Then comes the built-in `openai-codex/gpt-6-astra:high`. Give the board choices explicitly. Do not depend on the fallbacks. On OMP, `--model pi-claude/<model>` (without `--provider`) loads the local bridge at `~/.omp/local/pi-claude-bridge` explicitly. This is necessary because jobs otherwise start with `--no-extensions`. `--provider pi-claude` is not an OMP provider.

To start a coordinator in an existing Herdr pane, use a shell prompt with the project as the working directory:

```bash
herdr agent start limen-peer --kind <engine> --pane <pane-id> -- \
  --provider <provider> --model <model> --thinking <level>
```

Herdr sends on the arguments after `--`. Herdr does not select the model for Limen. Do not depend on old Pi project settings or a global default model. Limen does not change the settings or credentials of either engine.

For an ordinary worker:

```bash
limen spawn --engine <engine> \
  --provider <provider> --model <model> --thinking <level> \
  --label "what this changes · FNNN" 'Implement FNNN: <outcome>. Ticket: spec/features/active/FNNN-slug/ticket.md'
```

In Herdr, this job is hosted. Use `--detached` when someone asks for a background worker. In both modes, `--provider`, `--model`, and `--thinking` go to the selected engine as separate flag and value pairs. `limen continue` accepts the same flags. It uses the engine of the parent and refuses a different `--engine`. To continue a Pi transcript, you still need Pi.

`--engine pi|omp` selects the job binary. It has priority over `LIMEN_ENGINE`. When neither is set, new jobs use OMP. Old job records without an engine stay on Pi, for compatibility. A continuation keeps the engine of its parent. Pi and OMP keep separate auth stores (`~/.pi` and `~/.omp`). Authenticate OMP yourself. One wrapper and one stream parser serve both engines.

## Adjacent-repository workspaces

A parent directory that is not a Git repository can hold several independent Git repositories as children. Run `limen workspace init` one time in the parent. Then list the children in `spec/workspace.md`. After that, tell the coordinator which repository the work is for. The coordinator gives exactly one `--repo` to each job. Tickets stay in the parent. Branches, worktrees, diffs, and review stay in the selected child.

## Project files

The installed `limen` package supplies the default shop manual, role prompts, speech register, and hooks. `limen init` creates only the files that the project owns:

```text
.agents/limen/styleguide.md           project coding practice
spec/vision.md                        durable product intent
spec/build.md                         TRACK / NOW / NEXT / PROVEN
spec/features/                        planned, active, done, and dropped work
.pi/extensions/limen.ts               Pi stub: load hooks from the package
.omp/extensions/limen.ts              OMP stub: load the same hooks
.limen/jobs/<id>/                     runtime evidence
```

Optional overlays replace a package default, one file at a time: `AGENTS.md`, `.agents/limen/worker.md`, `.agents/limen/reviewer.md`, and `.agents/limen/communication.md`. A file that is still the same as the package is an old copy. The coordinator names it. A file with different bytes is an overlay. You can keep it, drop it, or edit it. Never overwrite an overlay.

The communication hook puts the shop manual, the speech register, the vision, and the styleguide in the system prompt for each model call. The board digest comes last, so a change to NOW or NEXT does not break the cached prefix. A short note on each turn names the audience and the reply rules. The wake cue is in that note, not in the system prompt. After a write or an edit, the tool result repeats the rule that applies. When you update the clone, every project on that computer gets the update.

## Recovery

The coordinator does this. You need it only if you look at a stuck tab yourself.

| Symptom | Safe next step |
|---|---|
| The job is quiet or repeats itself | Read `limen jobs <id>`, the log, and the worktree. Stop only on evidence. Then resume with a narrower task. |
| The worker has a real question | Read its durable note. Answer it. Resume the branch. |
| The wrapper is dead, but the state says `running` | Check the recorded PID. Correct the plain `state` file. Then resume. |
| A completion wake did not come | Read `.limen/jobs/` and Git. The job files stay the source of truth when a notification does not come. |

## Command reference

Coordinator actions. The coordinator runs these from its Herdr pane during ordinary work:

```text
limen spawn "instruction" [--label L] [--engine pi|omp] [--provider P] [--model M] [--thinking T] [--branch B] [--role NAME] [--timeout 20m] [--task-file F|-] [--prepare CMD]
limen spawn --repo R "instruction" [--label L] [--model M]
limen spawn --review --branch B --label L "instruction"
limen continue <id|suffix|label> "follow-up instruction" [--review] [--label L] [--engine pi|omp] [--provider P] [--model M] [--thinking T] [--tab|--detached]
limen status [--all]
limen jobs [--running|--active|--all|--label PREFIX|<id|suffix|label>]
limen diff <id|suffix|label>
limen steer <id|suffix|label> | --running "correction"
limen stop <id|suffix|label> [reason]
limen land <id|suffix|label> [--onto BRANCH] [--yes]
limen watch <id|suffix|label> | --running
limen unwatch <id|suffix|label> | --all
limen open <id|suffix|label>
limen close <FNNN>
limen prune [--retire [--dry-run]]
limen ticket-author <ticket-path>
limen picture build [--dir D] [--out F] [--json F] [--strict]
limen picture tick --engine E --provider P --model M --thinking T [--dir D] [--branch B] [--dry-run]
limen group start FEATURE --teams N --workers-per-team N --timeout D --worker-timeout D --engine E --provider P --model M --thinking T --worker-thinking T [--detached|--tab] [--new-run]
limen group status|publish|wait|stop|close [GROUP-ID]
limen github review <root> <comment-id> --engine E --provider P --model M --thinking T
limen github work <root> <comment-id> --engine E --provider P --model M --thinking T --task "instruction"
limen github resolve <root> <comment-id> <handoff-nonce> "no-job answer"
```

Operator actions. You run these one time for each project or seat, or a scheduler runs them:

```text
limen init
limen init --drop-leftovers
limen workspace init
limen sweep [--install|--uninstall]
limen linear [on [--team T --project P]|off|status]
limen github connect|disconnect|status|doctor
limen github ensure [registered-root]
limen github poll
limen picture watch [off | on --engine E --provider P --model M --thinking T [--branch B] [--dir D]]
limen wait <id|suffix|label>
```

Where the reference shows them, IDs, unique suffixes, and unique labels work the same. `status` is the plant inbox. It has four parts: `Running`, `Candidates to inspect` (finished jobs with commits that are not landed), `Needs a decision` (failed or stopped jobs with commits that are not landed), and coordinator tabs. `continue` keeps the engine of the parent. `land` merges a `done` job. A clean exit is not approval, so read the diff and the checks first. The group lead runs `group start` from its Herdr pane. Members get their group from their recorded membership. The lead gives the group ID. `wait` blocks, so it refuses under `LIMEN_COORDINATOR=1`. Use it in scripts. `sweep` sends one seat bell for each terminal job that nobody heard. `linear` turns the Linear mirror on or off. `github poll` runs as the isolated App user. It never runs as the worker account.

In a terminal, `jobs` shows an aligned table for people. Through a pipe, it prints the compact format that tools read. `LIMEN_VIEW=human|compact` selects a view. `NO_COLOR` removes the color.

## Develop

See [CONTRIBUTING.md](CONTRIBUTING.md). CI runs the same checks on Linux and macOS:

```bash
npm run check
```

The checks obey `.gitignore`. So local picture maps, job records, and retained evidence are never lint or format inputs.

Limen has no runtime dependencies. Capability goes in `src/`. Operating judgment goes in templates and project files.
