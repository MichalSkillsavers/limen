# Team 1 worker · the 12 largest test files: scores and Git history

Scope: the 12 largest files in `test/`, 9,299 lines (`wc -l`). The coordinator scores the other 46 files. Author: team-1 worker job `2026-10-06-f925-team-1-big12-8091051c`.

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
| `test/wake-hook.test.ts` | 1889 | finish-wake | mock | delete | real hook with a stubbed Pi host and hand-written job files; a third Herdr call-log mocks, the rest wording and fixed-sleep absence checks around a core of claim and routing tests |
| `test/hosted-spawn.test.ts` | 1340 | finish-wake | seam | delete | good noteHostedIdle/parser units, but half the lines assert fake-Herdr argv and race windows instead of job state |
| `test/spawn-command.test.ts` | 930 | spawn | seam | delete | real `bin/limen` spawns in temp Git repos; core spawn, review, prune and ticket-gate paths, plus argv copies and refusal wording |
| `test/group-command.test.ts` | 879 | groups | seam | scenario | real group start, then half direct cabinet/event units and three wall-clock contention tests (11 s, 12 s ×2) |
| `test/finish-webhook.test.ts` | 829 | webhooks | seam | delete | real finalize path and real helper with intercepted fetch; strong allowlist and author-routing checks, but each test copies the package and four tests wait on 2.5–20 s sender/Herdr timeouts |
| `test/github-doorbell.test.ts` | 700 | doorbell | unit | delete | internal poller functions with stubbed fetch; the claim allowlist and forged-receipt checks are cheap security units, two `bin/limen github` runs are the only end-to-end paths |
| `test/continue-command.test.ts` | 506 | steer-context | seam | delete | real `bin/limen continue`; two core resume paths, the rest argv copies, refusal variants and monkeypatched publication races |
| `test/communication-hook.test.ts` | 504 | steer-context | wording | delete | real hook, stub host; asserts the assembled prompt and cue text line by line; one worker-prompt check and one cache-stability check matter |
| `test/jobs-command.test.ts` | 466 | jobs-view | wording | delete | real `bin/limen jobs` on hand-written records; nearly every assertion is display text |
| `test/wake-sweep.test.ts` | 443 | finish-wake | unit | keep | deterministic wake-hook harness on a fake clock; the claim, fallback and exhaustion units that the slow wake-hook tests repeat with sleeps |
| `test/finish-webhook-helper.test.ts` | 427 | webhooks | unit | keep | real helper script with intercepted fetch; a cheap allowlist table for auth, URL, targets, author maps and env-as-data |
| `test/recovery.test.ts` | 386 | recovery | unit | keep | real supervisors and sweeps as child processes with an injected clock; reap and adopt decisions are units, competing-sweep runs are the scenario |

Seam, Class and Action in each row are the largest line share in that file. Section 2 gives the full split.

## Totals for the 12 files

Total 9299 lines (`wc -l`). Source: the per-file splits in section 2.

| Class | Lines | Share | TAP seconds |
| --- | --- | --- | --- |
| seam | 2948 | 31.7% | 403 |
| unit | 1740 | 18.7% | 80 |
| mock | 1326 | 14.3% | 52 |
| copy | 430 | 4.6% | 85 |
| wording | 1059 | 11.4% | 67 |
| timing | 545 | 5.9% | 143 |
| duplicate | 1105 | 11.9% | 95 |
| trivia | 146 | 1.6% | 30 |
| total | 9299 | 100% | 954 |

| Seam | Lines |
| --- | --- |
| finish-wake | 2919 |
| spawn | 1453 |
| webhooks | 1242 |
| steer-context | 1185 |
| groups | 744 |
| doorbell | 700 |
| recovery | 580 |
| jobs-view | 422 |
| spec-keeper | 54 |

| Action | Lines | TAP seconds |
| --- | --- | --- |
| delete | 5145 | 533 |
| scenario | 2272 | 338 |
| keep | 1882 | 84 |

- `seam` class: 2948 lines (31.7%). Of those, 2192 lines sit in tests I mark `scenario` or `keep`. The other 756 lines are real-path tests of details that are not on a seam a user must never lose, for example private planning, workspace repos, LIMEN_PREPARE and OMP skills.
- `mock`, `copy`, `wording`, `timing`, `duplicate` and `trivia` together: 4611 lines (49.6%).
- `unit`: 1740 lines (18.7%). Most are cheap: their TAP time is 80 s across all 12 files. The cheap unit sets are `wake-sweep`, `finish-webhook-helper`, the `noteHostedIdle` units in `hosted-spawn` and the group-events units in `group-command`.
- Time: these 12 files take 954 s of the 1,502 s F783 run (`/tmp/f783-lead/full-suite.tap`). Tests I mark `delete` account for 533 s. Tests I mark `scenario` account for 338 s, and that time stays until the scenario rewrite replaces them.
- Seams with no real end-to-end test in these 12 files: `land`. The only `limen land` call is a refusal (`group-command` L293, "lead owns landing"), and `wake-hook` L739 fakes a land with `git merge --ff-only`. `spec-keeper` appears only as the spawn ticket gate (`spawn-command` L537, L564). `ticket new`, `ticket check` and `keeper` are not called here. The coordinator's files must cover both.
- The hypothesis holds for these files, narrowly. Tests that drive the real path are 31.7% of the lines, just under one third. After you drop real-path tests of non-seam details, the lines that guard a seam are 2192 (23.6%). Most of the excess is `wake-hook` Herdr mocks, `communication-hook` and `jobs-command` text checks, argv copies in the spawn and continue files, and the long timing windows in `group-command` and `finish-webhook`.

## Slow tests and wall-clock waits (these 12 files)

Source: per-test `duration_ms` in `/tmp/f783-lead/full-suite.tap`, max over title matches; template titles sum their runs. The machine was loaded. `communication-hook` L388 "a project AGENTS.md suppresses the inherited shop manual" took 10.8 s for a pure in-memory check, so single numbers carry stall noise.

