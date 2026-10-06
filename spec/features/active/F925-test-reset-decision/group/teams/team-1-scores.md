# Team 1 · Value audit of `test/`: scores for all 58 files

The hypothesis holds. Of 17,094 lines in `test/`, 4,939 (28.9%) drive a real product path, and only about 3,980 (23.3%) sit in tests that guard one of the seams. Mocks, code copies, wording checks, timing windows, duplicates and trivia take 8,723 lines (51.0%). Only four tests are known to have caught a real product bug before anyone looked for it. All four failed in CI, and three of them run the real CLI or the real hook on a real Git repo ("Caught" below). The other bug links are regression tests written with the fix: 57 distinct fix commits ("Pinned"). One mock-based test missed a real Herdr bug (F045). Time is spent in process launches, not in logic: 116 tests over 5 s take 973 s of the 1,494 s run.

Sources: per-file reading of every test body (this note: the 46 smaller files; `team-1-worker-big12.md`: the 12 largest files, per test). `wc -l test/*` at `5df0697`. Timing: per-test `duration_ms` in `/tmp/f783-lead/full-suite.tap` (F783 lead run on `main`, 532 tests, 1,502 s), mapped to files by test title. History: `git log --follow --numstat -- test/<file>` plus `git show` for each commit.

## Totals

### Lines by class

| Class | Lines | Share | 12 largest files | 46 other files |
| --- | --- | --- | --- | --- |
| seam | 4,939 | 28.9% | 2,948 | 1,991 |
| unit | 3,237 | 18.9% | 1,740 | 1,497 |
| mock | 2,626 | 15.4% | 1,326 | 1,300 |
| copy | 1,233 | 7.2% | 430 | 803 |
| wording | 2,025 | 11.8% | 1,059 | 966 |
| timing | 933 | 5.5% | 545 | 388 |
| duplicate | 1,494 | 8.7% | 1,105 | 389 |
| trivia | 412 | 2.4% | 146 | 266 |
| fixture | 195 | 1.1% | 0 | 195 |
| total | 17,094 | 100% | 9,299 | 7,795 |

- `fixture` is `test/scratch.ts`, the shared helper. It is not a test, so it gets no test class.
- Lines in tests that guard a seam and are worth a scenario or a keep: 2,192 (12 largest files, worker section "Totals") + 1,786 (46 other files: seam-class lines in files marked scenario or keep) = 3,978 (23.3%).
- Unit lines in tests marked keep: about 1,435 (12 largest; 1,205 test-body lines scaled for helpers) + 1,000 (46 other) = about 2,435 (14%).
- Lines by fate, line by line: delete 10,133 (59%), carried into a scenario 3,800 (22%), kept as units or already-scenario tests 2,966 (17%), fixture 195. File by file (the Action column below): scenario 24 files / 10,993 lines, delete 18 files / 3,237 lines, keep 16 files / 2,864 lines. A `scenario` file loses most of its lines: only its seam core moves into the new scenario.

### Lines by seam

| Seam | Lines |
| --- | --- |
| finish-wake | 4,677 |
| spawn | 2,087 |
| webhooks | 1,919 |
| steer-context | 1,529 |
| picture | 1,506 |
| doorbell | 991 |
| groups | 931 |
| jobs-view | 869 |
| recovery | 580 |
| spec-keeper | 540 |
| herdr-tabs | 389 |
| prune | 338 |
| init | 206 |
| fixture | 195 |
| none | 155 |
| land | 120 |
| sweep | 62 |

All lines of each test count toward its seam, whatever their class. `jobs-view` merges `status-command`, `view` and `jobs-command`. `herdr-tabs` is `open` and `diff`. `none` is `job`, `linear-command` and `structure`. The spread is upside down: land, one of the six seams, has the fewest lines (120 in `land-command`; the other 59 lines of that file are the ticket gate). The picture, which is not a seam, has 1,506. Finish-and-wake has 4,677, and 1,319 of those are low-value lines in `wake-hook`.

### Time by file fate

TAP seconds summed per file, by the Action column: scenario 1257 s, keep 105 s, delete 132 s. Of the 1,494 s, 1,257 s are in files whose core moves to a scenario, so the run time falls only when the scenarios replace them. Deleting files alone saves about 130 s.

## Five worst files

Ranked by low-value lines (mock + copy + wording + timing + duplicate + trivia):

1. `wake-hook`: 1,319 of 1,889 lines. Herdr call-log mocks (579), duplicates (333), wording (225), fixed absence sleeps of 100–1,100 ms (156). The claim and routing core is 473 lines.
2. `hosted-spawn`: 730 of 1,340 lines, 175.7 s. Fake-Herdr argv checks and 6–8 s race windows (`FAKE_HERDR_START_BUSY_MS=8000`). A mock-based test here missed a real Herdr label bug (F045 review-1, fix `c064d3e`).
3. `finish-webhook`: 432 of 829 lines, 146.9 s. Every test copies `src/`, `hook/` and `templates/`. Four tests wait on 2.5–20 s sender or Herdr timeouts. Two pinned rules were later reversed (`1cd1f68`, `2cddbb6`).
4. `communication-hook`: 407 of 504 lines. The assembled prompt and cue text are asserted line by line. The file has 25 commits, and 11 of them only refactor or reword.
5. `jobs-command`: 395 of 466 lines. Nearly every assertion is display text.

Two more files are 100% low-value: `hosted-binding` (322 lines; Linux-only, both tests skipped in the F783 run; 17 s of fixed sleeps) and `open-command` (252 lines; a fake-Herdr call log). The most expensive file is `group-command`, at 259.8 s. Its lines are mostly seam and unit, but three wall-clock holds cost 65 s.

## Seams with no real end-to-end test today

1. **Context injection.** No test spawns a job and checks that the engine received the speech register, styleguide, vision and board pointers through the real hooks. `communication-hook` and `init-command` L104 call the hook handlers in-process. `spawn-command` L68 checks only that `--append-system-prompt` equals `templates/worker.md`.
2. **Spec keeper CLI.** `limen ticket new` and `limen ticket check` never run through `bin/limen`. `ticket-command` calls `ticketCommand` in-process. The strict check runs end to end only inside `limen land` (`land-command` L147). `limen keeper` has one real test file (`keeper-command`, 83 lines).
3. **Wake into a Pi coordinator session.** `wake-hook` drives the hook with a stub host on hand-written job files. Only the Herdr-pane wake route runs end to end, from a real spawn to a prompt (`coordinator-wake` L63).
4. **Land** has exactly one real file, `land-command` (179 lines, 40.8 s). It is already scenario-shaped. No other file lands anything; `wake-hook` L739 fakes a land with `git merge --ff-only`.

Covered end to end today: spawn (`spawn-command`, `workspace-command`), detached finish and stop (`finalize`, `stop-command`), steering (`steer-command` L44: the fake engine loads the real steering hook), continue (`continue-command`), webhooks (`finish-webhook` through the real finalize path, fetch intercepted), groups (`group-command`), doorbell (`github-doorbell` L608), prune, sweep and recovery.

