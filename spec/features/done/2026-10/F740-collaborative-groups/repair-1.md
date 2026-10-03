# Group progress repair and final native proof

The preserved candidate is `f85e97c542b3f12ff4f7ec4f2414eb568c1e7266`. Its implementation job reached the 90-minute outer timeout; this was not a reported quota failure. The worktree is clean and three implementation/documentation commits survive. Resume that state, not a fresh implementation.

## Reproduced group defect

`syncLifecycle` in `src/group-events.ts` identifies an advisory event by the job, field, and hash of its text. A blocker that clears and later returns with the same text therefore reuses the old event file. The second occurrence is never queued to recipients.

A real-file probe set one running member's advisory to `blocked on test evidence`, synchronized, cleared it and synchronized, then restored the same text and synchronized. Only one blocked event existed; two distinct occurrences were expected. The probe is retained as `advisory-recurrence.json` in the evidence directory below.

Give lifecycle transitions a durable occurrence identity while keeping unchanged observations and concurrent sweeps idempotent. Preserve retry safety if a process stops between writing an event and its last-observed marker. Add a regression covering unchanged repetition, clear-and-return, and concurrent synchronization. Do not change the unrelated seat-bell slice.

## Native evidence and permitted verification

The focused implementation lane passed 177/177. The full lane on `4ddcec3` passed TypeScript/Biome and 506/509 tests. The obsolete exact hook-registration-count assertion was corrected afterward; its existing coordinator-context behavior check passed.

The two other failures were an omitted optional Hunk version and a stop timing of 2,295 ms against a 2,000 ms bound. The coordinator ran those exact two tests once each on baseline `aeb3edd` and candidate `f85e97c`: both runs passed 2/2. This establishes isolated non-reproduction, not that the failures were pre-existing or that the whole candidate passed. Do not relax timing bounds, delete coverage, or modify unrelated runtime without a reproduced cause.

After the advisory correction, run the discriminating regression and one new full `npm run check` on the clean committed candidate. This new lane is authorized despite the previous worker's once-only lane limit. Retain its result honestly; if it fails, report the remaining failures rather than repeating the entire suite until green. The live two-team scenario is still reserved for the lead and has not been spent.

Evidence directory:
`/Users/overment/.overment/limen/.limen/jobs/2026-09-29-f740-teams-share-feature-progres-16e7c4d9/group-evidence/`

Read `full-native.log`, `native-failure-comparison.log`, and `advisory-recurrence.json` as needed. Deliver one focused repair commit and retained check output. Resolve `native-check-question.md` when its question is no longer true; do not change the board, reviewed contract, scenario requirements, vision, or models. No merge, push, extra reviewer, helper agents, or live group launch in this repair.
