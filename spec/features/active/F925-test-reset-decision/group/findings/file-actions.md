# File-by-file actions

One action for each of the 58 files in `test/` at `5df0697`. Sorted by lines, largest first. Line counts: `wc -l`. Seam and class: Team 1's audit (`group/teams/team-1-scores.md`). Action: the list Team 1 and Team 2 settled at 12:50, confirmed by the lead.

- **delete**: nothing in the file is carried forward.
- **scenario**: the file's seam core is rewritten into the named scenario on the shared throwaway plant; the old file is deleted in the same landing.
- **keep**: the file survives as one small unit file (U1 to U9), cut to the rows named.

Scenarios: S1 spawn (detached), S2 spawn (hosted), S3 finish and wake, S4 steering and context injection, S5 land, S6 spec keeper, S7 webhooks, S8 groups, S9 housekeeping (sweep, prune, stop, recovery), S10 GitHub doorbell. Units: U1 ticket diagnostics, U2 webhook sender trust table, U3 coordinator turn signal, U4 wake claims, U5 engine stream, U6 front matter and Markdown, U7 job ids and durations, U8 structure and the line cap, U9 pid identity.

| Action | Files | Lines today |
| --- | --- | --- |
| delete | 21 | 4,169 |
| scenario | 29 | 11,472 |
| keep | 8 | 1,453 |
| total | 58 | 17,094 |

The 29 scenario files (11,472 lines) become one fixture of about 260 lines and ten scenario files of about 2,500 lines. The 8 kept files (1,453 lines) shrink to about 585 lines. End state: about 3,350 lines in 20 files.

