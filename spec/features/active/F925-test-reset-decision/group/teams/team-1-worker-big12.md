# Team 1 worker · the 12 largest test files: scores and Git history

Scope: the 12 largest files in `test/`, 9,299 lines (`wc -l`). The coordinator scores the other 46 files.

## Method

- Lines: `wc -l test/<file>.test.ts`. Test blocks found by a script that matches `test(`/`it(` openers and their `});` closers. Lines outside any test block (imports, fixtures, helpers) go to the tests that call the helper by name; imports and blank lines go to all tests in proportion to their size. Splits round to whole lines and sum to `wc -l`.
- Class and action: one per test. I read every body. The class reflects what the test's assertions check, not the test's title.
- Hook tests (`wake-hook`, `communication-hook`, the group hook): the hook module is real and the Pi extension host (`on`, `sendUserMessage`) is a stub. I count that stub as "the engine faked". So a hook test is `seam` when it checks which session got which wake and what landed in the job files. It is `mock` when it checks the host interplay (`deliverAs`) or Herdr argv, and `wording` when it checks message text.
- Fake Herdr: a stateful fake that stands in for the engine's host is allowed in a `seam` test. A test whose assertions are on the fake's call log (argv order, flags, call counts) is `mock` or `copy`.
- `timing`: the verdict depends on a fixed sleep, a wall-clock bound, or an aged mtime/timestamp. Polling until a file appears, with a deadline, is not `timing` by itself. It is listed under `waits:`.
- TAP times: per-test `duration_ms` from `/tmp/f783-lead/full-suite.tap` (F783 lead full run, 2026-10-06, loaded Mac). Titles built from a template (`${...}`) sum all matching runs.

## 1. Table

| File | Lines | Seam | Class | Action | Reason |
| --- | --- | --- | --- | --- | --- |
| `test/wake-hook.test.ts` | 1889 | finish-wake | seam | delete | real hook with a stubbed Pi host and hand-written job files; a third Herdr call-log mocks, the rest wording and fixed-sleep absence checks around a core of claim and routing tests |
| `test/hosted-spawn.test.ts` | 1340 | finish-wake | seam | delete | good noteHostedIdle/parser units, but half the lines assert fake-Herdr argv and race windows instead of job state |
| `test/spawn-command.test.ts` | 930 | spawn | seam | delete | real `bin/limen` spawns in temp Git repos; core spawn, review, prune and ticket-gate paths, plus argv copies and refusal wording |
| `test/group-command.test.ts` | 879 | groups | seam | scenario | real group start, then half direct cabinet/event units and three wall-clock contention tests (11 s, 12 s ×2) |
| `test/finish-webhook.test.ts` | 829 | webhooks | seam | delete | real finalize path and real helper with intercepted fetch; strong allowlist and author-routing checks, but each test copies the package and four tests wait on 2.5–20 s sender/Herdr timeouts |
| `test/github-doorbell.test.ts` | 700 | doorbell | unit | delete | internal poller functions with stubbed fetch; the claim allowlist and forged-receipt checks are cheap security units, two `bin/limen github` runs are the only end-to-end paths |

Seam, Class and Action in a row are the largest line share in that file (section 2 has the split).

## 2–3. Line splits and per-test lists

### `test/wake-hook.test.ts` (1889 lines, 36 tests)

Lines by class: seam 695 · mock 579 · wording 225 · timing 223 · duplicate 141 · trivia 26 (sum 1889).  
Lines by seam: finish-wake 1768 · recovery 78 · steer-context 43.  
Lines by action: delete 1292 · scenario 597.  
TAP time (sum of per-test `duration_ms`, `/tmp/f783-lead/full-suite.tap`): 23.3 s.