## Bugs the tests caught or pinned

### Caught: an existing test failed first, and the product was fixed

| Test that failed | Where it failed | Product fix | Bug |
| --- | --- | --- | --- |
| `open-command` "close leftover tabs for a proven feature and leaves job files" | Actions run 34586899458 (`git show 43c01cf:ci-repair-notes.md`) | `43c01cf` (`src/git.ts`: `--no-optional-locks`) | background `git status` took the worker's `index.lock` while the worker ran `git add`; the job failed |
| `ticket-author-command` "paths are literal and resolve from subdirectories, absolute paths, and worktrees" | the same Actions run; reproduced on macOS | `76d87fb` | `/var/...` input against Git's `/private/var/...` root failed the repository containment check |
| a CI test the commit calls "the handshake" [INFERENCE: `reaper` "handshake records wrapper birth"] | CI, commit body of `a5c5e49` | `a5c5e49` (`src/wrapper.ts`, `src/contain.ts`) | two finalizers overlapped; the leftover sweep deleted the other's tmp file and crashed it with ENOENT |
| `inherit` "shipped template history matches git log/show of this clone" | CI shallow clone | `7f38f2e` (`hook/inherit.ts`, CI fetch depth) | template history broke in a shallow clone |

The worker searched the 12 largest files (commit log for caught/exposed/red, and `spec/features/**` notes). It found no catch there, only flakes and env leaks. Counter-evidence: in F045 review-1, a mock in `hosted-spawn` missed that Herdr 0.8.2 rejects the `stalled` label (fix `c064d3e`). The fix taught the fake to copy Herdr's allowlist.

Three of the four catches came from tests that run the real CLI on real Git. In `open-command`, which I score `mock`, the real spawn and worker inside the test caught the bug, not its fake-Herdr call-log assertions.

### Pinned: the test was written with the fix

The 12 largest files have 38 distinct bug commits, the 46 other files have 25, and 6 commits appear in both, so 57 are distinct. The table for the 12 largest files is in `team-1-worker-big12.md` section 4(a), and its section 5 names the seam each bug needs. Pinned in the 46 other files (test still present unless noted):

| Commit | Test (file: title) | Bug |
| --- | --- | --- |
| `11ae41d` | `prune-command`: "${command} keeps nested running jobs owned by another checkout"; "leftover sweep keeps a nested container with a locked registered child" | prune deleted live nested worktrees (data loss) |
| `30cff7a` | `prune-command`: "prune keeps a worktree published after its job listing" | prune deleted a job published between listing and removal |
| `9e2d7c7`, `501aa0f` | `stop-command`: "stop completes delayed discovery before a fast parent exit"; "sleeping descendant discovery delays stop only through its short bound" | escaped child processes survived stop; a stuck `ps` held stop open |
| `12473d1`, `3065768`, `cd53342` | `stop-command` (tests deleted by F776) | process-query outcomes confused; descendant attribution lost silently |
| `4e84296`, `8548de0`, `996bba9` | `sweep-command`: "registry registration and pruning repeatedly reclaim dead locks across processes" | concurrent stale-lock reclaim lost project registrations (78/80) and hit ENOTEMPTY (F043 reviews) |
| `967ab4b` | `finalize`: "a provider-error stream fails with its stop reason and preserves prior commits"; "a recovered provider error follows the clean final turn" | a run ending on a provider error was recorded done |
| `5754dad` | `reaper`: "dead valid PIDs confirm immediately regardless of job age" | orphaned hosted jobs lost watch-only ownership |
| `a482020` | `reaper`: "shared running candidates preserve reaper grace and clear omitted observations" | coordinator sweeps re-read every settled job record on each tick (performance; no user-facing failure) |
| `9c5aa8c` | `stalled-tool`: "an observed child that exits without ending its tool becomes a confirmed stall" | a vanished tool child was never confirmed as a stall |
| `839db44`, `bc9476f` | `hosted-hook`: "hosted refresh preserves supervisor warnings, promptly recovers RUNNING labels, and cleans up on shutdown" | the hosted heartbeat erased an active stall warning (F707 coordinator finding) |
| `951282a` | `hosted-binding` (both), `hosted-uncertainty`, `stalled-tool` "hosted ${engine} quiet tools survive...", `sweep-command` "seat uncertainty bell..." | hosted launch attribution wrong; ownership uncertainty not persisted |
| `236b8e7` | `init-command`: "init removes leftover hook copies so the stub is the only project extension" | old hook copies made Pi load the hooks twice |
| `2aaf43b` | `ticket-command`: "ticket new skips a number reserved only by a limen branch or a job label" | `ticket new` reused an F number held by a branch or job |
| `7e11c21` | `picture-tickets`: "two folders with one feature number keep the first work item and warn..." | two folders with one F number both counted |
| `4d003dc` | `picture-overlay`: "graph files with missing or misplaced kinds report errors instead of silently disappearing" | bad overlay files vanished silently |
| `edbc18d` | `keeper-command`: "keeper starts a keeper job on a new branch at the candidate tip"; `land-command` ticket gate | the keeper woke a keeper of itself, and lost a moved ticket (found by the F783 live proof) |
| `abf1e84`, `48c9f31`, `3fe9cd1` | `github-doctor` (two tests) | the doctor misread live Herdr envelopes and warm OMP agents |

Combined history, file × commit pairs: 12 largest files 281 (45 pinned, 0 caught, 163 feature, 60 refactor/reword/deflake, 13 trim). 46 other files without `structure` 298 (32 pinned, 4 caught, 167 feature, 47 refactor/reword, 22 deflake/env, 26 trim). `structure` alone has 87 commits; team 2 counted 50 raises of its old `src/` line budget.

Two pinned rules were later reversed (`finish-webhook`: `1cd1f68` was reversed by `16939e1`, and `2cddbb6` by the current decision table). Those tests guarded the bug, not the intent.

For team 2's scenarios, the closed replay list agreed in the group is: `8548de0`/`996bba9` (F043 registry), `7e43d23` (F042 duplicate and stolen wake claims), `b62b837` (group launch lock past 10 s, and the busy cabinet losing a finish), `43c01cf` (index lock) and `88fd5ac`/`7cbce5c` (hosted OMP agent row lost).

## Files that changed only for features, refactors, rewording or deflakes

These files never changed with a product bug fix. Their history is features plus refactor, reword or deflake churn:

`coordinator-wake`, `picture-viewer`, `status-command`, `picture-layers`, `picture-tick`, `lead-step-finish`, `steer-command`, `engine`, `github-issue-body`, `picture-work`, `view`, `finish-receipt`, `picture-watch`, `steering-hook`, `inherit`, `job`, `workspace-command`, `picture-board`, `wait-command`, `github-doorbell`, `finish-webhook-helper`.

Never changed after they were added: `plant-events`, `diff-command`, `watch-command`, `linear-command`.

