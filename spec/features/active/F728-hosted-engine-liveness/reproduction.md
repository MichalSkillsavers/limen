# Hosted OMP missing-row reproduction

The fake-Herdr regression reproduced the failure on `main` revision `1cecf60c9a408ae6ba1a10879e255f05ca8fd981`. The regression-only commit is `7cbce5c` (`test: reproduce hosted OMP missing-row recovery failure`). No recovery code changed in that commit.

```sh
node --test --test-concurrency=1 --test-timeout=60000 \
  --test-name-pattern='hosted OMP recovery' test/recovery.test.ts
```

Before the fix: 1 test, 0 passed, 1 failed. The assertion reported actual state `failed`, expected state `running`.

The fixture records `engine=omp`, a dead supervisor PID, and pane `w1:p1`. A real fixture-owned process remains alive. Fake Herdr returns `agent_not_found` for the agent lookup, an empty agent list, and an `omp` foreground process only on the recorded pane. Real reaper sweeps call `recoveryTarget`, which calls `locateHostedAgent`; the reaper marks the job failed despite that foreground evidence. This is a fake-Herdr reproduction, not a live Herdr/OMP observation.

## Fix seams

- `src/integrations/herdr.ts`: `locateHostedAgent` requires the recorded engine and uses its existing profile's `binaryDefault`, or the existing `node` fallback. Startup warning recovery passes the selected Herdr engine. Process lookup remains limited to the recorded pane.
- `src/runtime/recovery.ts`: `recoveryTarget` passes `jobProfile(jobDir).id` and retains the concrete lookup result. The old second agent lookup discarded positive foreground evidence by turning the same missing row into `unknown`.
- `src/runtime/supervisor.ts`: ongoing supervision and stop-during-start recovery pass the job's engine. Missing, uncertain, and positively located results remain distinct.

## Behavioral evidence

After the fix, the original regression passed with one replacement supervisor. The expanded regression observes at least five foreground probes while the agent row remains missing, then checks that the job is still running. Removing the real fixture-owned process ends the supervised job through the existing `hosted agent ended` path.

The scoped command covering OMP recovery, process identity boundaries, and hosted startup recovery passed 4 tests with 0 failures. Boundary cases cover Pi and OMP through `node`, each native engine name, rejection of the other engine, shell-only and empty foreground lists, and rejection of an unrelated agent/process on another pane. The startup regression recovers the recorded OMP pane after a ready-timeout warning; the existing unrelated-pane startup test also passes.

A standalone runtime smoke calls `locateHostedAgent` and `recoveryTarget` against a fake executable outside the test runner. It returns the recorded OMP pane for a missing row plus `omp` foreground evidence, and rejects the same process for a Pi job.


The affected run (`test/recovery.test.ts`, `test/hosted-spawn.test.ts`, and `test/hosted-hook.test.ts`) finished with 60 tests: 59 passed, 1 failed. All seven recovery tests passed, as did moved-pane and both startup recovery cases. The existing `two long hosted labels keep distinct agent names` test timed out waiting for a job's `herdr/agent` file. Its cause was not established; it is not evidence of a failure in the OMP missing-row regression. The shared fake Herdr fixture updates one JSON state file from concurrent subprocesses, but attributing the timeout to those updates would be an inference. No test or recovery policy was changed to suppress that failure.
Reviewer artifacts, including the smoke output and recovery records, are outside the worktree at `/tmp/limen-f728-evidence-29f068e5`. Full affected-test and `npm run check` results are recorded there and in the final handoff. No live Herdr/OMP run was performed.
