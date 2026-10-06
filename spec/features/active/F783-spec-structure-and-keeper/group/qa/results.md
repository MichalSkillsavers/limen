# Team 4 · Live keeper proof on a throwaway plant

Result: the proof passed on the integrated build. A real job ran on a throwaway plant. I then broke three spec links on its branch. `limen land` refused the branch and printed the keeper command. A real keeper job fixed all three links in under a minute. The land of the keeper job then succeeded, and the strict check on `main` had no error and no warning.

Build under test: local branch `limen/f783-team-4-proof-2` at `dce7e21`, in the worktree `/tmp/f783-proof/limen`. It is the lead's integration branch at `2aaf43b` (teams 1 and 2 merged, lead fixes) plus team 3 at `2172c65`. I did not push it. The plant is `/tmp/f783-proof/plant`, made by `group/qa/proof.sh`. It has its own seat registry (`LIMEN_HOME`), no Herdr, and no group or job identity. Jobs on the plant call this build through a `limen` shim on `PATH`.

## What each step showed

| Ticket acceptance | Step | Real result |
| --- | --- | --- |
| A keeper never commits on the branch of a running job | `limen keeper` while the worker ran | Refused, exit 1: "job … is still running; a keeper never commits beside a live job; wait for it, or stop it". After the keeper ran, the worker branch tip was still `210ed5d`; the keeper commit `1c23853` is only on `limen/keeper-f002-210ed5d`. |
| Each strict ticket diagnostic names the file, the line and the fix | `limen picture build --dir <map> --strict` on the broken branch | `error ticket.unknown-touch spec/features/active/F002-plant-greeting/ticket.md:3: unknown place id "limen.commandz"; fix: replace it with an id from limen picture build --json <file>`, exit 1. |
| `limen land` refuses a branch whose tickets fail, and prints the keeper command | `limen land <worker job> --yes` | Refused, exit 1. It printed a map warning, a board warning, the error line, and `fix: limen keeper spec/features/active/F002-plant-greeting/ticket.md --job … --engine <engine> --provider <provider> --model <model> --thinking <level>`. `main` did not move. |
| A keeper repairs a broken front matter, a missing board line and a stale map source | `limen keeper <old planned path> --job <worker job> …`, the path the done wake prints | It printed "ticket moved: spec/features/planned/… -> spec/features/active/…" and started keeper `2026-10-06-f002-spec-keeper-c1885cc2` (Sol, low). The keeper made one commit, `spec keeper: F002 links`. It changed `limen.commandz` to `limen.commands`, added the `NOW` board line, and changed the map source outside Git to the active path. It changed no other line. |
| The land then succeeds | `limen land <keeper job> --yes` | `main` fast-forwarded to `1c23853` with the worker commit, the break commit and the keeper commit. Strict check exit 0, no diagnostic. `./greet.sh` prints `Hello, plant.` |
| A scaffolded ticket gets the next free number and passes strict with no edit | `limen ticket new "The greeting takes a name" --touches limen.commands` | It wrote `spec/features/planned/F005-the-greeting-takes-a-name/ticket.md`. F004 is the highest number, in `done/2026-09/`. Strict exit 0, no diagnostic. |
| Done wakes send the work to the keeper | `completionWake` for the worker and the keeper (`proof.sh wake`) | Worker wake: "start limen keeper spec/features/planned/F002-plant-greeting/ticket.md --job … --engine <engine> … and land the keeper job instead". Keeper wake: "This is the spec keeper: land it, since it carries the work and the spec fixes." |

Checks on the same build, with the group and job variables unset: `node --test --test-concurrency=1` on `test/land-command.test.ts`, `test/keeper-command.test.ts`, `test/ticket-command.test.ts`, `test/picture-tickets.test.ts` and `test/coordinator-wake.test.ts`: 24 tests, 24 pass. I did not run typecheck or Biome; this build has no `node_modules`, and the owning teams report both clean.

## What is still open