`open-command` also has no bug commit of its own, but it caught the index-lock race (above). The pin lives in `git-status`.

Refactor commits that touched many test files without a behavior change: `c1c317f` (src folders regrouped, 43 product files), `3213897` (control renamed to limen), `755457f` (process runtime split), `51fd4d3`, `00aa9b0` (code moved between modules). Deflake and env commits: `c14c8e7`, `390d4d2`, `048a38b`, `e385cdc`, `c651d08`, `1d32305`, `139db5f`, `226b136`, `7b0ea9b`, `efda5ef`, `47e0d77`, `0dcb29c`, `edc1630`, `e59e829`, `cf273fd`, `62c8c0b`.

## Slow tests and wall-clock waits

TAP (F783 run, loaded Mac): 495 top-level results summing to 1,493.6 s. 116 tests over 5 s take 973 s (65%), 26 tests over 10 s take 365 s, and 191 tests under 1 s take 29 s (2%).

| File | Tests | TAP s | Share |
| --- | --- | --- | --- |
| `group-command` | 27 | 259.8 | 17.4% |
| `hosted-spawn` | 39 | 175.7 | 11.8% |
| `finish-webhook` | 34 | 146.9 | 9.8% |
| `spawn-command` | 27 | 127.0 | 8.5% |
| `continue-command` | 19 | 113.3 | 7.6% |
| `stop-command` | 10 | 52.7 | 3.5% |
| `prune-command` | 12 | 47.3 | 3.2% |
| `land-command` | 4 | 40.8 | 2.7% |
| `init-command` | 7 | 34.9 | 2.3% |
| `steer-command` | 6 | 33.6 | 2.3% |

Slowest 20 tests:

| TAP s | File | Test | File action |
| --- | --- | --- | --- |
| 24.2 | `group-command` | a continue waits beyond ten seconds for a real sibling launch without half-claimed members | scenario |
| 23.4 | `init-command` | init plants project-owned files and a hook stub, never role or hook copies | scenario |
| 23.0 | `group-command` | a spawn waits beyond ten seconds for a real sibling launch without half-claimed members | scenario |
| 17.9 | `land-command` | land refuses running job, empty commits, dirty target, and unconfirmed merge | keep |
| 17.8 | `group-command` | busy cabinet never blocks finalization or loses its deferred lifecycle event | scenario |
| 17.3 | `hosted-spawn` | spawn --review in Herdr is hosted; --detached keeps a watch tab | scenario |
| 16.2 | `inherit` | shipped template history matches git log/show of this clone | delete |
| 14.9 | `hosted-spawn` | hosted continue survives a killed caller and passes durable @continue, not @task | scenario |
| 13.4 | `finish-webhook` | missing attribution and unmapped logins skip unless fallback is explicit | scenario |
| 13.2 | `group-command` | automatic lead updates stay agent-attributed and only processed context suppresses replay | scenario |
| 13.2 | `land-command` | land refuses tickets that fail the strict check, prints the keeper command, and lands a good ticket | keep |
| 12.6 | `group-command` | worker continuation inherits membership and deadline but consumes another slot | scenario |
| 12.2 | `group-command` | private planning admits an ignored packet without copying it, and pins descendants and continuations | scenario |
| 12.0 | `group-command` | concurrent worktree spawns consume one total slot and never create a second cabinet | scenario |
| 12.0 | `hosted-spawn` | hosted spawn and continuation forward literal Pi launch flags | scenario |
| 11.8 | `hosted-spawn` | hosted spawn and continuation keep quoted multiline tasks out of shell arguments | scenario |
| 11.8 | `continue-command` | continue sends an explicit model rather than inheriting Pi settings or the old session | scenario |
| 11.5 | `finish-webhook` | automatic fan-out reaches two bot routes after terminal state; first HTTP stall stays HTTP-only | scenario |
| 11.5 | `spawn-command` | stage model defaults respect review roles and explicit overrides | scenario |
| 11.4 | `hosted-spawn` | hosted stop while agent start resolves stops the appeared worker | scenario |

Re-timed at today's load (`env -u LIMEN_GROUP_ID -u LIMEN_TEAM_ID -u LIMEN_JOB -u LIMEN_JOB_ID -u LIMEN_CONTEXT_ROOT node --test --test-concurrency=1 test/<file>.test.ts`, 12:39–12:41):

- `init-command`: 48 s, 7/7 pass, load 116 → 100. One test, "init plants project-owned files and a hook stub", took 34.1 s for two `limen init` calls and file reads. It has no sleep (TAP 23.4 s).
- `land-command`: 48 s, 4/4 pass, load 100 → 87. "land refuses running job, empty commits, dirty target, and unconfirmed merge" took 20.1 s, with four scratch repos and no sleep (TAP 17.9 s).

So most of the cost is process launches and Git work under load, and fixed holds come second. Team 2 accepted this correction. [INFERENCE] The 34 s `init` case likely goes into template drift checks, which run `git log` on the package clone; I did not profile it.

Tests whose verdict rests on a fixed sleep or a wall-clock window, in the 46 other files (the 12 largest are listed in `team-1-worker-big12.md`, "Slow tests and wall-clock waits"):

- `stop-command` L137 "sleeping descendant discovery delays stop only through its short bound": elapsed must be 900–2,000 ms and startup at least 2,100 ms. It failed at load 400 (F776 notes).
- `stop-command` L228 "stop interrupts a process group and is idempotent": a fixed 1,100 ms sleep before the no-cleanup check.
- `finalize` L37: finalize must take under 750 ms while the fake Herdr blocks for 3 s. `finalize` L170: failed must land in under 6 s while the tab close blocks for 8 s.
- `hosted-binding`: fixed sleeps of 7 s + 5 s + 5 s (Linux-only, skipped on macOS).
- `stalled-tool` L30 (x2 engines): a fixed 5 s sleep with `LIMEN_TOOL_STALL_MS=1200`.
- `wait-command`: fake engine sleeps of 400 ms and 3 s, with elapsed of at least 100 ms and under 2 s.
- `steering-hook` L37: a 200 ms sleep proves "not sent again".
- `hosted-hook` L8: three 100 ms sleeps on mocked timers.
- `coordinator-wake` L290: a 100 ms poll with 5 s and 10 s caps on the lead hook heartbeat.
- `sweep-command` L168: 8 rounds × 11 Node children with a 15 s child timeout.

33 of the 57 test files contain a sleep, a poll or a deadline (`waitForState` 10 s, file polls of 25–50 ms with 2–20 s deadlines; `grep -l -E 'waitForState|waitFor[A-Z(]|waitUntil|until\(|deadline|setTimeout|delay\(|wait\(' test/*.test.ts`). A poll is not a verdict by itself. But every poll deadline turns into a random failure at a load above about 300 (F776 notes: about ten tests hit their 10 s wait at load 400).

## File table (all 58 files)

