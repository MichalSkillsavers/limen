# Team 2 · replay of `88fd5ac` (hosted OMP ended when Herdr lost its agent row)

The fix made the foreground-process fallback in `locateHostedAgent` (`src/integrations/herdr.ts:180`) accept the job's engine binary, not only `pi` or `node`. Before it, a hosted OMP job whose Herdr agent row disappeared was finalized while `omp` still ran in its pane.

## Commands

`git revert --no-commit 88fd5ac` does not apply (conflicts in `src/integrations/herdr.ts`, `src/runtime/recovery.ts`, and the moved F728 reproduction). The fix was hand-reverted in a scratch worktree (`/tmp/f927-t2-replay`, never committed): line 180 back to `names.some((n) => n === "pi" || n === "node")`.

```
node --test test/s2-hosted.test.ts                  # fix reverted
✔ a hosted job gets one tab, its task as @task, and finishes done with its handoff when the session ends
✖ a live OMP job stays running while Herdr reports done, then after Herdr loses its agent row (88fd5ac)
  AssertionError: omp still runs on p2; a lost agent row must not end the job
    actual: 'done', expected: 'running'
✖ two competing sweeps start exactly one replacement for a killed hosted supervisor (5754dad)
  AssertionError: the OMP job is still supervised          (follows from the job above having ended)
✔ hosted Pi gets literal launch flags and the selected extension; stop records stopped once
ℹ pass 2  ℹ fail 2

node --test test/s2-hosted.test.ts                  # main, fix in place
ℹ pass 4  ℹ fail 0
```

## Other probe

`5754dad` (two sweeps adopt one killed hosted supervisor) is not one of the five incident families; probed in `/tmp/f927-t2-probe`. `claimRecovery` (`src/runtime/recovery.ts:15`) made to grant every claim: two supervisors adopt the job and S2 goes red with `one replacement supervisor, not two` (actual 3, expected 2). Removing only the live-owner recheck after the claim (`recovery.ts:98`) stays green: the claim alone serializes the candidates.

## Hazard found

`jobFile()` returns `""` for a missing file and `Number("")` is `0`, so `process.kill(Number(jobFile(p, id, "pid")), "SIGKILL")` signals the test runner's own process group. The first replay run died with exit 137 and lost its output. S2 asserts the pid is positive and the job still running before the kill.