- **`limen ticket check` is not in this build.** `templates/keeper.md` and `templates/agents.md` name it. The keeper ran it as its last check and got the usage text, exit 1. It reported this in its final message. The lead plans to add the command at integration. Until then, the keeper's last step fails.
- **The worker wake still prints the task's old ticket path.** The command works, because `limen keeper` now follows a moved ticket. A reader who copies it must still fill in the four route flags.
- **The place-id fix text fails in a worktree.** The error says "replace it with an id from limen picture build --json <file>". In a job worktree that command exits 1 with "No map yet". The keeper did not need it, because it read the map nodes. Details are in `group/teams/team-4-review.md`.
- **Map edits do not land.** The keeper's map fix applied at once to the plant's map, outside Git. Nothing in Git records it, except the keeper's final message.

## How the breaks were made

The worker was told to change one line in `greet.sh`, and did. The three broken links are one scripted commit on the worker's branch after the worker finished (`proof.sh break`). It moves the ticket from `planned/` to `active/`, sets `touches` to the unknown id `limen.commandz`, and deletes the board line. The map still cites the `planned/` path. So the proof tests the keeper and the land gate, not whether a worker leaves links broken on its own.

## Runs

- Run 1 (`group/qa/run-1.md`): the same steps on the first team 2 and team 3 commits. It passed. It also found four problems that team 3 fixed before run 2 (`edbc18d`). A keeper's done wake asked for a keeper of the keeper. The worker wake's command had no route flags and a stale path. The packet told the keeper to start a keeper. A refusal named a role it had just refused.
- Run 2: below, verbatim from `/tmp/f783-proof/transcript.md`. The packet, the keeper result and the keeper diff were added to the same transcript by hand-run commands, shown with their output.

## Run 2 transcript

### setup (2026-10-06 10:20:57 CEST, limen package /tmp/f783-proof/limen at dce7e21) · limen dce7e21

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
265ae8f Throwaway plant for the F783 keeper proof
[exit 0]
```

Baseline strict check on main: expect no error and no warning.

```console
$ cd /tmp/f783-proof/plant && limen picture build --dir /tmp/f783-proof/plant/.limen/picture --out /tmp/f783-proof/map.html --strict
picture: 3 places, 0 edges; wrote /tmp/f783-proof/map.html
[exit 0]
```

### spawn: one small real job · limen dce7e21

```console
$ cd /tmp/f783-proof/plant && limen spawn --engine omp --provider openai-codex --model gpt-6-sol --thinking low --detached --timeout 10m --label 'F002 plant greeting' Implement\ F002:\ the\ greeting\ names\ the\ plant.\ Change\ the\ echo\ line\ in\ greet.sh\ so\ ./greet.sh\ prints\ \'Hello\,\ plant.\'\ and\ commit\ it.\ Change\ no\ other\ file.\ Ticket:\ spec/features/planned/F002-plant-greeting/ticket.md
started F002 plant greeting
2026-10-06-f002-plant-greeting-71cce8db
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && limen jobs --all
RUNNING F002 plant greeting · id 2026-10-06-f002-plant-greeting-71cce8db · branch limen/2026-10-06-f002-plant-greeting-71cce8db · elapsed 2s · silent 0s · think · tools 0 · pid 86512
  log:
  [limen 2026-10-06T08:21:04.928Z] worker started
  think
  engine omp
  versions:
    omp omp/18.4.4