- L30 "wake ignores history, announces start, and steers once on terminal change" — seam, finish-wake, scenario, waits: poll 20ms until predicate, 3s/5s deadline; setTimeout 100ms absence (59 lines; tap 0.23 s)
- L90 "a completion wake carries bounded commits and the worker's final message" — wording, finish-wake, delete, waits: poll 20ms until predicate, 3s/5s deadline (50 lines; tap 0.18 s)
- L141 "a completion wake says when a terminal job produced nothing" — wording, finish-wake, delete, waits: poll 20ms until predicate, 3s/5s deadline (46 lines; tap 0.18 s)
- L188 "a reloaded coordinator tab resubscribes to its running jobs" — seam, finish-wake, scenario, waits: poll 20ms until predicate, 3s/5s deadline (43 lines; tap 0.03 s)
- L232 "wake remains inert inside workers" — mock, finish-wake, delete (28 lines; tap 0.00 s)
- L261 "wake stays out of foreign projects and honors LIMEN_WAKE=0" — seam, steer-context, scenario (41 lines; tap 0.00 s)
- L303 "wake finds the project root from a subdirectory" — seam, finish-wake, delete, waits: poll 20ms until predicate, 3s/5s deadline, dup of: L30 (root discovery is incidental) (38 lines; tap 0.11 s)
- L342 "/limen off mutes the session and /limen on catches up once" — seam, finish-wake, delete, waits: poll 20ms until predicate, 3s/5s deadline; setTimeout 150ms absence (55 lines; tap 0.19 s)
- L398 "subscriptions scope wakes and one idle coordinator receives fallback" — seam, finish-wake, scenario, waits: poll 20ms until predicate, 3s/5s deadline (73 lines; tap 0.34 s)
- L472 "herdr pane naming follows running jobs and each terminal state notifies once" — mock, finish-wake, delete, waits: poll herdr call files, 5s deadline (57 lines; tap 0.40 s)
- L530 "settled coordinator labels count watched and visible unwatched RUNNING jobs beyond truncated detail" — mock, finish-wake, delete, waits: poll herdr call files, 5s deadline; real sleeper child process (80 lines; tap 1.08 s)
- L611 "same-feature jobs retain useful names and only a mismatched wrapper identity needs attention" — mock, finish-wake, delete, waits: poll 20ms until predicate, 3s/5s deadline (62 lines; tap 3.89 s)
- L674 "the coordinator tab keeps running and finished counts on its stem; an owner turn clears the finished count" — mock, finish-wake, delete, waits: poll herdr call files 5s; setTimeout 600ms absence (one 500ms sweep) (64 lines; tap 1.56 s)
- L739 "a finished job leaves the coordinator title and job line once it lands or its feature closes" — mock, finish-wake, delete, waits: poll tab label file, 5s deadline (59 lines; tap 1.80 s)
- L799 "limen close and the job line agree on a job whose label names two features" — mock, finish-wake, delete, waits: poll tab label file, 5s deadline (49 lines; tap 0.38 s)
- L849 "a tab still carrying herdr's own number is never decorated" — mock, finish-wake, delete, waits: poll herdr call files, 5s deadline (34 lines; tap 0.29 s)
- L907 "muting holds job notices and wakes until the conversation is unmuted" — duplicate, finish-wake, delete, waits: setTimeout 200ms absence; poll 3s/5s, dup of: L342 /limen off mutes the session (same mute, adds Herdr toast) (62 lines; tap 0.27 s)
- L970 "a concretely missing hosted job is reaped once and wakes while a pidless young job keeps grace" — seam, recovery, scenario, waits: LIMEN_REAP_CONFIRM_MS=30; poll 3s; setTimeout 200ms absence (75 lines; tap 0.92 s)
- L1046 "an idle advisory wakes once, stays running, and does not block completion" — seam, finish-wake, scenario, waits: poll 20ms until predicate, 3s/5s deadline (52 lines; tap 0.32 s)
- L1099 "an errored advisory wake says the last turn failed" — wording, finish-wake, delete, waits: poll 20ms until predicate, 3s/5s deadline, dup of: L1046 (same advisory path, other text) (41 lines; tap 0.07 s)
- L1141 "first idle wake in a sweep is a real turn; later wakes are followUp" — mock, finish-wake, delete, waits: poll 20ms until predicate, 3s/5s deadline (33 lines; tap 0.03 s)
- L1175 "one assistant response confirms every batched followUp wake in the turn" — mock, finish-wake, delete, waits: poll 20ms until predicate, 3s/5s deadline; setTimeout 650ms absence (39 lines; tap 0.68 s)
- L1215 "a busy session injects every wake as followUp" — duplicate, finish-wake, delete, waits: poll 20ms until predicate, 3s/5s deadline, dup of: L1141 (busy → followUp is its other half) (28 lines; tap 0.04 s)
- L1244 "a rejected injection releases the claim and the next sweep retries" — seam, finish-wake, scenario, waits: setTimeout 150ms; poll log 5s; poll 20ms until predicate, 3s/5s deadline (55 lines; tap 0.29 s)
- L1300 "an accepted wake is recovered after shutdown when no turn ran" — seam, finish-wake, scenario, waits: utimes claim −31s; setTimeout 550ms absence; poll 3s (54 lines; tap 0.61 s)
- L1355 "another listener does not recover a live accepted claim" — timing, finish-wake, delete, waits: utimes −31s; setTimeout 650ms absence is the verdict, dup of: L1300 first half (live owner protects claim) (50 lines; tap 0.69 s)
- L1407 "competing subscribers ${failure ? "share two failures without a late confirmation reset" : "still fan out successful wakes"}" — duplicate, finish-wake, delete, waits: poll 3s; setTimeout 1100ms absence (failure case), dup of: L398 fan-out and L1454 two-failure cap (45 lines; tap 1.67 s over 2 runs)
- L1454 "provider-error turns exhaust the allowance after two failures" — seam, finish-wake, scenario, waits: poll 3s; setTimeout 1100ms absence (44 lines; tap 1.16 s)
- L1499 "a footer failure leaves completion delivery and sweeps alive" — mock, finish-wake, delete, waits: poll .limen/log 5s (48 lines; tap 0.08 s)
- L1548 "session start delivers a standing advisory before a completion" — wording, finish-wake, delete, waits: poll 20ms until predicate, 3s/5s deadline (33 lines; tap 0.05 s)
- L1582 "an open coordinator stamps last-sweep and shutdown stops refreshing it" — trivia, finish-wake, delete, waits: poll stamp file 5s (25 lines; tap 0.00 s)
- L1608 "a stop-marked session receives no completion wake" — seam, finish-wake, scenario, waits: setTimeout 200ms absence; poll 3s (47 lines; tap 0.23 s)
- L1656 "fallback waits out the grace window and skips sessions that own no jobs" — timing, finish-wake, delete, waits: LIMEN_WAKE_FALLBACK_MS=60000; setTimeout 250ms absence, dup of: L398 fallback leg (64 lines; tap 0.44 s)
- L1721 "a wake opens with label and task and ends with the instruction" — wording, finish-wake, delete, waits: setTimeout 650ms absence (45 lines; tap 0.72 s)
- L1767 "standing uncertainty waits one minute and delivers once across transitions and listener restart; real failure and completion still deliver" — timing, finish-wake, delete, waits: spoofed since −61s; 2× setTimeout 650ms absence; poll 3s/5s (51 lines; tap 1.57 s)
- L1819 "uncertainty does not queue into a busy recipient or consume failure and completion attempts" — timing, finish-wake, delete, waits: 4× setTimeout 650ms absence; poll 3s (48 lines; tap 2.79 s)

