# Run 1 · trial on the first team 2 and team 3 commits

Verbatim transcript from `proof.sh`. Steps setup to keeper-early ran on proof commit 79e445a; I merged the team 3 worker f2dcf35 (board and map warnings) as ec149cc before the land step. Not the final integrated build: no `limen ticket new`, no `limen ticket check`, no team 2 `fix:` diagnostics.

## setup (2026-10-06 10:08:58 CEST, limen package /tmp/f783-proof/limen at 79e445a)

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
026b435 Throwaway plant for the F783 keeper proof
[exit 0]
```

Baseline strict check on main: expect no error and no warning.

```console
$ cd /tmp/f783-proof/plant && limen picture build --dir /tmp/f783-proof/plant/.limen/picture --out /tmp/f783-proof/map.html --strict
picture: 3 places, 0 edges; wrote /tmp/f783-proof/map.html
[exit 0]
```

## spawn: one small real job

```console
$ cd /tmp/f783-proof/plant && limen spawn --engine omp --provider openai-codex --model gpt-6-sol --thinking low --detached --timeout 10m --label 'F002 plant greeting' Implement\ F002:\ the\ greeting\ names\ the\ plant.\ Change\ the\ echo\ line\ in\ greet.sh\ so\ ./greet.sh\ prints\ \'Hello\,\ plant.\'\ and\ commit\ it.\ Change\ no\ other\ file.\ Ticket:\ spec/features/planned/F002-plant-greeting/ticket.md
started F002 plant greeting
2026-10-06-f002-plant-greeting-37515160
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && limen jobs --all
RUNNING F002 plant greeting · id 2026-10-06-f002-plant-greeting-37515160 · branch limen/2026-10-06-f002-plant-greeting-37515160 · elapsed 1s · silent 0s · think · tools 0 · pid 95270
  log:
  [limen 2026-10-06T08:09:01.725Z] worker started
  engine omp
  versions:
    omp omp/18.4.4
[exit 0]
```

## keeper while the job runs: expect a refusal

```console
$ cd /tmp/f783-proof/plant && job_state 2026-10-06-f002-plant-greeting-37515160
state: running
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && limen keeper spec/features/planned/F002-plant-greeting/ticket.md --job 2026-10-06-f002-plant-greeting-37515160 --engine omp --provider openai-codex --model gpt-6-sol --thinking low --timeout 10m
job 2026-10-06-f002-plant-greeting-37515160 is still running; a keeper never commits beside a live job; wait for it, or stop it
[exit 1]
```

## wait for 2026-10-06-f002-plant-greeting-37515160

```console
$ cd /tmp/f783-proof/plant && limen wait 2026-10-06-f002-plant-greeting-37515160
DONE F002 plant greeting · id 2026-10-06-f002-plant-greeting-37515160
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && job_state 2026-10-06-f002-plant-greeting-37515160
state: done
[exit 0]
```

## break three links on the branch of 2026-10-06-f002-plant-greeting-37515160 (worktree /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-37515160)

```console
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-37515160 && git log --oneline 026b43560277ebcaab8b9eaaf2f5073b00ede5fd..HEAD
4e12184 Name plant in greeting
[exit 0]
```

```console
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-37515160 && git mv spec/features/planned/F002-plant-greeting spec/features/active/F002-plant-greeting
[exit 0]
```

```console
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-37515160 && git add -A
[exit 0]
```

```console
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-37515160 && git commit -q -m 'F002: start work (proof: three broken links)'
[exit 0]
```

```console
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-37515160 && git show --stat '--format=%h %s' HEAD
5fc9afb F002: start work (proof: three broken links)

 spec/build.md                                                   | 1 -
 spec/features/{planned => active}/F002-plant-greeting/ticket.md | 2 +-
 2 files changed, 1 insertion(+), 2 deletions(-)