| TAP s | File | Test | Class | Action | What it waits on |
| --- | --- | --- | --- | --- | --- |
| 47.2 | `group-command` | L808 a ${command} waits beyond ten seconds for a real sibling launch without half-cla | timing | scenario | activate(): waitForState poll 25ms, 10s deadline per member; git post-checkout hook sleeps 12000ms; poll marker 25ms 5s; asserts elapsed > 10000ms; runs twice (spawn, continue) |
| 18.9 | `finish-webhook` | L228 automatic fan-out reaches two bot routes after terminal state; first HTTP ${firs | wording | scenario | fixture copies src/ hook/ templates/ per test; delivery(): poll finish-webhook 25ms, 20s deadline; stall case waits the sender's 3000ms timeout twice; runs 2× |
| 17.8 | `group-command` | L770 busy cabinet never blocks finalization or loses its deferred lifecycle event | timing | scenario | activate(): waitForState poll 25ms, 10s deadline per member; delay 11000ms holding the cabinet lock |
| 17.3 | `hosted-spawn` | L774 spawn --review in Herdr is hosted; --detached keeps a watch tab | duplicate | delete | waitForState poll 25ms, 10s deadline ×4; waitForFile poll 25ms, 10s deadline |
| 14.9 | `hosted-spawn` | L868 hosted continue survives a killed caller and passes durable @continue, not @task | seam | scenario | returnedMs < 6000 wall-clock bound; FAKE_HERDR_SHELL_BUSY_MS=2000; 20s caller deadline; waitForFile poll 25ms, 10s deadline; waitForState poll |
| 13.4 | `finish-webhook` | L686 missing attribution and unmapped logins skip unless fallback is explicit | seam | scenario | fixture copies src/ hook/ templates/ per test; delivery(): poll finish-webhook 25ms, 20s deadline ×4 |
| 13.2 | `group-command` | L642 automatic lead updates stay agent-attributed and only processed context suppress | seam | delete | activate(): waitForState poll 25ms, 10s deadline per member; race against delay 5000ms |
| 12.9 | `continue-command` | L314 workspace continue copies repo and uses the child's branch (pruned: ${pruned}) | seam | delete | waitForState poll 25ms, 10s deadline ×2; runs 2× |
| 12.6 | `group-command` | L299 worker continuation inherits membership and deadline but consumes another slot | seam | scenario | activate(): waitForState poll 25ms, 10s deadline per member; waitForState poll 25ms, 10s deadline ×2 |
| 12.2 | `group-command` | L140 private planning admits an ignored packet without copying it, and pins descendan | seam | delete | activate(): waitForState poll 25ms, 10s deadline per member; waitForState poll 25ms, 10s deadline ×2 |
| 12.0 | `group-command` | L269 concurrent worktree spawns consume one total slot and never create a second cabi | seam | scenario | activate(): waitForState poll 25ms, 10s deadline per member; waitForState poll 25ms, 10s deadline |
| 12.0 | `hosted-spawn` | L509 hosted spawn and continuation forward literal Pi launch flags | copy | delete | waitForState poll |
| 12.0 | `continue-command` | L439 continue preserves a Pi parent despite the OMP default (legacy: ${legacy}) | copy | delete | waitForState poll 25ms, 10s deadline ×2; runs 2× |
| 11.8 | `hosted-spawn` | L565 hosted spawn and continuation keep quoted multiline tasks out of shell arguments | seam | scenario | waitForState poll |
| 11.8 | `continue-command` | L116 continue sends an explicit model rather than inheriting Pi settings or the old s | copy | delete | waitForState poll 25ms, 10s deadline ×7 |
| 11.5 | `spawn-command` | L221 stage model defaults respect review roles and explicit overrides | copy | delete | waitForState poll 25ms, 10s deadline ×5 |
| 11.4 | `hosted-spawn` | L1002 hosted stop while agent start resolves stops the appeared worker | timing | delete | FAKE_HERDR_START_BUSY_MS=8000 race window; waitForFile poll 25ms, 10s deadline; waitForState poll |
| 11.2 | `finish-webhook` | L96 automatic finish decision: ${state} with ${result === undefined ? "missing" : "a | seam | scenario | fixture copies src/ hook/ templates/ per test; runs 6× (state × result) |
| 10.8 | `communication-hook` | L388 a project AGENTS.md suppresses the inherited shop manual | trivia | delete |  |
| 10.7 | `group-command` | L237 duplicate and concurrent activation start one fixed roster, never repair or add  | seam | scenario | waitForState poll 25ms, 10s deadline per member |

Tests whose verdict needs a fixed sleep or a wall-clock window (class `timing`, or a fixed absence sleep inside another class):

- `wake-hook` L30 "wake ignores history, announces start, and steers once on terminal change": poll 20ms until predicate, 3s/5s deadline; setTimeout 100ms absence
- `wake-hook` L342 "/limen off mutes the session and /limen on catches up once": poll 20ms until predicate, 3s/5s deadline; setTimeout 150ms absence
- `wake-hook` L674 "the coordinator tab keeps running and finished counts on its stem; an owner turn clears th": poll herdr call files 5s; setTimeout 600ms absence (one 500ms sweep)
- `wake-hook` L907 "muting holds job notices and wakes until the conversation is unmuted": setTimeout 200ms absence; poll 3s/5s
- `wake-hook` L970 "a concretely missing hosted job is reaped once and wakes while a pidless young job keeps g": LIMEN_REAP_CONFIRM_MS=30; poll 3s; setTimeout 200ms absence
- `wake-hook` L1175 "one assistant response confirms every batched followUp wake in the turn": poll 20ms until predicate, 3s/5s deadline; setTimeout 650ms absence
- `wake-hook` L1244 "a rejected injection releases the claim and the next sweep retries": setTimeout 150ms; poll log 5s; poll 20ms until predicate, 3s/5s deadline
- `wake-hook` L1300 "an accepted wake is recovered after shutdown when no turn ran": utimes claim −31s; setTimeout 550ms absence; poll 3s
- `wake-hook` L1355 "another listener does not recover a live accepted claim": utimes −31s; setTimeout 650ms absence is the verdict
- `wake-hook` L1407 "competing subscribers ${failure ? "share two failures without a late confirmation reset" :": poll 3s; setTimeout 1100ms absence (failure case); runs 2×
- `wake-hook` L1454 "provider-error turns exhaust the allowance after two failures": poll 3s; setTimeout 1100ms absence
- `wake-hook` L1608 "a stop-marked session receives no completion wake": setTimeout 200ms absence; poll 3s
- `wake-hook` L1656 "fallback waits out the grace window and skips sessions that own no jobs": LIMEN_WAKE_FALLBACK_MS=60000; setTimeout 250ms absence
- `wake-hook` L1721 "a wake opens with label and task and ends with the instruction": setTimeout 650ms absence
- `wake-hook` L1767 "standing uncertainty waits one minute and delivers once across transitions and listener re": spoofed since −61s; 2× setTimeout 650ms absence; poll 3s/5s
- `wake-hook` L1819 "uncertainty does not queue into a busy recipient or consume failure and completion attempt": 4× setTimeout 650ms absence; poll 3s
- `hosted-spawn` L654 "hosted start does not restore focus over a human tab change": FAKE_HERDR_START_BUSY_MS=8000 blocks herdr; waitForFile poll 25ms, 10s deadline; waitForState poll
- `hosted-spawn` L673 "hosted supervisor refuses an unbound moved pane and finalizes when its tab closes": waitForFile poll 25ms, 10s deadline; setTimeout 1500ms then assert still running; waitForState poll
- `hosted-spawn` L816 "a hosted job finalizes on session end, never on unseen idle after tools": setTimeout 3000ms then assert still running; waitForState poll; waitForFile poll 25ms, 10s deadline
- `hosted-spawn` L977 "hosted stop before pi starts finalizes with the requested reason": FAKE_HERDR_SHELL_BUSY_MS=6000 race window; waitForFile poll 25ms, 10s deadline; waitForState poll
- `hosted-spawn` L1002 "hosted stop while agent start resolves stops the appeared worker": FAKE_HERDR_START_BUSY_MS=8000 race window; waitForFile poll 25ms, 10s deadline; waitForState poll
- `group-command` L219 "group start refuses a lead registration that no running hook refreshes, and names the relo": registration mtime aged −60s vs freshness window
- `group-command` L472 "bounded waiting returns events, normal timeout, stopped state and expired deadline": activate(): waitForState poll 25ms, 10s deadline per member; waitGroup 20ms and 1000ms; asserts elapsed < 1000ms
- `group-command` L576 "detached role deadlines stop a real child and hosted supervision enforces the same recorde": activate(): waitForState poll 25ms, 10s deadline per member; worker deadline budgets 2s/6s/15s with retry; waitForState poll 25ms, 10s deadline up to deadline+10s
- `group-command` L642 "automatic lead updates stay agent-attributed and only processed context suppresses replay": activate(): waitForState poll 25ms, 10s deadline per member; race against delay 5000ms
- `group-command` L770 "busy cabinet never blocks finalization or loses its deferred lifecycle event": activate(): waitForState poll 25ms, 10s deadline per member; delay 11000ms holding the cabinet lock
- `group-command` L808 "a ${command} waits beyond ten seconds for a real sibling launch without half-claimed membe": activate(): waitForState poll 25ms, 10s deadline per member; git post-checkout hook sleeps 12000ms; poll marker 25ms 5s; asserts elapsed > 10000ms; runs twice (spawn, continue)
- `group-command` L861 "cabinet recovery reclaims a dead owner but never displaces an aged live owner": lock mtime aged −60s
- `finish-webhook` L485 "hanging sender and its descendant are killed within shutdown grace without changing stoppe": fixture copies src/ hook/ templates/ per test; sender hangs until the 3000ms sender timeout; asserts elapsed < 4500ms
- `finish-webhook` L506 "a slow Herdr coordinator prompt does not spend the configured webhook's shutdown budget": fixture copies src/ hook/ templates/ per test; fake Herdr sleeps 20000ms; finalize deadline now+4000ms
- `finish-webhook` L524 "a sender timeout gets one bounded successful retry and records both attempts": fixture copies src/ hook/ templates/ per test; first attempt hangs to the 3000ms sender timeout
- `finish-webhook` L543 "a timeout at the shutdown deadline records no retry": fixture copies src/ hook/ templates/ per test; sender hangs; deliver deadline now+2500ms
- `github-doorbell` L100 "a rejected bare-shell prompt retries after recovery without duplicate notice": claim attemptedAt aged −31s (retry backoff window)
- `continue-command` L292 "continue refuses a running job or missing transcript without writing records": fake engine sleeps 1500ms so the parent is still running; poll pid 25ms 5s; waitForState poll 25ms, 10s deadline
- `recovery` L286 "uncertain Herdr never adopts or fails, including cached life and a failed relocation probe": injected clock; ownership-uncertainty since −61s; Linux-only tail

## 2–3. Line splits and per-test lists

Format: `L<line> "<title>" — class, seam, action, waits, dup of (test lines; TAP time)`.

### `test/wake-hook.test.ts` (1889 lines, 36 tests)

Lines by class: mock 579 · seam 570 · duplicate 333 · wording 225 · timing 156 · trivia 26 (sum 1889).  
Lines by seam: finish-wake 1768 · recovery 78 · steer-context 43.  
Lines by action: delete 1416 · scenario 473.  
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
- L970 "a concretely missing hosted job is reaped once and wakes while a pidless young job keeps grace" — duplicate, recovery, delete, waits: LIMEN_REAP_CONFIRM_MS=30; poll 3s; setTimeout 200ms absence, dup of: recovery L353 concretely missing agent fails with handoff and wake eligibility (75 lines; tap 0.92 s)
- L1046 "an idle advisory wakes once, stays running, and does not block completion" — seam, finish-wake, scenario, waits: poll 20ms until predicate, 3s/5s deadline (52 lines; tap 0.32 s)
- L1099 "an errored advisory wake says the last turn failed" — wording, finish-wake, delete, waits: poll 20ms until predicate, 3s/5s deadline, dup of: L1046 (same advisory path, other text) (41 lines; tap 0.07 s)
- L1141 "first idle wake in a sweep is a real turn; later wakes are followUp" — mock, finish-wake, delete, waits: poll 20ms until predicate, 3s/5s deadline (33 lines; tap 0.03 s)
- L1175 "one assistant response confirms every batched followUp wake in the turn" — mock, finish-wake, delete, waits: poll 20ms until predicate, 3s/5s deadline; setTimeout 650ms absence (39 lines; tap 0.68 s)
- L1215 "a busy session injects every wake as followUp" — duplicate, finish-wake, delete, waits: poll 20ms until predicate, 3s/5s deadline, dup of: L1141 (busy → followUp is its other half) (28 lines; tap 0.04 s)
- L1244 "a rejected injection releases the claim and the next sweep retries" — seam, finish-wake, scenario, waits: setTimeout 150ms; poll log 5s; poll 20ms until predicate, 3s/5s deadline (55 lines; tap 0.29 s)
- L1300 "an accepted wake is recovered after shutdown when no turn ran" — seam, finish-wake, scenario, waits: utimes claim −31s; setTimeout 550ms absence; poll 3s (54 lines; tap 0.61 s)
- L1355 "another listener does not recover a live accepted claim" — timing, finish-wake, delete, waits: utimes −31s; setTimeout 650ms absence is the verdict, dup of: L1300 first half (live owner protects claim) (50 lines; tap 0.69 s)
- L1407 "competing subscribers ${failure ? "share two failures without a late confirmation reset" : "still fan out successful wakes"}" — duplicate, finish-wake, delete, waits: poll 3s; setTimeout 1100ms absence (failure case); runs 2×, dup of: L398 fan-out; wake-sweep L234 two-failure stop on a fake clock (45 lines; tap 1.67 s over 2 runs)
- L1454 "provider-error turns exhaust the allowance after two failures" — duplicate, finish-wake, delete, waits: poll 3s; setTimeout 1100ms absence, dup of: wake-sweep L234 completion subscriber stops after two error failures (fake clock) (44 lines; tap 1.16 s)
- L1499 "a footer failure leaves completion delivery and sweeps alive" — mock, finish-wake, delete, waits: poll .limen/log 5s (48 lines; tap 0.08 s)
- L1548 "session start delivers a standing advisory before a completion" — wording, finish-wake, delete, waits: poll 20ms until predicate, 3s/5s deadline (33 lines; tap 0.05 s)
- L1582 "an open coordinator stamps last-sweep and shutdown stops refreshing it" — trivia, finish-wake, delete, waits: poll stamp file 5s (25 lines; tap 0.00 s)
- L1608 "a stop-marked session receives no completion wake" — seam, finish-wake, scenario, waits: setTimeout 200ms absence; poll 3s (47 lines; tap 0.23 s)
- L1656 "fallback waits out the grace window and skips sessions that own no jobs" — duplicate, finish-wake, delete, waits: LIMEN_WAKE_FALLBACK_MS=60000; setTimeout 250ms absence, dup of: wake-sweep L12 fallback grace on a fake clock, and L398 fallback leg (64 lines; tap 0.44 s)
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

Lines by class: seam 397 · duplicate 172 · wording 144 · timing 85 · trivia 31 (sum 829).  
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
- L393 "canonical project config is selected from a linked worktree, never the worktree-local decoy" — duplicate, webhooks, delete, waits: fixture copies src/ hook/ templates/ per test; delivery(): poll finish-webhook 25ms, 20s deadline, dup of: finish-webhook-helper Git common directory selects the canonical project's config (same rule, cheaper) (13 lines; tap 3.28 s)
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

### `test/continue-command.test.ts` (506 lines, 15 tests)

Lines by class: seam 239 · copy 97 · mock 84 · duplicate 51 · timing 22 · trivia 13 (sum 506).  
Lines by seam: steer-context 467 · spawn 39.  
Lines by action: delete 424 · scenario 82.  
TAP time (sum of per-test `duration_ms`, `/tmp/f783-lead/full-suite.tap`): 113.3 s.

- L34 "private continuation retains source and canonical ticket even after a setting change and checkout restoration" — seam, steer-context, delete, waits: waitForState poll 25ms, 10s deadline ×3 (43 lines; tap 8.98 s)
- L78 "continue resumes a finished job in its own session and links the record" — seam, steer-context, scenario, waits: waitForState poll 25ms, 10s deadline ×2 (37 lines; tap 4.84 s)
- L116 "continue sends an explicit model rather than inheriting Pi settings or the old session" — copy, steer-context, delete, waits: waitForState poll 25ms, 10s deadline ×7 (23 lines; tap 11.78 s)
- L140 "detached spawn and continuation forward literal provider, model, and thinking flags" — duplicate, steer-context, delete, waits: waitForState poll 25ms, 10s deadline ×2, dup of: hosted-spawn L509 hosted spawn and continuation forward literal Pi launch flags (19 lines; tap 4.36 s)
- L160 "continue without --review loads the parent role preamble" — copy, steer-context, delete, waits: waitForState poll 25ms, 10s deadline ×2 (16 lines; tap 4.51 s)
- L177 "continue restores a pruned finished checkout from its branch and saved session" — seam, steer-context, scenario, waits: waitForState poll 25ms, 10s deadline ×2 (36 lines; tap 6.70 s)
- L215 "continuation publication ${failPublication ? "failure preserves parent without a child" : "survives prune before markers"}" — mock, steer-context, delete, waits: waitForState poll 25ms, 10s deadline; preload monkeypatches fs.promises.writeFile/rename; runs 2× (75 lines; tap 9.18 s over 2 runs)
- L292 "continue refuses a running job or missing transcript without writing records" — timing, steer-context, delete, waits: fake engine sleeps 1500ms so the parent is still running; poll pid 25ms 5s; waitForState poll 25ms, 10s deadline (20 lines; tap 6.23 s)
- L314 "workspace continue copies repo and uses the child's branch (pruned: ${pruned})" — seam, steer-context, delete, waits: waitForState poll 25ms, 10s deadline ×2; runs 2× (32 lines; tap 12.94 s over 2 runs)
- L349 "continue refuses a pruned checkout when its branch is ${unavailable} without writing records" — seam, steer-context, delete, waits: waitForState poll 25ms, 10s deadline; runs 2× (30 lines; tap 10.14 s over 2 runs)
- L381 "continue after prune leaves a live nested child owned by another checkout untouched" — seam, spawn, delete, waits: waitForState poll 25ms, 10s deadline ×2 (35 lines; tap 6.35 s)
- L417 "continue --detached stays a wrapper even in Herdr" — copy, steer-context, delete, waits: waitForState poll 25ms, 10s deadline ×2 (20 lines; tap 4.91 s)
- L439 "continue preserves a Pi parent despite the OMP default (legacy: ${legacy})" — copy, steer-context, delete, waits: waitForState poll 25ms, 10s deadline ×2; runs 2× (27 lines; tap 11.96 s over 2 runs)
- L468 "LIMEN_PREFLIGHT=auth fails continue with no record" — trivia, steer-context, delete, waits: waitForState poll 25ms, 10s deadline (12 lines; tap 4.79 s)
- L481 "hosted continue start failure finalizes the child record" — duplicate, steer-context, delete, waits: waitForState poll 25ms, 10s deadline, dup of: hosted-spawn L605 hosted start failure finalizes failed (26 lines; tap 5.59 s)

### `test/communication-hook.test.ts` (504 lines, 22 tests)

Lines by class: wording 256 · copy 84 · seam 73 · duplicate 45 · unit 24 · trivia 22 (sum 504).  
Lines by seam: steer-context 504.  
Lines by action: delete 430 · scenario 60 · keep 14.  
TAP time (sum of per-test `duration_ms`, `/tmp/f783-lead/full-suite.tap`): 15.4 s.

- L123 "private planning guidance uses canonical vision and board and honors the job's recorded source" — seam, steer-context, delete (18 lines; tap 2.47 s)
- L142 "two human turns with unchanged files share a system prompt, and a wake turn matches" — unit, steer-context, keep (10 lines; tap 0.00 s)
- L153 "the system prompt holds shop, register, vision, styleguide, then the NOW/NEXT digest" — copy, steer-context, scenario (20 lines; tap 0.00 s)
- L174 "the per-turn cue is a hidden note that names the audience and stays under 1.25 kilobytes" — wording, steer-context, delete (12 lines; tap 0.00 s)
- L187 "the selected register controls audience and wake cues and is reread on each turn" — wording, steer-context, delete (23 lines; tap 0.00 s)
- L211 "a 130-line board adds one advisory line; an 80-line board does not" — wording, steer-context, delete (13 lines; tap 0.00 s)
- L225 "spec edits recall the selected register; code edits and planning commands recall project guidance" — wording, steer-context, delete (32 lines; tap 0.00 s)
- L258 "an errored previous assistant turn puts the error on the next cue, a successful one does not" — wording, steer-context, delete (16 lines; tap 0.00 s)
- L275 "the next turn names what the last turn touched" — wording, steer-context, delete (10 lines; tap 0.00 s)
- L286 "a hosted worker's system prompt holds the styleguide and both register audiences and no board body" — seam, steer-context, scenario (23 lines; tap 0.00 s)
- L310 "a jg whose help names Jevgrep adds the search rule for jobs and the coordinator; another jg or none does not" — wording, steer-context, delete, waits: fake jg run once to warm macOS exec before the hook's probe timeout (24 lines; tap 0.58 s)
- L335 "workspace jobs resolve guidance from the workspace root" — seam, steer-context, delete (11 lines; tap 0.02 s)
- L347 "a project overlay wins over the package speech register" — unit, steer-context, delete (7 lines; tap 0.01 s)
- L355 "communication is reread each turn and bounded like other project files" — wording, steer-context, delete (13 lines; tap 0.00 s)
- L369 "missing communication inherits the package register" — copy, steer-context, delete (8 lines; tap 0.00 s)
- L378 "a coordinator without AGENTS.md inherits the package shop manual on the system prompt" — copy, steer-context, delete (9 lines; tap 0.00 s)
- L388 "a project AGENTS.md suppresses the inherited shop manual" — trivia, steer-context, delete (7 lines; tap 10.79 s)
- L396 "identical leftover copies are named as leftovers, overlays as overlays" — wording, steer-context, delete (11 lines; tap 0.00 s)
- L408 "style and vision reminders name the project files and their headings" — duplicate, steer-context, delete, dup of: L225 spec edits recall the register; code edits recall project guidance (32 lines; tap 0.00 s)
- L441 "a write or edit outside spec/ recalls the styleguide unless the path is Markdown" — wording, steer-context, delete (28 lines; tap 0.00 s)
- L470 "unrelated tools are not patched" — trivia, steer-context, delete (9 lines; tap 0.00 s)
- L480 "a stale copy is named with both dates in the drift section" — copy, steer-context, delete, waits: reads this repo's own git log for templates/reviewer.md (16 lines; tap 1.45 s)

### `test/jobs-command.test.ts` (466 lines, 15 tests)

Lines by class: wording 310 · unit 71 · duplicate 43 · mock 42 (sum 466).  
Lines by seam: jobs-view 422 · recovery 44.  
Lines by action: delete 422 · keep 44.  
TAP time (sum of per-test `duration_ms`, `/tmp/f783-lead/full-suite.tap`): 30.1 s.

- L10 "a running record without pid is starting, not invalid" — wording, jobs-view, delete (19 lines; tap 1.27 s)
- L30 "jobs tails a rambling log and keeps the last limen detail line" — wording, jobs-view, delete (19 lines; tap 1.68 s)
- L50 "jobs detail shows result and commits for a terminal job that has them" — wording, jobs-view, delete (27 lines; tap 2.05 s)
- L78 "jobs marks a terminal job with zero tool calls and no commits as produced nothing" — duplicate, jobs-view, delete, dup of: wake-hook L141 a completion wake says when a terminal job produced nothing (same F011 rule) (41 lines; tap 2.81 s)
- L120 "jobs lists running first, then newest started-at" — unit, jobs-view, delete (25 lines; tap 1.62 s)
- L146 "the default jobs snapshot stays compact and exposes every live job" — wording, jobs-view, delete (35 lines; tap 2.13 s)
- L182 "compact snapshots cap malformed live diagnostics" — wording, jobs-view, delete (19 lines; tap 1.35 s)
- L202 "hosted jobs pulse follows activity, not Herdr unseen-idle" — mock, jobs-view, delete (40 lines; tap 2.59 s)
- L243 "jobs shows the advisory line on a running hosted job" — wording, jobs-view, delete, waits: ownership-uncertainty since=now (27 lines; tap 2.77 s)
- L271 "jobs names a directory with no state as an orphan" — wording, jobs-view, delete (12 lines; tap 1.65 s)
- L284 "jobs --label lists matching jobs including hidden terminal ones" — wording, jobs-view, delete (52 lines; tap 3.90 s)
- L337 "hosted pulse uses wrapper identity even when the agent is idle" — unit, recovery, keep (42 lines; tap 1.38 s)
- L380 "failed human rows prefer stop-reason and ignore post-finish delivery logs" — wording, jobs-view, delete (27 lines; tap 1.42 s)
- L408 "jobs refuses an unknown id in an empty plant and hides old empty jobs" — wording, jobs-view, delete, waits: job ages 1 and 9 days vs the hide window (34 lines; tap 1.87 s)
- L443 "hosted detail folds activity words and hides the finish webhook while running" — wording, jobs-view, delete (24 lines; tap 1.59 s)

### `test/wake-sweep.test.ts` (443 lines, 10 tests)

Lines by class: unit 347 · mock 96 (sum 443).  
Lines by seam: finish-wake 443.  
Lines by action: keep 347 · delete 96.  
TAP time (sum of per-test `duration_ms`, `/tmp/f783-lead/full-suite.tap`): 7.6 s.

- L12 "unwatched completion crosses fallback grace on the timer alone" — unit, finish-wake, keep, waits: fake Date.now, fake setInterval/setTimeout, mocked fs.watch (no wall clock) (23 lines; tap 0.01 s)
- L36 "busy completion stays claimed until its one followUp turn finishes" — unit, finish-wake, keep, waits: fake Date.now, fake setInterval/setTimeout, mocked fs.watch (no wall clock) (25 lines; tap 0.01 s)
- L62 "second full sweep skips 473 settled records and shares two running jobs with status and reaper" — mock, finish-wake, delete, waits: fake Date.now, fake setInterval/setTimeout, mocked fs.watch (no wall clock); spies on fs read calls (17 lines; tap 0.83 s)
- L80 "settlement keeps fallback, blocked claims, and new subscriptions observable" — unit, finish-wake, keep (14 lines; tap 0.01 s)
- L95 "cache invalidates ready, subscriptions, whole-job changes, and manual delivery repair" — unit, finish-wake, keep, waits: fake Date.now, fake setInterval/setTimeout, mocked fs.watch (no wall clock) (26 lines; tap 0.01 s)
- L122 "ownership cache notices whole-job addition and deletion" — unit, finish-wake, keep, waits: fake Date.now, fake setInterval/setTimeout, mocked fs.watch (no wall clock); counts fs reads (22 lines; tap 0.01 s)
- L145 "missed events and watcher failure recover settled records and ownership within thirty seconds" — unit, finish-wake, keep, waits: fake Date.now, fake setInterval/setTimeout, mocked fs.watch (no wall clock) (23 lines; tap 0.01 s)
- L169 "progress events neither invalidate settled records nor schedule sweeps" — unit, finish-wake, keep, waits: fake Date.now, fake setInterval/setTimeout, mocked fs.watch (no wall clock); counts fs reads (23 lines; tap 0.00 s)
- L193 "an async footer read cannot overlap sweeps or publish into a replacement session" — mock, finish-wake, delete, waits: fake Date.now, fake setInterval/setTimeout, mocked fs.watch (no wall clock); mocked fs.promises.readFile pause; test timeout 5s (37 lines; tap 0.01 s)
- L234 "${advisory ? "advisory" : "completion"} ${fallback ? "fallback" : "subscriber"} stops after two ${failure} failures" — unit, finish-wake, keep, waits: fake Date.now, fake setInterval/setTimeout, mocked fs.watch (no wall clock); runs 8× (advisory × fallback × failure) (39 lines; tap 6.69 s over 10 runs)

### `test/finish-webhook-helper.test.ts` (427 lines, 17 tests)

Lines by class: unit 304 · duplicate 67 · seam 27 · trivia 16 · wording 13 (sum 427).  
Lines by seam: webhooks 427.  
Lines by action: keep 289 · delete 138.  
TAP time (sum of per-test `duration_ms`, `/tmp/f783-lead/full-suite.tap`): 3.3 s.

- L82 "helper safely encodes all CLI fields, sends Bearer in memory, and reports only HTTP acceptance" — seam, webhooks, keep (21 lines; tap 0.04 s)
- L104 "failed and stopped sender payloads direct inspection without a landing signal" — trivia, webhooks, delete (12 lines; tap 0.07 s)
- L117 "event fields ride the payload as one-line data; a non-terminal event names its own handoff" — unit, webhooks, delete (33 lines; tap 0.08 s)
- L151 "explicit targets fan out to two routes without an implicit single-target recipient" — duplicate, webhooks, delete, dup of: finish-webhook L228 automatic fan-out reaches two bot routes (30 lines; tap 0.04 s)
- L182 "a failed or stalled first bot does not block the second bot; acceptance is never called a wake" — unit, webhooks, keep, waits: preload shortens setTimeout to 35ms (20 lines; tap 0.18 s)
- L203 "invalid explicit target lists fail before all transport and never fall back to the single target" — unit, webhooks, keep (24 lines; tap 0.26 s)
- L228 "legacy-only configuration fails closed and names the new key before any request" — wording, webhooks, delete (10 lines; tap 0.15 s)
- L239 "the retired env-path override cannot select a destination" — duplicate, webhooks, delete, dup of: finish-webhook L419 a retired env-path override does not opt a job in (10 lines; tap 0.35 s)
- L250 "helper rejects missing, raw, Basic and malformed Bearer auth before transport" — unit, webhooks, keep (23 lines; tap 0.31 s)
- L274 "helper rejects missing or unsafe destinations without revealing their contents" — unit, webhooks, keep (11 lines; tap 0.14 s)
- L286 "helper fails redirects, non-2xx, transport errors and a bounded stalled request" — unit, webhooks, keep, waits: preload shortens setTimeout to 35ms (24 lines; tap 0.41 s)
- L311 "an unauthenticated receiver body is not a sender diagnosis or a wake acknowledgement" — unit, webhooks, keep (12 lines; tap 0.11 s)
- L324 "absolute override wins; missing, empty and relative overrides never fall back" — unit, webhooks, keep (13 lines; tap 0.18 s)
- L338 "Git common directory selects the canonical project's config from an external worktree" — unit, webhooks, keep (28 lines; tap 0.45 s)
- L367 "legacy home config is available only for manual invocation outside Git, not inherited credentials" — duplicate, webhooks, delete, dup of: finish-webhook L431 unconfigured jobs never inherit home config (12 lines; tap 0.17 s)
- L380 "env files are data, never shell scripts" — unit, webhooks, keep (9 lines; tap 0.03 s)
- L390 "invalid author maps and target references send nothing" — unit, webhooks, keep (38 lines; tap 0.32 s)

### `test/recovery.test.ts` (386 lines, 7 tests)

Lines by class: unit 195 · seam 191 (sum 386).  
Lines by seam: recovery 386.  
Lines by action: keep 195 · scenario 164 · delete 27.  
TAP time (sum of per-test `duration_ms`, `/tmp/f783-lead/full-suite.tap`): 19.9 s.

- L148 "hosted OMP recovery stays running without an agent row while omp remains on the recorded pane" — seam, recovery, delete, waits: until(): poll 25ms, 10s deadline ×3 (≥5 process-info polls); waitForState poll 25ms, 10s deadline; real child processes (16 lines; tap 7.44 s)
- L165 "hosted recovery matches only the recorded engine or node on its recorded pane" — unit, recovery, keep (22 lines; tap 2.33 s)
- L188 "competing real sweeps replace a killed young supervisor exactly once, then can replace it again and finish" — seam, recovery, scenario, waits: until(): poll 25ms, 10s deadline ×8; waitForState poll 25ms, 10s deadline; real supervisor and sweep processes (42 lines; tap 4.42 s)
- L231 "a killed recovery claimant is reclaimed by competing sweeps" — seam, recovery, scenario, waits: until(): poll 25ms, 10s deadline ×3; real claimant and sweep processes (23 lines; tap 1.44 s)
- L255 "missing and malformed PID/timestamp shapes expire; a real startup grace alone waits" — unit, recovery, keep, waits: injected clock (now + STARTUP_GRACE_MS) (30 lines; tap 1.51 s)
- L286 "uncertain Herdr never adopts or fails, including cached life and a failed relocation probe" — unit, recovery, keep, waits: injected clock; ownership-uncertainty since −61s; Linux-only tail (66 lines; tap 1.39 s)
- L353 "uncertain then concretely missing agent fails with handoff and wake eligibility; terminal records cannot revive" — seam, recovery, scenario, waits: injected clock; until(): poll 25ms, 10s deadline (34 lines; tap 1.40 s)

## 4. Git history

Source: `git log --follow --format='%h %ad %s' --date=short --numstat -- test/<file>`, then `git show --name-only <sha>` and the commit body for each of the 182 distinct commits. Each (file, commit) pair goes in one bucket.

- `bug-pinned`: the commit fixes product behavior in `src/`, `hook/` or `bin/` that its message or notes call wrong, and the same commit adds or changes an assertion on the fixed behavior.
- `bug-caught`: an existing test went red on a later change and forced a product fix. I searched the commit log and `spec/features/**` notes for this pattern; the searches and what they found are listed under (a).
- `feature-add`: new behavior, or a behavior change that no note calls a bug.
- `refactor-only`: test-only deflakes and formatting, renames and moves, and product commits that only reword text the tests pin.
- `trim`: F776 (`45d93a9`) and `e030714` "test: stop inventorying prompt prose".

### (b) Commits per bucket, per file

| File | Commits | bug-pinned | bug-caught | feature-add | refactor-only | trim |
| --- | --- | --- | --- | --- | --- | --- |
| `wake-hook` | 49 | 8 | 0 | 33 | 7 | 1 |
| `hosted-spawn` | 52 | 17 | 0 | 24 | 10 | 1 |
| `spawn-command` | 51 | 4 | 0 | 35 | 10 | 2 |
| `group-command` | 15 | 2 | 0 | 7 | 5 | 1 |
| `finish-webhook` | 19 | 4 | 0 | 11 | 3 | 1 |
| `github-doorbell` | 9 | 0 | 0 | 5 | 3 | 1 |
| `continue-command` | 15 | 1 | 0 | 10 | 3 | 1 |
| `communication-hook` | 25 | 1 | 0 | 11 | 11 | 2 |
| `jobs-command` | 23 | 2 | 0 | 17 | 3 | 1 |
| `wake-sweep` | 6 | 2 | 0 | 1 | 2 | 1 |
| `finish-webhook-helper` | 12 | 0 | 0 | 9 | 2 | 1 |
| `recovery` | 5 | 4 | 0 | 0 | 1 | 0 |
| total (file × commit) | 281 | 45 | 0 | 163 | 60 | 13 |

### (a) Bug list

All entries are `pinned`. None is `caught`. Evidence for zero `caught`:

- `git log --format='%h %s%n%b' | rg -i 'caught|exposed|surfaced|revealed|found by|failing test|test failed|went red|red on'` finds no product fix forced by one of these 12 files. The two hits are `e59e829` (picture watch test, not in my set) and `e8edbc3` (a deflake): `group-command` "detached role deadlines stop a real child…" failed on clean `main` under load and the test was changed, not the product.
- `rg` over `spec/features/**/*.md` for these file names next to fail/red/caught/flake finds only flakes and environment leaks. Examples: `F741 checks.md:30`, two `finish-webhook` timing tests fail at load 55–62. `F728 reproduction.md:29`, "two long hosted labels" timed out with no product cause. `F018 review-1:17` and `F054 review-1:17`, `communication-hook` failed on a reviewer's leaked `LIMEN_*` env. `F085 review-1:17`, a hosted-start handshake flake. `F761 notes.md:20` and `F029 review-1:13`, a spawn concurrency flake.
- Counter-evidence that a mock missed a real bug: in `F045 review-1:5-9`, the reviewer found that Herdr 0.8.2 rejects the `stalled` state label, so no stall metadata was ever applied. They also found that "the fake at test/hosted-spawn.test.ts:74 only records arguments and cannot detect this failure." The fix (`c064d3e`) taught the fake to reject bad labels, which means the test now copies Herdr's allowlist.
- Team 3 (`team-3-incidents.md`, commit `586c334`) reports that the F042 wake bugs and the F043 registry race were found by reviewer probes, and that regression tests were written afterwards. The one test that caught a real race, `open-command` (`43c01cf`), is not in my 12 files.

| Commit | File | Current test (line, title) | Bug, in one clause |
| --- | --- | --- | --- |
| `951282a` 2026-10-05 | `wake-hook` | L1767 "standing uncertainty waits one minute and delivers once across transit"; L1819 "uncertainty does not queue into a busy recipient or consume failure an" | a hosted job launched from a moved or unbound pane was attributed and adopted wrongly, and ownership uncertainty was not persisted |
| `a14640f` 2026-09-19 | `wake-hook` | L1454 "provider-error turns exhaust the allowance after two failures" | provider errors, aborts and rejected injections released wake claims without counting, so a wake could retry forever |
| `bc9476f` 2026-09-08 | `wake-hook` | L530 "settled coordinator labels count watched and visible unwatched RUNNING" | settled Herdr panes hid RUNNING jobs from the coordinator line |
| `a70cf2a` 2026-08-26 | `wake-hook` | L188 "a reloaded coordinator tab resubscribes to its running jobs" | a reloaded coordinator tab lost the wakes of jobs it had started |
| `7e43d23` 2026-08-25 | `wake-hook` | L1175 "one assistant response confirms every batched followUp wake in the tur"; L1355 "another listener does not recover a live accepted claim" | batched follow-up wakes were injected three times for two jobs, and a second listener stole a live 31 s claim (F042 review-1) |
| `af12f1b` 2026-08-25 | `wake-hook` | L1300 "an accepted wake is recovered after shutdown when no turn ran" | a wake was marked delivered when the host accepted it, before any turn ran, so a lost turn lost the wake |
| `96344eb` 2026-08-16 | `wake-hook` | L30 "wake ignores history, announces start, and steers once on terminal cha" | completion wakes went in as a steer that idle coordinators easily missed |
| `d9a92fb` 2026-08-14 | `wake-hook` | pinning test since removed or rewritten | a footer timer outliving /reload crashed Pi |
| `125d71a` 2026-10-06 | `hosted-spawn` | L924 "makeJobId never leaves a run of dashes where a feature number or the c" | job IDs could carry a run of dashes |
| `951282a` 2026-10-05 | `hosted-spawn` | L673 "hosted supervisor refuses an unbound moved pane and finalizes when its" | a hosted job launched from a moved or unbound pane was attributed and adopted wrongly, and ownership uncertainty was not persisted |
| `88fd5ac` 2026-10-03 | `hosted-spawn` | L930 "startHostedPi recovers an unclassified OMP process after a start warni" | Herdr losing an OMP agent row made a live hosted job fail |
| `a14640f` 2026-09-19 | `hosted-spawn` | L147 "noteHostedIdle writes one stall marker, skips zero tools, and re-arms " | provider errors, aborts and rejected injections released wake claims without counting, so a wake could retry forever |
| `ccf3e7e` 2026-09-16 | `hosted-spawn` | L466 "hosted start records PATH with /usr/bin and HERDR_ENV=1; detached watc" | hosted tabs lost /usr/bin and HERDR_ENV, so the hosted engine could not find git |
| `a3872a6` 2026-09-11 | `hosted-spawn` | L565 "hosted spawn and continuation keep quoted multiline tasks out of shell"; L868 "hosted continue survives a killed caller and passes durable @continue," | a multiline or quoted task passed as a shell argument broke hosted continuation |
| `967ab4b` 2026-08-26 | `hosted-spawn` | L24 "hosted result capture follows the last assistant stop reason"; L846 "a hosted session error fails with its stop reason" | a hosted session that ended on a provider error was recorded done, not failed |
| `9139a20` 2026-08-25 | `hosted-spawn` | L188 "noteHostedIdle rings and stamps unheard stalls until delivery, then re" | stall labels were stamped with a state label Herdr rejects |
| `c064d3e` 2026-08-25 | `hosted-spawn` | L188 "noteHostedIdle rings and stamps unheard stalls until delivery, then re" | same bug as 9139a20: Herdr 0.8.2 rejected the `stalled` label so no metadata applied; the call-log fake could not see it (F045 review-1) |
| `fe510dd` 2026-08-25 | `hosted-spawn` | L605 "hosted start finalizes failed after two pane-shell failures"; L702 "hosted start does not retry a non-pane-shell error" | one transient pane-shell failure failed a hosted start |
| `2ef9f40` 2026-08-19 | `hosted-spawn` | L350 "hostedAgentStatus reads nested 0.8.0 envelope and flat legacy"; L381 "hostedAgentStatus keeps last known status across a non-not-found CLI f" | the supervisor misread Herdr 0.8's nested agent status and finalized jobs on one missing sample |
| `c8200bb` 2026-08-18 | `hosted-spawn` | L13 "hosted completion is session end or vanished agent, not Herdr idle" | hosted jobs were marked done after 90 s of Herdr idle while the session kept working (F015) |
| `1dbcdd8` 2026-08-18 | `hosted-spawn` | L424 "ordinary lead-in labels start hosted; --detached keeps a watch tab" | Herdr 0.8 would not start an agent in a background pane |
| `2a1b848` 2026-08-17 | `hosted-spawn` | L424 "ordinary lead-in labels start hosted; --detached keeps a watch tab" | a --no-focus tab was not an available shell, so agent start failed |
| `c316fce` 2026-08-16 | `hosted-spawn` | L816 "a hosted job finalizes on session end, never on unseen idle after tool" | the supervisor treated Herdr `done` (unseen idle) as process exit and finalized live jobs |
| `73b129b` 2026-08-16 | `hosted-spawn` | L424 "ordinary lead-in labels start hosted; --detached keeps a watch tab" | spawn --tab stole macOS focus |
| `755d762` 2026-08-15 | `hosted-spawn` | L424 "ordinary lead-in labels start hosted; --detached keeps a watch tab" | agent start raced prompt hooks still running in a new tab |
| `30cff7a` 2026-09-19 | `spawn-command` | L591 "overlapping starts keep both worktrees; prune still drops a genuine le"; L671 "a second spawn cannot delete a worktree still being added"; L737 "prune between job-directory creation and marker writes cannot delete t" | prune could delete a job directory in the window before its markers were written |
| `e5feac5` 2026-09-19 | `spawn-command` | L591 "overlapping starts keep both worktrees; prune still drops a genuine le"; L671 "a second spawn cannot delete a worktree still being added" | overlapping spawns let prune delete the other start's worktree |
| `d220b3b` 2026-09-16 | `spawn-command` | L537 "spawn refuses a ticket missing from the base commit and starts when it" | spawn started a job whose ticket was missing from the base commit |
| `e63c790` 2026-08-13 | `spawn-command` | L68 "spawn creates isolated branch, canonical record, defaults to omp, and " | wrapper Herdr/Pi state leaked into the worker environment |
| `b62b837` 2026-10-01 | `group-command` | L770 "busy cabinet never blocks finalization or loses its deferred lifecycle"; L808 "a ${command} waits beyond ten seconds for a real sibling launch withou"; L861 "cabinet recovery reclaims a dead owner but never displaces an aged liv" | a busy group lock failed live members and sibling launches past a 10 s deadline (team-3 note) |
| `57ad3e9` 2026-09-30 | `group-command` | L365 "lifecycle advisories repeat after clearing without duplicates from con"; L397 "lifecycle recovery completes an interrupted occurrence before observin" | recurring group lifecycle advisories were dropped or duplicated under concurrent sync |
| `16939e1` 2026-09-28 | `finish-webhook` | L138 "jobs at the same recorded tip each send, including with a legacy tip m"; L162 "two detached jobs that settle at the same HEAD each send an automatic " | the tip rule from 1cd1f68 silenced the second job's legitimate ping; dedupe moved to per job |
| `1cd1f68` 2026-09-16 | `finish-webhook` | pinning test since removed or rewritten | two jobs at the same tip both pinged (later judged wrong and reversed by 16939e1) |
| `2cddbb6` 2026-09-13 | `finish-webhook` | L96 "automatic finish decision: … sends once with its reason (rule since re" | empty failed/stopped jobs sent finish pings (rule later reversed: the current L96 sends for every terminal state) |
| `a777385` 2026-09-10 | `finish-webhook` | L203 "automatic delivery finds Limen's Node runtime when the inherited PATH can" | automatic finish webhooks failed when the service PATH had no runnable node |
| `533be73` 2026-09-13 | `continue-command` | L177 "continue restores a pruned finished checkout from its branch and saved"; L292 "continue refuses a running job or missing transcript without writing r" | continue refused a finished job whose checkout had been pruned |
| `b962dd4` 2026-08-23 | `communication-hook` | pinning test since removed or rewritten | wake turns re-injected vision and board context |
| `951282a` 2026-10-05 | `jobs-command` | L243 "jobs shows the advisory line on a running hosted job" | a hosted job launched from a moved or unbound pane was attributed and adopted wrongly, and ownership uncertainty was not persisted |
| `5754dad` 2026-09-11 | `jobs-command` | L337 "hosted pulse uses wrapper identity even when the agent is idle" | orphaned hosted jobs lost watch-only ownership after a supervisor died |
| `a14640f` 2026-09-19 | `wake-sweep` | L234 "${advisory} ${fallback} stops after two ${failure} failures" | provider errors, aborts and rejected injections released wake claims without counting, so a wake could retry forever |
| `a482020` 2026-09-05 | `wake-sweep` | L12 "unwatched completion crosses fallback grace on the timer alone"; L36 "busy completion stays claimed until its one followUp turn finishes"; L62 "second full sweep skips 473 settled records and shares two running job"; L80 "settlement keeps fallback, blocked claims, and new subscriptions obser"; L95 "cache invalidates ready, subscriptions, whole-job changes, and manual "; L122 "ownership cache notices whole-job addition and deletion"; L145 "missed events and watcher failure recover settled records and ownershi"; L169 "progress events neither invalidate settled records nor schedule sweeps" | coordinator sweeps re-read every settled job record on each tick |
| `951282a` 2026-10-05 | `recovery` | L286 "uncertain Herdr never adopts or fails, including cached life and a fai" | a hosted job launched from a moved or unbound pane was attributed and adopted wrongly, and ownership uncertainty was not persisted |
| `88fd5ac` 2026-10-03 | `recovery` | L165 "hosted recovery matches only the recorded engine or node on its record" | Herdr losing an OMP agent row made a live hosted job fail |
| `7cbce5c` 2026-10-03 | `recovery` | L148 "hosted OMP recovery stays running without an agent row while omp remai" | same bug as 88fd5ac; reproduction test committed first, red 0/1 before the fix (team-3 note) |
| `5754dad` 2026-09-11 | `recovery` | L188 "competing real sweeps replace a killed young supervisor exactly once, "; L231 "a killed recovery claimant is reclaimed by competing sweeps"; L255 "missing and malformed PID/timestamp shapes expire; a real startup grac"; L286 "uncertain Herdr never adopts or fails, including cached life and a fai"; L353 "uncertain then concretely missing agent fails with handoff and wake el" | orphaned hosted jobs lost watch-only ownership after a supervisor died |

### (c) Files that never changed with a bug fix

- `github-doorbell` (9 commits), `finish-webhook-helper` (12 commits): only `feature-add`, `refactor-only` or `trim` commits.
- Files with at most two bug-pinned commits, against many feature and wording commits: `group-command` (2 of 15), `continue-command` (1 of 15), `communication-hook` (1 of 25), `jobs-command` (2 of 23), `wake-sweep` (2 of 6). The bug in `communication-hook` (`b962dd4`) was pinned by a test that later rewrites removed. Both `jobs-command` bugs are display side effects of recovery fixes.
- Tests that pinned a rule later reversed: `finish-webhook` `1cd1f68` (same-tip skip, reversed by `16939e1`) and `2cddbb6` (skip empty failed/stopped, reversed in the current L96 decision table). Both pinned behavior the owner later judged wrong. The tests guarded the bug, not the intent.

## 5. Notes for the scenario design

One line per pinned bug: the seam a scenario must exercise to catch it again. Bugs on this list that team 3 and the lead put on the closed replay list: `7e43d23`, `88fd5ac`/`7cbce5c`, `b62b837`.

- `951282a`: recovery: a moved or unbound pane is not adopted and uncertainty persists. Unit (`recovery` L286) plus the hosted scenario.
- `a14640f`: finish-wake: a host that rejects or errors twice stops retrying. Fake-clock unit `wake-sweep` L234.
- `bc9476f`: none: Herdr footer display. Accept the risk or check by hand.
- `a70cf2a`: finish-wake: restart the coordinator listener between spawn and finish; the wake still arrives.
- `7e43d23`: finish-wake: two listeners and two jobs finish in one turn; each wake is injected once and a live claim is not stolen. Replay against `7e43d23^`.
- `af12f1b`: finish-wake: the host accepts the wake, the session shuts down before a turn runs, and the next session gets the wake.
- `96344eb`: finish-wake: an idle coordinator gets the wake as a normal user turn (no `deliverAs`).
- `d9a92fb`: none: crash on /reload; the pinning test is gone. Hook-level smoke only.
- `125d71a`: unit: `makeJobId` (`hosted-spawn` L924).
- `88fd5ac`: recovery: the hosted scenario's fake Herdr drops the agent row while the pane foreground is still `omp`; the job stays running. Replay against `88fd5ac^` (team-3 lists it).
- `ccf3e7e`: spawn (hosted): the engine launched in the hosted tab can run `git` with a stripped caller PATH.
- `a3872a6`: spawn (hosted) and continue: a quoted multiline task reaches the engine byte for byte.
- `967ab4b`: finish-wake: an engine whose last turn is a provider error ends `failed` with a stop-reason.
- `9139a20`: none in a scenario: Herdr metadata. Only a live Herdr can prove it (F045 review-1).
- `c064d3e`: same as 9139a20.
- `fe510dd`: spawn (hosted): one failed agent start is retried; two fail the job.
- `2ef9f40`: unit: `hostedAgentStatus` envelope parsing (`hosted-spawn` L350, L381).
- `c8200bb`: finish-wake (hosted): an idle agent after tool calls is not done until the session ends.
- `1dbcdd8`: spawn (hosted): only against real Herdr 0.8. The fake encodes the focus rule, so this is a copy check.
- `2a1b848`: same as 1dbcdd8.
- `c316fce`: finish-wake (hosted): Herdr `done` does not finalize a live job.
- `73b129b`: none: focus theft. Herdr argv copy only.
- `755d762`: same as 1dbcdd8.
- `30cff7a`: spawn and prune: a prune during a spawn leaves the new job intact. Gate-file race; `spawn-command` L591 is the cheap form.
- `e5feac5`: spawn: two overlapping spawns keep both worktrees (`spawn-command` L591, L671).
- `d220b3b`: spec-keeper and spawn: spawn refuses a ticket that is not committed on the base.
- `e63c790`: spawn: the worker env does not carry the caller's Herdr/Pi variables (the fake engine dumps its env).
- `b62b837`: groups: a launch held past 10 s does not fail a sibling, and a busy cabinet does not lose a finish event. Replay against `b62b837^`; make the hold a gate, not a 12 s sleep.
- `57ad3e9`: groups: unit `syncLifecycle` (`group-command` L365, L397).
- `16939e1`: webhooks: two jobs that finish at the same HEAD each send one ping.
- `1cd1f68`: none: the rule was reversed.
- `2cddbb6`: none: the rule was reversed. The current decision table sends for every terminal state.
- `a777385`: webhooks: delivery works when the service PATH has no runnable node. One env tweak in the webhook scenario.
- `533be73`: steer-context: continue after prune restores the checkout from the branch.
- `b962dd4`: none: the pinning test was removed and the rule now lives in `communication-hook` L142 (a wake turn shares the system prompt).
- `5754dad`: recovery: competing sweeps adopt a dead hosted supervisor exactly once (`recovery` L188, L231).
- `a482020`: finish-wake: unit on a fake clock (`wake-sweep` L62 counts reads). Performance; no user-facing failure.
- `7cbce5c`: same as 88fd5ac.

## Notes from other teams that changed this note

- Team 3 (F042 review-1, `7e43d23`): the batched-followUp and live-claim tests (`wake-hook` L1175, L1355) were written after reviewer probes reproduced the bugs. I kept their classes (`mock`, `timing`) but list `7e43d23` in section 5 as a replay case. L1175 stays `scenario`. L1355 stays `delete` as a test, and its behavior moves into the finish-wake scenario.
- Team 3 (`b62b837`): `group-command` L770 and L808 are `timing` by form and `scenario` by action. Their 11 s and 12 s holds should become gates.
- Team 2 (fixture env): the `scratch.ts` env denylist misses `LIMEN_GROUP_ID`/`LIMEN_TEAM_ID`. I ran no test files, so this did not affect my numbers.
