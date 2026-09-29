# Native-proof decision for collaborative groups

The once-only full native run on clean candidate `4ddcec3044ba278d4608055af8d35e6426a04deb` exited 1: TypeScript/Biome passed, 506/509 tests passed. Its obsolete exact hook-count assertion was removed and the existing OMP coordinator-context check passed afterward. Two failures remain outside the group seam:

- `test/diff-command.test.ts:43`: the recorded versions were `omp 0.0.0-test\n`; expected optional `hunk 0.20.0-test` was absent. `src/commands/spawn.ts:454-473` probes each executable with a one-second kill budget. The run did not retain a reason for this omitted optional probe, so scheduling sensitivity is only an inference, not a classification.
- `test/stop-command.test.ts:224`: stop plus terminal-state observation took 2,295 ms; the test requires 900–1,999 ms. Stop exited 0 and the job recorded `stopped`, but the elapsed acceptance failed. No timing bound was relaxed.

Neither failure was rerun merely to classify it; neither is claimed pre-existing or flaky. Runtime code is unchanged after the full run. The exact failure output is `/Users/overment/.overment/limen/.limen/jobs/2026-09-29-f740-teams-share-feature-progres-16e7c4d9/group-evidence/full-native.log`. No second full lane was spent.

Question for the lead: authorize a separate baseline/discriminating repair slice for these two failures and a new final native lane, or retain the failed native evidence while proceeding only with the already-authorized real-agent proof? Prefer the separate repair/proof slice before accepting this candidate; do not silently declare the native lane green or change the scenario's collaboration requirements.