Action is the file's fate. `scenario` means the file's seam core moves into a seam scenario and the rest is deleted. `keep` means the file stays, trimmed to its units. `delete` means nothing in it needs carrying. Line-by-line splits: the 12 largest files are in `team-1-worker-big12.md` section 2, and the 46 other files are in the next section.

| File | Lines | Seam | Class | Action | Reason |
| --- | --- | --- | --- | --- | --- |
| `test/wake-hook.test.ts` | 1,889 | finish-wake | mock | scenario | Real wake hook with a stub Pi host on hand-written job files; 473 lines of claim/routing core go to the finish-wake scenario, 1,416 lines (Herdr call-log mocks, fixed absence sleeps, wording) are deleted |
| `test/hosted-spawn.test.ts` | 1,340 | finish-wake | seam | scenario | 324 lines of hosted spawn/finish core go to the scenarios, 302 lines of noteHostedIdle/parser units stay, 714 lines of fake-Herdr argv and race windows are deleted; 175.7 s |
| `test/spawn-command.test.ts` | 930 | spawn | seam | scenario | Real `bin/limen` spawns; 240 lines of core spawn/review/prune/ticket-gate go to the spawn scenario, 235 lines of overlapping-start race tests stay, 455 lines of argv copies and refusal wording are deleted |
| `test/group-command.test.ts` | 879 | groups | seam | scenario | Real group start; slot and launch-lock contention (b62b837) go to the groups scenario, 244 lines of cabinet/event units stay; three wall-clock tests (11 s, 12 s ×2) cost 65 s |
| `test/finish-webhook.test.ts` | 829 | webhooks | seam | scenario | Real finalize path and real helper with intercepted fetch; 393 lines of decision and author routing go to the webhooks scenario; each test copies the package and four tests wait on 2.5–20 s timeouts |
| `test/github-doorbell.test.ts` | 700 | doorbell | unit | scenario | Two `bin/limen github` runs (216 lines) are the doorbell scenario; 185 lines of claim-allowlist and forged-receipt units stay; 299 lines of mocks and duplicates go |
| `test/continue-command.test.ts` | 506 | steer-context | seam | scenario | Real `bin/limen continue`; 82 lines of the two resume paths go to the steering scenario; 424 lines of argv copies, refusal variants and monkeypatched races go |
| `test/communication-hook.test.ts` | 504 | steer-context | wording | scenario | Real hook, stub host; asserts the prompt and cue text line by line (256 wording); the 60-line presence check of register/styleguide/vision is the only context-injection guard and moves to a scenario |
| `test/jobs-command.test.ts` | 466 | jobs-view | wording | delete | Real `bin/limen jobs` on hand-written records; nearly every assertion is display text; the 44-line reap check duplicates reaper/recovery units |
| `test/wake-sweep.test.ts` | 443 | finish-wake | unit | keep | Deterministic wake-claim harness on a fake clock: claim, fallback and exhaustion units that wake-hook repeats with sleeps; 7.6 s |
| `test/finish-webhook-helper.test.ts` | 427 | webhooks | unit | keep | Real helper script with intercepted fetch; cheap allowlist table for auth, URL, targets, author maps; 3.3 s |
| `test/recovery.test.ts` | 386 | recovery | unit | keep | Real supervisors and sweeps as child processes with an injected clock; reap/adopt decisions are units; competing-sweep runs (164 lines) are the recovery scenario |
| `test/coordinator-wake.test.ts` | 339 | finish-wake | seam | scenario | Real spawn→finish→Herdr prompt with fake engine and fake Herdr (retry once, stop after two stalls, pane takeover); group-lead part calls finalizeJob and the group hook on a hand-built cabinet; exact receipt/log text |
| `test/prune-command.test.ts` | 338 | prune | seam | scenario | Real bin/limen prune/spawn on temp Git with hand-written job records; guards data loss of live worktrees; one readdir monkeypatch race test; several variants of the same keep-live rule |
| `test/picture-viewer.test.ts` | 328 | picture | unit | delete | Pure router/render logic of picture/viewer/viewer.js in a vm, 0 s; picture is a display detail, not a seam; keep only the 6-line ticket-title escape check if picture keeps any test |
| `test/hosted-binding.test.ts` | 322 | spawn | mock | delete | Linux-only (both tests skipped on macOS, 0s in the main run); drives hook/hosted.ts and runtime internals with a fake Herdr, an fs monkeypatch and 17s of fixed sleeps |
| `test/stop-command.test.ts` | 315 | finish-wake | seam | scenario | Real spawn+stop with stubborn/escaping fake engines; process-group containment and stop/timeout terminal states; one 900–2000 ms wall-clock window known to fail under load |
| `test/status-command.test.ts` | 293 | jobs-view | wording | scenario | Real `limen status` on hand-written job records and real branches, but every assertion pins the exact plate layout; the one real check (merged, empty or cherry-picked work is not a candidate) moves into the land scenario |
| `test/picture-layers.test.ts` | 281 | picture | mock | delete | Browser history-stack rules of layers.js checked through a 160-line fake DOM and fake History; UI navigation detail, not a seam |
| `test/stalled-tool.test.ts` | 279 | finish-wake | timing | scenario | Stalled-tool detection with real processes but internal entry points (supervisor, wrapper, observeToolStall) and fixed 5 s sleeps; the detached idle-tool failure is the one user-visible outcome |
| `test/sweep-command.test.ts` | 267 | finish-wake | seam | scenario | Real `limen sweep` rings a fake bell once per advisory or terminal event and claims atomically across processes. The 8-round registry test (L168) pins the F043 lock bugs (`4e84296`, `8548de0`, `996bba9`); a shorter replacement counts only if it fails on `8548de0^` and `996bba9^`. osascript is monkeypatched; the launchd plist check is wording |
| `test/plant-events.test.ts` | 263 | webhooks | unit | keep | Coordinator signal decision table (turnSignal) is real tricky logic; event tests drive internal APIs with a fetch-replacing preload and assert exact reason strings |
| `test/open-command.test.ts` | 252 | herdr-tabs | mock | delete | Herdr tab housekeeping (open/focus/close) checked by grepping a 70-line fake Herdr call log; a display convenience, not a seam |
| `test/picture-generator.test.ts` | 248 | spec-keeper | unit | keep | Pure tests of the frontmatter parser the ticket check also uses, Markdown/HTML escaping, and model building; fast (1.0 s total) |
| `test/finalize.test.ts` | 214 | finish-wake | seam | scenario | Terminal state written once and first (provider error → failed with commits kept; tool-call cap → failed); also Herdr tab-close retry via fake Herdr and wall-clock bounds |
| `test/picture-tick.test.ts` | 207 | picture | seam | delete | Real `limen picture tick --dry-run` on temp Git decides whether the map is stale; all checks are on dry-run output lines; picture refresh is a background convenience, not a user-felt seam |
| `test/lead-step-finish.test.ts` | 198 | webhooks | seam | scenario | Real group-peer hook with a stubbed host and a fetch preload: a lead turn that writes synthesis.md sends one webhook, an unchanged turn sends none, no config sends nothing; handoff sentences pinned |
| `test/scratch.ts` | 195 | fixture | fixture | scenario | Shared fixture: temp repo, fake engine, env scrubbing via a fixed LIMEN_* denylist, waitForState poll; base of the scenario fixture but leaks LIMEN_GROUP_ID/LIMEN_TEAM_ID (team-2 finding) |
| `test/picture-tickets.test.ts` | 193 | spec-keeper | unit | keep | Pure ticket front-matter rules (bad fields, impossible dates, paired flags, duplicate F numbers, unknown places) with line numbers; 0 s; this is the strict check the land gate runs |
| `test/steer-command.test.ts` | 186 | steer-context | seam | scenario | Best seam test in the suite: real spawn, the fake engine loads the real worker hook, `limen steer` text reaches sendUserMessage as a steer and leaves delivered receipts |
| `test/land-command.test.ts` | 179 | land | seam | keep | Already scenario-shaped: real spawn→done→`limen land` fast-forward, merge, five refusals that leave HEAD unchanged, and the ticket gate; slow because each refusal builds a fresh repo (40.8 s) |
| `test/reaper.test.ts` | 177 | finish-wake | unit | keep | Dead-job detection: pid+birth identity and the confirm-after-10 s rule driven with injected clocks (no sleep); plus one CLI check that `jobs` reaps a dead record and frees the branch |
| `test/engine.test.ts` | 175 | spawn | copy | delete | Asserts the exact argv flag lists argvFor builds per engine and mode; restates the implementation, and the spawn scenario (fake engine records its argv) catches a missing flag |
| `test/github-issue-body.test.ts` | 174 | doorbell | mock | scenario | GitHub issue trust rules (write permission, body-only mention, open issue, claim once) through a hand-written fetch fake, fake sudo/id/herdr; asserts prompt wording |
| `test/hosted-hook.test.ts` | 168 | finish-wake | mock | scenario | Calls hook/hosted.ts handlers directly with mocked timers and a call-logging fake Herdr; pins pane-label argv; the finish tool writing `result` is the one seam fact |
| `test/picture-work.test.ts` | 161 | picture | copy | delete | One test: `picture build` joins tickets, board and map into map.json; asserts the full model JSON field by field (restates the model shape); byte-identical rebuild is the one useful fact |
| `test/finish-receipt.test.ts` | 154 | webhooks | unit | keep | Pure allowlist parsers that keep secrets out of receipts and `jobs` detail; 0 s; security logic worth a unit |
| `test/picture-overlay.test.ts` | 154 | picture | unit | delete | Pure buildModel rules for feature/journey overlays (drop unknown refs, never invent edges); fast but deep picture internals that duplicate picture-generator cycle/orphan cases |
| `test/view.test.ts` | 154 | jobs-view | wording | delete | Pins the exact row layout, padding and ANSI color codes of the `limen jobs` human view; pure presentation |
| `test/init-command.test.ts` | 150 | init | copy | scenario | Checks the file list `limen init` plants and removes (copy of the template layout) plus guidance wording; the stub-injects-context test (L104) is a real steer-context check; 34.9 s |
| `test/ticket-author-command.test.ts` | 140 | webhooks | seam | scenario | Real Git history decides who filed a ticket (survives moves, edits, mailmap, shallow clones); feeds webhook routing to the right collaborator |
| `test/diff-command.test.ts` | 137 | herdr-tabs | mock | delete | Hunk review tab opening checked through a fake Herdr call log and a fake hunk; display convenience, not a seam |
| `test/github-doctor.test.ts` | 117 | doorbell | wording | delete | Checks the doctor prints a list of named prerequisite lines and never the key bytes; console.log monkeypatched; setup diagnostics, not a seam |
| `test/picture-watch.test.ts` | 117 | picture | seam | delete | Real git reference-transaction hook starts a picture job on a top-branch move; background convenience with 20 s log polling; the one leak check (routing not inherited) is the useful fact |
| `test/steering-hook.test.ts` | 113 | steer-context | duplicate | delete | Drives hook/steering.ts handlers directly; the same inbox→steer delivery is proven end to end by steer-command L44 |
| `test/inherit.test.ts` | 101 | init | copy | delete | Template drift classification plus a check that templates/.history matches git log of this clone (16.2 s); the history test fails on every template edit until regenerated, guarding the build artefact, not behaviour |
| `test/job.test.ts` | 92 | none | unit | keep | Pure parsers: duration bounds, state union, job id resolution by suffix/label (ambiguity errors); 0 s |
| `test/workspace-command.test.ts` | 89 | spawn | seam | scenario | Real workspace init + spawn --repo into a child repo, path-traversal refusal, review worktree; a spawn variant for multi-repo plants |
| `test/keeper-command.test.ts` | 83 | spec-keeper | seam | keep | Real `limen keeper` refuses a running job, starts one keeper job on a new branch at the candidate tip, follows a moved ticket and refuses a second keeper; scenario-shaped already |
| `test/ticket-command.test.ts` | 81 | spec-keeper | unit | keep | Next free F number skips numbers held by branches, job labels and monthly done/dropped folders; refuses unknown places; calls ticketCommand in-process (2.9 s) |
| `test/picture-board.test.ts` | 80 | picture | unit | delete | Pure board-line parser (section, state, line); the land gate warning about missing board lines is covered by land-command L147 |
| `test/watch-command.test.ts` | 71 | finish-wake | seam | scenario | Real `limen watch`/`unwatch` move the wake route between sessions and panes; the takeover rule is a wake-routing fact the finish scenario should check once |
| `test/git-status.test.ts` | 48 | spawn | unit | keep | cleanWorktree must not rewrite the index a worker is committing to (a real race); two other tests pin outside-project and unborn-repo wording |
| `test/hosted-uncertainty.test.ts` | 37 | finish-wake | unit | keep | Pure state rule: one uncertainty condition keeps its start time across 50 transitions, child loss needs child recovery, terminal state retires it; injected clock, 0 s |
| `test/linear-command.test.ts` | 37 | none | wording | delete | Toggle for the Linear mirror config file; asserts messages for each state; config housekeeping, not a seam |
| `test/wait-command.test.ts` | 35 | finish-wake | timing | delete | `limen wait` blocks until a terminal state and refuses in a coordinator; both checks are wall-clock bounds (>=100 ms, <2 s) around fake-engine sleeps. The scenarios wait with `limen wait` (team 2 design), so every scenario exercises it |
| `test/stream.test.ts` | 27 | finish-wake | unit | keep | Pure parser of engine JSON events into activity, tool and stop reason; the finish decision depends on it; 0 s |
| `test/structure.test.ts` | 26 | none | trivia | keep | Pins zero runtime dependencies and unique basenames; the natural home for a machine-checked test budget |