### `test/hosted-spawn.test.ts` (1340 lines, 39 tests)

Lines by class: seam 308 · unit 302 · mock 286 · duplicate 211 · copy 118 · timing 115 (sum 1340).  
Lines by seam: finish-wake 635 · spawn 580 · recovery 72 · steer-context 53.  
Lines by action: delete 714 · scenario 324 · keep 302.  
TAP time (sum of per-test `duration_ms`, `/tmp/f783-lead/full-suite.tap`): 175.7 s.

- L13 "hosted completion is session end or vanished agent, not Herdr idle" — unit, finish-wake, keep (10 lines; tap 0.00 s)
- L24 "hosted result capture follows the last assistant stop reason" — unit, finish-wake, keep (11 lines; tap 0.00 s)
- L36 "hosted result capture keeps a tool-written result over later assistant text" — unit, finish-wake, keep (9 lines; tap 0.00 s)
- L46 "noteHostedIdle finalizes a clean idle turn with no tool call and writes no advisory" — duplicate, finish-wake, delete, dup of: L78 noteHostedIdle clean tool-using turn (same clean/dirty/stall table) (31 lines; tap 0.82 s)
- L78 "noteHostedIdle finalizes a clean tool-using turn without claiming the session ended" — unit, finish-wake, keep (68 lines; tap 0.85 s)
- L147 "noteHostedIdle writes one stall marker, skips zero tools, and re-arms after working" — unit, finish-wake, keep (40 lines; tap 0.02 s)
- L188 "noteHostedIdle rings and stamps unheard stalls until delivery, then restores and re-arms" — mock, finish-wake, delete, waits: LIMEN_STALL_RERING_MS=10 (injected clock values) (101 lines; tap 0.62 s)
- L290 "noteHostedIdle treats blocked as immediate and ignores unknown" — duplicate, finish-wake, delete, dup of: L78 blocked leg (16 lines; tap 0.01 s)
- L307 "noteHostedIdle snapshots result and commits without finishing" — unit, finish-wake, keep (42 lines; tap 1.17 s)
- L350 "hostedAgentStatus reads nested 0.8.0 envelope and flat legacy" — unit, spawn, keep (30 lines; tap 0.50 s)
- L381 "hostedAgentStatus keeps last known status across a non-not-found CLI failure" — unit, spawn, keep (27 lines; tap 0.32 s)
- L409 "spawn --tab refuses without Herdr and leaves no job record" — seam, spawn, scenario (14 lines; tap 1.25 s)
- L424 "ordinary lead-in labels start hosted; --detached keeps a watch tab" — mock, spawn, scenario, waits: waitForState poll; waitForFile poll 25ms, 10s deadline; poll log 25ms 2s (41 lines; tap 7.12 s)
- L466 "hosted start records PATH with /usr/bin and HERDR_ENV=1; detached watch tabs do not" — copy, spawn, delete, waits: waitForState poll (42 lines; tap 6.69 s)
- L509 "hosted spawn and continuation forward literal Pi launch flags" — copy, spawn, delete, waits: waitForState poll (28 lines; tap 11.97 s)
- L538 "hosted omp spawn uses Herdr kind omp and omits json mode" — copy, spawn, delete, waits: waitForState poll (26 lines; tap 6.81 s)
- L565 "hosted spawn and continuation keep quoted multiline tasks out of shell arguments" — seam, spawn, scenario, waits: waitForState poll (39 lines; tap 11.82 s)
- L605 "hosted start finalizes failed after two pane-shell failures" — seam, spawn, scenario, waits: waitForState poll; FAKE_HERDR_SHELL_BUSY_MS=500; waitForFile poll 25ms, 10s deadline (30 lines; tap 5.36 s)
- L636 "hosted tab creation refusal fails synchronously without launching a supervisor" — duplicate, spawn, delete, dup of: L605 hosted start failure → failed (17 lines; tap 2.98 s)
- L654 "hosted start does not restore focus over a human tab change" — timing, spawn, delete, waits: FAKE_HERDR_START_BUSY_MS=8000 blocks herdr; waitForFile poll 25ms, 10s deadline; waitForState poll (18 lines; tap 8.57 s)
- L673 "hosted supervisor refuses an unbound moved pane and finalizes when its tab closes" — timing, recovery, delete, waits: waitForFile poll 25ms, 10s deadline; setTimeout 1500ms then assert still running; waitForState poll (28 lines; tap 5.65 s)
- L702 "hosted start does not retry a non-pane-shell error" — duplicate, spawn, delete, waits: waitForState poll, dup of: L605 (start-attempt count) (17 lines; tap 3.53 s)
- L720 "hosted supervisor finalizes a clean tool-using idle without claiming the session ended" — duplicate, finish-wake, delete, waits: LIMEN_HOSTED_IDLE_MS=200; waitForFile poll 25ms, 10s deadline; waitForState poll, dup of: L78 unit + L816 hosted finalize (33 lines; tap 4.42 s)
- L754 "spawn --role opens that Herdr space and a second spawn reuses it" — mock, spawn, delete, waits: waitForState poll (19 lines; tap 5.73 s)
- L774 "spawn --review in Herdr is hosted; --detached keeps a watch tab" — duplicate, spawn, delete, waits: waitForState poll 25ms, 10s deadline ×4; waitForFile poll 25ms, 10s deadline, dup of: spawn-command L187 review gets fresh detached worktree (hosted adds Herdr mode only) (41 lines; tap 17.28 s)
- L816 "a hosted job finalizes on session end, never on unseen idle after tools" — seam, finish-wake, scenario, waits: setTimeout 3000ms then assert still running; waitForState poll; waitForFile poll 25ms, 10s deadline (29 lines; tap 6.63 s)
- L846 "a hosted session error fails with its stop reason" — seam, finish-wake, scenario, waits: waitForState poll; waitForFile poll 25ms, 10s deadline (21 lines; tap 3.29 s)
- L868 "hosted continue survives a killed caller and passes durable @continue, not @task" — seam, steer-context, scenario, waits: returnedMs < 6000 wall-clock bound; FAKE_HERDR_SHELL_BUSY_MS=2000; 20s caller deadline; waitForFile poll 25ms, 10s deadline; waitForState poll (43 lines; tap 14.88 s)
- L912 "makeJobId hoists a feature number from anywhere in the label" — unit, spawn, keep (11 lines; tap 0.00 s)
- L924 "makeJobId never leaves a run of dashes where a feature number or the cut was" — unit, spawn, keep (5 lines; tap 0.00 s)
- L930 "startHostedPi recovers an unclassified OMP process after a start warning" — mock, spawn, delete (23 lines; tap 0.46 s)
- L954 "startHostedPi recovery does not adopt another pane by name" — mock, spawn, delete (22 lines; tap 0.49 s)
- L977 "hosted stop before pi starts finalizes with the requested reason" — timing, finish-wake, delete, waits: FAKE_HERDR_SHELL_BUSY_MS=6000 race window; waitForFile poll 25ms, 10s deadline; waitForState poll (24 lines; tap 5.71 s)
- L1002 "hosted stop while agent start resolves stops the appeared worker" — timing, finish-wake, delete, waits: FAKE_HERDR_START_BUSY_MS=8000 race window; waitForFile poll 25ms, 10s deadline; waitForState poll (24 lines; tap 11.39 s)
- L1027 "hosted stop records stopped after two interrupts" — seam, finish-wake, scenario, waits: waitForFile poll 25ms, 10s deadline; waitForState poll (18 lines; tap 6.97 s)
- L1046 "hosted stop with a done: reason records done" — duplicate, finish-wake, delete, waits: waitForFile poll 25ms, 10s deadline; waitForState poll, dup of: L1027 hosted stop (done: prefix variant) (17 lines; tap 6.86 s)
- L1064 "hosted stop leaves running when the agent ignores interrupts" — seam, finish-wake, delete, waits: LIMEN_HOSTED_STOP_WAIT_MS=400; waitForFile poll 25ms, 10s deadline; waitForState poll (28 lines; tap 5.53 s)
- L1093 "hosted stop finalizes when the supervisor is gone and the agent is missing" — seam, recovery, scenario, waits: SIGKILL + poll pid gone 25ms, 2s; waitForFile poll 25ms, 10s deadline (31 lines; tap 4.06 s)
- L1125 "two long hosted labels keep distinct agent names" — mock, spawn, delete, waits: waitForFile poll 25ms, 10s deadline; waitForState poll (27 lines; tap 5.88 s)

