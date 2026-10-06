# Command reference

[README](../README.md) · [Setup](setup.md) · [Jobs](jobs.md)

The coordinator runs job commands. The operator runs setup commands. Run `limen --help` for the installed command list. Run `limen <command> --help`, for example `limen picture --help`, for the usage lines of one command.

Where the reference shows them, IDs, unique suffixes, and unique labels work the same.

## Coordinator actions

The coordinator runs these from its Herdr pane during ordinary work.

### Start and continue jobs

Start a worker, a reviewer, or a job in one child repository, or continue a finished job.

```text
limen spawn --engine <engine> --provider <provider> --model <model> --thinking <level> "instruction" [--label L] [--branch B] [--role NAME] [--timeout 20m] [--task-file F|-] [--prepare CMD] [--tab|--detached]
limen spawn --engine <engine> --provider <provider> --model <model> --thinking <level> --repo R "instruction" [--label L]
limen spawn --engine <engine> --provider <provider> --model <model> --thinking <level> --review --detached --branch B --label L [--base SHA] [--head SHA] "instruction"
limen continue <id|suffix|label> "follow-up instruction" [--review] [--label L] [--engine pi|omp] [--provider P] [--model M] [--thinking T] [--tab|--detached]
```

`--base` and `--head` take full commit SHAs and pin the range that a review reads. They require `--review`.

### Inspect jobs

Run job commands from the project repository or Limen workspace. Outside either location, Limen names the current directory and tells you where to run. A new repository needs its first commit before `spawn`.

Read the plant inbox, the job records, and the diff of a job, or open a job in Herdr.

```text
limen status [--all]
limen jobs [--running|--active|--all|--label PREFIX|<id|suffix|label>]
limen diff <id|suffix|label>
limen open <id|suffix|label>
```

`status` is the plant inbox. It has four parts:

- `Running`
- `Candidates to inspect` (finished jobs with commits that are not landed)
- `Needs a decision` (failed or stopped jobs with commits that are not landed)
- coordinator tabs

Open groups replace individual member candidates with one line: `group <feature>: N member branches; the lead decides (limen group status <id>)`. Closed groups leave the inbox. Work outside groups keeps its ordinary candidate or decision row.

In a terminal, `jobs` shows an aligned table for people. Through a pipe, it prints the compact format that tools read. `LIMEN_VIEW=human|compact` selects a view. `NO_COLOR` removes the color.

The default compact `jobs` view lists running jobs and recent empty jobs. It hides empty jobs that ended more than 7 days ago and prints `N older empty jobs hidden`. `limen jobs --all` shows every job. An unknown job ID exits 1 with `no job matches "<id>"`.

### Control running jobs

Correct or stop a running job, or subscribe to it.

```text
limen steer <id|suffix|label> | --running "correction"
limen stop <id|suffix|label> [reason]
limen watch <id|suffix|label> | --running
limen unwatch <id|suffix|label> | --all
```

### Land and clean up

Merge a job, close the Herdr tabs of a feature, and remove finished worktrees or records.

```text
limen land <id|suffix|label> [--onto BRANCH] [--yes]
limen close <FNNN>
limen prune [--retire [--dry-run]]
```

### Tickets

Show who first added a ticket.

```text
limen ticket-author <ticket-path>
```

### Map build and refresh

Build the architecture map, or do one quiet refresh pass.

```text
limen picture build [--dir D] [--out F] [--json F] [--strict]
limen picture tick --engine E --provider P --model M --thinking T [--dir D] [--branch B] [--dry-run]
```

### Team groups

Start a team group, and show the status of, publish, wait for, stop, or close it.

```text
limen group start FEATURE --teams N --workers-per-team N --timeout D --worker-timeout D --engine E --provider P --model M --thinking T --worker-thinking T [--team-model team-N=provider/model] [--detached|--tab] [--new-run]
limen group status [GROUP-ID] [--json]
limen group publish [GROUP-ID] [--team team-N] "finding"
limen group wait [GROUP-ID] [--timeout D]
limen group stop|close [GROUP-ID]
```

Members get their group from their recorded membership. The group lead gives the group ID. Repeat `--team-model` to give more than one team its own model. See [Groups](groups.md).

### GitHub comments

Start a hosted review or task for one GitHub request, or give an answer without a job. The claim ID is the triggering comment ID, or `issue-<number>` when an issue body carries the request.

```text
limen github review <root> <claim-id> --engine E --provider P --model M --thinking T
limen github work <root> <claim-id> --engine E --provider P --model M --thinking T --task "instruction"
limen github resolve <root> <claim-id> <handoff-nonce> "no-job answer"
```

## Operator actions

You run these one time for each project or seat, or a scheduler runs them.

### Project setup

Create the project files, set up a parent workspace for child repositories, or choose where group planning files live. `limen init` ends with a `next:` line that names the next step, and says so when the repository has no commit yet.

```text
limen init
limen init --drop-leftovers
limen workspace init
limen planning [committed|private]
```

`limen planning` prints the current planning source. `committed` is the default.

### Seat sweep

Run the seat sweep (see [Seat notifications](jobs.md#seat-notifications)), or install or remove it. Each pass also sends the `coordinator.exited` webhook for a registered coordinator whose process died without a normal exit (see [Plant events](finish-webhooks.md#plant-events)).

```text
limen sweep [--install|--uninstall]
```

### Finish webhook test

Send one `webhook.test` event to this plant's finish webhook targets. The sender prints one line per target. It never prints a URL or a credential.

```text
limen webhook test
```

### Linear

`linear` turns the Linear mirror on or off.

```text
limen linear [on [--team T --project P]|off|status]
```

### GitHub

Connect projects to GitHub, diagnose the seat, and run one polling pass. The poller runs `deliver` to hand one claim to the live coordinator.

```text
limen github connect|disconnect|status|doctor
limen github ensure [registered-root]
limen github poll
limen github deliver <root> <claim-id> <handoff-nonce>
```

`github poll` runs as the isolated App user. It never runs as the worker account.

### Map watch toggle

Turn the architecture map watch on or off, or print its state.

```text
limen picture watch [off | on --engine E --provider P --model M --thinking T [--branch B] [--dir D]]
```

### Scripts

`limen wait` blocks until a job ends, so use it in scripts.

```text
limen wait <id|suffix|label>
```

Because it blocks, `wait` refuses under `LIMEN_COORDINATOR=1`. It tells you to use `limen jobs`, the `state` file of the job, and the completion wake.