## Line splits for the 46 other files

| File | Lines | seam | unit | mock | copy | wording | timing | duplicate | trivia | fixture | TAP s | Waits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `coordinator-wake` | 339 | 230 |  | 50 | 19 | 40 |  |  |  |  | 29.1 | receipt(): poll 50ms, 10s deadline; L319 lead hook refresh poll 100ms, 5s cap; L329 delivery poll 100ms, 10s cap; waitForState 10s deadline |
| `prune-command` | 338 | 200 |  | 41 |  | 10 |  | 75 | 12 |  | 47.3 | startup window: started-at 60s vs 60min (fixed timestamps, no sleep); waitForState 10s |
| `picture-viewer` | 328 |  | 200 | 30 | 80 |  |  |  | 18 |  | 0.0 |  |
| `hosted-binding` | 322 |  |  | 190 | 72 |  | 60 |  |  |  | 0.0 | L272 wait(7000); L313 wait(5000); L317 wait(5000); until(): poll 25ms, 10s deadline |
| `stop-command` | 315 | 165 |  | 30 | 25 | 25 | 70 |  |  |  | 52.7 | L137 asserts elapsed 900–2000 ms and >=2100 ms startup (F776: failed once at load 400); L252 sleep 1100 ms; L240 poll 25ms 5s; waitForContainment 25ms poll 5s; L264 waitForState failed 8s; L300 poll 10ms 2s; fake ps sleeps 0.2s / 10s |
| `status-command` | 293 | 95 |  | 45 |  | 140 |  | 13 |  |  | 25.9 |  |
| `picture-layers` | 281 |  | 100 | 165 |  |  |  |  | 16 |  | 0.0 |  |
| `stalled-tool` | 279 | 70 | 50 | 49 |  |  | 110 |  |  |  | 29.0 | L106 wait(5000) x2 engines; until(): poll 100ms, 12s deadline; LIMEN_TOOL_STALL_MS=1200 windows; L217 waits for CPU time to tick |
| `sweep-command` | 267 | 140 |  | 55 | 25 | 17 | 30 |  |  |  | 10.8 | timestamps aged with utimes (no sleep); LIMEN_SEAT_RING_MS=1/10000 windows; runChildren 15s child timeout; 8 rounds x 11 node children (L168) |
| `plant-events` | 263 |  | 40 | 120 | 48 | 55 |  |  |  |  | 3.9 | settledEvents(): poll 20ms, 20s deadline; fixed timestamps for idle windows (no sleep) |
| `open-command` | 252 |  |  | 170 | 52 | 30 |  |  |  |  | 20.4 | L21 poll 25ms 5s for tab file; L32 poll 25ms 2s for tab close; waitForState 10s |
| `picture-generator` | 248 |  | 185 |  | 20 | 25 |  |  | 18 |  | 1.0 |  |
| `finalize` | 214 | 95 |  | 50 |  |  | 45 | 24 |  |  | 29.1 | L74 asserts finalize < 750 ms while fake Herdr blocks 3 s; L192 asserts failed < 6 s while tab close blocks 8 s; L123 poll 25ms 8s; waitForState 8–10s |
| `picture-tick` | 207 | 90 |  |  |  | 85 |  |  | 32 |  | 17.3 |  |
| `lead-step-finish` | 198 | 135 |  |  |  | 45 |  |  | 18 |  | 9.6 |  |
| `scratch` | 195 |  |  |  |  |  |  |  |  | 195 | 0.0 | waitForState(): poll, 10s default deadline |
| `picture-tickets` | 193 |  | 160 |  |  |  |  | 33 |  |  | 0.0 |  |
| `steer-command` | 186 | 135 |  |  |  | 21 |  | 30 |  |  | 33.6 | waitUntil(): poll 20ms, 5s deadline; waitForState 10s |
| `land-command` | 179 | 150 |  |  |  | 29 |  |  |  |  | 40.8 | waitForState 10s (x7 jobs) |
| `reaper` | 177 | 45 | 95 |  | 20 |  |  |  | 17 |  | 11.6 | injected timestamps t0+9000/t0+10000 (no sleep); waitForFile poll 25ms 5s |
| `engine` | 175 |  | 30 |  | 125 |  |  |  | 20 |  | 0.3 |  |
| `github-issue-body` | 174 |  | 50 | 80 |  | 30 |  | 14 |  |  | 7.3 |  |
| `hosted-hook` | 168 | 28 |  | 80 | 45 |  | 15 |  |  |  | 0.9 | context.mock.timers (fake time); waitFor(): poll 20ms, 3s; L70 sleep 100ms x3 |
| `picture-work` | 161 | 45 |  |  | 95 | 21 |  |  |  |  | 2.0 |  |
| `view` | 154 |  | 20 |  |  | 120 |  |  | 14 |  | 3.8 |  |
| `picture-overlay` | 154 |  | 90 |  |  |  |  | 44 | 20 |  | 0.0 |  |
| `finish-receipt` | 154 |  | 120 |  | 20 | 14 |  |  |  |  | 0.0 |  |
| `init-command` | 150 | 45 |  |  | 70 | 35 |  |  |  |  | 34.9 |  |
| `ticket-author-command` | 140 | 70 | 40 |  |  |  |  | 30 |  |  | 15.9 |  |
| `diff-command` | 137 |  |  | 85 | 35 | 17 |  |  |  |  | 15.5 | waitForState 10s x3 |
| `picture-watch` | 117 | 70 |  |  |  | 22 | 25 |  |  |  | 8.9 | logMatching(): poll 50ms, 20s deadline; waitForState 20s |
| `github-doctor` | 117 |  | 12 | 35 |  | 70 |  |  |  |  | 4.7 |  |
| `steering-hook` | 113 |  |  | 25 |  |  | 13 | 75 |  |  | 0.4 | waitUntil poll 20ms 3s; L50 sleep 200 ms to prove "not sent again" |
| `inherit` | 101 |  | 45 |  | 45 |  |  |  | 11 |  | 17.3 |  |
| `job` | 92 |  | 60 |  |  | 20 |  |  | 12 |  | 0.0 |  |
| `workspace-command` | 89 | 65 |  |  |  |  |  | 24 |  |  | 21.5 | waitForState 10s; fake engine setTimeout 500ms (L58) |
| `keeper-command` | 83 | 63 |  |  |  | 20 |  |  |  |  | 15.6 | waitForState 10s |
| `ticket-command` | 81 |  | 60 |  |  | 10 |  | 11 |  |  | 2.9 |  |
| `picture-board` | 80 |  | 60 |  |  |  |  |  | 20 |  | 0.0 |  |
| `watch-command` | 71 | 55 |  |  |  |  |  | 16 |  |  | 15.6 | waitForState 10s |
| `git-status` | 48 |  | 23 |  |  | 25 |  |  |  |  | 4.3 |  |
| `linear-command` | 37 |  |  |  |  | 25 |  |  | 12 |  | 4.9 |  |
| `hosted-uncertainty` | 37 |  | 30 |  | 7 |  |  |  |  |  | 0.0 |  |
| `wait-command` | 35 |  |  |  |  | 15 | 20 |  |  |  | 6.4 | fake engine setTimeout 400 ms and 3000 ms; asserts elapsed >=100 ms and <2000 ms |
| `stream` | 27 |  | 27 |  |  |  |  |  |  |  | 0.0 |  |
| `structure` | 26 |  |  |  |  |  |  |  | 26 |  | 0.0 |  |

