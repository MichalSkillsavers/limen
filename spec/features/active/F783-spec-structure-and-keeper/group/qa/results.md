# Team 4 · Live keeper proof on a throwaway plant

Result: the proof passed on the lead's integration commit `e423ef1`. A real job ran on a throwaway plant. I then broke three spec links on its branch. `limen ticket check` and `limen land` both refused the branch, and land printed the keeper command. A real keeper job fixed all three links in 38 seconds. `limen ticket check` then passed on the keeper branch, the land of the keeper job succeeded, and the strict check on `main` had no error and no warning.

Build under test: `limen/2026-10-06-f783-spec-structure-spec-keeper-81acb6b0` at `e423ef1` (teams 1, 2 and 3 plus lead fixes), checked out detached in `/tmp/f783-proof/limen`. The plant is `/tmp/f783-proof/plant`, made by `group/qa/proof.sh`. It has its own seat registry (`LIMEN_HOME`), no Herdr, and no group or job identity. Jobs on the plant call this build through a `limen` shim on `PATH`. Worker and keeper ran on Sol (`openai-codex/gpt-6-sol`, thinking low).

## What each step showed

| Ticket acceptance | Step | Real result |
| --- | --- | --- |
| A keeper never commits on the branch of a running job | `limen keeper` while the worker ran | Refused, exit 1: "job … is still running; a keeper never commits beside a live job; wait for it, or stop it". After the keeper ran, the worker branch tip was still `7977eca`. The keeper commit `273cbad` is only on `limen/keeper-f002-7977eca`. |
| Each strict ticket diagnostic names the file, the line and the fix | `limen picture build --dir <map> --strict` on the broken branch | `error ticket.unknown-touch spec/features/active/F002-plant-greeting/ticket.md:3: unknown place id "limen.commandz"; fix: replace it with an id from limen picture build --json <file>`, exit 1. |
| The check before an ordinary merge | `limen ticket check <worker branch>` | Exit 1, with the same map warning, board warning, error and keeper line as land. The keeper line says `--job <id>`, because the check does not know the job. |
| `limen land` refuses a branch whose tickets fail, and prints the keeper command | `limen land <worker job> --yes` | Refused, exit 1. It printed a map warning, a board warning, the `error` line, and `fix: limen keeper spec/features/active/F002-plant-greeting/ticket.md --job 2026-10-06-f002-plant-greeting-f3e262a8 --engine <engine> --provider <provider> --model <model> --thinking <level>`. `main` did not move. |
| A keeper repairs a broken front matter, a missing board line and a stale map source | `limen keeper <old planned path> --job <worker job> …`, the path the done wake prints | It printed "ticket moved: spec/features/planned/… -> spec/features/active/…" and started keeper `2026-10-06-f002-spec-keeper-35a9fb7d`. The packet had no `fix: limen keeper` line. The keeper made one commit, `spec keeper: F002 links`. It changed `limen.commandz` to `limen.commands` and added the `NOW` board line. Outside Git, it changed the map source to the active path. It changed no other line. Its last check, `limen ticket check` in its worktree, exited 0. |
| The land then succeeds | `limen ticket check <keeper branch>`, then `limen land <keeper job> --yes` | The check exited 0. `main` fast-forwarded to `273cbad`, with the worker commit, the break commit and the keeper commit. Strict check exit 0, no diagnostic. `./greet.sh` prints `Hello, plant.` |
| A scaffolded ticket gets the next free number and passes strict with no edit | `limen ticket new "The greeting takes a name" --touches limen.commands` | It wrote `spec/features/planned/F005-the-greeting-takes-a-name/ticket.md`. F004 is the highest number, in `done/2026-09/`. Strict exit 0, no diagnostic. |
| Done wakes send the work to the keeper | `completionWake` for the worker and the keeper (`proof.sh wake`) | Worker wake: "start limen keeper spec/features/planned/F002-plant-greeting/ticket.md --job … --engine <engine> --provider <provider> --model <model> --thinking <level> and land the keeper job instead". Keeper wake: "This is the spec keeper: land it, since it carries the work and the spec fixes." |

