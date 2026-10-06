# Team 2 · The from-scratch test set

Author: team-2 worker (job `2026-10-06-f925-team-2-design-502a23e2`). Read-only run: no test was added, changed or deleted. Every time below names its load average (`uptime`); the Mac ran at load 67 to 129 during this work, so every measured time is an upper bound.

## 1. Verdict from the design side

The from-scratch set is one shared fixture, ten scenarios on a throwaway plant, and eight small unit files. It is about **3,300 lines** (today 17,094) and runs in about **4 minutes serial** (estimate range 2.5 to 6.5 minutes at load 70 to 125) or **about 1.5 minutes with four files at a time**. The hypothesis of 2,500 lines is 30% low; "under 3 minutes" holds only with four-way concurrency. Calendar time to reach it on this plant: about 1.5 working days [estimate, section 5]. For the decision this means **staged replace, seam by seam, done fast**: build the fixture first, then land each scenario together with the deletion of the files it replaces and the anti-bloat gate in the first landing. Each of five historical regressions must first fail on its pre-fix commit (closed list in section 8b). A full restart (delete all, then rebuild) leaves the plant with no guard for a day or more and gains nothing, because the old and new files share no code.

## 2. The shared fixture

One file, `test/plant.ts`, replaces `test/scratch.ts` (195 lines). Estimated size: 260 lines. It gives every scenario five things.

1. **A throwaway plant.** A temp Git repo (real path, because macOS `tmpdir` is a `/var` symlink and Git reports `/private/var`; test/scratch.ts line 17; the bug fixed in `76d87fb`) with one commit, `limen init` run and committed, `.limen/` ignored, a committed `spec/features/active/F001-demo/ticket.md`, and one `.limen/picture/nodes/` place file so `ticket check` has a place id. Today `scratchRepo` (test/scratch.ts lines 15-24) makes only the repo, and each test runs `init` itself. `bin/limen-group-fixture.mjs` (73 lines) builds the same kind of plant for a live group proof and calls `initCommand` directly (line 22).
2. **An allowlisted environment.** The child env is built from nothing. Exact allowlist: `PATH` (fake bin, then the directory of `process.execPath`, then `/usr/bin:/bin`), `HOME` (a temp dir inside the plant parent, so no `~/.omp` or `~/.pi` config is read), `TMPDIR`, `LIMEN_HOME` (plant parent), `LIMEN_HERDR=0` (or the fake Herdr path in S2), `LIMEN_HUNK=0`, `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_CONFIG_NOSYSTEM=1`. A scenario adds variables only by name (`PI_SESSION_ID`, `LIMEN_COORDINATOR`, `NODE_OPTIONS` for the webhook sink). Today `runLimen` copies `process.env` and deletes 45 names (test/scratch.ts lines 70-115). That list misses `LIMEN_GROUP_ID` and `LIMEN_TEAM_ID`. Checked: inside this group job, `node --test test/keeper-command.test.ts` fails 2/2 with `missing job id in ""`; with `env -u LIMEN_GROUP_ID -u LIMEN_TEAM_ID` it passes 2/2 in 42.5 s (12:29, load 89 to 72). The F776 notes record the same class of failure with `LIMEN_OMP`: a leaked variable launched the real `omp` with a real model (spec/features/active/F776-trim-low-signal-tests/notes.md, section "Red tests on main"). A denylist breaks each time the product adds a variable.
3. **One fake engine with a script.** One `pi`/`omp` shim on `PATH`. It answers `--version` and `config get` like today's `writeFakePi` (test/scratch.ts lines 168-180). It reads its script from the task text: `commit`, `fail <code>`, `error-after-commit` (emits an assistant stop reason `error`), `block` (opens a FIFO and waits for one line), `spawn-orphan` (forks a detached grandchild), `say <text>`. It writes argv, the names of `LIMEN_*`/`HERDR_*`/`PI_*` variables, and the task bytes to the job dir. It loads every `--extension <path>` the product passes (src/runtime/wrapper.ts line 93: `steering.ts`, `communication.ts`, and `group-peer.ts` for group members) through a 30-line fake extension API (`on`, `sendUserMessage`) and fires `session_start`, `before_agent_start`, `turn_end` and `session_shutdown`. `test/steer-command.test.ts` lines 13-42 do this for one test; the fixture makes it the default. Today `spawn-command.test.ts` alone defines 27 fake engines (27 `scratchRepo(` calls with a custom engine).
4. **A webhook sink.** The helper `bin/tony-finish-ping.sh` refuses a URL that is not `https:` (line 66), so a plain `http://127.0.0.1` server cannot receive a real ping. The seam the product offers is a fetch preload: `NODE_OPTIONS=--import=<preload>` replaces `globalThis.fetch` and appends each request as one JSON line to a file (test/finish-webhook-helper.test.ts lines 20-52 already do this). The fixture writes `.limen/finish-webhook.env` (found by `finishWebhookEnv`, src/integrations/finish-webhook.ts line 30; `LIMEN_FINISH_WEBHOOK_ENV` overrides it) and the preload. "Zero requests" means the sink file has zero lines.
5. **A fake Herdr, only in S2.** `LIMEN_HERDR=<path>` selects the Herdr binary and `0` turns it off (src/integrations/herdr.ts lines 489-491). The fake is about 80 lines: it records each call, runs the pane command as a child process, and answers `agent get` from a state file the test edits. Hosted is the default spawn path whenever Herdr runs, so leaving it out would leave the most-used path untested. The risk of the fake: it can drift from real Herdr. The answer is one manual hosted smoke run with real Herdr when the set is built (team-3 point, section 9), not more fake detail.