Per-file notes:

- `coordinator-wake`: L91 retry-once and L104 stop-after-two are real decision logic; L120 is copy (file layout).
- `prune-command`: L53 and L117 both prove "locked registered worktree survives"; L284 repeats the spawn-side keep of L17/L68; L208 trivia.
- `picture-viewer`: Fixture is 164 lines; vm harness patches the startup call (mock). L282/L291 restate adapter grouping (copy).
- `hosted-binding`: Never ran in the F783 suite (2 skipped). L200-218 enumerates each binding field (copy of the record shape).
- `stop-command`: L94 calls recordCleanup directly then reads `jobs` detail (half copy). L174/L192 hand-written hosted job records.
- `status-command`: Fake Herdr tab/agent lists in L19, L177 (mock). L172-174 repeats prune --retire dry-run (duplicate of prune-command).
- `picture-layers`: Only split() (L182) is pure logic worth a 15-line unit if picture keeps tests.
- `stalled-tool`: L115 (detached idle tool fails) is the scenario-worthy case. L178/L221 are the unit-worthy decision cases. L260 duplicates hosted-binding ownership.
- `sweep-command`: L168 stress loop (8 rounds × 80 registrations) is a lock-race test of the project registry. L207 launchd plist is wording/copy.
- `plant-events`: Keep L85 (decision table, 37 lines) as a unit; the three event tests become part of the webhooks scenario (event reaches the HTTP sink once).
- `open-command`: Assertions are on exact herdr argv strings (copy of the call shape).
- `picture-generator`: Keep L39, L62 (frontmatter), L71/L153 (escaping), L83 (cycles). L203 pins exact warn lines (wording). L192 trivia.
- `finalize`: L143 provider-error and L170 cap are finish-scenario cases. L196 duplicates stop-command L228 (one terminal line). L134 tab-close retry is Herdr housekeeping (mock).
- `picture-tick`: If picture stays a seam, keep one cited-edit-vs-uncited case (L107) as a scenario step. L33/L49 are hint wording.
- `lead-step-finish`: Hook-host stub counted as the faked engine (same rule as the worker). L174 is wording.
- `scratch`: Not a test; counted as fixture. Rewrite with an env allowlist.
- `picture-tickets`: Keep as the spec-keeper unit set; L179 overlaps L20/L83 (duplicate).
- `steer-command`: L44 is the steering scenario nearly as-is. L92 and L113 are two routes of --running (session vs pane); L133 ended-between-selection is a race case.
- `land-command`: Keep as the land scenario; collapse the four scratch repos of L61 into one repo to cut ~15 s. L168/L171 pin exact warn text.
- `reaper`: L41/L65 are the unit kernel (keep). L89 belongs in the finish scenario (crashed worker becomes failed). L117 pins the born format (copy).
- `engine`: Bridge/extension discovery (L70, L103) and skills view (L135) are file-layout restatements. L16 default-engine resolution is a 15-line unit at most.
- `github-issue-body`: The trust filter (L123) is the security core. Fold it into one doorbell scenario that fakes the GitHub API with a fetch preload, since the sender refuses plain HTTP (team 2). The claim-name collision (L143) is a pinned bug.
- `hosted-hook`: L105 (finish tool writes result, session-ended only after finish) belongs in the hosted finish scenario. L8 pane-label refresh is Herdr display detail (copy of argv).
- `picture-work`: Unknown-touch error (L157) duplicates picture-tickets L20 and land-command ticket gate.
- `view`: resolveView/colorWanted (L96) is a 10-line unit at most; the rest is display wording.
- `picture-overlay`: L134 escape duplicates picture-generator L71/L153. If picture keeps one unit file, merge L45 into it.
- `finish-receipt`: L18/L37/L70 are the allowlists; L49 asserts detail wording.
- `init-command`: Every scenario starts with `limen init`, so init is covered by the fixture; keep "never overwrite a user file" (L46 part) and L104 as scenario steps.
- `ticket-author-command`: L8 is the core; L91 path forms and L61 refusals are edge variants. Overlaps finish-webhook "after edits and lane moves" test.
- `picture-watch`: F776: failed from engine leak (LIMEN_OMP inherited). Routing-not-inherited (L111) is the only seam-level fact.
- `github-doctor`: The no-secret-in-output check (L60) is the one worth 5 lines inside a doorbell scenario.
- `steering-hook`: Deliver-once (L37) is the only case not in steer-command; add it as a step in the steering scenario.
- `inherit`: L50 breaks on every template change (refactor-only by construction). L13/L29 drift classes are a 30-line unit if init --drop-leftovers stays.
- `job`: Keep L5 and L81; L15/L64 render text (wording).
- `workspace-command`: L7 is the workspace spawn scenario; L69 stop and L56 branch reuse are variants.
- `keeper-command`: Fold into the spec-keeper scenario together with land-command L147.
- `ticket-command`: L26/L38 are the tricky-logic units (keep). L51-54 pin template headings (wording).
- `picture-board`: If the board parser stays in the land gate, keep the malformed-line case (L52, 28 lines) as a unit.
- `watch-command`: L47 pane takeover overlaps coordinator-wake L146.
- `git-status`: Keep L8 (index race, 16 lines). L25/L38 are guidance wording.