[exit 0]
```

```console
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-37515160 && git diff 'HEAD~1' -- spec/features/active/F002-plant-greeting/ticket.md spec/build.md
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
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-37515160 && grep -n F002 /tmp/f783-proof/plant/.limen/picture/features/limen.feature.f002.md
6:title: The greeting names the plant (F002)
11:  - spec/features/planned/F002-plant-greeting/ticket.md
[exit 0]
```

Strict check on the job branch: expect ticket.unknown-touch (error) and source.missing (warning).

```console
$ cd /private/tmp/f783-proof/.plant-limen-worktrees/2026-10-06-f002-plant-greeting-37515160 && limen picture build --dir /tmp/f783-proof/plant/.limen/picture --out /tmp/f783-proof/map.html --strict
warn source.missing features/limen.feature.f002.md:10: source "spec/features/planned/F002-plant-greeting/ticket.md" does not exist in the project root
error ticket.unknown-touch spec/features/active/F002-plant-greeting/ticket.md:3: unknown place id "limen.commandz"
picture: 3 places, 0 edges; wrote /tmp/f783-proof/map.html
[exit 1]
```

## land 2026-10-06-f002-plant-greeting-37515160 onto main

```console
$ cd /tmp/f783-proof/plant && git status --short --branch
## main
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && limen land 2026-10-06-f002-plant-greeting-37515160 --yes
land refused: limen/2026-10-06-f002-plant-greeting-37515160 has tickets that fail the strict check
warn /private/tmp/f783-proof/plant/.limen/picture/features/limen.feature.f002.md: source "spec/features/planned/F002-plant-greeting/ticket.md" does not exist at limen/2026-10-06-f002-plant-greeting-37515160; fix: change it to spec/features/active/F002-plant-greeting/ticket.md
warn spec/build.md: no board line for F002; fix: add - `F002-plant-greeting` (🟠 ACTIVE): <one clause> under ## NOW
spec/features/active/F002-plant-greeting/ticket.md:3: unknown place id "limen.commandz"
fix: limen keeper spec/features/active/F002-plant-greeting/ticket.md --job 2026-10-06-f002-plant-greeting-37515160 --engine <engine> --provider <provider> --model <model> --thinking <level>
[exit 1]
```

```console
$ cd /tmp/f783-proof/plant && git log --oneline -3
026b435 Throwaway plant for the F783 keeper proof
[exit 0]
```

## keeper for 2026-10-06-f002-plant-greeting-37515160

```console
$ cd /tmp/f783-proof/plant && limen keeper spec/features/active/F002-plant-greeting/ticket.md --job 2026-10-06-f002-plant-greeting-37515160 --engine omp --provider openai-codex --model gpt-6-sol --thinking low --timeout 10m
started spec keeper · F002
2026-10-06-f002-spec-keeper-cd6ba589
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && limen jobs --all
RUNNING spec keeper · F002 · id 2026-10-06-f002-spec-keeper-cd6ba589 · branch limen/keeper-f002-5fc9afb · elapsed 1s · silent 0s · think · tools 0 · pid 5289
  diff:
  greet.sh                                                        | 2 +-
   spec/build.md                                                   | 1 -
   spec/features/{planned => active}/F002-plant-greeting/ticket.md | 2 +-
   3 files changed, 2 insertions(+), 3 deletions(-)
  log:
  [limen 2026-10-06T08:09:48.468Z] worker started
  engine omp
  versions:
    omp omp/18.4.4

DONE F002 plant greeting · id 2026-10-06-f002-plant-greeting-37515160 · branch limen/2026-10-06-f002-plant-greeting-37515160 · elapsed 22s · silent 0s · tools 8 · bash
  diff:
  greet.sh                                                        | 2 +-
   spec/build.md                                                   | 1 -
   spec/features/{planned => active}/F002-plant-greeting/ticket.md | 2 +-
   3 files changed, 2 insertions(+), 3 deletions(-)
  log:
  wait
  think
  wait
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
  bash ./greet.sh
  wait
  think
  The greeting now prints `Hello, plant.` Only the echo line in `greet.sh` changed.
  
  Check: `./greet.sh` printed `Hello, plant.` after the commit. Commit: `4e12184` (`Name plant in greeting`). No slice remains; the next worker can use that commit.
  [limen 2026-10-06T08:09:23.433Z] done: omp exited 0
  engine omp
  versions:
    omp omp/18.4.4
  commits:
    4e12184 Name plant in greeting
  result:
    The greeting now prints `Hello, plant.` Only the echo line in `greet.sh` changed.
    
    Check: `./greet.sh` printed `Hello, plant.` after the commit. Commit: `4e12184` (`Name plant in greeting`). No slice remains; the next worker can use that commit.
  finish-webhook:
    configured: no (this job sends no finish webhook)
    event: limen-finish-7093234d12a45387185688fa1e656eefcbad9296309c353bdbdce190d854c4e8 (the ID the receiver uses to match this finish)
    handoff: Job done. Next step: land it, or name the check that still blocks landing.
    author: unavailable · ordinary email · commit 026b43560277ebcaab8b9eaaf2f5073b00ede5fd
    transport: unknown (no record that Limen sent the webhook to any target)
    bot-turn: unobserved (no trusted export shows that a receiving bot finished a turn for this event)
[exit 0]
```

## wait for 2026-10-06-f002-spec-keeper-cd6ba589

```console
$ cd /tmp/f783-proof/plant && limen wait 2026-10-06-f002-spec-keeper-cd6ba589
DONE spec keeper · F002 · id 2026-10-06-f002-spec-keeper-cd6ba589
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && job_state 2026-10-06-f002-spec-keeper-cd6ba589
state: done
[exit 0]
```

## land 2026-10-06-f002-spec-keeper-cd6ba589 onto main

```console
$ cd /tmp/f783-proof/plant && git status --short --branch
## main
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && limen land 2026-10-06-f002-spec-keeper-cd6ba589 --yes
Updating 026b435..73c7649
Fast-forward
 greet.sh                                                        | 2 +-
 spec/build.md                                                   | 3 ++-
 spec/features/{planned => active}/F002-plant-greeting/ticket.md | 0
 3 files changed, 3 insertions(+), 2 deletions(-)
 rename spec/features/{planned => active}/F002-plant-greeting/ticket.md (100%)
landed 2026-10-06-f002-spec-keeper-cd6ba589 onto main
[exit 0]
```

```console
$ cd /tmp/f783-proof/plant && git log --oneline -3
73c7649 spec keeper: F002 links
5fc9afb F002: start work (proof: three broken links)
4e12184 Name plant in greeting
[exit 0]
```

## check the three links on main

```console
$ cd /tmp/f783-proof/plant && git log --oneline -6
73c7649 spec keeper: F002 links
5fc9afb F002: start work (proof: three broken links)
4e12184 Name plant in greeting
026b435 Throwaway plant for the F783 keeper proof
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