Tests: on `e423ef1`, with the group and job variables unset, `node --test --test-concurrency=1` on `test/land-command.test.ts`, `test/keeper-command.test.ts`, `test/ticket-command.test.ts`, `test/picture-tickets.test.ts` and `test/coordinator-wake.test.ts` gave 24 tests, 24 pass. I did not run typecheck or Biome; the proof checkout has no `node_modules`.

## What is still open

- **The place-id fix text fails in a worktree.** The error and the worker contract say "limen picture build --json <file>". In a job worktree that command exits 1 with "No map yet". Neither keeper needed it, because each read the map nodes. Details and a replacement are in `group/teams/team-4-review.md`.
- **The worker wake still prints the task's old ticket path.** The command works, because `limen keeper` follows a moved ticket. A reader who copies it must still fill in the four route flags.
- **`limen ticket check` prints nothing when it passes.** Exit 0 is the only sign of a pass. A branch with no ticket change gets a line, so the silent case reads as "nothing happened".
- **Map edits do not land.** The keeper's map fix applied at once to the plant's map, outside Git. Nothing in Git records it, except the keeper's final message.

## How the breaks were made

The worker was told to change one line in `greet.sh`, and did. The three broken links are one scripted commit on the worker's branch after the worker finished (`proof.sh break`). It moves the ticket from `planned/` to `active/`, sets `touches` to the unknown id `limen.commandz`, and deletes the board line. The map still cites the `planned/` path. So the proof tests the keeper and the land gate, not whether a worker leaves links broken on its own.

## Rerun

Run from a checkout that holds this packet. `JOB` is the id that `spawn` prints, and `KEEPER` is the id that `keeper` prints.

```sh
P=spec/features/active/F783-spec-structure-and-keeper/group/qa/proof.sh
export LIMEN_PKG=/path/to/limen/checkout/under/test
bash $P setup && bash $P spawn && bash $P keeper-early JOB   # the keeper must refuse while JOB runs
bash $P wait JOB && bash $P break JOB && bash $P wake JOB
bash $P ticket-check limen/JOB; bash $P land JOB            # both must refuse
bash $P keeper JOB spec/features/planned/F002-plant-greeting/ticket.md
bash $P wait KEEPER && bash $P wake KEEPER && bash $P ticket-check limen/keeper-f002-<tip7>
bash $P land KEEPER && bash $P check && bash $P scaffold
```

## Runs

- Run 1 (`group/qa/run-1.md`): the first team 2 and team 3 commits. It passed. It also found four problems that team 3 fixed before run 2 (`edbc18d`). A keeper's done wake asked for a keeper of the keeper. The worker wake's command had no route flags and a stale path. The packet told the keeper to start a keeper. A refusal named a role it had just refused.
- Run 2 (`group/qa/run-2.md`): a local merge of lead `2aaf43b` and team 3 `2172c65`. It passed, but the build had no `limen ticket check`, so the keeper's last check printed usage.
- Run 3: below, verbatim from `/tmp/f783-proof/transcript.md`. The keeper packet, the keeper result and the keeper diff come from hand-run commands that the transcript shows with their output.

## Run 3 transcript

### setup (2026-10-06 10:28:56 CEST, limen package /tmp/f783-proof/limen at e423ef1) · limen e423ef1

```console
$ cd /tmp/f783-proof/plant && limen init
created .agents/limen/styleguide.md
created spec/vision.md
created spec/build.md
created spec/features/_template/ticket.md
created spec/features/_template/outcome.md
created spec/features/planned/.gitkeep
created spec/features/active/.gitkeep
created spec/features/done/.gitkeep
created spec/features/dropped/.gitkeep
created .pi/extensions/limen.ts
created .omp/extensions/limen.ts
ready .limen/jobs
this repository has no commit yet; commit once, then spawn.
next: write spec/vision.md and .agents/limen/styleguide.md, commit, then open a coordinator in this folder (docs/setup.md)
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && git log --oneline -1
940852e Throwaway plant for the F783 keeper proof
[exit 0]
```