**Waiting without timers.** A scenario never sleeps. It waits on product events.

- Job end: `limen wait <id>` blocks until the state is terminal (src/commands/wait.ts: `fs.watch` on the job dir at line 41, with a 1-second fallback interval at line 23). One process exit replaces `waitForState`, which polls the state file every 25 ms against a 10-second wall-clock deadline (test/scratch.ts lines 137-151) and is called 166 times today.
- Engine progress: the fake engine writes a marker file; the test waits on it with `fs.watch`, bounded only by the `node --test` timeout.
- A blocked engine or a blocked prepare step: a FIFO. The fake engine (or a `LIMEN_PREPARE` script, which runs in the worktree before the engine, src/commands/spawn.ts line 219) blocks reading the FIFO; the test releases it with one write. No timer on either side.
- Absence ("no second wake", "no ping"): order it behind a later positive event. Example: job A ends, then job B ends; once B's wake arrives, A's wake count must still be 1. The wake hook sweeps in order every 500 ms (hook/wake.ts line 567), so B's wake is a barrier for A.
- Age: claim and lock staleness is measured from file mtime (`statSync(claim).mtimeMs`, src/job/wake-delivery.ts lines 88 and 91; lock age in src/job/group-cabinet.ts line 71). The test sets an old mtime with `fs.utimes`; it never waits 30 seconds.

**Seams that offer only a wall clock today.** Three.

- Detached timeout: `--timeout` is real time. S3 uses `--timeout 1s` once on a blocked engine. Cost: about 1 s.
- Hosted uncertainty: `HOSTED_UNCERTAINTY_MS` is a constant (imported by hook/wake.ts line 32), not an env override. The set does not test it; see section 8b for the accepted risk.
- Group launch-lock deadline: `groupLock` sets `Date.now() + 10_000` in process (src/job/group-cabinet.ts line 61). The fix in `b62b837` lets a sibling wait past it; its test holds the lock with a Git post-checkout hook for 12 s and asserts more than 10 s passed (test/group-command.test.ts line 845). A barrier released early cannot prove the old deadline is gone (team-3 finding 00000020). Two options: (a) keep one 12-second hold in S8; (b) a small product change: an env override for the lock deadline (the fixture sets about 200 ms; the hook holds past it). A short window can only cause a false pass under load, never a random failure. The plan picks (b) as a follow-up product change and keeps (a) until it lands. The `src/` change is out of scope for this run.

## 3. Scenario stories

Ten scenarios, one file each, `test/s<N>-<seam>.test.ts`. Line and time estimates use the method in section 5; "RT" is one spawn-and-wait round trip.

**S1 · Spawn, detached.** About 230 lines, 3 RT, 8 calls. Setup: plant with committed F001 ticket. Commands: `limen spawn --detached --label "F001 demo" "commit"`; while it blocks, set an old mtime on a tracked file in its worktree and run `limen jobs` and `limen status`; release; `limen wait <id>`; `limen jobs <id>`; one workspace spawn (two child repos); four refusals: an uncommitted ticket, `--role coordinator`, `--engine claude`, and `--engine pi` with no `pi` on `PATH`. Checks: worktree on branch `limen/<id>` from the base commit; `task.md` holds the exact bytes; argv is the omp detached argv; the engine env has no `HERDR_*` or `PI_SESSION_*`; `.git/index` of the worktree is byte-identical and no `index.lock` appeared during `jobs`/`status`; state `done`, result text and one commit in `jobs`; each refusal exits 1 and leaves no job dir and no worktree. Must catch: a job that edits the caller's tree, a ticket missing from the base, a half-made job after a refusal, a status read that takes the worker's index lock (`43c01cf`). Replaces: `spawn-command`, `engine`, `git-status`, `init-command`, `wait-command`, `workspace-command`.

**S2 · Spawn, hosted.** About 300 lines (including the 80-line fake Herdr), 3 RT, 5 calls. Setup: plant, fake Herdr, `HERDR_ENV=1`, the caller in a coordinator pane with no Pi session. Commands: `limen spawn "F001 hosted" "say hi"`; the fake engine ends its session; `limen wait`; a second hosted job with `block`; the fake Herdr drops its agent row while the engine process lives; release; a third hosted job with `block`, then `limen stop <id>`. Checks: one tab in the role space; the pane command has no json flag; the task reaches the engine as `@task`, never as shell text; session end records `done` with the last assistant text; the coordinator pane receives one wake prompt; the job without an agent row stays `running`, then ends `done`; stop records `stopped` once. Must catch: Herdr idle taken as finish, task text in shell argv, a live OMP job failed because Herdr lost its row (`88fd5ac`), a stop that leaves `running`. Replaces: `hosted-spawn`, `hosted-hook`, `coordinator-wake`, `open-command`, `recovery` (hosted part).