[exit 0]
```

### keeper while the job runs: expect a refusal · limen dce7e21

```console
$ cd /tmp/f783-proof/plant && job_state 2026-10-06-f002-plant-greeting-71cce8db
state: running
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && limen keeper spec/features/planned/F002-plant-greeting/ticket.md --job 2026-10-06-f002-plant-greeting-71cce8db --engine omp --provider openai-codex --model gpt-6-sol --thinking low --timeout 10m
job 2026-10-06-f002-plant-greeting-71cce8db is still running; a keeper never commits beside a live job; wait for it, or stop it
[exit 1]
```

### wait for 2026-10-06-f002-plant-greeting-71cce8db · limen dce7e21

```console
$ cd /tmp/f783-proof/plant && limen wait 2026-10-06-f002-plant-greeting-71cce8db
DONE F002 plant greeting · id 2026-10-06-f002-plant-greeting-71cce8db
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && job_state 2026-10-06-f002-plant-greeting-71cce8db
state: done
[exit 0]
```

### break three links on the branch of 2026-10-06-f002-plant-greeting-71cce8db (worktree /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-71cce8db) · limen dce7e21

```console
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-71cce8db && git log --oneline 265ae8f76651c6c04529504cb3ad4e0870a09d78..HEAD
d08a296 Name plant in greeting
[exit 0]
```

```console
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-71cce8db && git mv spec/features/planned/F002-plant-greeting spec/features/active/F002-plant-greeting
[exit 0]
```

```console
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-71cce8db && git add -A
[exit 0]
```

```console
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-71cce8db && git commit -q -m 'F002: start work (proof: three broken links)'
[exit 0]
```

```console
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-71cce8db && git show --stat '--format=%h %s' HEAD
210ed5d F002: start work (proof: three broken links)

 spec/build.md                                                   | 1 -
 spec/features/{planned => active}/F002-plant-greeting/ticket.md | 2 +-
 2 files changed, 1 insertion(+), 2 deletions(-)
[exit 0]
```

```console
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-71cce8db && git diff 'HEAD~1' -- spec/features/active/F002-plant-greeting/ticket.md spec/build.md
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
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-71cce8db && grep -n F002 /tmp/f783-proof/plant/.limen/picture/features/limen.feature.f002.md
6:title: The greeting names the plant (F002)
11:  - spec/features/planned/F002-plant-greeting/ticket.md
[exit 0]
```

Strict check on the job branch: expect ticket.unknown-touch (error) and source.missing (warning).

```console
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-71cce8db && limen picture build --dir /tmp/f783-proof/plant/.limen/picture --out /tmp/f783-proof/map.html --strict
warn source.missing features/limen.feature.f002.md:10: source "spec/features/planned/F002-plant-greeting/ticket.md" does not exist in the project root
error ticket.unknown-touch spec/features/active/F002-plant-greeting/ticket.md:3: unknown place id "limen.commandz"; fix: replace it with an id from limen picture build --json <file>
picture: 3 places, 0 edges; wrote /tmp/f783-proof/map.html
[exit 1]
```

### done wake text for 2026-10-06-f002-plant-greeting-71cce8db · limen dce7e21

```console
$ cd /tmp/f783-proof/plant && node --input-type=module -e import\ \{\ completionWake\ \}\ from\ \'/tmp/f783-proof/limen/src/job/wake-text.ts\'\;\ const\ job\ =\ \'/tmp/f783-proof/plant/.limen/jobs/2026-10-06-f002-plant-greeting-71cce8db\'\;\ console.log\(completionWake\(job\,\ \'2026-10-06-f002-plant-greeting-71cce8db\'\,\ \'done\'\,\ \'2026-10-06-f002-plant-greeting-71cce8db\'\,\ \'BRANCH\'\,\ \'\'\,\ false\)\)\;
Limen job "2026-10-06-f002-plant-greeting-71cce8db": Implement F002: the greeting names the plant.
is done (2026-10-06-f002-plant-greeting-71cce8db) on branch BRANCH.

Commits:
d08a296 Name plant in greeting

Final message:
The plant greeting now prints `Hello, plant.` from `./greet.sh`. Only the echo line in `greet.sh` changed.

Check: `./greet.sh` printed `Hello, plant.` before and after the commit. Commit: `d08a296` (`Name plant in greeting`). No remaining slice.

Job done. Next step: land it, or name the check that still blocks landing. Done does not mean that review passed.