Baseline strict check on main: expect no error and no warning.

```console
$ cd /tmp/f783-proof/plant && limen picture build --dir /tmp/f783-proof/plant/.limen/picture --out /tmp/f783-proof/map.html --strict
picture: 3 places, 0 edges; wrote /tmp/f783-proof/map.html
[exit 0]
```

### spawn: one small real job · limen e423ef1

```console
$ cd /tmp/f783-proof/plant && limen spawn --engine omp --provider openai-codex --model gpt-6-sol --thinking low --detached --timeout 10m --label 'F002 plant greeting' Implement\ F002:\ the\ greeting\ names\ the\ plant.\ Change\ the\ echo\ line\ in\ greet.sh\ so\ ./greet.sh\ prints\ \'Hello\,\ plant.\'\ and\ commit\ it.\ Change\ no\ other\ file.\ Ticket:\ spec/features/planned/F002-plant-greeting/ticket.md
started F002 plant greeting
2026-10-06-f002-plant-greeting-f3e262a8
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && limen jobs --all
RUNNING F002 plant greeting · id 2026-10-06-f002-plant-greeting-f3e262a8 · branch limen/2026-10-06-f002-plant-greeting-f3e262a8 · elapsed 1s · silent 0s · think · tools 0 · pid 19176
  log:
  [limen 2026-10-06T08:29:00.364Z] worker started
  engine omp
  versions:
    omp omp/18.4.4
[exit 0]
```

### keeper while the job runs: expect a refusal · limen e423ef1

```console
$ cd /tmp/f783-proof/plant && job_state 2026-10-06-f002-plant-greeting-f3e262a8
state: running
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && limen keeper spec/features/planned/F002-plant-greeting/ticket.md --job 2026-10-06-f002-plant-greeting-f3e262a8 --engine omp --provider openai-codex --model gpt-6-sol --thinking low --timeout 10m
job 2026-10-06-f002-plant-greeting-f3e262a8 is still running; a keeper never commits beside a live job; wait for it, or stop it
[exit 1]
```

### wait for 2026-10-06-f002-plant-greeting-f3e262a8 · limen e423ef1

```console
$ cd /tmp/f783-proof/plant && limen wait 2026-10-06-f002-plant-greeting-f3e262a8
DONE F002 plant greeting · id 2026-10-06-f002-plant-greeting-f3e262a8
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && job_state 2026-10-06-f002-plant-greeting-f3e262a8
state: done
[exit 0]
```

### break three links on the branch of 2026-10-06-f002-plant-greeting-f3e262a8 (worktree /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-f3e262a8) · limen e423ef1

```console
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-f3e262a8 && git log --oneline 940852ec3a681f98ddef717a85baca989cec9d9c..HEAD
58683d3 Name the plant in greeting
[exit 0]
```

```console
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-f3e262a8 && git mv spec/features/planned/F002-plant-greeting spec/features/active/F002-plant-greeting
[exit 0]
```

```console
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-f3e262a8 && git add -A
[exit 0]
```

```console
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-f3e262a8 && git commit -q -m 'F002: start work (proof: three broken links)'
[exit 0]
```

```console
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-f3e262a8 && git show --stat '--format=%h %s' HEAD
7977eca F002: start work (proof: three broken links)

 spec/build.md                                                   | 1 -
 spec/features/{planned => active}/F002-plant-greeting/ticket.md | 2 +-
 2 files changed, 1 insertion(+), 2 deletions(-)
[exit 0]
```

