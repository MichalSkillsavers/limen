---
touches:
  - limen.plant
  - limen.commands
opened: 2026-10-06
---

# F927 · Limen's tests are rebuilt from scratch and held under a 3,500-line cap

## Outcome

This carries out the test-reset verdict Adam approved on 2026-10-06 (F925): a staged replace, written from scratch. Today `test/` holds about 17,000 lines in 58 files and a full run takes about 25 minutes. Afterwards it holds about 3,350 lines in about 20 files: one shared throwaway-plant fixture, ten seam scenarios that run the real `limen` CLI, and nine small unit files. A full run takes minutes, so it runs before every land, and a cap in `spec/vision.md` stops the folder from growing back.

## Scope

- One line in `spec/vision.md` caps `test/` at 3,500 lines; only Adam changes it.
- The structure test and `limen land` read that line and fail when `test/` goes over it.
- The shared fixture `test/plant.ts` replaces `test/scratch.ts`: a temp plant after `limen init`, an allowlisted environment, one scripted fake engine that loads the real hooks, and a webhook sink.
- Scenarios S1 to S10 and units U1 to U9 per F925's `group/synthesis.md` and `group/findings/file-actions.md`. Each scenario lands with the deletion of the old files it replaces.

## Out of scope

- Product changes in `src/`, `hook/` or `bin/` beyond the cap check in `limen land`.
- A lock-deadline override for the group launch lock; S8 keeps one real 12-second hold.
- Tests for the picture, the views, or the accepted risks F925 lists.

## Acceptance

- `npm test` fails with the line count, the cap and the lines to remove when `test/` (new files only, until the old suite is gone) is over the cap.
- `limen land` refuses a branch that grows `test/` past the cap and names the numbers.
- Each of the five incident families (F043 seat registry, F042 wakes, `b62b837` group launch lock, `43c01cf` status index lock, `88fd5ac` hosted lost agent row) has a new test that goes red with the old fix reverted and green on `main`.
- `wc -l test/*` totals at most 3,500 lines; no file from the old suite or `test/scratch.ts` remains.
- One full `npm test` run on `main` passes, and its real wall time is recorded in the outcome.
- `AGENTS.md` and the worker task wrapper say that new work replaces tests and that the cap binds.

## Notes

- Replay rule (F925): an old regression test is deleted only after its replacement fails on the pre-fix commit. If nothing reaches the bug, the old test stays and the gap is named.
- Adam asked for the land check (2026-10-06 13:03), so the "no land refusal" choice in F925's synthesis is overruled for the cap only. Land refuses only when the branch adds test lines and the result is over the cap; deletions always land.