## Method

- One class per test, from what its assertions check, not from its title. Imports and helpers go to the tests that use them, and each split sums to `wc -l`.
- `seam` means the real product path. That is `bin/limen` or the real hook or command entry, on a real temp Git repo and real files, with only the engine faked. A hook run in-process with a stub Pi host counts as `seam` when it asserts job files or delivered wakes. It counts as `mock` when it asserts host interplay or Herdr argv. The worker and I applied the same rule (`coordinator-wake` and `lead-step-finish` were re-scored to match).
- A stateful fake Herdr is allowed in a seam test. A test that asserts the fake's call log is `mock` or `copy`.
- `timing` means the verdict rests on a fixed sleep, a wall-clock bound, or an aged timestamp. A poll with a deadline is listed under waits and is not a class by itself.
- `bug-caught` needs evidence that an existing test went red before the fix (a CI log, a commit body or notes). `bug-pinned` means the fix commit added or changed the assertion.

## Actions after settlement with team 2

The file table above is team 1's own reading. The lead asked team 1 and team 2 to settle the 12 files where their actions differed (lead `00000074`). The two answers crossed (team 1 `00000079`, team 2 `00000081`). Where one team conceded and the other agreed, the stronger guard wins. The converged fates:

| File | Team 1 | Team 2 | Settled fate |
| --- | --- | --- | --- |
| `wake-sweep` | keep | delete | rewritten as unit U4 (about 80 lines): claim, fallback and two-failure exhaustion (`a14640f`) on a fake clock with mtime ageing; the sweep-cache internals go |
| `finish-receipt` | keep | delete | delete: S7 plants a real secret and checks that no job file, receipt, stdout/stderr or `limen jobs <id>` detail carries it. It reopens if a receipt field exists that S7 cannot make carry the secret |
| `recovery` | keep | scenario | scenario: the missing-row case to S2 (replayed on `88fd5ac^`); the killed supervisor and competing sweeps to S9 (two `limen jobs` started together after `kill -9`; one `finished-at`) |
| `reaper` | keep | scenario | kept as a unit of about 50 lines: a dead valid pid confirms at once (`5754dad`), a recycled pid with a new birth is dead, and the 10 s confirm rule runs on an injected clock |
| `hosted-uncertainty` | keep | delete | kept as a unit (about 30 lines; pure, injected clock; no scenario reaches it without a wall clock) |
| `git-status` | keep | scenario | keep the first test (about 20 lines) as the direct `43c01cf` proof and replay target; its two wording tests go |
| `stalled-tool` | scenario | delete | one S3 case: a detached engine starts a tool and blocks, `LIMEN_TOOL_STALL_MS` is small, and the job ends failed with the stall reason before `--timeout` |
| `status-command` | scenario | delete | one S5 check: a merged, empty or cherry-picked job is not a land candidate in `limen status`; the layout asserts go |
| `land-command` | keep | scenario | becomes S5 on the shared plant (one plant per file, not one fresh repo per refusal); content kept |
| `keeper-command` | keep | scenario | becomes part of S6 |
| `ticket-command` | keep | scenario | S6 runs `limen ticket new` through `bin/limen`, with a branch, a job label and a done folder holding numbers |
| `picture-work` | delete | scenario | one S6 check (two builds give identical bytes); the rest goes |