Inspect the job record, branch diff and commits, log/session, and relevant checks. Then land the work at the verified commit. If a check blocks landing, name that check and resume a focused fix. If it added, moved or changed a ticket, start limen keeper spec/features/planned/F002-plant-greeting/ticket.md --job 2026-10-06-f002-plant-greeting-71cce8db --engine <engine> --provider <provider> --model <model> --thinking <level> and land the keeper job instead. After it lands, continue with the next item on the board. Keep the user informed; ask only when genuine product ambiguity, a scope or risk tradeoff, or an irreversible action needs a human decision.
[exit 0]
```

### land 2026-10-06-f002-plant-greeting-71cce8db onto main · limen dce7e21

```console
$ cd /tmp/f783-proof/plant && git status --short --branch
## main
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && limen land 2026-10-06-f002-plant-greeting-71cce8db --yes
land refused: limen/2026-10-06-f002-plant-greeting-71cce8db has tickets that fail the strict check
warn /private/tmp/f783-proof/plant/.limen/picture/features/limen.feature.f002.md: source "spec/features/planned/F002-plant-greeting/ticket.md" does not exist at limen/2026-10-06-f002-plant-greeting-71cce8db; fix: change it to spec/features/active/F002-plant-greeting/ticket.md
warn spec/build.md: no board line for F002; fix: add - `F002-plant-greeting` (🟠 ACTIVE): <one clause> under ## NOW
error spec/features/active/F002-plant-greeting/ticket.md:3: unknown place id "limen.commandz"; fix: replace it with an id from limen picture build --json <file>
fix: limen keeper spec/features/active/F002-plant-greeting/ticket.md --job 2026-10-06-f002-plant-greeting-71cce8db --engine <engine> --provider <provider> --model <model> --thinking <level>
[exit 1]
```

```console
$ cd /tmp/f783-proof/plant && git log --oneline -3
265ae8f Throwaway plant for the F783 keeper proof
[exit 0]
```

### keeper for 2026-10-06-f002-plant-greeting-71cce8db · limen dce7e21

```console
$ cd /tmp/f783-proof/plant && limen keeper spec/features/planned/F002-plant-greeting/ticket.md --job 2026-10-06-f002-plant-greeting-71cce8db --engine omp --provider openai-codex --model gpt-6-sol --thinking low --timeout 10m
ticket moved: spec/features/planned/F002-plant-greeting/ticket.md -> spec/features/active/F002-plant-greeting/ticket.md
started spec keeper · F002
2026-10-06-f002-spec-keeper-c1885cc2
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && limen jobs --all
RUNNING spec keeper · F002 · id 2026-10-06-f002-spec-keeper-c1885cc2 · branch limen/keeper-f002-210ed5d · elapsed 2s · silent 0s · think · tools 0 · pid 10708
  diff:
  greet.sh                                                        | 2 +-
   spec/build.md                                                   | 1 -
   spec/features/{planned => active}/F002-plant-greeting/ticket.md | 2 +-
   3 files changed, 2 insertions(+), 3 deletions(-)
  log:
  [limen 2026-10-06T08:22:11.899Z] worker started
  think
  engine omp
  versions:
    omp omp/18.4.4

DONE F002 plant greeting · id 2026-10-06-f002-plant-greeting-71cce8db · branch limen/2026-10-06-f002-plant-greeting-71cce8db · elapsed 49s · silent 0s · tools 8 · bash
  diff:
  greet.sh                                                        | 2 +-
   spec/build.md                                                   | 1 -
   spec/features/{planned => active}/F002-plant-greeting/ticket.md | 2 +-
   3 files changed, 2 insertions(+), 3 deletions(-)
  log:
  think
  edit
  wait
  think
  bash ./greet.sh
  wait
  think
  bash git add -- greet.sh && git commit -m 'Name plant in greeting'
  wait
  think
  read spec/build.md
  bash ./greet.sh
  wait
  think
  wait
  think
  The plant greeting now prints `Hello, plant.` from `./greet.sh`. Only the echo line in `greet.sh` changed.
  
  Check: `./greet.sh` printed `Hello, plant.` before and after the commit. Commit: `d08a296` (`Name plant in greeting`). No remaining slice.
  [limen 2026-10-06T08:21:52.437Z] done: omp exited 0
  engine omp
  versions:
    omp omp/18.4.4
  commits:
    d08a296 Name plant in greeting
  result:
    The plant greeting now prints `Hello, plant.` from `./greet.sh`. Only the echo line in `greet.sh` changed.
    
    Check: `./greet.sh` printed `Hello, plant.` before and after the commit. Commit: `d08a296` (`Name plant in greeting`). No remaining slice.
  finish-webhook:
    configured: no (this job sends no finish webhook)
    event: limen-finish-2181a1d146a1fc625d0130cca74b8320d40d2f1a7b6110872e315652d3253499 (the ID the receiver uses to match this finish)
    handoff: Job done. Next step: land it, or name the check that still blocks landing.
    author: unavailable · ordinary email · commit 265ae8f76651c6c04529504cb3ad4e0870a09d78
    transport: unknown (no record that Limen sent the webhook to any target)
    bot-turn: unobserved (no trusted export shows that a receiving bot finished a turn for this event)