**S3 · Finish and wake.** About 320 lines, 6 RT, 5 calls. Setup: plant; a fake coordinator process loads `hook/wake.ts` through the fake extension API with `PI_SESSION_ID=coord`. Commands, from that session: spawn `commit`; `fail 7`; `error-after-commit`; `block` then `limen stop`; `block` with `--timeout 1s`; then a second listener for the same session; `/limen off`, a sixth job, `/limen on`. Checks: each job gets exactly one wake with label, state (`done`, `failed`, `failed` with the provider stop reason and its commit kept, `stopped`, `failed` timed out), commits and final text; a job with no tools and no commits says it produced nothing; the stopped job has one `finished-at` and one terminal state line; two listeners deliver each wake once; two jobs that end in one turn are confirmed once each; the muted wake arrives once after `on`; `limen watch`/`unwatch` moves the wake to another session. Must catch: a lost wake, a duplicate wake (F042 review-1: three injections for two jobs; a live claim stolen after 31 s, fixed in `7e43d23`), a wake before the state file is durable, two finalizers racing (`a5c5e49`), a provider error recorded as done (`967ab4b`). Replaces: `wake-hook`, `wake-sweep`, `finalize`, `watch-command`.

**S4 · Steering and context injection.** About 230 lines, 2 RT, 5 calls. Setup: plant with `spec/vision.md`, `spec/build.md`, `.agents/limen/styleguide.md`, a project `communication.md`, and leftover hook copies from an old `init`; run `limen init` again. Commands: spawn `block`; `limen steer <id> "one"`; `limen steer <id> "two"`; release; `limen steer <id> "late"`; `limen continue <id> "next"`; `limen wait`. Checks: the engine receives "one" then "two", once each, as `steer`; the late steer exits 1 and writes nothing; `before_agent_start` returns a system prompt with the styleguide, the register, the vision and board pointers, and no board body for a worker; each hook registers its handlers once; the continuation reuses the session dir, gets `@continue`, and links parent and child. Must catch: a lost or doubled steer, missing project guidance, a hook loaded twice (`236b8e7`), a continuation that starts a fresh session. Replaces: `steer-command`, `steering-hook`, `continue-command`, `communication-hook`, `inherit`.

**S5 · Land.** About 150 lines, 4 RT, 7 calls. Setup: plant. Commands: job A `commit`, `limen land --yes A` (fast-forward); job B `commit`, move `main`, `limen land --yes B` (merge); refusals: a running job, a job with no commits, a dirty target, a branch whose ticket fails the strict check, `LIMEN_GROUP_ID` set. Checks: `main` holds each candidate; each refusal exits 1, names the reason (src/commands/land.ts lines 14-36), and leaves `main` unchanged; the ticket refusal prints the keeper command. Must catch: landing a running or empty job, landing onto a dirty tree, landing a bad ticket, a group member landing. Replaces: `land-command`, `diff-command`.

**S6 · Spec keeper.** About 170 lines, 2 RT, 7 calls. Setup: plant with `spec/features/done/2026-09/F004-x`, a `limen/f007-y` branch, a job labelled `F009`. Commands: `limen ticket new "x" --touches demo.place`; `limen ticket new "y" --touches nope`; write a ticket with a bad date and an unknown key; `limen ticket check`; `limen keeper <ticket> --job <id> --engine omp --provider p --model m --thinking high` while the job runs, then after it is done; `limen picture build --strict` twice. Checks: the new ticket is F010; the unknown place is refused before any file exists; `ticket check` names file, line and fix for each fault; keeper refuses a running job and starts a keeper job on a new branch at the candidate tip; two builds give identical bytes. Must catch: a reused F number (`2aaf43b`), a silent bad ticket, a keeper on the wrong base (`edbc18d`). Replaces: `ticket-command`, `keeper-command`, `ticket-author-command` (path part), `picture-work`.

**S7 · Webhooks.** About 220 lines, 4 RT, 3 calls. Setup: plant with `.limen/finish-webhook.env` holding two `LIMEN_FINISH_WEBHOOK_TARGETS` and a `LIMEN_FINISH_WEBHOOK_AUTHOR_TARGETS` map; the ticket of job 1 committed by author A, of job 2 by author B; fetch-preload sink. Commands: spawn `commit` (A); spawn `fail 3` with an empty result (B); `limen continue` job 1 from a subdirectory; a second plant with no config spawns one job. Checks: after each terminal state, requests go only to the mapped target; Bearer only in the header; payload carries kind, plant, id and reason; the failed job with an empty result still sends; the continuation keeps the parent's config path and author; no secret or URL appears in stdout, stderr or any job file; the unconfigured plant's sink has zero lines. Must catch: a ping before durable state, a ping to the wrong target, a leaked secret. Replaces: `finish-webhook`, `finish-receipt`, `ticket-author-command` (author part).

**S8 · Groups.** About 380 lines, 6 RT, 7 calls, one 12 s hold until the lock-deadline override exists. Setup: plant with a group packet (brief, two team notes) and a live lead registration. Commands: `limen group start <feature> --teams 2 --workers-per-team 1`; team 1 spawns its worker; team 2 starts two spawns for its one slot at once (both released by one FIFO write in a `LIMEN_PREPARE` step); a spawn while a Git post-checkout hook holds the launch lock past the deadline; `limen group publish`; `limen group wait`; the lead writes `group/synthesis.md`; `limen group stop`; `limen group close` with one dirty member, then clean. Checks: one roster and one cabinet; of the two concurrent spawns exactly one becomes a member and the other is refused with no half-claimed record; the held-lock spawn still records durable membership; each recipient reads a finding once; a worker's `land` and `spawn` exit 1; the synthesis write sends one lead-step ping; close refuses the dirty member. Must catch: duplicate slots, half-claimed members, the old 10-second lock deadline (`b62b837`). Replaces: `group-command`, `lead-step-finish`, `status-command` (group part).