```console
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-f3e262a8 && git diff 'HEAD~1' -- spec/features/active/F002-plant-greeting/ticket.md spec/build.md
diff --git a/spec/build.md b/spec/build.md
index cb3c218..32ab8f3 100644
--- a/spec/build.md
+++ b/spec/build.md
@@ -8,7 +8,6 @@
 
 ## NEXT
 
-- `F002-plant-greeting` (🔴 PLANNED): the greeting names the plant.
 
 ## PROVEN
 
diff --git a/spec/features/active/F002-plant-greeting/ticket.md b/spec/features/active/F002-plant-greeting/ticket.md
new file mode 100644
index 0000000..b07deb5
--- /dev/null
+++ b/spec/features/active/F002-plant-greeting/ticket.md
@@ -0,0 +1,23 @@
+---
+touches:
+  - limen.commandz
+opened: 2026-10-06
+---
+
+# F002 · The greeting names the plant
+
+## Outcome
+
+Running `./greet.sh` prints `Hello, plant.` instead of `Hello`. A reader of the proof sees which plant answered.
+
+## Scope
+
+- The one echo line in `greet.sh`.
+
+## Out of scope
+
+- The README.
+
+## Acceptance
+
+- `./greet.sh` prints `Hello, plant.`
[exit 0]
```

```console
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-f3e262a8 && grep -n F002 /tmp/f783-proof/plant/.limen/picture/features/limen.feature.f002.md
6:title: The greeting names the plant (F002)
11:  - spec/features/planned/F002-plant-greeting/ticket.md
[exit 0]
```

Strict check on the job branch: expect ticket.unknown-touch (error) and source.missing (warning).

```console
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-f3e262a8 && limen picture build --dir /tmp/f783-proof/plant/.limen/picture --out /tmp/f783-proof/map.html --strict
warn source.missing features/limen.feature.f002.md:10: source "spec/features/planned/F002-plant-greeting/ticket.md" does not exist in the project root
error ticket.unknown-touch spec/features/active/F002-plant-greeting/ticket.md:3: unknown place id "limen.commandz"; fix: replace it with an id from limen picture build --json <file>
picture: 3 places, 0 edges; wrote /tmp/f783-proof/map.html
[exit 1]
```

### done wake text for 2026-10-06-f002-plant-greeting-f3e262a8 · limen e423ef1

```console
$ cd /tmp/f783-proof/plant && node --input-type=module -e import\ \{\ completionWake\ \}\ from\ \'/tmp/f783-proof/limen/src/job/wake-text.ts\'\;\ const\ job\ =\ \'/tmp/f783-proof/plant/.limen/jobs/2026-10-06-f002-plant-greeting-f3e262a8\'\;\ console.log\(completionWake\(job\,\ \'2026-10-06-f002-plant-greeting-f3e262a8\'\,\ \'done\'\,\ \'2026-10-06-f002-plant-greeting-f3e262a8\'\,\ \'BRANCH\'\,\ \'\'\,\ false\)\)\;
Limen job "2026-10-06-f002-plant-greeting-f3e262a8": Implement F002: the greeting names the plant.
is done (2026-10-06-f002-plant-greeting-f3e262a8) on branch BRANCH.

Commits:
58683d3 Name the plant in greeting

Final message:
The greeting now prints `Hello, plant.` The only changed file is `greet.sh`.

Check: `./greet.sh` printed `Hello, plant.`, and an exact-output check passed. Commit: `58683d3` (`Name the plant in greeting`). No remaining slice.

Job done. Next step: land it, or name the check that still blocks landing. Done does not mean that review passed.

Inspect the job record, branch diff and commits, log/session, and relevant checks. Then land the work at the verified commit. If a check blocks landing, name that check and resume a focused fix. If it added, moved or changed a ticket, start limen keeper spec/features/planned/F002-plant-greeting/ticket.md --job 2026-10-06-f002-plant-greeting-f3e262a8 --engine <engine> --provider <provider> --model <model> --thinking <level> and land the keeper job instead. After it lands, continue with the next item on the board. Keep the user informed; ask only when genuine product ambiguity, a scope or risk tradeoff, or an irreversible action needs a human decision.
[exit 0]
```