| File | Lines | Seam | Class | Action | Goes to | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| `test/wake-hook.test.ts` | 1,889 | finish and wake | mock | **scenario** | S3, U4 | The claim and routing core (about 470 lines) moves to S3 and the wake-claim unit; Herdr call-log mocks, fixed 100–1,100 ms absence sleeps and title wording go. F042 fix 7e43d23 is replayed. |
| `test/hosted-spawn.test.ts` | 1,340 | spawn | seam | **scenario** | S2, U7 | Hosted launch, finish on session end and the F728 missing-agent-row case (88fd5ac, replayed) move to S2; job-id helpers to U7; fake-Herdr argv checks and 6–8 s race windows go. |
| `test/spawn-command.test.ts` | 930 | spawn | seam | **scenario** | S1, S9 | Isolated worktree, task bytes, engine argv and refusals move to S1; prune races to S9; 27 per-test fake engines and refusal wording go. |
| `test/group-command.test.ts` | 879 | groups | seam | **scenario** | S8 | Roster, one-slot contention and the busy-lock fix b62b837 (replayed) move to S8; three wall-clock holds cost 65 s today. |
| `test/finish-webhook.test.ts` | 829 | webhooks | seam | **scenario** | S7 | Decision and author routing move to S7 on the shared plant; each test copies the package today and four wait on 2.5–20 s timeouts. |
| `test/github-doorbell.test.ts` | 700 | doorbell | unit | **scenario** | S10 | Two real `limen github` runs become S10; claim-allowlist rows ride in S10; mocks and duplicates go. |
| `test/continue-command.test.ts` | 506 | steering and context | seam | **scenario** | S4 | The two resume paths move to S4; argv copies and refusal variants go. |
| `test/communication-hook.test.ts` | 504 | steering and context | wording | **scenario** | S4 | One check that the real prompt carries register, styleguide, vision and board pointers moves to S4; 256 lines of line-by-line prompt wording go. |
| `test/jobs-command.test.ts` | 466 | views | wording | **delete** | — | Display text of `limen jobs`; scenarios read job state from files and `limen wait`. |
| `test/wake-sweep.test.ts` | 443 | finish and wake | unit | **delete** | U4 (one row) | Restates sweep-cache internals; its two-failure exhaustion row (a14640f) joins the wake-claim unit U4. |
| `test/finish-webhook-helper.test.ts` | 427 | webhooks | unit | **keep** | U2 | One zero-request table for bad auth, unsafe targets, redirects and stalls, about 120 lines; the trust boundary of the webhook sender. |
| `test/recovery.test.ts` | 386 | finish and wake | unit | **scenario** | S2, S9 | Missing agent row with a live pane goes to S2 (replay 88fd5ac^); killed supervisor and two competing sweeps go to S9. |
| `test/coordinator-wake.test.ts` | 339 | finish and wake | seam | **scenario** | S2, S3 | The Herdr pane wake goes to S2 and the retry rules to S3; exact receipt and log text go. |
| `test/prune-command.test.ts` | 338 | housekeeping | seam | **scenario** | S9 | Keeps live, nested and half-published worktrees (11ae41d, 30cff7a) in S9; duplicate keep-live variants go. |
| `test/picture-viewer.test.ts` | 328 | picture | unit | **delete** | — | Browser routing of a read-only page; the picture is not a seam. |
| `test/hosted-binding.test.ts` | 322 | spawn | mock | **delete** | — | Linux-only, skipped on this Mac, 17 s of fixed sleeps. |
| `test/stop-command.test.ts` | 315 | housekeeping | seam | **scenario** | S3, S9 | Stopped state in S3; escaped descendants (9e2d7c7, 501aa0f) in S9; the 900–2,000 ms window that fails under load goes. |
| `test/status-command.test.ts` | 293 | views | wording | **delete** | — | Pins the exact status plate layout; display, not a seam. |
| `test/picture-layers.test.ts` | 281 | picture | mock | **delete** | — | Browser history rules through a 160-line fake DOM. |
| `test/stalled-tool.test.ts` | 279 | finish and wake | timing | **delete** | — | The outer job timeout still bounds a stuck tool, so the worst case is a slow failure, not a lost job; 5 s fixed sleeps. Accepted risk 9c5aa8c. |
| `test/sweep-command.test.ts` | 267 | housekeeping | seam | **scenario** | S9 | Registry contention from a dead-owner lock (F043: 4e84296, 8548de0, 996bba9, all replayed) moves to S9; launchd wording goes. |
| `test/plant-events.test.ts` | 263 | webhooks | mock | **keep** | U3 | The coordinator turn-signal decision table, about 60 lines; event tests through internal APIs go. |
| `test/open-command.test.ts` | 252 | views | mock | **delete** | — | Herdr tab housekeeping checked through a fake call log; the index-lock race it once exposed stays guarded by git-status. |
| `test/picture-generator.test.ts` | 248 | spec keeper | unit | **keep** | U6 | Front-matter parser and Markdown escaping the ticket check shares, about 60 lines; graph-build cases go. |
| `test/finalize.test.ts` | 214 | finish and wake | seam | **scenario** | S3 | Provider error ends failed with commits kept (967ab4b) and the tool-cap exit move to S3; Herdr tab-close retries go. |
| `test/picture-tick.test.ts` | 207 | picture | seam | **delete** | — | Picture refresh scheduling; a background convenience, not a seam. |
| `test/lead-step-finish.test.ts` | 198 | groups | seam | **scenario** | S8 | The lead-step ping on a synthesis write becomes one S8 check. |
| `test/scratch.ts` | 195 | fixture | fixture | **scenario** | fixture | Replaced by the shared throwaway-plant fixture with an allowlisted environment; today's denylist leaks LIMEN_GROUP_ID and LIMEN_TEAM_ID. |
| `test/picture-tickets.test.ts` | 193 | spec keeper | unit | **keep** | U1 | Ticket diagnostics with file, line and fix, about 90 lines; the strict check that land runs. |
| `test/steer-command.test.ts` | 186 | steering and context | seam | **scenario** | S4 | Already the best seam test: steer reaches the agent through the real hook. Moves to S4 nearly as is. |
| `test/land-command.test.ts` | 179 | land | seam | **scenario** | S5 | The only real land test, rewritten on one shared plant instead of a fresh repo per refusal. |
| `test/reaper.test.ts` | 177 | housekeeping | unit | **keep** | U9 | S9 covers the dead pid (5754dad); a 30-line unit keeps 'a recycled pid with a mismatched birth is dead'. No scenario can recycle a pid. |
| `test/engine.test.ts` | 175 | spawn | copy | **delete** | — | Restates the engine argv lists; S1 and S2 check the argv the fake engine received. |
| `test/github-issue-body.test.ts` | 174 | doorbell | mock | **scenario** | S10 | The issue trust filter (write permission, body mention, open issue, claim once) becomes S10 rows. |
| `test/hosted-hook.test.ts` | 168 | spawn | mock | **scenario** | S2 | The finish tool writing the result becomes one S2 check; pane-label argv goes. |
| `test/picture-work.test.ts` | 161 | picture | copy | **scenario** | S6 | One S6 check: two builds give the same bytes; the model JSON field-by-field copy goes. |
| `test/finish-receipt.test.ts` | 154 | webhooks | unit | **delete** | U2 (one row) | S7 plants a real secret and checks no job file, receipt or output carries it; one row where the receipt drops secret-bearing sender output joins U2. |
| `test/picture-overlay.test.ts` | 154 | picture | unit | **delete** | — | Deep map internals; accepted risk 4d003dc. |
| `test/view.test.ts` | 154 | views | wording | **delete** | — | Row layout, padding and colour codes of `limen jobs`. |
| `test/init-command.test.ts` | 150 | steering and context | copy | **scenario** | fixture, S4 | Every scenario starts with `limen init`; the leftover hook-copy cleanup (236b8e7) becomes one S4 check. |
| `test/ticket-author-command.test.ts` | 140 | webhooks | seam | **scenario** | S6, S7 | Ticket author from real Git history routes a webhook (S7); path forms (76d87fb) ride the fixture's real temp path. |
| `test/diff-command.test.ts` | 137 | views | mock | **delete** | — | Review-tab opening checked through a fake Herdr call log. |
| `test/github-doctor.test.ts` | 117 | doorbell | wording | **delete** | — | Setup diagnostics text. |
| `test/picture-watch.test.ts` | 117 | picture | seam | **delete** | — | Git hook that starts picture jobs; a background convenience. |
| `test/steering-hook.test.ts` | 113 | steering and context | duplicate | **scenario** | S4 | Repeats steer-command in-process; its deliver-once case becomes one S4 check. |
| `test/inherit.test.ts` | 101 | init | copy | **delete** | — | Template history check that breaks on every template edit; guards a build artefact, not behaviour. |
| `test/job.test.ts` | 92 | none | unit | **keep** | U7 | Job id resolution and duration bounds, about 60 lines. |
| `test/workspace-command.test.ts` | 89 | spawn | seam | **scenario** | S1 | One workspace spawn into a child repo becomes one S1 step. |
| `test/keeper-command.test.ts` | 83 | spec keeper | seam | **scenario** | S6 | The keeper refuses a running job and starts on a new branch at the candidate tip (edbc18d); rewritten on the shared plant. |
| `test/ticket-command.test.ts` | 81 | spec keeper | unit | **scenario** | S6 | The next free F number through the real CLI (2aaf43b); no CLI test exists today. |
| `test/picture-board.test.ts` | 80 | picture | unit | **delete** | — | Board-line reader for the picture; the land gate warning rides S5. |
| `test/watch-command.test.ts` | 71 | finish and wake | seam | **scenario** | S3 | Moving the wake route between sessions becomes one S3 check. |
| `test/git-status.test.ts` | 48 | spawn | unit | **scenario** | S1 | S1 checks that status never rewrites a worker's index and must go red on 43c01cf^; if it does not, this 20-line test stays. |
| `test/hosted-uncertainty.test.ts` | 37 | finish and wake | unit | **delete** | — | Drives an advisory only; accepted risk. |
| `test/linear-command.test.ts` | 37 | none | wording | **delete** | — | Renames a config file; messages only. |
| `test/wait-command.test.ts` | 35 | finish and wake | timing | **delete** | — | Every scenario waits with `limen wait`; the elapsed-time asserts go. |
| `test/stream.test.ts` | 27 | finish and wake | unit | **keep** | U5 | Done versus failed from the engine stream, about 40 lines. |
| `test/structure.test.ts` | 26 | none | trivia | **keep** | U8 | Dependency-free runtime, unique basenames, and the test-line cap read from the vision. |