### `test/spawn-command.test.ts` (930 lines, 27 tests)

Lines by class: seam 573 · copy 131 · mock 83 · wording 64 · duplicate 41 · trivia 38 (sum 930).  
Lines by seam: spawn 834 · spec-keeper 54 · steer-context 16 · finish-wake 14 · groups 12.  
Lines by action: delete 455 · scenario 240 · keep 235.  
TAP time (sum of per-test `duration_ms`, `/tmp/f783-lead/full-suite.tap`): 127.0 s.

- L10 "planning source is persistent, defaults to committed, and private ordinary descendants keep canonical pointers" — seam, spawn, delete, waits: waitForState poll 25ms, 10s deadline ×2 (37 lines; tap 8.24 s)
- L48 "private spawn rejects missing, unreadable, traversal and symlink ticket escapes before publication" — seam, spawn, keep (19 lines; tap 3.83 s)
- L68 "spawn creates isolated branch, canonical record, defaults to omp, and resumes its worktree" — seam, spawn, scenario, waits: waitForState poll 25ms, 10s deadline ×2 (74 lines; tap 6.64 s)
- L143 "OMP jobs build legacy skills from the selected branch without changing its files" — seam, spawn, delete, waits: waitForState poll 25ms, 10s deadline ×2 (29 lines; tap 4.95 s)
- L173 "failure is durable and detailed jobs render facts" — seam, finish-wake, scenario, waits: waitForState poll 25ms, 10s deadline (13 lines; tap 3.27 s)
- L187 "review gets fresh detached worktree and reviewer birth text" — seam, spawn, scenario, waits: waitForState poll 25ms, 10s deadline ×2 (33 lines; tap 6.12 s)
- L221 "stage model defaults respect review roles and explicit overrides" — copy, spawn, delete, waits: waitForState poll 25ms, 10s deadline ×5 (31 lines; tap 11.51 s)
- L264 "prune drops a finished worktree and spawn keeps a resumed one" — seam, spawn, scenario, waits: waitForState poll 25ms, 10s deadline ×3 (28 lines; tap 8.31 s)
- L293 "spawn prints failed when the wrapper dies before writing pid" — seam, spawn, delete (11 lines; tap 2.66 s)
- L305 "explicit pi spawn without pi on PATH fails before worktree add" — seam, spawn, scenario (11 lines; tap 1.22 s)
- L317 "explicit provider reaches authentication preflight without a fallback job" — copy, spawn, delete (31 lines; tap 1.42 s)
- L349 "LIMEN_PREFLIGHT=auth proceeds when check passes" — trivia, spawn, delete, waits: waitForState poll 25ms, 10s deadline (10 lines; tap 3.09 s)
- L360 "task-file and stdin write task.md bytes untouched" — seam, spawn, scenario, waits: waitForState poll 25ms, 10s deadline ×2 (17 lines; tap 4.81 s)
- L378 "spawn warns on a number-only or live-duplicate label and still starts" — wording, spawn, delete, waits: waitForState poll 25ms, 10s deadline ×3 (stop cleanup) (36 lines; tap 9.60 s)
- L415 "spawn --role loads that overlay preamble and persists the name" — copy, steer-context, delete, waits: waitForState poll 25ms, 10s deadline (15 lines; tap 2.78 s)
- L431 "spawn refuses --role coordinator/lead before planting a job" — wording, groups, delete (12 lines; tap 1.32 s)
- L444 "spawn --role without a preamble or with --review plants no job" — wording, spawn, delete (13 lines; tap 1.55 s)
- L458 "LIMEN_PREPARE runs in the worktree before Pi and is logged" — seam, spawn, delete, waits: waitForState poll 25ms, 10s deadline (17 lines; tap 3.12 s)
- L476 "spawn accepts --engine omp and LIMEN_ENGINE, and refuses claude before a job exists" — copy, spawn, delete, waits: waitForState poll 25ms, 10s deadline ×4 (37 lines; tap 9.53 s)
- L514 "bare and explicit omp spawns fail before a job exists when omp is missing" — duplicate, spawn, delete, dup of: L305 explicit pi spawn without pi on PATH fails before worktree add (13 lines; tap 1.47 s)
- L528 "LIMEN_PREFLIGHT=auth does not probe omp" — trivia, spawn, delete, waits: waitForState poll 25ms, 10s deadline (8 lines; tap 2.96 s)
- L537 "spawn refuses a ticket missing from the base commit and starts when it is committed" — seam, spec-keeper, scenario, waits: waitForState poll 25ms, 10s deadline (26 lines; tap 5.61 s)
- L564 "spawn --branch checks the ticket against that branch, not the caller's tree" — duplicate, spec-keeper, delete, waits: waitForState poll 25ms, 10s deadline ×2, dup of: L537 ticket missing from base commit (branch variant) (26 lines; tap 6.53 s)
- L591 "overlapping starts keep both worktrees; prune still drops a genuine leftover" — seam, spawn, keep, waits: prepare gate file polled 50ms; waitFor 25ms, 30s deadlines; 10s settle; test timeout 120s (79 lines; tap 5.95 s)
- L671 "a second spawn cannot delete a worktree still being added" — seam, spawn, keep, waits: fake git wrapper blocks on gate file 50ms; waitFor 30s; waitForState poll 25ms, 10s deadline; test timeout 120s (65 lines; tap 3.86 s)
- L737 "prune between job-directory creation and marker writes cannot delete the start" — mock, spawn, delete, waits: waitForState poll 25ms, 10s deadline; monkeypatched fs.promises.mkdir/rename (58 lines; tap 3.07 s)
- L912 "a positional title labels a task file, and a trailing period does not break the ticket pointer" — trivia, spawn, delete, waits: waitForState poll 25ms, 10s deadline (19 lines; tap 3.62 s)