### ticket check for limen/2026-10-06-f002-plant-greeting-f3e262a8 · limen e423ef1

```console
$ cd /tmp/f783-proof/plant && limen ticket check limen/2026-10-06-f002-plant-greeting-f3e262a8
warn /private/tmp/f783-proof/plant/.limen/picture/features/limen.feature.f002.md: source "spec/features/planned/F002-plant-greeting/ticket.md" does not exist at limen/2026-10-06-f002-plant-greeting-f3e262a8; fix: change it to spec/features/active/F002-plant-greeting/ticket.md
warn spec/build.md: no board line for F002; fix: add - `F002-plant-greeting` (🟠 ACTIVE): <one clause> under ## NOW
error spec/features/active/F002-plant-greeting/ticket.md:3: unknown place id "limen.commandz"; fix: replace it with an id from limen picture build --json <file>
fix: limen keeper spec/features/active/F002-plant-greeting/ticket.md --job <id> --engine <engine> --provider <provider> --model <model> --thinking <level>
[exit 1]
```

### land 2026-10-06-f002-plant-greeting-f3e262a8 onto main · limen e423ef1

```console
$ cd /tmp/f783-proof/plant && git status --short --branch
## main
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && limen land 2026-10-06-f002-plant-greeting-f3e262a8 --yes
land refused: limen/2026-10-06-f002-plant-greeting-f3e262a8 has tickets that fail the strict check
warn /private/tmp/f783-proof/plant/.limen/picture/features/limen.feature.f002.md: source "spec/features/planned/F002-plant-greeting/ticket.md" does not exist at limen/2026-10-06-f002-plant-greeting-f3e262a8; fix: change it to spec/features/active/F002-plant-greeting/ticket.md
warn spec/build.md: no board line for F002; fix: add - `F002-plant-greeting` (🟠 ACTIVE): <one clause> under ## NOW
error spec/features/active/F002-plant-greeting/ticket.md:3: unknown place id "limen.commandz"; fix: replace it with an id from limen picture build --json <file>
fix: limen keeper spec/features/active/F002-plant-greeting/ticket.md --job 2026-10-06-f002-plant-greeting-f3e262a8 --engine <engine> --provider <provider> --model <model> --thinking <level>
[exit 1]
```

```console
$ cd /tmp/f783-proof/plant && git log --oneline -3
940852e Throwaway plant for the F783 keeper proof
[exit 0]
```

### keeper for 2026-10-06-f002-plant-greeting-f3e262a8 · limen e423ef1

