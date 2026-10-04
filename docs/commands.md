# Command reference

[README](../README.md) · [Setup](setup.md) · [Jobs](jobs.md)

The coordinator runs job commands. The operator runs setup commands. Run `limen --help` for the installed command list.

Where the reference shows them, IDs, unique suffixes, and unique labels work the same.

## Coordinator actions

The coordinator runs these from its Herdr pane during ordinary work.

### Start and continue jobs

Start a worker, a reviewer, or a job in one child repository, or continue a finished job.

```text
limen spawn "instruction" [--label L] [--engine pi|omp] [--provider P] [--model M] [--thinking T] [--branch B] [--role NAME] [--timeout 20m] [--task-file F|-] [--prepare CMD]
limen spawn --repo R "instruction" [--label L] [--model M]
limen spawn --review --branch B --label L "instruction"
limen continue <id|suffix|label> "follow-up instruction" [--review] [--label L] [--engine pi|omp] [--provider P] [--model M] [--thinking T] [--tab|--detached]
```

### Inspect jobs

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

In a terminal, `jobs` shows an aligned table for people. Through a pipe, it prints the compact format that tools read. `LIMEN_VIEW=human|compact` selects a view. `NO_COLOR` removes the color.

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
limen group start FEATURE --teams N --workers-per-team N --timeout D --worker-timeout D --engine E --provider P --model M --thinking T --worker-thinking T [--detached|--tab] [--new-run]
limen group status|publish|wait|stop|close [GROUP-ID]
```

Members get their group from their recorded membership. The group lead gives the group ID.

### GitHub comments

Start a hosted review or task for one GitHub comment, or give an answer without a job.

```text
limen github review <root> <comment-id> --engine E --provider P --model M --thinking T
limen github work <root> <comment-id> --engine E --provider P --model M --thinking T --task "instruction"
limen github resolve <root> <comment-id> <handoff-nonce> "no-job answer"
```

## Operator actions

You run these one time for each project or seat, or a scheduler runs them.

### Project setup

Create the project files, or set up a parent workspace for child repositories.

```text
limen init
limen init --drop-leftovers
limen workspace init
```

### Seat sweep

Run the seat sweep (see [Seat notifications](jobs.md#seat-notifications)), or install or remove it.

```text
limen sweep [--install|--uninstall]
```

### Linear

`linear` turns the Linear mirror on or off.

```text
limen linear [on [--team T --project P]|off|status]
```

### GitHub

Connect projects to GitHub, diagnose the seat, and run one polling pass.

```text
limen github connect|disconnect|status|doctor
limen github ensure [registered-root]
limen github poll
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