[exit 0]
```

```console
$ cat /tmp/f783-proof/plant/.limen/jobs/2026-10-06-f002-spec-keeper-c1885cc2/task.md
Spec keeper for F002. Fix the ticket, board and map links for this work; commit on this branch.

Ticket: spec/features/active/F002-plant-greeting/ticket.md
Board: spec/build.md
Map: /private/tmp/f783-proof/plant/.limen/picture
Group: none
Candidate: limen/2026-10-06-f002-plant-greeting-71cce8db at 210ed5d0d041d929b8818d96143ae66e1d59a91c
Changed tickets: spec/features/active/F002-plant-greeting/ticket.md
Land check now:
  warn /private/tmp/f783-proof/plant/.limen/picture/features/limen.feature.f002.md: source "spec/features/planned/F002-plant-greeting/ticket.md" does not exist at limen/2026-10-06-f002-plant-greeting-71cce8db; fix: change it to spec/features/active/F002-plant-greeting/ticket.md
  warn spec/build.md: no board line for F002; fix: add - `F002-plant-greeting` (🟠 ACTIVE): <one clause> under ## NOW
  error spec/features/active/F002-plant-greeting/ticket.md:3: unknown place id "limen.commandz"; fix: replace it with an id from limen picture build --json <file>

Job: 2026-10-06-f002-plant-greeting-71cce8db
  Label: F002 plant greeting
  State: done
  Branch: limen/2026-10-06-f002-plant-greeting-71cce8db (base 265ae8f76651c6c04529504cb3ad4e0870a09d78, tip 210ed5d0d041d929b8818d96143ae66e1d59a91c)
  Worktree: /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-71cce8db
  Session: /private/tmp/f783-proof/plant/.limen/jobs/2026-10-06-f002-plant-greeting-71cce8db/session/2026-10-06T08-21-05-142Z_01a1104d-51f6-7000-9783-fa8a16c5ecb4.jsonl
  Task: /private/tmp/f783-proof/plant/.limen/jobs/2026-10-06-f002-plant-greeting-71cce8db/task.md
```

### wait for 2026-10-06-f002-spec-keeper-c1885cc2 · limen dce7e21

```console
$ cd /tmp/f783-proof/plant && limen wait 2026-10-06-f002-spec-keeper-c1885cc2
DONE spec keeper · F002 · id 2026-10-06-f002-spec-keeper-c1885cc2
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && job_state 2026-10-06-f002-spec-keeper-c1885cc2
state: done
[exit 0]
```

```console
$ cat .limen/jobs/2026-10-06-f002-spec-keeper-c1885cc2/result
The greeting ticket’s spec links are fixed and committed as `1c23853` (`spec keeper: F002 links`).

- `spec/features/active/F002-plant-greeting/ticket.md`: replaced the unknown place ID with `limen.commands`.
- `spec/build.md`: added the single ACTIVE line under NOW.
- Outside Git, `/private/tmp/f783-proof/plant/.limen/picture/features/limen.feature.f002.md`: updated the source to the ticket’s active path.

The strict picture check exited **0** with no warnings. The final `limen ticket check` exited **1**: this installed CLI exposes only `limen ticket new`, so it printed usage instead of running a land check.

$ git diff --stat 210ed5d limen/keeper-f002-210ed5d
 spec/build.md                                      | 2 ++
 spec/features/active/F002-plant-greeting/ticket.md | 2 +-
 2 files changed, 3 insertions(+), 1 deletion(-)