```console
$ cd /tmp/f783-proof/plant && limen keeper spec/features/planned/F002-plant-greeting/ticket.md --job 2026-10-06-f002-plant-greeting-f3e262a8 --engine omp --provider openai-codex --model gpt-6-sol --thinking low --timeout 10m
ticket moved: spec/features/planned/F002-plant-greeting/ticket.md -> spec/features/active/F002-plant-greeting/ticket.md
started spec keeper · F002
2026-10-06-f002-spec-keeper-35a9fb7d
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && limen jobs --all
RUNNING spec keeper · F002 · id 2026-10-06-f002-spec-keeper-35a9fb7d · branch limen/keeper-f002-7977eca · elapsed 1s · silent 0s · think · tools 0 · pid 26546
  diff:
  greet.sh                                                        | 2 +-
   spec/build.md                                                   | 1 -
   spec/features/{planned => active}/F002-plant-greeting/ticket.md | 2 +-
   3 files changed, 2 insertions(+), 3 deletions(-)
  log:
  [limen 2026-10-06T08:29:34.220Z] worker started
  engine omp
  versions:
    omp omp/18.4.4

DONE F002 plant greeting · id 2026-10-06-f002-plant-greeting-f3e262a8 · branch limen/2026-10-06-f002-plant-greeting-f3e262a8 · elapsed 19s · silent 0s · tools 6 · bash
  diff:
  greet.sh                                                        | 2 +-
   spec/build.md                                                   | 1 -
   spec/features/{planned => active}/F002-plant-greeting/ticket.md | 2 +-
   3 files changed, 2 insertions(+), 3 deletions(-)
  log:
  [limen 2026-10-06T08:29:00.364Z] worker started
  think
  read spec/vision.md
  read spec/features/planned/F002-plant-greeting/ticket.md
  read greet.sh
  read spec/build.md
  wait
  think
  wait
  think
  edit
  wait
  think
  bash ./greet.sh && test "$(./greet.sh)" = 'Hello, plant.' && git add -- greet.sh && g
  wait
  think
  The greeting now prints `Hello, plant.` The only changed file is `greet.sh`.
  
  Check: `./greet.sh` printed `Hello, plant.`, and an exact-output check passed. Commit: `58683d3` (`Name the plant in greeting`). No remaining slice.
  [limen 2026-10-06T08:29:18.786Z] done: omp exited 0
  engine omp
  versions:
    omp omp/18.4.4
  commits:
    58683d3 Name the plant in greeting
  result:
    The greeting now prints `Hello, plant.` The only changed file is `greet.sh`.
    
    Check: `./greet.sh` printed `Hello, plant.`, and an exact-output check passed. Commit: `58683d3` (`Name the plant in greeting`). No remaining slice.
  finish-webhook:
    configured: no (this job sends no finish webhook)
    event: limen-finish-d3195daf3a9fbbd2d9ca7d7830383a1fb90c761908bad943620033c6b95bf190 (the ID the receiver uses to match this finish)
    handoff: Job done. Next step: land it, or name the check that still blocks landing.
    author: unavailable · ordinary email · commit 940852ec3a681f98ddef717a85baca989cec9d9c
    transport: unknown (no record that Limen sent the webhook to any target)
    bot-turn: unobserved (no trusted export shows that a receiving bot finished a turn for this event)
[exit 0]
```

```console
$ cat /tmp/f783-proof/plant/.limen/jobs/2026-10-06-f002-spec-keeper-35a9fb7d/task.md
Spec keeper for F002. Fix the ticket, board and map links for this work; commit on this branch.

Ticket: spec/features/active/F002-plant-greeting/ticket.md
Board: spec/build.md
Map: /private/tmp/f783-proof/plant/.limen/picture
Group: none
Candidate: limen/2026-10-06-f002-plant-greeting-f3e262a8 at 7977eca4205e2e4a7c6381778a43241444c8e1bb
Changed tickets: spec/features/active/F002-plant-greeting/ticket.md
Land check now:
  warn /private/tmp/f783-proof/plant/.limen/picture/features/limen.feature.f002.md: source "spec/features/planned/F002-plant-greeting/ticket.md" does not exist at limen/2026-10-06-f002-plant-greeting-f3e262a8; fix: change it to spec/features/active/F002-plant-greeting/ticket.md
  warn spec/build.md: no board line for F002; fix: add - `F002-plant-greeting` (🟠 ACTIVE): <one clause> under ## NOW
  error spec/features/active/F002-plant-greeting/ticket.md:3: unknown place id "limen.commandz"; fix: replace it with an id from limen picture build --json <file>

Job: 2026-10-06-f002-plant-greeting-f3e262a8
  Label: F002 plant greeting
  State: done
  Branch: limen/2026-10-06-f002-plant-greeting-f3e262a8 (base 940852ec3a681f98ddef717a85baca989cec9d9c, tip 7977eca4205e2e4a7c6381778a43241444c8e1bb)
  Worktree: /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-f3e262a8
  Session: /private/tmp/f783-proof/plant/.limen/jobs/2026-10-06-f002-plant-greeting-f3e262a8/session/2026-10-06T08-29-00-493Z_01a11054-92cd-7374-a334-a2b96dfc41d9.jsonl
  Task: /private/tmp/f783-proof/plant/.limen/jobs/2026-10-06-f002-plant-greeting-f3e262a8/task.md
```