### `test/group-command.test.ts` (879 lines, 26 tests)

Lines by class: seam 354 · unit 269 · timing 167 · wording 47 · duplicate 42 (sum 879).  
Lines by seam: groups 732 · steer-context 102 · finish-wake 45.  
Lines by action: scenario 320 · delete 315 · keep 244.  
TAP time (sum of per-test `duration_ms`, `/tmp/f783-lead/full-suite.tap`): 259.8 s.

- L98 "group status offers a short roster and opt-in full evidence without losing missing job slots" — wording, groups, delete, waits: activate(): waitForState poll 25ms, 10s deadline per member (29 lines; tap 10.03 s)
- L128 "unknown group commands are rejected before group lookup and missing records are explained" — wording, groups, delete (11 lines; tap 1.94 s)
- L140 "private planning admits an ignored packet without copying it, and pins descendants and continuations" — seam, groups, delete, waits: activate(): waitForState poll 25ms, 10s deadline per member; waitForState poll 25ms, 10s deadline ×2 (40 lines; tap 12.20 s)
- L181 "private packet failures occur before activation, and default mode still requires committed prerequisites" — duplicate, groups, delete, dup of: spawn-command L48 private spawn rejects traversal and symlink escapes (21 lines; tap 3.92 s)
- L203 "group start refuses a hosted job and points at the Herdr coordinator lead recipe" — duplicate, groups, delete, dup of: spawn-command L431 spawn refuses --role coordinator/lead (15 lines; tap 5.86 s)
- L219 "group start refuses a lead registration that no running hook refreshes, and names the reload fix" — timing, groups, delete, waits: registration mtime aged −60s vs freshness window (17 lines; tap 6.71 s)
- L237 "duplicate and concurrent activation start one fixed roster, never repair or add agents" — seam, groups, scenario, waits: waitForState poll 25ms, 10s deadline per member (17 lines; tap 10.71 s)
- L255 "invalid activation creates no group and ignores inherited plant roots" — seam, groups, delete, waits: waitForState poll 25ms, 10s deadline per member (13 lines; tap 7.00 s)
- L269 "concurrent worktree spawns consume one total slot and never create a second cabinet" — seam, groups, scenario, waits: activate(): waitForState poll 25ms, 10s deadline per member; waitForState poll 25ms, 10s deadline (29 lines; tap 11.98 s)
- L299 "worker continuation inherits membership and deadline but consumes another slot" — seam, groups, scenario, waits: activate(): waitForState poll 25ms, 10s deadline per member; waitForState poll 25ms, 10s deadline ×2 (24 lines; tap 12.64 s)
- L324 "informational delivery is per recipient, bounded, deduplicated and preserved across continuation" — unit, groups, keep, waits: activate(): waitForState poll 25ms, 10s deadline per member; waitForState poll 25ms, 10s deadline (40 lines; tap 10.50 s)
- L365 "lifecycle advisories repeat after clearing without duplicates from concurrent synchronization" — unit, groups, keep, waits: activate(): waitForState poll 25ms, 10s deadline per member (31 lines; tap 6.71 s)
- L397 "lifecycle recovery completes an interrupted occurrence before observing a changed advisory" — unit, groups, keep, waits: activate(): waitForState poll 25ms, 10s deadline per member (48 lines; tap 6.84 s)
- L446 "ambiguous acceptance retries at most twice independently for each recipient" — unit, groups, keep, waits: activate(): waitForState poll 25ms, 10s deadline per member (25 lines; tap 7.09 s)
- L472 "bounded waiting returns events, normal timeout, stopped state and expired deadline" — unit, groups, keep, waits: activate(): waitForState poll 25ms, 10s deadline per member; waitGroup 20ms and 1000ms; asserts elapsed < 1000ms (23 lines; tap 6.74 s)
- L496 "stop serializes with launch, dirty close refuses and pruning stays protected until deliberate clean close" — seam, groups, scenario, waits: activate(): waitForState poll 25ms, 10s deadline per member; poll stop fence 25ms, 5s deadline (31 lines; tap 10.62 s)
- L528 "group hook proves processing only after peer data entered context and an assistant responded" — seam, steer-context, scenario, waits: activate(): waitForState poll 25ms, 10s deadline per member (47 lines; tap 7.01 s)
- L576 "detached role deadlines stop a real child and hosted supervision enforces the same recorded deadline" — timing, finish-wake, scenario, waits: activate(): waitForState poll 25ms, 10s deadline per member; worker deadline budgets 2s/6s/15s with retry; waitForState poll 25ms, 10s deadline up to deadline+10s (39 lines; tap 9.76 s)
- L616 "hosted coordinators retain live children; unread findings never keep a clean finished worker alive" — unit, groups, keep, waits: activate(): waitForState poll 25ms, 10s deadline per member; injected clock values (25 lines; tap 7.05 s)
- L642 "automatic lead updates stay agent-attributed and only processed context suppresses replay" — seam, steer-context, delete, waits: activate(): waitForState poll 25ms, 10s deadline per member; race against delay 5000ms (40 lines; tap 13.20 s)
- L683 "an OMP lead without PI_SESSION_ID is recognized only through its registered ancestor process" — seam, groups, delete, waits: waitForState poll 25ms, 10s deadline per member; bystander child process 60s (28 lines; tap 8.73 s)
- L712 "per-team models route each coordinator and gate that team's worker launches" — seam, groups, delete, waits: waitForState poll 25ms, 10s deadline per member; waitForState poll 25ms, 10s deadline (34 lines; tap 8.68 s)
- L747 "uncertain stall observations stay out of group lifecycle while real advisories are shared" — unit, groups, delete, waits: activate(): waitForState poll 25ms, 10s deadline per member (22 lines; tap 8.26 s)
- L770 "busy cabinet never blocks finalization or loses its deferred lifecycle event" — timing, groups, scenario, waits: activate(): waitForState poll 25ms, 10s deadline per member; delay 11000ms holding the cabinet lock (36 lines; tap 17.84 s)
- L808 "a ${command} waits beyond ten seconds for a real sibling launch without half-claimed members" — timing, groups, scenario, waits: activate(): waitForState poll 25ms, 10s deadline per member; git post-checkout hook sleeps 12000ms; poll marker 25ms 5s; asserts elapsed > 10000ms; runs twice (spawn, continue) (51 lines; tap 47.23 s over 2 runs)
- L861 "cabinet recovery reclaims a dead owner but never displaces an aged live owner" — unit, groups, keep, waits: lock mtime aged −60s (19 lines; tap 0.57 s)