$ git diff 210ed5d limen/keeper-f002-210ed5d
diff --git a/spec/build.md b/spec/build.md
index 32ab8f3..7abcb85 100644
--- a/spec/build.md
+++ b/spec/build.md
@@ -6,6 +6,8 @@
 
 ## NOW
 
+- `F002-plant-greeting` (🟠 ACTIVE): the greeting names the plant.
+
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

### done wake text for 2026-10-06-f002-spec-keeper-c1885cc2 · limen dce7e21

```console
$ cd /tmp/f783-proof/plant && node --input-type=module -e import\ \{\ completionWake\ \}\ from\ \'/tmp/f783-proof/limen/src/job/wake-text.ts\'\;\ const\ job\ =\ \'/tmp/f783-proof/plant/.limen/jobs/2026-10-06-f002-spec-keeper-c1885cc2\'\;\ console.log\(completionWake\(job\,\ \'2026-10-06-f002-spec-keeper-c1885cc2\'\,\ \'done\'\,\ \'2026-10-06-f002-spec-keeper-c1885cc2\'\,\ \'BRANCH\'\,\ \'\'\,\ false\)\)\;
Limen job "2026-10-06-f002-spec-keeper-c1885cc2": Spec keeper for F002.
is done (2026-10-06-f002-spec-keeper-c1885cc2) on branch BRANCH.

Commits:
1c23853 spec keeper: F002 links

Final message:
The greeting ticket’s spec links are fixed and committed as `1c23853` (`spec keeper: F002 links`).

- `spec/features/active/F002-plant-greeting/ticket.md`: replaced the unknown place ID with `limen.commands`.
- `spec/build.md`: added the single ACTIVE line under NOW.
- Outside Git, `/private/tmp/f783-proof/plant/.limen/picture/features/limen.feature.f002.md`: updated the source to the ticket’s active path.

The strict picture check exited **0** with no warnings. The final `limen ticket check` exited **1**: this installed CLI exposes only `limen ticket new`, so it printed usage instead of running a land check.

Job done. Next step: land it, or name the check that still blocks landing. Done does not mean that review passed.

Inspect the job record, branch diff and commits, log/session, and relevant checks. Then land the work at the verified commit. If a check blocks landing, name that check and resume a focused fix. This is the spec keeper: land it, since it carries the work and the spec fixes. If it made no commit, land the original job. After it lands, continue with the next item on the board. Keep the user informed; ask only when genuine product ambiguity, a scope or risk tradeoff, or an irreversible action needs a human decision.
[exit 0]
```

### land 2026-10-06-f002-spec-keeper-c1885cc2 onto main · limen dce7e21

```console
$ cd /tmp/f783-proof/plant && git status --short --branch
## main
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && limen land 2026-10-06-f002-spec-keeper-c1885cc2 --yes
Updating 265ae8f..1c23853
Fast-forward
 greet.sh                                                        | 2 +-
 spec/build.md                                                   | 3 ++-
 spec/features/{planned => active}/F002-plant-greeting/ticket.md | 0
 3 files changed, 3 insertions(+), 2 deletions(-)
 rename spec/features/{planned => active}/F002-plant-greeting/ticket.md (100%)
landed 2026-10-06-f002-spec-keeper-c1885cc2 onto main
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && git log --oneline -3
1c23853 spec keeper: F002 links
210ed5d F002: start work (proof: three broken links)
d08a296 Name plant in greeting
[exit 0]
```

### check the three links on main · limen dce7e21

```console
$ cd /tmp/f783-proof/plant && git log --oneline -6
1c23853 spec keeper: F002 links
210ed5d F002: start work (proof: three broken links)
d08a296 Name plant in greeting
265ae8f Throwaway plant for the F783 keeper proof
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
9:- `F002-plant-greeting` (🟠 ACTIVE): the greeting names the plant.
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

The worker branch keeps its own tip; the keeper committed only on its own branch.

```console
$ git log --oneline -1 limen/2026-10-06-f002-plant-greeting-71cce8db
210ed5d F002: start work (proof: three broken links)
$ git log --oneline -1 limen/keeper-f002-210ed5d
1c23853 spec keeper: F002 links
```

### scaffold a new ticket on main · limen dce7e21

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
