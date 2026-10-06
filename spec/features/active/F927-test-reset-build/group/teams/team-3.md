# Team 3 · S3 finish and wake, S4 steering and context injection

Line budget: 530 lines for both files (S3 about 310, S4 about 220).

## S3 finish and wake (`test/s3-finish-wake.test.ts`)

Must catch: a missing, double or wrong wake; a provider error recorded as done (`967ab4b`; fake engine `commit` then `error`); stopped and timed-out states with one terminal line; two listeners delivering one wake twice and batched follow-ups injected more than once (`7e43d23`, F042); a job with no tools and no commits saying it produced nothing; moving the wake route with `limen watch`; `/limen off` and `on`. Story: F925 team-2 design, section 3, S3. The coordinator session is the fake engine run with `--extension hook/wake.ts` and `PI_SESSION_ID`; its `fake-events.jsonl` holds every wake it received. Prove absence by ordering behind a later positive event, never by waiting.

Incident replay you own: `7e43d23` (F042). S3 must go red with that fix reverted and green on `main`. Team 5 writes the unit U4 for the aged live claim (a claim older than 30 seconds, set with `fs.utimes`); agree with team 5 which half catches what, and replay both if both are needed.

Deletes when S3 lands: `test/finalize.test.ts`, `test/watch-command.test.ts`. Shared, deleted with the second to land: `test/wake-hook.test.ts` (with team 5's U4), `test/stop-command.test.ts` (with team 1's S9), `test/coordinator-wake.test.ts` (with team 2's S2).

## S4 steering and context injection (`test/s4-steering.test.ts`)

Must catch: a steer lost or delivered twice; a late steer to an ended job accepted; a prompt without the register, the styleguide, the vision and board pointers; hooks registered twice after a second `limen init` (`236b8e7`); `limen continue` without the old session. Story: F925 team-2 design, section 3, S4. Check one prompt property per guidance source, not wording.

Deletes when S4 lands: `test/steer-command.test.ts`, `test/steering-hook.test.ts`, `test/continue-command.test.ts`, `test/communication-hook.test.ts`, `test/init-command.test.ts`.

## Order

S4 first only if S3's replay blocks; otherwise S3 first, because it carries the F042 replay.

## Resume (second run)

- Saved: S4 on `limen/2026-10-06-f927-team-3-coordinator-f814daf2` at `e4d5e4d` (`test/s4-steering.test.ts`, 128 lines; its fixture part is on `main`). S3 on `limen/2026-10-06-f927-team-3-s3-finish-and-wake-b1a3e152` at `b6c4166` (`test/s3-finish-wake.test.ts`, 133 lines). Both not verified.
- Left: finish S3 with the F042 batched replay (the split with team 5's U4 stands), and S4.
- S4 folds in the continue checks PR 7 added (a continuation inherits or replaces local extensions) and deletes `worker-extensions`: S1 is on `main`, so S4 lands second.
- Shared deletions you make as second lander: `wake-hook` once team 5's U4 is on `main`, `stop-command` once team 1's S9 is on `main`, `coordinator-wake` once team 2's S2 is on `main`.