### `test/finish-webhook.test.ts` (829 lines, 28 tests)

Lines by class: seam 412 · duplicate 157 · wording 144 · timing 85 · trivia 31 (sum 829).  
Lines by seam: webhooks 815 · finish-wake 14.  
Lines by action: delete 409 · scenario 393 · keep 27.  
TAP time (sum of per-test `duration_ms`, `/tmp/f783-lead/full-suite.tap`): 146.9 s.

- L96 "automatic finish decision: ${state} with ${result === undefined ? "missing" : "a"} result sends once with its reason" — seam, webhooks, scenario, waits: fixture copies src/ hook/ templates/ per test; runs 6× (state × result) (39 lines; tap 11.17 s over 6 runs)
- L138 "jobs at the same recorded tip each send, including with a legacy tip marker" — duplicate, webhooks, delete, waits: fixture copies src/ hook/ templates/ per test, dup of: L162 two detached jobs at the same HEAD each send (23 lines; tap 1.63 s)
- L162 "two detached jobs that settle at the same HEAD each send an automatic ping" — seam, webhooks, scenario, waits: fixture copies src/ hook/ templates/ per test; delivery(): poll finish-webhook 25ms, 20s deadline (14 lines; tap 5.86 s)
- L177 "automatic delivery invokes the real canonical helper with synthetic dotenv and intercepted transport" — seam, webhooks, scenario, waits: fixture copies src/ hook/ templates/ per test; delivery(): poll finish-webhook 25ms, 20s deadline (25 lines; tap 3.44 s)
- L203 "automatic delivery finds Limen's Node runtime when the inherited PATH cannot run node" — seam, webhooks, delete, waits: fixture copies src/ hook/ templates/ per test; delivery(): poll finish-webhook 25ms, 20s deadline (23 lines; tap 1.58 s)
- L228 "automatic fan-out reaches two bot routes after terminal state; first HTTP ${firstStatus} stays HTTP-only" — wording, webhooks, scenario, waits: fixture copies src/ hook/ templates/ per test; delivery(): poll finish-webhook 25ms, 20s deadline; stall case waits the sender's 3000ms timeout twice; runs 2× (122 lines; tap 18.93 s over 2 runs)
- L352 "private receipt channel discards malformed, secret-bearing, duplicate and overflowing sender output" — seam, webhooks, keep, waits: fixture copies src/ hook/ templates/ per test (23 lines; tap 1.59 s)
- L376 "detached completion sends exact arguments only after durable state using an absolute explicit config snapshot" — seam, webhooks, scenario, waits: fixture copies src/ hook/ templates/ per test; delivery(): poll finish-webhook 25ms, 20s deadline (16 lines; tap 3.66 s)
- L393 "canonical project config is selected from a linked worktree, never the worktree-local decoy" — seam, webhooks, delete, waits: fixture copies src/ hook/ templates/ per test; delivery(): poll finish-webhook 25ms, 20s deadline (13 lines; tap 3.28 s)
- L407 "workspace jobs use the coordinator project's config rather than a child repository destination" — seam, webhooks, delete, waits: fixture copies src/ hook/ templates/ per test; delivery(): poll finish-webhook 25ms, 20s deadline (11 lines; tap 3.58 s)
- L419 "a retired env-path override does not opt an unconfigured job into delivery" — trivia, webhooks, delete, waits: fixture copies src/ hook/ templates/ per test; waitForState poll 25ms, 10s deadline (11 lines; tap 3.13 s)
- L431 "unconfigured jobs never inherit home config or a later finalizer environment" — seam, webhooks, scenario, waits: fixture copies src/ hook/ templates/ per test; waitForState poll 25ms, 10s deadline (15 lines; tap 3.48 s)
- L447 "concurrent processes and repeated finalization make one automatic attempt; failure preserves outcome and routing" — duplicate, webhooks, delete, waits: fixture copies src/ hook/ templates/ per test; delivery(): poll finish-webhook 25ms, 20s deadline, dup of: L96 automatic finish decision (also runs 4 concurrent deliveries and a repeat finalize) (19 lines; tap 1.75 s)
- L467 "hosted supervisor completion uses the same automatic path without a worker manual ping" — duplicate, webhooks, delete, waits: fixture copies src/ hook/ templates/ per test; delivery(): poll finish-webhook 25ms, 20s deadline, dup of: L376 detached completion sends after durable state (hosted entry) (17 lines; tap 1.94 s)
- L485 "hanging sender and its descendant are killed within shutdown grace without changing stopped state" — timing, webhooks, delete, waits: fixture copies src/ hook/ templates/ per test; sender hangs until the 3000ms sender timeout; asserts elapsed < 4500ms (20 lines; tap 5.45 s)
- L506 "a slow Herdr coordinator prompt does not spend the configured webhook's shutdown budget" — timing, webhooks, delete, waits: fixture copies src/ hook/ templates/ per test; fake Herdr sleeps 20000ms; finalize deadline now+4000ms (17 lines; tap 5.24 s)
- L524 "a sender timeout gets one bounded successful retry and records both attempts" — timing, webhooks, delete, waits: fixture copies src/ hook/ templates/ per test; first attempt hangs to the 3000ms sender timeout (18 lines; tap 4.35 s)
- L543 "a timeout at the shutdown deadline records no retry" — timing, webhooks, delete, waits: fixture copies src/ hook/ templates/ per test; sender hangs; deliver deadline now+2500ms (17 lines; tap 3.80 s)
- L561 "an exhausted shutdown budget records not sent without launching the helper" — trivia, webhooks, delete, waits: fixture copies src/ hook/ templates/ per test; delivery(): poll finish-webhook 25ms, 20s deadline (15 lines; tap 1.30 s)
- L577 "missing config and unavailable sender fail safely, while an interrupted claim is never retried automatically" — seam, webhooks, delete, waits: fixture copies src/ hook/ templates/ per test; delivery(): poll finish-webhook 25ms, 20s deadline (19 lines; tap 1.64 s)
- L597 "a detached timeout sends job.timed-out with its reason before its self-kill grace" — seam, finish-wake, scenario, waits: fixture copies src/ hook/ templates/ per test; job --timeout 1s; delivery(): poll finish-webhook 25ms, 20s deadline (12 lines; tap 6.25 s)
- L610 "continuation retains only its parent's config path even when the caller selects another destination" — seam, webhooks, delete, waits: fixture copies src/ hook/ templates/ per test; delivery(): poll finish-webhook 25ms, 20s deadline ×2 (15 lines; tap 5.15 s)
- L637 "two collaborators' finishes reach only their mapped targets after edits and lane moves" — seam, webhooks, scenario, waits: fixture copies src/ hook/ templates/ per test; delivery(): poll finish-webhook 25ms, 20s deadline ×2 (48 lines; tap 9.88 s)
- L686 "missing attribution and unmapped logins skip unless fallback is explicit" — seam, webhooks, scenario, waits: fixture copies src/ hook/ templates/ per test; delivery(): poll finish-webhook 25ms, 20s deadline ×4 (37 lines; tap 13.45 s)
- L724 "invalid author maps make zero requests and leave the job result intact" — duplicate, webhooks, delete, waits: fixture copies src/ hook/ templates/ per test; delivery(): poll finish-webhook 25ms, 20s deadline, dup of: L686 unmapped logins skip (fail-closed author routing) (24 lines; tap 5.52 s)
- L749 "continuation keeps captured author after the ticket is removed" — seam, webhooks, delete, waits: fixture copies src/ hook/ templates/ per test; waitForState poll 25ms, 10s deadline ×2 (19 lines; tap 7.81 s)
- L769 "hosted completion filters by captured author and preserves ordinals on partial failure" — duplicate, webhooks, delete, waits: fixture copies src/ hook/ templates/ per test; delivery(): poll finish-webhook 25ms, 20s deadline, dup of: L637 mapped author targets (hosted entry, partial failure) (46 lines; tap 4.30 s)
- L816 "workspace, shallow, and later ticket evidence do not invent an author" — seam, webhooks, delete, waits: fixture copies src/ hook/ templates/ per test (14 lines; tap 7.73 s)