**S9 · Sweep, prune and recovery.** About 280 lines, 4 RT, 8 calls. Setup: plant. Commands: spawn `block` and `kill -9` its wrapper, then `limen jobs`; spawn `spawn-orphan`, then `limen stop`; spawn with a `LIMEN_PREPARE` step blocked on a FIFO and run `limen prune` while it blocks; a running job in a nested checkout owned by another clone, then `limen prune`; `limen prune --retire` after landing one job; plant a dead-owner `projects.lock` (owner pid not alive, old mtime), then fork 80 registrants and 12 pruners released by one FIFO write. Checks: the killed job becomes `failed` once, at once, and is wake-eligible; the orphan grandchild is gone or named in the cleanup note; prune keeps the half-published job, the running job and the nested one, and drops a finished worktree; retire drops merged jobs only; all 80 registrations survive and no child reports `ENOTEMPTY`. Must catch: a live job reaped or its worktree deleted (`11ae41d`, `30cff7a`), an escaped child left running (`9e2d7c7`, `501aa0f`), a dead pid left `running` (`5754dad`), lost registrations (F043 review-2: 78 of 80; fixes `4e84296`, `8548de0`, `996bba9`). Replaces: `prune-command`, `reaper`, `recovery` (detached part), `sweep-command`, `stop-command`, `jobs-command`.

**S10 · GitHub doorbell.** About 200 lines, 1 RT, 5 calls. Setup: plant registered for the doorbell; the fetch preload answers the GitHub API from a fixture file; an idle fake coordinator. Commands: `limen github poll` with an authorized `@limen` PR comment, an unauthorized comment, an issue body mention, a closed issue, and a forged receipt; `limen github work` for the claimed request. Checks: one claim and one coordinator prompt for the authorized comment and the issue; none for the others; one start and one terminal reply, never an approval; a poller restart does not post twice. Must catch: an outside user starting work, a duplicate reply. Replaces: `github-doorbell`, `github-issue-body`, `github-doctor`.

**Seams beyond the six.** Groups (S8) and the doorbell (S10) are seams of their own: each is a concurrency or trust boundary a user feels, and no other scenario reaches it. Sweep, prune and recovery (S9) are one seam: "a dead or finished job is cleaned up, a live one is not". The picture is not a seam: it is a read-only view for Adam; one build check rides in S6 and its parser keeps a unit (U1, U6).

**Lock copies.** The product has four separate lock implementations. S8 covers the group cabinet lock (src/job/group-cabinet.ts line 58). S9 covers the seat registry lock (src/project/seat.ts line 50). S10 covers the poller's exclusive receipt file (src/integrations/github-poller.ts line 460) through the restart check. The picture-tick lock (src/project/picture-tick.ts line 61) is not covered; picture tick is deleted with its tests (section 8).

## 4. Pure unit tests worth keeping

Eight files, about 555 lines. Each runs in under one second (TAP times in section 5).

| Unit | Function and file | Why tricky | Why not a scenario | Size |
| --- | --- | --- | --- | --- |
| U1 ticket diagnostics | `readTickets`, `checkTickets`, src/picture/tickets.ts lines 27, 67 | Seven keys, paired dated flags, block lists, duplicate F numbers (`7e11c21`); each fault must give file, line and fix | S6 can afford one or two faults; each further fault would cost a plant and a CLI call | 90 |
| U2 webhook trust table | `bin/tony-finish-ping.sh` run with the fetch preload | Trust boundary: raw, Basic and malformed Bearer; non-https, userinfo and fragment URLs; invalid target list and author map; redirect, non-2xx, stalled request. Each row must make **zero requests** and print no secret | Each row is a 50 ms helper run; through spawn each would be a full job | 120 |
| U3 coordinator turn signal | `turnSignal`, src/integrations/coordinator-signal.ts line 39 | Decision table: blocked always counts; idle and done wait for owned jobs; an aborted turn never counts | No engine produces these turn shapes on demand | 60 |
| U4 wake claims | `claimDelivery`, `recordUnconfirmed`, `recoverClaims`, src/job/wake-delivery.ts lines 24-165 | Two listeners, a live owner with a 31-second-old claim (mtime set with `fs.utimes`), a dead owner, a batched turn; the F042 defects (`7e43d23`) | S3 proves the happy two-listener path; the aged live claim needs a 30 s wait in a scenario | 80 |
| U5 engine stream | `createStreamParser`, `assistantStopReason`, src/runtime/stream.ts lines 7, 58 | Decides done versus failed from split JSON lines and stop reasons | Cheap and exact here; S3 covers one error shape only | 40 |
| U6 front matter and Markdown | `parseFrontmatter`, src/picture/frontmatter.ts line 36; Markdown escape | Hand-written parser; malformed boundaries, prototype keys, executable links | Parser edge cases are inputs, not paths | 60 |
| U7 job ids and durations | `resolveJobId`, `makeJobId`, `parseDuration`, src/job/job.ts lines 77, 89, 109 | Suffix and label resolution must be unique; feature number hoisting; bounded durations | Every scenario uses ids, but only the happy shape | 60 |
| U8 structure | test/structure.test.ts | Runtime stays dependency-free, basenames unique, and the test line ceiling (section 7) | It is a repo rule, not a path | 45 |

The next free F number is not a unit: `nextFeatureNumber` is private and reads folders, branches and job labels (src/commands/ticket.ts line 23), so S6 covers it on the real plant at the cost of one CLI call. The land refusal rules are not a unit either: they are seven early `throw`s in `landJob` (src/commands/land.ts lines 14-38) and S5 drives them through the CLI.

