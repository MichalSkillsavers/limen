# Native verification remains incomplete

The checked candidate is `7b0ea9be9cabe60428471c80555350d478d7d468`. The last clean full `npm run check` passed TypeScript and Biome, then 509/511 tests; exit status 1. The corrected stop/discovery deadline tests passed. Three full native runs have consumed approximately 86 minutes without one complete pass. Do not replace that evidence with the passing focused group tests or spend another automatic full-suite retry.

## Remaining steering-test synchronization

- `test/steer-command.test.ts:44` waits for the fake agent's `acted` file, then immediately requires both delivery receipts and their log entries. The fake agent writes `acted` inside `sendUserMessage`; `hook/steering.ts` writes the accepted marker, renames the delivery claim, and appends its log only after that callback returns. The failed run saw `acted` before `steer/delivered/0002/text` existed. The next correction should wait for the observable receipt/log boundary it asserts, not add a guessed sleep or weaken the receipt checks.
- `test/steer-command.test.ts:74` waits for job state `done`, snapshots all job filenames, invokes refused steering, then compares the directory. `finalizeJob` publishes terminal state before removing `pid`, so expected terminal cleanup can change that snapshot independently of the refused command. The failed run differed only by removal of `pid`. The next correction should distinguish steering writes from expected lifecycle cleanup, preserving the requirement that refusal creates no steer.

These source-level races match the failures. They do not constitute a new passing run or establish every runtime path as correct. Keep the live scenario unspent and do not merge or push while acceptance remains incomplete.

Latest retained evidence:
`/Users/overment/.overment/limen/.limen/jobs/2026-09-30-f740-group-final-native-proof-7fd28736/evidence/`

Read `native-check.stdout.log`, `native-check.stderr.log`, `native-check.result.json`, and `handoff.txt`. The implementation, advisory correction, previous red/green evidence, and disposable fixture remain preserved. A bounded steering-test stabilization pass, followed by focused verification and a deliberate final native run, is the proposed next scope; it has not been started.