### `test/github-doorbell.test.ts` (700 lines, 11 tests)

Lines by class: unit 228 · seam 216 · mock 156 · duplicate 100 (sum 700).  
Lines by seam: doorbell 700.  
Lines by action: delete 299 · scenario 216 · keep 185.  
TAP time (sum of per-test `duration_ms`, `/tmp/f783-lead/full-suite.tap`): 32.3 s.

- L31 "only an exact write-authorized PR comment claims a request; unavailable coordinator never spawns" — unit, doorbell, keep, waits: stubbed global fetch (68 lines; tap 1.54 s)
- L100 "a rejected bare-shell prompt retries after recovery without duplicate notice" — mock, doorbell, delete, waits: claim attemptedAt aged −31s (retry backoff window) (55 lines; tap 1.61 s)
- L156 "one idle coordinator accepts two repository-specific requests and rejects a noninteractive pane" — mock, doorbell, delete (92 lines; tap 3.89 s)
- L249 "a generic hosted worker and a nonce-backed no-job answer reconcile without a review claim" — unit, doorbell, keep, waits: stubbed global fetch (72 lines; tap 1.33 s)
- L322 "a forged checkout claim and hosted-looking job cannot earn an App receipt" — unit, doorbell, keep, waits: stubbed global fetch (34 lines; tap 1.40 s)
- L357 "reconciliation posts start and terminal once for matching hosted pinned job, never approval" — duplicate, doorbell, delete, waits: stubbed global fetch, dup of: L608 one start and one terminal reply; L322 forged receipt (58 lines; tap 1.85 s)
- L416 "poller restart recognizes its own posted receipt after an interrupted write" — unit, doorbell, delete, waits: stubbed global fetch (41 lines; tap 1.54 s)
- L458 "review records an explicitly pinned base and refuses a moved head" — seam, doorbell, scenario, waits: waitForState poll 25ms, 10s deadline (25 lines; tap 4.80 s)
- L484 "coordinator review refuses a changed PR head and never falls back to detached without Herdr" — duplicate, doorbell, delete, dup of: L458 refuses a moved head; hosted-spawn L409 refuses without Herdr (36 lines; tap 2.96 s)
- L521 "an authorized comment on an open issue claims one request and prompts the coordinator with the issue" — seam, doorbell, scenario, waits: stubbed global fetch; real sudo handoff via fake sudo (86 lines; tap 3.32 s)
- L608 "github review refuses an issue claim; github work starts one hosted job that earns one start and one terminal reply" — seam, doorbell, scenario, waits: waitForState poll 25ms, 10s deadline; stateful fake Herdr (93 lines; tap 8.01 s)