### wait for 2026-10-06-f002-spec-keeper-35a9fb7d · limen e423ef1

```console
$ cd /tmp/f783-proof/plant && limen wait 2026-10-06-f002-spec-keeper-35a9fb7d
DONE spec keeper · F002 · id 2026-10-06-f002-spec-keeper-35a9fb7d
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && job_state 2026-10-06-f002-spec-keeper-35a9fb7d
state: done
[exit 0]
```

```console
$ cat .limen/jobs/2026-10-06-f002-spec-keeper-35a9fb7d/result
The greeting ticket’s spec links are fixed and committed as `273cbad` (`spec keeper: F002 links`).

- `spec/features/active/F002-plant-greeting/ticket.md`: replaced the unknown place id with `limen.commands`.
- `spec/build.md`: added the ticket under NOW as ACTIVE.
- Map file edited outside Git: `.limen/picture/features/limen.feature.f002.md` now cites the active ticket path.
- Warnings left: none. Strict picture check exit code: **0**. The final `limen ticket check` also exited **0**.

$ git diff 7977eca limen/keeper-f002-7977eca
diff --git a/spec/build.md b/spec/build.md
index 32ab8f3..f09c038 100644
--- a/spec/build.md
+++ b/spec/build.md
@@ -5,6 +5,7 @@
 - Throwaway plant for the F783 spec keeper proof.
 
 ## NOW
+- `F002-plant-greeting` (🟠 ACTIVE): the greeting names the plant.
 
 ## NEXT
 
diff --git a/spec/features/active/F002-plant-greeting/ticket.md b/spec/features/active/F002-plant-greeting/ticket.md
index b07deb5..2b0623d 100644
--- a/spec/features/active/F002-plant-greeting/ticket.md
+++ b/spec/features/active/F002-plant-greeting/ticket.md
@@ -1,6 +1,6 @@
 ---
 touches:
-  - limen.commandz
+  - limen.commands
 opened: 2026-10-06
 ---
 
```

### done wake text for 2026-10-06-f002-spec-keeper-35a9fb7d · limen e423ef1

```console
$ cd /tmp/f783-proof/plant && node --input-type=module -e import\ \{\ completionWake\ \}\ from\ \'/tmp/f783-proof/limen/src/job/wake-text.ts\'\;\ const\ job\ =\ \'/tmp/f783-proof/plant/.limen/jobs/2026-10-06-f002-spec-keeper-35a9fb7d\'\;\ console.log\(completionWake\(job\,\ \'2026-10-06-f002-spec-keeper-35a9fb7d\'\,\ \'done\'\,\ \'2026-10-06-f002-spec-keeper-35a9fb7d\'\,\ \'BRANCH\'\,\ \'\'\,\ false\)\)\;
Limen job "2026-10-06-f002-spec-keeper-35a9fb7d": Spec keeper for F002.
is done (2026-10-06-f002-spec-keeper-35a9fb7d) on branch BRANCH.

Commits:
273cbad spec keeper: F002 links

Final message:
The greeting ticket’s spec links are fixed and committed as `273cbad` (`spec keeper: F002 links`).

- `spec/features/active/F002-plant-greeting/ticket.md`: replaced the unknown place id with `limen.commands`.
- `spec/build.md`: added the ticket under NOW as ACTIVE.
- Map file edited outside Git: `.limen/picture/features/limen.feature.f002.md` now cites the active ticket path.
- Warnings left: none. Strict picture check exit code: **0**. The final `limen ticket check` also exited **0**.

Job done. Next step: land it, or name the check that still blocks landing. Done does not mean that review passed.

Inspect the job record, branch diff and commits, log/session, and relevant checks. Then land the work at the verified commit. If a check blocks landing, name that check and resume a focused fix. This is the spec keeper: land it, since it carries the work and the spec fixes. If it made no commit, land the original job. After it lands, continue with the next item on the board. Keep the user informed; ask only when genuine product ambiguity, a scope or risk tradeoff, or an irreversible action needs a human decision.
[exit 0]
```

