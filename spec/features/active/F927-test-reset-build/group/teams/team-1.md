# Team 1 · S8 groups and S9 housekeeping

Line budget: 640 lines for both files (S8 about 380, S9 about 260).

## S8 groups (`test/s8-groups.test.ts`)

Must catch: two members claiming one slot; a lost finish while the cabinet is busy; a launch failing behind a slow sibling past the 10-second launch-lock deadline (`b62b837`); the lead-step ping on a synthesis write. Story: F925 team-2 design, section 3, S8. Keep one real 12-second hold for the lock deadline; no other timing.

Incident replay you own: `b62b837` (group launch lock). The new S8 must go red with that fix reverted and green on `main`.

Deletes when S8 lands: `test/group-command.test.ts`, `test/lead-step-finish.test.ts`.

## S9 housekeeping (`test/s9-housekeeping.test.ts`)

Must catch: prune deleting live, nested or half-published work (`11ae41d`, `30cff7a`); escaped child processes after stop (`9e2d7c7`, `501aa0f`; use the fake engine's `orphan`); a killed detached wrapper not reaped at once (`5754dad`); lost seat registrations and `ENOTEMPTY` from a dead-owner `projects.lock` under contention (F043). Story: F925 team-2 design, section 3, S9. Release the contention with one FIFO write, never a timer.

Incident replays you own: F043 at `4e84296`, `8548de0` and `996bba9`. The new S9 must go red with each fix reverted (one at a time, or the overlay fallback in the brief) and green on `main`.

Deletes when S9 lands: `test/prune-command.test.ts`, `test/sweep-command.test.ts`. Shared files, deleted with the second scenario to land: `test/stop-command.test.ts` (with team 3's S3), `test/spawn-command.test.ts` and `test/recovery.test.ts` (with team 2's S1 and S2). `test/reaper.test.ts` goes to team 5's unit U9.

## Order

S8 first: `group-command` is the slowest old file (about 260 seconds). Then S9.

## Resume (second run)

- Saved: `limen/2026-10-06-f927-team-1-s9-housekeeping-8585a40f` at `953ef71`: `test/s9-housekeeping.test.ts`, 170 lines, not verified. S8 has no saved work.
- Left: S8 with the `b62b837` replay, plus the guard PR 8 added to `group-command`: a lead update reaches an idle lead only as a followUp (group leads wake without an interrupt). Then finish S9 from the saved file, with the F043 replays.
- Shared deletions you make as second lander: `spawn-command` (S1 is on `main`), `recovery` once team 2's S2 is on `main`, `stop-command` once team 3's S3 is on `main`.
