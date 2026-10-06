# Team 5 · S10 GitHub doorbell, the unit files, and the final sweep

Line budget: 740 lines (S10 about 190, units about 550).

## S10 GitHub doorbell (`test/s10-doorbell.test.ts`)

Must catch: an outside or unauthorized user starting work; an issue body mention, a closed issue and a forged receipt starting work; a duplicate reply after a poller restart; any approval posted. Story: F925 team-2 design, section 3, S10. Answer the GitHub API with `respond(plant, rows)`; `requests(plant)` lists what was sent.

Deletes when S10 lands: `test/github-doorbell.test.ts`, `test/github-issue-body.test.ts`, `test/github-doctor.test.ts`.

## Units (`test/u<N>-<name>.test.ts`)

Each is a small pure file; table in F925 team-2 design, section 4. Write it fresh and delete the old file in the same commit.

- U1 ticket diagnostics, 90 lines, replaces `picture-tickets`.
- U2 webhook sender trust table, 130 lines: each bad row makes zero requests and prints no secret; one row for secret-bearing sender output dropped by the receipt. Replaces `finish-webhook-helper` and `finish-receipt`.
- U3 coordinator turn signal, 60 lines, replaces `plant-events`.
- U4 wake claims, 90 lines: two listeners, a live claim aged past 30 seconds with `fs.utimes`, a dead owner, the two-failure stop (`a14640f`). Replaces `wake-sweep`; `wake-hook` goes with team 3's S3, second to land. Agree the F042 split with team 3.
- U5 engine stream, 40 lines, replaces `stream`.
- U6 front matter and Markdown escape, 60 lines, replaces `picture-generator`.
- U7 job ids and durations, 60 lines, replaces `job`; `hosted-spawn` goes with team 2's S2, second to land.
- U8 is `test/structure.test.ts`; touch it only in the final sweep.
- U9 process identity, 30 lines: a recycled process group id with a mismatched birth is dead. Replaces `reaper`.

## Final sweep

Delete every file F925 marks **delete**: `jobs-command`, `picture-viewer`, `hosted-binding`, `status-command`, `picture-layers`, `stalled-tool`, `open-command` (only after team 2's S1 `43c01cf` replay is on `main`), `picture-tick`, `engine`, `picture-overlay`, `view`, `diff-command`, `picture-watch`, `inherit`, `picture-board`, `hosted-uncertainty`, `linear-command`, `wait-command`. Delete them in small batches as early as you like; they have no replacement.

`inherit.test.ts` is the only place that regenerates and checks `templates/.history/` (`LIMEN_WRITE_HISTORY=1`). Before you delete it, ask the lead where that check goes; do not drop it silently.

Last, once no old file remains: delete `test/scratch.ts`, remove the old-suite marker rule from `test/structure.test.ts` so the cap covers all of `test/`, and switch `npm test` in `package.json` to `--test-concurrency=4` if the scenarios share no state. Publish the real wall time of one full `npm test`.
