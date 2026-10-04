# Setup

[README](../README.md) · [Command reference](commands.md)

Install Limen, start a coordinator, and set the project configuration.

## Requirements

- **Operating system:** macOS or Linux. Limen does not support Windows.
- **Tools:** Node.js 24 or later, and Git.
- **Engine:** the selected engine (`omp` or `pi`) on `PATH`.
- **Last known-good versions:** omp 18.4.4 and Herdr 0.9.1. Limen records the versions on each job, but it does not refuse other versions.

## Install

### 1. Install Limen

You do this part, one time:

```bash
git clone https://github.com/overment/limen.git
cd limen
npm install
npm link
```

For interactive OMP jobs in Herdr, install the integration:

```bash
herdr integration install omp
```

`npm link` puts that clone on `PATH`. The binary reads `hook/` and `templates/` from the directory next to it. Projects do not copy those files, so when you update the clone, every project on that computer gets the update. After `git pull` on the clone, `/reload` the coordinator.

### 2. Start each project

Open a Herdr tab in the project’s Git repository. Before you start a worker, the repository must have at least one commit.

```bash
cd /path/to/your-project
limen init
LIMEN_COORDINATOR=1 omp --provider <provider> --model <model> --thinking <level>
```

Get the engine, provider, model, and reasoning level from the project choices in `spec/build.md` (see [Models](#models)). A new plant has no choices until you record them. The coordinator runs on OMP.

### What `limen init` does

- **Project files:** It creates the files that the project owns: the vision, the board, the feature lanes, and the styleguide (see [Project files](#project-files)). It does not overwrite existing project files.
- **Hook stubs:** It creates package-hook stubs in `.pi/extensions/` and `.omp/extensions/`. A Herdr OMP coordinator needs the `.omp` stub for communication, wake, and steering, so in an existing project, run `limen init` again before you start one.
- **Old hook copies:** It deletes old `limen-*.ts` hook copies in both extension directories, so that they cannot load next to the stubs.
- **Leftover prompts:** `limen init --drop-leftovers` deletes only prompt copies that are still the same as the package.

### The coordinator session

That interactive session is the coordinator (`LIMEN_COORDINATOR=1`). It is not a spawned job. You talk in this session. You do not operate the job CLI.

**Roles**

- Ordinary `limen spawn` starts workers and reviewers. It does not start a coordinator.
- Only an explicit `limen group start` from this pane creates managed team coordinators, and the pane must have `group-peer` loaded. The group lead runs that command from its Herdr pane.
- A hosted Limen job (`LIMEN_JOB=1`) cannot be the group lead. Do not spawn a "lead" tab in its place. The same environment variable on a spawn shell does not change the role of the job.

**Herdr layout**

- Use a Herdr space with the name of the plant (`limen`, or `alice limen`). Do not use a space with the name `workers` only.
- The coordinator gives its own tab the name of one stable subject (`chat settings`). Limen adds ` · N running` to that name while its jobs run.
- Worker tabs get their names from spawn labels (see [Job IDs and labels](jobs.md#job-ids-and-labels)).
- The inherited shop manual (`templates/agents.md`) has the same layout rules. A project `AGENTS.md` replaces it.

### Project skills

Put project skills in `.agents/skills/<name>/SKILL.md`. Each engine finds skills in these places:

| Location | Found by |
|---|---|
| `.agents/skills/<name>/SKILL.md` | All engines |
| `.omp/skills/<name>/SKILL.md` | OMP |
| `.pi/skills/<name>/SKILL.md` | Pi |
| `.pi/skills/<name>.md` (older flat files) | Pi |

**Old Pi skills in OMP jobs.** For OMP jobs, Limen makes a per-job view of old Pi skills outside the worktree. Limen gives that view to OMP as a skill directory. When two skills have the same name, the skill in `.agents/skills` or `.omp/skills` wins over the old copy. This applies to workers, reviewers, and continuations in both launch modes. It also applies to jobs in a repository next to a non-Git coordinator workspace.

The next launch finds new or changed old skills, so the plant needs no links that you keep by hand. Pi finds skills the same way as before.

## Models

Project choices are in `spec/build.md`. The board records the engine, provider, model, and reasoning level for each role, and who reviews. The coordinator reads those choices and passes them to the CLI as command flags. The CLI selects settings from flags, environment variables, and package defaults. A newer explicit instruction from the owner has priority over the board. Replace the placeholders in the commands with the project choices.

### Package fallbacks

The coordinator must pass the board choices explicitly. Package fallbacks apply when command flags and environment variables do not select a setting.

**Engine.** `--engine pi|omp` selects the job binary. The order of priority is:

1. `--engine pi|omp`
2. `LIMEN_ENGINE` (for example, `LIMEN_ENGINE=pi` selects Pi)
3. OMP, for new jobs, when neither is set

Two exceptions apply:

- Old job records without an engine stay on Pi, for compatibility.
- A continuation keeps the engine of its parent. `limen continue` refuses a different `--engine`, so to continue a Pi transcript, you still need Pi.

**Model.** The order of priority is:

1. `--model`
2. `LIMEN_WORKER_MODEL` (or `LIMEN_REVIEWER_MODEL` for `--review`)
3. the built-in `openai-codex/gpt-6-astra:high`

**`pi-claude` on OMP.** On OMP, `--model pi-claude/<model>` (without `--provider`) loads the local bridge at `~/.omp/local/pi-claude-bridge` explicitly. This is necessary because jobs otherwise start with `--no-extensions`. `--provider pi-claude` is not an OMP provider.

**Auth.** Pi and OMP keep separate auth stores (`~/.pi` and `~/.omp`), so authenticate OMP yourself. Limen does not change the settings or credentials of either engine. One wrapper and one stream parser serve both engines.

### Start a coordinator in a Herdr pane

To start a coordinator in an existing Herdr pane, use a shell prompt with the project as the working directory:

```bash
herdr agent start limen-peer --kind <engine> --pane <pane-id> -- \
  --provider <provider> --model <model> --thinking <level>
```

Herdr sends on the arguments after `--`, but Herdr does not select the model for Limen. Do not depend on old Pi project settings or a global default model.

### Start a worker

For an ordinary worker:

```bash
limen spawn --engine <engine> \
  --provider <provider> --model <model> --thinking <level> \
  --label "what this changes · FNNN" 'Implement FNNN: <outcome>. Ticket: spec/features/active/FNNN-slug/ticket.md'
```

In Herdr, this job is hosted. Use `--detached` when someone asks for a background worker. In both modes, `--provider`, `--model`, and `--thinking` go to the selected engine as separate flag and value pairs. `limen continue` accepts the same flags.

## Adjacent-repository workspaces

A parent directory that is not a Git repository can hold several independent Git repositories as children.

1. Run `limen workspace init` one time in the parent.
2. List the children in `spec/workspace.md`.
3. Tell the coordinator which repository the work is for.

The coordinator gives exactly one `--repo` to each job. Tickets stay in the parent. Branches, worktrees, diffs, and review stay in the selected child.

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

### Overlays

Optional overlays replace a package default, one file at a time:

- `AGENTS.md`
- `.agents/limen/worker.md`
- `.agents/limen/reviewer.md`
- `.agents/limen/communication.md`

| File | Name | What happens |
|---|---|---|
| Same bytes as the package | Old copy | The coordinator names it. |
| Different bytes | Overlay | You can keep it, drop it, or edit it. **Never overwrite an overlay.** |

### Hooks

The communication hook puts the shop manual, the speech register, the vision, and the styleguide in the system prompt for each model call. The board digest comes last, so a change to NOW or NEXT does not break the cached prefix.

A short note on each turn names the audience and the reply rules. The wake cue is in that note, not in the system prompt. After a write or an edit, the tool result repeats the rule that applies.
