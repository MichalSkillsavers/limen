# Synthesis

## Verdict: staged replace, written from scratch

Rebuild Limen's tests from an empty folder, seam by seam. Each new scenario lands together with the deletion of the old files it replaces. Do not trim the old suite again, and do not delete it all before the new one exists.

All three teams reached this verdict on their own evidence:

1. **The old suite is mostly not guarding anything.** Of 17,094 lines, 51% are mocks, copies of the code, wording checks, timing windows, duplicates and trivia; only about 23% sit in tests that guard a seam (Team 1, all 58 files read). In the 12 largest files, 281 file-and-commit pairs hold 0 bug catches, 45 regression pins, 163 feature additions and 60 refactor-only changes. Only four tests in the whole suite are known to have caught a bug before anyone looked; three of them ran the real CLI on real Git.
2. **A trim does not hold.** The last trim (F776) cut 17,543 to 15,551 lines; 11 hours later the folder was back at 17,094 (+2,153 / −610 in 54 commits). An earlier line budget in `test/structure.test.ts` was raised 50 times in 37 days and then deleted (Team 2, `git log -G 'sourceLines <='`).
3. **A rip-out first opens a real hole.** Five incident families have a reproduced failure and a fix: lost seat registrations under stale-lock races (F043), duplicate and stolen wakes (F042), the group launch lock past its 10-second limit (`b62b837`), background status taking a worker's Git index lock (`43c01cf`), and a hosted job marked failed when Herdr lost its agent row (F728). Six happy-path scenarios catch none of them (Team 3).
4. **The new suite is cheap to run.** One spawn-and-wait round trip on a throwaway plant took 1 to 3 seconds at load 114 to 129 (Team 2, measured). The old suite is slow because every test builds its own repo, engine and wait loop, not because Limen is slow.

The staged path costs about one more day than a rip-out (Team 3: two days against three), and it never leaves a known race without a guard.

## Size and time

| | Today | After |
| --- | --- | --- |
| Lines in `test/` | 17,094 | about 3,350 (cap 3,500) |
| Files | 58 | 20: one fixture, ten scenarios, nine units |
| Full run, one file at a time | 1,502 s, about 25 min (F783 run, loaded Mac) | about 4 min |
| Full run, four files at a time | not possible today (tests share state) | about 1.5 min |

The "after" numbers are estimates from measured step costs (Team 2, section 5), not an observed run. Under heavy load the serial run may reach 11 minutes. The first real run of the new suite replaces these estimates.

## The seams and their scenarios

Each scenario is one file on one shared throwaway plant: a temp Git repo after `limen init`, an allowlisted environment, one scripted fake engine that loads the real hooks, a fetch sink for webhooks, and a fake Herdr only where hosted jobs need it. No scenario sleeps: it waits on `limen wait`, file events, FIFOs and file ages set with `utimes`.

| # | Seam | What it must catch |
| --- | --- | --- |
| S1 | Spawn, detached | a job without its own worktree and branch, wrong task bytes, leaked engine environment, a status read that takes the worker's Git index lock (`43c01cf`) |
| S2 | Spawn, hosted | a hosted job that does not finish on session end, a task passed as shell text, a job marked failed when Herdr loses its agent row (`88fd5ac`) |
| S3 | Finish and wake | a missing, double or wrong wake; provider error recorded as done (`967ab4b`); stop and timeout states; two listeners delivering one wake twice (`7e43d23`) |
| S4 | Steering and context injection | a steer lost or delivered twice; a prompt without the register, styleguide, vision and board pointers; continue without the old session |
| S5 | Land | landing a running, empty or failed job, onto a dirty target, with a bad ticket, or by a group member |
| S6 | Spec keeper | a reused F number (`2aaf43b`), a ticket check without file, line and fix, a keeper on the wrong base (`edbc18d`) |
| S7 | Webhooks | a ping to the wrong target, a secret in any job file or output, a failed job that sends nothing |
| S8 | Groups | two members claiming one slot, a lost finish while the cabinet is busy, a launch failing behind a slow sibling (`b62b837`) |
| S9 | Housekeeping (sweep, prune, stop, recovery) | prune deleting live work (`11ae41d`, `30cff7a`), escaped child processes after stop, lost seat registrations from a dead-owner lock (F043) |
| S10 | GitHub doorbell | an outside user starting work, a duplicate reply after a restart |

Groups and the doorbell are seams of their own: each is a concurrency or trust boundary a user feels. The picture is not a seam: it is a read-only view. It keeps only the parser units the ticket check shares.

Units, each a small pure file: U1 ticket diagnostics, U2 webhook sender trust table (zero requests on bad input), U3 coordinator turn signal, U4 wake claims, U5 engine stream, U6 front matter and Markdown, U7 job ids and durations, U8 structure and the line cap, U9 pid identity.

## Plan