## 5. Targets and method

**Target size: 3,300 lines in `test/`** (today 17,094; `wc -l test/*`). **Target time: 4 minutes serial with today's `--test-concurrency=1`, 1.5 minutes with `--test-concurrency=4`.** The plan picks four-way: the scenarios share no state (own temp dir, allowlisted env, no `process.env` writes in the test process).

**End-state number for the lead:** 3,300 lines, about 4 minutes serial at today's load. **Calendar time:** about 1.5 working days on this plant [estimate]: one fixture job (about 1 hour with review), two waves of five scenario jobs (about 1.5 hours each, limited by load on this Mac), one unit job in parallel, six pre-fix replays (2 to 5 minutes each), and one cut-and-gate landing per seam.

**Lines, method.** For each scenario, the closest existing end-to-end tests, measured as top-level `test(` block lengths (Python block scan over test/*.ts, 12:38):

| Scenario | Closest existing tests (lines) | Estimate |
| --- | --- | --- |
| S1 | spawn-command "spawn creates isolated branch…" 75, git-status 48, refusal tests about 60 | 230 |
| S2 | hosted-spawn "finalizes on session end…" 30, coordinator-wake "spawned from a Herdr coordinator…" 28, fake Herdr in hosted-spawn about 80, stop and missing-row cases about 80 | 300 |
| S3 | wake-hook "competing subscribers" 47, finalize "provider-error" 18, stop/timeout about 60, mute about 50 | 320 |
| S4 | steer-command "reaches a running worker" 34 plus its 30-line engine, continue-command "resumes a finished job" 38, communication-hook "system prompt holds…" 21 | 230 |
| S5 | land-command, all four tests: 26 + 23 + 86 + 34 = 169 | 150 |
| S6 | ticket-command 81 + keeper-command 83 | 170 |
| S7 | finish-webhook "two collaborators' finishes…" 49 plus decision and continuation cases about 120 | 220 |
| S8 | group-command "concurrent worktree spawns…" 30, the two launch-lock tests, activation and close cases about 250 | 380 |
| S9 | prune "nested running jobs" 49, sweep "registry … dead locks" 39, stop "escaped-group child" 21, reaper and retire about 120 | 280 |
| S10 | github-doorbell "only an exact write-authorized…" 69 plus issue and restart cases | 200 |

Sum: fixture 260 + scenarios 2,480 + units 555 = **3,295 lines**. The shared fixture saves the per-test setup today's files repeat (each seam file defines its own engine and `init`). The hypothesis of 2,500 lines is low by about 800 lines; the extra comes from the contention and regression cases the other teams showed (S8, S9, U4) and the fake Herdr (S2).

**Time, method.** Measured step costs on a throwaway plant with a 5-line fake engine:

| Step | Measured | Load | Source |
| --- | --- | --- | --- |
| `limen` no-op call | 0.27 to 0.50 s | 108 / 70 | /tmp/team2-roundtrip.sh, 12:30-12:32 |
| `limen init` | 0.29 to 1.19 s | 125 / 114 / 70 | coordinator probe /tmp/f925-t2-probe/probe.sh (finding 00000058); same probe rerun 12:40 |
| spawn and wait (RT) | 1.0 to 1.2 s | 124-129 | coordinator probe, 12:39 |
| spawn and wait (RT) | 2.5 to 3.1 s | 114 | same probe rerun, 12:40 |
| init + spawn + wait | 3.6 s wall, 1.85 s CPU | 108 | /tmp/team2-roundtrip.sh under `/usr/bin/time`, 12:32 |

Counts for the set (section 3): 35 RT, 60 CLI calls, 11 inits, 13 s of fixed real time (the 1 s timeout in S3 and the 12 s lock hold in S8), and about 10 s of unit files (today's unit files: TAP total under 5 s). At 3 s per RT, 0.4 s per call and 1.1 s per init: 105 + 24 + 12 + 13 + 10 = **164 s serial**. At 5 s per RT (my slowest measure): 236 s.

Calibration against a real file: the same formula for `land-command.test.ts` (7 spawns, 14 other calls, 4 inits; `grep -c` on the file) gives 21 + 6 + 4 = 31 s. The F783 TAP has 40.8 s; the coordinator measured 89.5 s at load 74 to 89 (steer 1). So the formula under-predicts by 1.3x to 2.9x under heavy load. Applied to 164 to 236 s: **serial 3.5 to 11 minutes at loads 70 to 125**, with 4 minutes as the planning target on a lightly loaded Mac [estimate; not an observed suite]. Four-way: the longest file (S8: 6 RT, 7 calls, 12 s hold, about 35 to 50 s) bounds it, and the total divided by four is 40 to 60 s, so **about 1.5 minutes**, more under load because the Mac is CPU-bound.

**Hypothesis check.** "About 2,500 lines and under 3 minutes": corrected to about 3,300 lines; under 3 minutes holds four-way, not serial under today's load. For comparison: today 1,502 s for 532 tests (`/tmp/f783-lead/full-suite.tap` line 3294); 116 tests over 5 s take 973 s (coordinator count from the same TAP); the five largest files take 52% of the run (lead finding).

**Today's time per file** (sum of top-level `duration_ms` in the F783 TAP, names matched to files by substring and by hand for 26 templated names; 495 of 532 tests matched): group-command 259.8 s, hosted-spawn 175.7 s, finish-webhook 146.9 s, spawn-command 127.0 s, continue-command 113.3 s, stop-command 52.7 s, prune-command 47.3 s, land-command 40.8 s. Full list: /tmp/f925-team-2-tap-by-file.txt.

## 6. No sleeps, no wall-clock windows

Today's timing constructs in `test/` (counted with `grep -o` over test/*.ts, 12:40):

| Construct | Count | Where |
| --- | --- | --- |
| `setTimeout` | 73 | wake-hook 22, stop-command 9, hosted-spawn 7 (per-file `grep -c`) |
| fixed `await new Promise((resolve) => setTimeout(resolve, N))` | 49 | 21 are 20-25 ms poll steps; 28 are fixed waits of 100 to 3,000 ms (nine of 650 ms, three of 1,100 ms, one of 3,000 ms), summing to about 17.6 s per run |
| fixed waits of 100 ms or more, by file | 26 | wake-hook 20, hosted-spawn 2, stop-command 2, hosted-hook 1, steering-hook 1 |
| `sleep` (child process or helper) | 8 | spawn-command, group-command, stalled-tool, coordinator-wake |
| `Date.now()` | 120 | group-command 13, stop-command 10, wake-hook 10 |
| elapsed-time asserts | at least 9 | e.g. stop-command lines 156-157 (900 to 2,000 ms window), group-command line 845 (more than 10 s), finalize lines 74 and 192, finish-webhook line 498, wait-command lines 19 and 33 |
| `waitForState` calls (25 ms poll, 10 s deadline) | 166 | hosted-spawn 54, spawn-command 42, continue-command 28 |
| `LIMEN_*_MS` overrides | 30 | scratch.ts 8, hosted-spawn 8, sweep-command 5 |

How the new set avoids them: `limen wait` and `fs.watch` instead of polling; FIFOs instead of fixed blocks; ordering behind a later positive event instead of an absence window; `fs.utimes` instead of waiting for age; no elapsed-time asserts at all. What is left: the 1 s `--timeout` in S3, the 1 s fallback interval inside `limen wait` (product code), and the 12 s lock hold in S8 until the lock deadline takes an override. None of these can fail at random under load; the worst case under load is a slower pass.

## 7. Anti-bloat rule

**Rule: a landing never adds test lines.** `limen land` refuses a branch when `git diff --numstat <target>...<branch> -- test/` shows more added than deleted lines.

- **Where it runs.** In `limen land`, next to the ticket gate (src/commands/land.ts line 36). Land runs from the operator's installed Limen, not from the branch [INFERENCE: the coordinator calls `limen` from `PATH`, the canonical checkout; a branch's edit to land.ts cannot judge itself]. There is no number to edit, so a branch cannot loosen it. A direct commit to `main` skips land, so `test/structure.test.ts` adds a fixed ceiling of 3,300 lines over `test/*` and fails `npm test` above it.
- **Exact error (land):** `land refused: limen/<id> adds 214 test lines (+260 -46 in test/). A landing never adds test lines. Remove 214 lines from test/ in this branch.`
- **Exact error (structure test):** `test/ holds 3,514 lines; the ceiling is 3,300. A feature that adds test lines removes as many.`
- **How a feature gets more test lines.** It deletes as many: a weaker check, a duplicate case, a wording assert. Raising the ceiling is a commit Adam makes on `main`; the net-zero land check needs no number and has no bypass flag.
- **Why a budget alone fails.** `test/structure.test.ts` once pinned `src/` size: `git log -G 'sourceLines <=' -- test/structure.test.ts` shows 50 raises in 37 days (800 at `6743d9e`, 2026-08-13, to 4,280 at `58c9c4f`, 2026-09-19), one cut, then the file's budget was deleted in `1ffb7c4` (2026-09-24) (team-2 coordinator finding 00000012). The F776 trim was half undone in 11 hours: 15,551 lines at its merge (`2855cd5`) to 17,094 now (`5df0697`), +2,153 / -610 in 54 commits (finding 00000048). Since 2026-09-06, test/ took +12,950 / -4,268 lines and src/ +10,295 / -2,331 (`git log --numstat`, 12:37). A cut without a gate in the same landing regrows within a day.

## 8. File-to-scenario mapping

One row per file in `test/`, sorted by lines (`wc -l test/*`, 12:27). Seconds are the F783 TAP sum per file (section 5).

| File | Lines | Seam | Class | Action | Reason |
| --- | --- | --- | --- | --- | --- |
| wake-hook.test.ts | 1889 | finish and wake | mock | scenario S3; unit U4 | Drives the hook in-process with a stub host and 105 `process.env` writes; 20 fixed waits of 150-1,100 ms; Herdr title decoration (about 7 tests) is wording. 23.3 s |
| hosted-spawn.test.ts | 1340 | spawn | mock | scenario S2; unit U7 | 309 Herdr mentions of in-process fake Herdr; `noteHostedIdle` internals; 54 `waitForState`. CLI paths go to S2, `makeJobId` to U7. 175.7 s |
| spawn-command.test.ts | 930 | spawn | seam | scenario S1 | Real CLI path, but 27 tests each with its own fake engine; prune races move to S9. 127.0 s |
| group-command.test.ts | 879 | groups | seam | scenario S8 | Real cabinet and spawns; 13 `Date.now()`; two 12 s lock holds (23.0 s and 24.2 s). 259.8 s |
| finish-webhook.test.ts | 829 | webhooks | seam | scenario S7 | Real finish path with intercepted helper; six-case decision matrix at about 1.8 s each; shutdown-budget cases are timing. 146.9 s |
| github-doorbell.test.ts | 700 | doorbell | mock | scenario S10 | Poller driven in-process with fake GitHub and fake Herdr; 28 env writes. 32.3 s |
| continue-command.test.ts | 506 | steering | seam | scenario S4 | Real continue; flag-forwarding cases duplicate spawn; publication race moves to S9. 113.3 s |
| communication-hook.test.ts | 504 | steering | wording | scenario S4 | 51 `assert.match` on prompt text; S4 keeps one prompt-content check. 15.4 s |
| jobs-command.test.ts | 466 | sweep/recovery | wording | scenario S9 | Row and snapshot text (43 `assert.match`); S1/S9 read `limen jobs` for state only. 30.1 s |
| wake-sweep.test.ts | 443 | finish and wake | copy | delete | Restates sweep cache internals ("skips 473 settled records"); claim logic moves to U4. 1.1 s |
| finish-webhook-helper.test.ts | 427 | webhooks | unit | keep (U2, shrink to 120) | Trust boundary; 54 variants collapse to one zero-request table. 3.3 s |
| recovery.test.ts | 386 | sweep/recovery | mock | scenario S2, S9 | Herdr-uncertainty internals; missing-row case (`88fd5ac`) to S2, killed supervisor to S9. 19.9 s |
| coordinator-wake.test.ts | 339 | finish and wake | mock | scenario S2 | Herdr pane wake for OMP coordinators; S2 checks one pane prompt. 29.1 s |
| prune-command.test.ts | 338 | sweep/recovery | seam | scenario S9 | Real prune on worktrees; pins `11ae41d`, `30cff7a`. 47.3 s |
| picture-viewer.test.ts | 328 | picture | unit | delete | Browser route and HTML rendering of a read-only view. 0.0 s |
| hosted-binding.test.ts | 322 | spawn | timing | delete | Both tests skip off Linux (TAP lines 1255, 1261); never run on this Mac; 10 s polling of process births |
| stop-command.test.ts | 315 | sweep/recovery | timing | scenario S9 | 11 timers, 10 `Date.now()`, the 900-2,000 ms window F776 kept; escaped-child case to S9. 52.7 s |
| status-command.test.ts | 293 | none | wording | delete | Plant plate text; S8 checks group status by state only. 25.9 s |
| picture-layers.test.ts | 281 | picture | unit | delete | Browser history stack of the picture page. 0.0 s |
| stalled-tool.test.ts | 279 | finish and wake | timing | delete | Real sleeping children and observation windows; stall is an advisory. 29.0 s |
| sweep-command.test.ts | 267 | sweep/recovery | seam | scenario S9 | Registry contention (`4e84296`, `8548de0`, `996bba9`) moves to S9; launchd install is trivia. 10.8 s |
| plant-events.test.ts | 263 | webhooks | mock | keep (U3, shrink to 60) | Turn-signal table is pure; ring-once cases mock the sweep. 3.9 s |
| open-command.test.ts | 252 | none | mock | delete | Fake-Herdr tab calls; the index-lock bug it caught (`43c01cf`) moves to S1. 20.4 s |
| picture-generator.test.ts | 248 | picture | unit | keep (U6, shrink to 60) | Front matter and Markdown escape stay; graph build cases go. 1.0 s |
| finalize.test.ts | 214 | finish and wake | mock | scenario S3 | Provider-error finish (`967ab4b`) and one terminal line to S3; tab-close retries are Herdr mocks. 29.1 s |
| picture-tick.test.ts | 207 | picture | seam | delete | Picture job scheduling; not a user seam. 17.3 s |
| lead-step-finish.test.ts | 198 | groups | mock | scenario S8 | Lead-step ping on synthesis write. 9.6 s |
| scratch.ts | 195 | all | mock | scenario (replaced by test/plant.ts) | Denylist env misses `LIMEN_GROUP_ID`/`LIMEN_TEAM_ID`; polling `waitForState` |
| picture-tickets.test.ts | 193 | spec keeper | unit | keep (U1, shrink to 90) | Ticket diagnostics feed `ticket check` and land. 0.0 s |
| steer-command.test.ts | 186 | steering | seam | scenario S4 | Real steer through the real hook. 33.6 s |
| land-command.test.ts | 179 | land | seam | scenario S5 | The one real land file. 40.8 s |
| reaper.test.ts | 177 | sweep/recovery | seam | scenario S9 | Dead pid reaped (`5754dad`, `a5c5e49`); pgid recycling internals go. 11.6 s |
| engine.test.ts | 175 | spawn | copy | delete | Restates `argvFor` output; S1/S2 check the argv the fake engine received. 0.3 s |
| github-issue-body.test.ts | 174 | doorbell | duplicate | scenario S10 | Same claim path as the doorbell file. 7.3 s |
| hosted-hook.test.ts | 168 | spawn | mock | scenario S2 | Hosted finish handoff; in-process with env writes. 0.9 s |
| picture-work.test.ts | 161 | spec keeper | seam | scenario S6 | Build determinism check. 2.0 s |
| finish-receipt.test.ts | 154 | webhooks | unit | delete | Receipt allowlist; S7 checks no secret in any job file end to end. 0.0 s |
| picture-overlay.test.ts | 154 | picture | unit | delete | Overlay graph rules of the map (`4d003dc` pin accepted as risk). 0.0 s |
| view.test.ts | 154 | none | wording | delete | Row glyphs, colors and footer text. 3.8 s |
| init-command.test.ts | 150 | spawn | wording | scenario S1, S4 | 25 `assert.match`; fixture runs init; hook-copy cleanup (`236b8e7`) to S4. 34.9 s |
| ticket-author-command.test.ts | 140 | webhooks | seam | scenario S6, S7 | Author capture for routing (S7); path resolution (S6, `76d87fb`). 15.9 s |
| diff-command.test.ts | 137 | none | mock | delete | Hunk and Herdr review tabs. 15.5 s |
| github-doctor.test.ts | 117 | doorbell | trivia | delete | Setup diagnostics text. 4.7 s |
| picture-watch.test.ts | 117 | picture | seam | delete | Git hook for picture ticks; not a user seam. 8.9 s |
| steering-hook.test.ts | 113 | steering | duplicate | scenario S4 | Same delivery as steer-command, in-process. 0.4 s |
| inherit.test.ts | 101 | steering | copy | delete | Restates template classification; its CI break (`7f38f2e`) was the test's own shallow clone. 17.3 s |
| job.test.ts | 92 | none | unit | keep (U7, 60) | Id resolution and durations. 0.0 s |
| workspace-command.test.ts | 89 | spawn | seam | scenario S1 | One workspace spawn in S1. 21.5 s |
| keeper-command.test.ts | 83 | spec keeper | seam | scenario S6 | Real keeper job (`edbc18d`). 15.6 s |
| ticket-command.test.ts | 81 | spec keeper | seam | scenario S6 | Calls `ticketCommand` in-process; S6 runs it through the CLI (`2aaf43b`). 2.9 s |
| picture-board.test.ts | 80 | picture | unit | delete | Board line reader for the picture. 0.0 s |
| watch-command.test.ts | 71 | finish and wake | seam | scenario S3 | Watch moves the wake. 15.6 s |
| git-status.test.ts | 48 | spawn | unit | scenario S1 | Index invariant (`43c01cf`) checked end to end in S1. 4.3 s |
| hosted-uncertainty.test.ts | 37 | finish and wake | unit | delete | One constant-driven transition; risk accepted (8b). 0.0 s |
| linear-command.test.ts | 37 | none | trivia | delete | Renames a config file. 4.9 s |
| wait-command.test.ts | 35 | finish and wake | timing | scenario S1 | Two elapsed-time asserts; `limen wait` is the fixture's wait. 6.4 s |
| stream.test.ts | 27 | finish and wake | unit | keep (U5, 40) | Done versus failed from the stream. 0.0 s |
| structure.test.ts | 26 | none | unit | keep (U8, 45) | Adds the line ceiling. 0.0 s |

Totals by action (lines): keep 1,388 in 7 files (shrinking to about 475); scenario 11,264 in 32 files; delete 4,442 in 19 files. Total 17,094.

### 8b. Bug coverage and the cutover rule

Cutover rule (agreed with team 3, closed list per the lead): an old regression test is deleted only after its replacement **fails on the pre-fix commit** (product files of `<fix>^` checked out under the new `test/` in a scratch worktree) and passes on `main`. If the CLI changed too much, replay the narrow unit; if none reaches it, record the risk in the cutover ticket's notes. Every other file is deleted without replay.

| Bug | Fix | Covered by | Replay |
| --- | --- | --- | --- |
| Status read takes the worker's index.lock (caught by open-command) | `43c01cf` | S1 | `43c01cf^` |
| Registry: lost registrations, then `ENOTEMPTY` (F043) | `4e84296`, `8548de0`, `996bba9` | S9 | `4e84296^`, `8548de0^`, `996bba9^` |
| Wake: batched follow-ups injected three times, live claim stolen (F042) | `7e43d23` | S3, U4 | `7e43d23^` |
| Group launch lock fails past 10 s; deferred finish | `b62b837` | S8 | `b62b837^` |
| Hosted OMP failed when Herdr lost its agent row | `88fd5ac` | S2 | `88fd5ac^` |
| macOS `/var` vs `/private/var` paths | `76d87fb` | fixture (real path), S6 | none |
| Two finalizers delete each other's temp file | `a5c5e49` | S3 (stop during exit) | none |
| Shallow-clone template history | `7f38f2e` | none: the test itself broke; deleted | none |
| Prune deletes nested live worktrees | `11ae41d` | S9 | none |
| Prune races a half-published job | `30cff7a` | S9 (FIFO in `LIMEN_PREPARE`) | none |
| Stop leaves escaped descendants | `9e2d7c7`, `501aa0f` | S9 (`spawn-orphan`); the 900-2,000 ms bound is dropped | none |
| Provider error recorded as done | `967ab4b` | S3 | none |
| Dead pid not reaped at once; reaper grace | `5754dad`, `a482020` | S9 (dead pid); grace: accepted risk | none |
| Observed child exits without ending its tool | `9c5aa8c` | accepted risk: stall is an advisory | none |
| Hosted refresh warnings | `839db44` | accepted risk | none |
| Hosted binding, uncertainty, quiet tools, seat bell | `951282a` | accepted risk: Linux-only or wall-clock; S2 covers the missing-row failure that was seen | none |
| Hooks loaded twice after init | `236b8e7` | S4 | none |
| F number reused across branch or job label | `2aaf43b` | S6 | none |
| Two folders with one F number | `7e11c21` | U1 | none |
| Graph files with missing kinds | `4d003dc` | accepted risk: picture is not a seam | none |
| Keeper starts on the wrong base | `edbc18d` | S6 | none |

## 9. Points from other teams

Filled by the coordinator.
