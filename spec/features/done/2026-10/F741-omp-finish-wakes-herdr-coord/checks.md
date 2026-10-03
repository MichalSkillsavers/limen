# F741 checks

The implementation landed on main as `39ec81b` (Herdr pane wake for OMP coordinators; `limen wait` refused under `LIMEN_COORDINATOR=1`). Checks below ran on main `e943fb4`, which contains it, after `npm ci` from `package-lock.json`. Node v24.1.0, macOS arm64, 2026-10-02.

## Retained live proof

Source: `/Users/overment/.overment/limen/.limen/jobs/2026-10-02-f741-live-wake-proof-13306a96` (hosted OMP worker, `engine` = `omp`, `versions` = `omp/18.4.4`, `herdr 0.9.1`, `base` = `39ec81b`).

- The worker finished: `state` = `done`, `result` = `wake proof done`, `tip` = `6cb28e7` (commit `proof`, adds `proof-f741.txt`, parent `39ec81b`). The session transcript contains the `finish` call.
- The recorded coordinator pane is `origin-pane` = `wWY:p6`; the worker ran in its own pane (`herdr/pane` = `wXA:p5`).
- `notify/herdr-prompt`: `attempt 1: turn observed on wWY:p6 2026-10-02T04:40:19.879Z`. `notify/delivered/_herdr` = `2026-10-02T04:40:19.880Z`. In `src/integrations/coordinator-wake.ts` that line and the delivered marker are written only when `herdr agent prompt <pane> … --wait --until working --until blocked` exits 0, so Herdr itself observed the coordinator pane start a turn 0.38 s after `finished-at` (`04:40:19.503Z`).
- The finish webhook failed on its own: `finish-webhook-targets` shows target 1 `rejected` / `4xx`; `finish-webhook` = `failed: sender exited 1 2026-10-02T04:40:20.061Z`. The log records the Herdr wake (`04:40:19.879Z`) before the webhook failure (`04:40:20.066Z`). The coordinator wake did not depend on the webhook, and the webhook result is not claimed as Herdr follow-through.

What the receipt does not show: the content of the coordinator's turn. "Turn observed" means Herdr saw the pane enter working/blocked after the prompt was submitted.

## Commands

| Command | Result |
| --- | --- |
| `node --test --test-concurrency=1 --test-timeout=60000 --test-reporter=spec test/coordinator-wake.test.ts` | 5/5 pass (observed turn on origin pane, one retry, two stalls stop delivery, missing pane fails visibly, Pi coordinator keeps in-process wake) |
| `node --test … --test-reporter=spec test/coordinator-wake.test.ts test/wait-command.test.ts test/finish-webhook.test.ts` | 55/57 pass; wait: 3/3 including `wait refuses in a coordinator instead of blocking its pane`; F741's `a slow Herdr coordinator prompt does not spend the configured webhook's shutdown budget` passes. 2 failures below |
| `npx tsc --noEmit` | exit 0 |
| `npx biome check` on the 13 paths `39ec81b` touched | `Checked 12 files … No fixes applied.`, exit 0 |
| `npx biome check .` | `Checked 100 files … No fixes applied.` |

An earlier run of the same three files piped through a TAP-only `grep` exited 1 with no output; it is not evidence either way and was rerun with the spec reporter above.

## Failures not caused by F741

Two `test/finish-webhook.test.ts` timing tests fail on this machine under heavy load (`vm.loadavg` ≈ 21 / 55–62 / 57–59):

- `hanging sender and its descendant are killed within shutdown grace without changing stopped state`: `sender must leave room within the wrapper's 5s grace` (elapsed > 4.5 s).
- `a sender timeout gets one bounded successful retry and records both attempts`: retry got a 955 ms budget and timed out, so the receipt starts `failed:` instead of `accepted:`.

Neither test writes `origin-pane`, so `promptCoordinator` returns before invoking Herdr. Discriminating check: the same `--test-name-pattern` run, three times each, on main and on a throwaway worktree at `39ec81b^` (before F741), same load.

- main `e943fb4`: hanging-sender failed 3/3; bounded-retry failed 1/3 (plus 1/1 in the full-file run).
- `39ec81b^`: hanging-sender failed 3/3; bounded-retry failed 1/3.

Same pattern before and after F741: these are pre-existing load-sensitive shutdown-budget assertions, not an F741 regression. They were not rerun on an idle machine.

## Not run

No new live proof (the retained one above stands). Full `npm test` was not run. No Herdr or webhook configuration was changed.

## Second live proof, 2026-10-03

Source: `.limen/jobs/2026-10-03-f741-omp-finish-wakes-this-coord-6d3eb663` (hosted OMP worker, `omp/18.4.4`, `herdr 0.9.1`, `base` = `1cecf60`, no commits).

- `state` = `done`; `finished-at` = `2026-10-03T15:45:12.249Z`.
- `origin-pane` = `wYN:p1`, the coordinator pane that spawned the job.
- `notify/herdr-prompt`: `attempt 1: turn observed on wYN:p1 2026-10-03T15:45:12.633Z`, 0.38 s after finish. `notify/delivered/_herdr` exists.
- The coordinator on `wYN:p1` received the completion wake as a new turn and acted on it. This is the turn content the first proof did not show.
- No finish webhook was configured for this job.

`node --test --test-concurrency=1 test/coordinator-wake.test.ts test/wait-command.test.ts` on `main` at `1cecf60`: 8/8 pass.