1. **Adam decides the cap** (the one owner decision, below).
2. **Freeze the old suite.** From now on a feature adds no lines to old test files; a new check goes into the new suite only.
3. **Fixture first.** One job writes the shared throwaway plant (`test/plant.ts`, about 260 lines) and the cap check in `test/structure.test.ts`, which reads the cap from `spec/vision.md` and runs only on the new suite until the old files are gone. `limen land` prints one information line: test lines at the branch tip, the cap, this branch's added and removed lines, and "over the cap" when it is over.
4. **Scenarios in two waves.** Wave one: S8 groups, S2 hosted, S7 webhooks, S1 spawn, S4 steering. The old files they replace take more than half of today's run time. Wave two: S3, S5, S6, S9, S10, and the unit files. Each landing deletes the old files its scenario replaces, per `group/findings/file-actions.md`.
5. **Replay the five incident families.** Before an old regression test is deleted, its replacement must fail on the commit before the fix and pass on `main`: `4e84296^`, `8548de0^`, `996bba9^` (F043), `7e43d23^` (F042), `b62b837^`, `43c01cf^`, `88fd5ac^` (F728). If the new CLI cannot run on the old commit, overlay the old `src/`, `hook/` and `bin/` under the new tests; if that still fails, replay the narrow unit; if nothing reaches it, record the gap and keep the old test. This list is closed: every other file is deleted without a replay.
6. **Final cut.** Delete the remaining old files and `test/scratch.ts`. Switch `npm test` to four files at a time. The cap check now covers all of `test/`.
7. **Prove it.** One full run on a quiet Mac, with the real time recorded in the outcome. One manual hosted run with real Herdr, because the fake Herdr can drift from the real one.

Calendar estimate: two to three working days on this plant (Team 2: 1.5 days; Team 1: 2 to 3; Team 3: 3). The long pole is the replays and the load on this Mac, not writing the tests.

Optional follow-up, not part of the reset: a small product change that lets a test shorten the group lock deadline would remove the one remaining 12-second hold in S8.

## Anti-bloat rule

**The test folder has a hard cap that only Adam sets.** One line in `spec/vision.md` holds the number (3,500). `test/structure.test.ts` reads it and fails `npm test` when `test/` is over it: `test/ has 3,612 lines; spec/vision.md caps it at 3,500. Remove 112 test lines, or ask Adam to raise the cap.` `limen land` prints the line count and the branch's change as information, and says when a branch edits the vision.

Why this holds where the old budget failed: all 50 raises of the old budget edited a constant in the same branch as the feature. A number in the vision cannot move without a visible edit to Adam's own file, which the coordinator must not make without asking. And a suite that runs in minutes gets run before a land; today's 25-minute suite does not, which is why `main` went red twice today (`edc1630`, `e288a4c`).

No new land refusal: the vision says harness mechanisms "inform and preserve judgment; no hidden workflow gate", and the styleguide says "inform, do not gate". If a landing ever goes over the cap, the documented escalation is a net-zero rule in `limen land`: a branch that adds test lines must remove as many.

## Accepted risks

These bugs keep no test after the reset. Each is an advisory, a display detail, a Linux-only path, or a performance fix:

- a stalled tool is no longer detected early (`9c5aa8c`); the job timeout still ends it
- hosted refresh warnings (`839db44`) and hosted uncertainty bells
- the Linux-only hosted binding (`951282a`), never run on this Mac
- map files with missing kinds (`4d003dc`); the picture is not a seam
- reaper grace on settled records (`a482020`), a performance fix with no user-facing failure
- shallow-clone template history (`7f38f2e`); that test broke on every template edit

## The one decision for Adam

Approve the reset with a 3,500-line cap on `test/`, written as one line in `spec/vision.md`. The anti-bloat rule depends on that number living in the file only Adam edits. Without it, the plan falls back to another trim, and the folder regrows.

## Where the teams disagreed and how it was settled

- **Target size.** Team 2 built the set bottom-up at 3,300 lines; Team 1's unit floor gave 3,500; Team 3 moved to 3,700. After the twelve disputed files were settled, Teams 1 and 2 agree on about 3,350. The lead set the cap at 3,500.
- **Replay rule.** Team 3 asked that no old regression test go before its replacement fails on the pre-fix commit. The lead accepted it only as a closed list of five families, so it cannot slow the rest of the cut.
- **Land refusal.** Team 2 first proposed that `limen land` refuse any branch that adds test lines. The lead chose an information line plus a cap the owner holds, because of the vision principle above; Team 2 agreed and kept the refusal as the escalation.
- **Twelve files** had different actions in Team 1 and Team 2. Both teams settled them in one exchange; the result is in `group/findings/file-actions.md`.

## Sources

- Team 1 value audit: `group/teams/team-1-scores.md`, `group/teams/team-1-worker-big12.md`
- Team 2 design: `group/teams/team-2-design.md`
- Team 3 challenge: `group/teams/team-3-challenge.md`, `group/teams/team-3-incidents.md`
- File actions: `group/findings/file-actions.md`
- Run time: `/tmp/f783-lead/full-suite.tap` (532 tests, 1,502 s)
- Group: `4f7f48da-b9c4-4bab-bea4-d7baa685c92d`
