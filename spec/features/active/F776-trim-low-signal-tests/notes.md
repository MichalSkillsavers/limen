# F776 notes

## What was cut

Base `1c04fc3`: 51 test files, 17,348 test lines (17,543 with `test/scratch.ts`), 516 `test(` blocks.
After the trim: 50 test files, 15,120 test lines, 428 `test(` blocks. 91 blocks were deleted and 3 were renamed after they shrank.

Cut classes, with examples:

- **Duplicates.** The same rule was proven twice. The stronger, end-to-end test stays. Examples: the issue-body copy of the doorbell "github work starts one hosted job" test, the helper-level author-map tests that the end-to-end finish tests repeat, and four "same tip" finish tests that prove one no-dedupe rule.
- **Trivia.** Tests that pin constants (`HOSTED_UNCERTAINTY_MS`, idle and re-ring defaults, `--ttl-ms`), argument-count errors, "unknown command", empty-set messages, and guards for removed features (changed-files record, `/speak`).
- **Wording freezes.** Full prompt sentences, log-line punctuation, and advisory text. Where the test also guards behavior, it shrank to the fact that matters.
- **Timing.** Tests whose signal was a sleep or a wall-clock window: the 20 s hosted start deadline, the 20 s group wait cap, 4 s supervisor sleeps, a 1250 ms process-table gap, a 5.1 s tool loop, and a 1.6 s fallback sleep.
- **Variants.** Loops over near-identical inputs shrank to representative cases: the finish decision matrix (15 to 6 cases), HTTP status and failure loops, role preamble loops, and stop/timeout twins.

`test/no-speech-hook.test.ts` is deleted: the hook it guarded has no speech code left.

## Protected seams that keep tests

Publication (`continue-command`: "continuation publication ..."), wake text (`wake-hook`), watch and steer over the OMP route (`watch-command`, `coordinator-wake`), blocked and other status kinds (`view`, `job`, `status-command`, `hosted-spawn`), group start safety (`group-command`), GitHub poller trust (`github-doorbell`, `github-issue-body`), land with a dirty target (`land-command`), finish webhook security allowlists (`finish-webhook-helper`, `finish-receipt`).

## Still timing-sensitive, kept on purpose

- `stop-command`: "sleeping descendant discovery delays stop only through its short bound" asserts a 900 to 2000 ms window. It is the only proof that a stuck `ps` cannot hold `stop` open. At load average 400 it took 2310 ms and failed once; it passed on rerun.

At load average near 400, about ten other tests hit their 10 s state wait or 60 s test timeout and passed on rerun. They are load failures, not product failures.

## Red tests on main that this work fixed

- `coordinator-wake`: the OMP watch test expected the old wake header. The wake names the task after the label (`"taken over": do work\nis done (id)`), so the test now matches that.
- Engine leak: a test that spreads `process.env` keeps the operator's `LIMEN_OMP`, so inside a Limen job it launches the real `omp` with a real model. Five group tests, the prune publication race test, and the picture watch test failed this way. `group-command` `launch`, the `spawn-command` prune race test, and `picture-watch` `commitAsMover` now clear or pin `LIMEN_OMP` and `LIMEN_PI`. `test/scratch.ts` already did this.

## Candidates for a later pass

- `wake-hook.test.ts` (about 1,770 lines) and `hosted-spawn.test.ts` (about 1,350 lines) are still the largest files. Most of what remains guards protected seams; a further cut needs a reader who knows the wake and supervisor code well.
- `hosted-binding.test.ts` runs only on Linux (CI runs it on `ubuntu-latest`).