Net effect (team 2's count): units about +100 lines and scenarios about +30. The from-scratch set moves from about 3,300 to about 3,400 lines, under the lead's 3,500 cap.

## Points from other teams

| From | Point | Answer | Changed my result? |
| --- | --- | --- | --- |
| team 2 | Send the tests that caught real bugs, with commits | Sent a partial list early (group message `00000036`) and the full list here (Caught and Pinned) | No |
| team 2 | `scratch.ts` scrubs a LIMEN_* denylist that misses `LIMEN_GROUP_ID`/`LIMEN_TEAM_ID`, so spawn tests fail inside a group job | Checked: I unset both (and the job vars) for my two timing runs; both files passed | Yes: the timing method and the `scratch` row (fixture needs an env allowlist) |
| team 2 | The old `src/` line budget was raised 50 times, then deleted; F776's cut regrew 1,543 lines in 11 hours | Accepted as input for the anti-bloat rule; outside my scores | No |
| team 2 | One spawn round trip is about 1 s at load 125, so suite time must be fixed waits | Rejected with evidence: `init-command` L46 took 34.1 s and `land-command` L61 took 20.1 s, neither with a sleep. Team 2 then corrected their claim. Their own census later found 26 fixed awaits of 100 ms or more, summing to 17.6 s (1.2% of the run) | No |
| team 2 | Unit budget about 500 lines; your floor keeps rows that a scenario already reaches through the CLI (`00000076`, design `b5d0456` section 4) | First I disagreed (floor about 1,210). Team 2 then went file by file: each dropped unit is reached by a named scenario, or its risk is accepted in their section 8b. I accept that, except for rows that a scenario cannot reach without a wall clock or a recycled pid. The settlement kept those rows (`wake-sweep` as U4, `reaper`, `hosted-uncertainty`, `git-status`): about +100 lines over their 555 | Yes: the unit floor moves from about 1,210 to about 650 lines |
| team 3 | Do not score `group-command` as timing/delete; `b62b837` fixed a real lock bug | Agreed: L770 and L808 are scenario; the file is scenario. Their 11–12 s holds should become gates if product code may change later | Confirmed the worker's action |
| team 3 | `sweep-command`'s 8-round registry test is not disposable (F043, 78/80 lost registrations, ENOTEMPTY) | Agreed: scenario, not timing. A shorter replacement counts only if it fails on `8548de0^` and `996bba9^` | Yes: the red-on-pre-fix condition is added to the `sweep-command` row |
| team 3 | `open-command` caught the index-lock race (`43c01cf`) | Verified in `43c01cf:ci-repair-notes.md`. Added to Caught. The file stays delete because `git-status` pins the invariant directly | Yes: the bug list. No: the action |
| team 3 | Which kept units can collapse safely? | Per-file floor: wake-sweep 347→150, finish-webhook-helper 289→100, hosted-spawn units 302→120, group-command units 244→120, recovery 195→100, github-doorbell units 185→90, picture-generator 248→90, picture-tickets 193→90, finish-receipt 154→70, reaper 177→60, ticket-command 81→45, job 92→35, the rest about 160. Total about 1,210 | No |
| team 3 | F042/F043 tests were written after reviewer reproductions, not caught | Agreed: both are in Pinned | No |
| lead | Give class totals and the share that survives | Totals above. About 3,980 seam lines (23%) plus about 2,435 kept unit lines (14%) | No |
| lead | One end-state number and one calendar number | First estimate: about 3,500 lines, with units at about 1,210. After the settlement with team 2: about 3,400 lines (team 2's count). About 5 min serial at load 100 [estimate: about 60 job round trips at 1–3 s plus fast units]. 2–3 working days of agent time | Yes: the line estimate, after the settlement |
| lead | Settle the 12 files where team 1 and team 2 differ, one line each | Settled above. The answers crossed, so each file takes the stronger guard either team offered: 4 units kept (`wake-sweep` as U4, `reaper`, `hosted-uncertainty`, `git-status`), 1 deleted (`finish-receipt`, guarded by S7's planted secret), and 7 move into scenarios | Yes: the settled fates override the file table for those 12 files |
| lead | Draft verdict: staged replace written from scratch; target 3,300 lines, hard cap 3,500; the cap lives in `spec/vision.md` and `test/structure.test.ts` fails above it; land informs, does not refuse | Agree. From this audit: the cap binds only if the suite that enforces it is the one people run before land. Main went red twice today (`edc1630`, `e288a4c`) because nobody runs a 25-minute suite | No; the settled estimate (about 3,400) is inside the cap |
| brief | Are groups, the doorbell, the picture, sweep and prune seams of their own? | Groups: yes, a scenario of its own (slot and lock contention bugs `b62b837`, `57ad3e9`). Doorbell: yes, a trust boundary (one scenario plus the claim allowlist units). Sweep, prune and recovery: steps of finish-wake and spawn, with one housekeeping scenario for the data-loss and lost-wake races. Picture: not a seam. It keeps only the frontmatter and escaping units that the ticket check shares. Status and jobs views, and Herdr tabs: details; delete | No |