### ticket check for limen/keeper-f002-7977eca · limen e423ef1

```console
$ cd /tmp/f783-proof/plant && limen ticket check limen/keeper-f002-7977eca
[exit 0]
```

### land 2026-10-06-f002-spec-keeper-35a9fb7d onto main · limen e423ef1

```console
$ cd /tmp/f783-proof/plant && git status --short --branch
## main
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && limen land 2026-10-06-f002-spec-keeper-35a9fb7d --yes
Updating 940852e..273cbad
Fast-forward
 greet.sh                                                        | 2 +-
 spec/build.md                                                   | 2 +-
 spec/features/{planned => active}/F002-plant-greeting/ticket.md | 0
 3 files changed, 2 insertions(+), 2 deletions(-)
 rename spec/features/{planned => active}/F002-plant-greeting/ticket.md (100%)
landed 2026-10-06-f002-spec-keeper-35a9fb7d onto main
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && git log --oneline -3
273cbad spec keeper: F002 links
7977eca F002: start work (proof: three broken links)
58683d3 Name the plant in greeting
[exit 0]
```

The worker branch keeps its own tip; the keeper committed only on its own branch.

```console
$ git log --oneline -1 limen/2026-10-06-f002-plant-greeting-f3e262a8
7977eca F002: start work (proof: three broken links)
$ git log --oneline -1 limen/keeper-f002-7977eca
273cbad spec keeper: F002 links
```

### check the three links on main · limen e423ef1

```console
$ cd /tmp/f783-proof/plant && git log --oneline -6
273cbad spec keeper: F002 links
7977eca F002: start work (proof: three broken links)
58683d3 Name the plant in greeting
940852e Throwaway plant for the F783 keeper proof
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && ls spec/features/planned spec/features/active
spec/features/active:
F002-plant-greeting

spec/features/planned:
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && sed -n 1,8p spec/features/active/F002-plant-greeting/ticket.md
---
touches:
  - limen.commands
opened: 2026-10-06
---

# F002 · The greeting names the plant
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && grep -n F002 spec/build.md
8:- `F002-plant-greeting` (🟠 ACTIVE): the greeting names the plant.
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && sed -n 1,20p /tmp/f783-proof/plant/.limen/picture/features/limen.feature.f002.md
---
schema: architecture-map/1
kind: feature
id: limen.feature.f002
project: limen
title: The greeting names the plant (F002)
status: partial
touches:
  - limen.commands
sources:
  - spec/features/active/F002-plant-greeting/ticket.md
  - greet.sh
---

The greeting script prints the plant name.
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && limen picture build --dir /tmp/f783-proof/plant/.limen/picture --out /tmp/f783-proof/map.html --strict
picture: 3 places, 0 edges; wrote /tmp/f783-proof/map.html
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && ./greet.sh
Hello, plant.
[exit 0]
```

### scaffold a new ticket on main · limen e423ef1

```console
$ cd /tmp/f783-proof/plant && limen ticket new 'The greeting takes a name' --touches limen.commands
spec/features/planned/F005-the-greeting-takes-a-name/ticket.md
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && git status --short
?? spec/features/planned/F005-the-greeting-takes-a-name/
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && limen picture build --dir /tmp/f783-proof/plant/.limen/picture --out /tmp/f783-proof/map.html --strict
picture: 3 places, 0 edges; wrote /tmp/f783-proof/map.html
[exit 0]
```
