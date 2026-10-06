# Team 1 · replays of the F043 seat-lock fixes and the S9 guards

F043 fixed one lock protocol three times: `4e84296` serializes registry writes behind `projects.lock`, `8548de0` reclaims a dead-owner lock only after an inode-checked claim, and `996bba9` moves the claim marker out of the lock directory and releases by rename. `git revert --no-commit <fix>` applies to none of them: `hook/seat.ts` moved to `src/project/seat.ts`. Each fix was hand-reverted in a scratch worktree (`git worktree add --detach /tmp/f927-s9-replay-<fix> HEAD`, test files copied from the branch), as listed below. All scratch trees are removed.

## What the seat test plants

A dead-owner `projects.lock` (owner pid 999999999, mtime set to 1970 with `fs.utimes`), with the `reclaimer` marker of a dead reclaimer inside it. 40 `limen workspace init` and 8 `limen sweep` children each stop at their first registry touch (an `--import` preload reading a FIFO). One FIFO write releases all of them. Checks: every child exits 0 with no `ENOTEMPTY`, and the registry holds the plant root and all 40 seats (two gone entries pruned).

The marker is how the test reaches `996bba9`. Review-3's `ENOTEMPTY` needs a stale contender's write to land inside the owner's native recursive `rmSync`, a window no FIFO can schedule: one round with the fix reverted stayed green 7 of 7 times. A dead lock that already holds a foreign marker is the lasting result of that same stale write. Pre-fix code reads the foreign marker and never reclaims the lock; the fix ignores it.

```
node --test --test-name-pattern="seat registrations" test/s9-housekeeping.test.ts
4e84296 reverted (updateRegisteredProjects without withRegistryLock; pre-fix mkdir of .limen kept)
✖ seat registrations survive a dead-owner registry lock under contention (3625ms)
  AssertionError: Expected values to be strictly deep-equal:  (seat-1, seat-10 … missing from the registry)
8548de0 reverted (4e84296 removeAbandonedLock: rmSync the dead lock; release with rmSync(lock))
✖ seat registrations survive a dead-owner registry lock under contention (4154ms)
  + "ENOTEMPTY, Directory not empty: …/.limen/projects.lock", status: 1
996bba9 reverted (8548de0 lock: claim at projects.lock/reclaimer, release with rmSync(lock))
✖ seat registrations survive a dead-owner registry lock under contention (13955ms)
  + 'timed out locking …/.limen/projects\n'
branch, fixes in place
✔ seat registrations survive a dead-owner registry lock under contention (4202ms)
```

Without the marker, the `8548de0` replay was also red (`ENOTEMPTY`, same assertion).

## Other S9 guards (one guard broken at a time, same scratch method)

```
11ae41d  prune.ts nested-root skips removed (both regex lines)
✖ prune keeps live, nested and half-published work …  prune removed …/.repo-limen-worktrees/.2026-10-06-block-…-limen-worktrees/2026-10-06-block-…
30cff7a  prune.ts startingJob() dropped from both no-state checks
✖ prune keeps live, nested and half-published work …  prune removed …/.repo-limen-worktrees/2026-10-06-say-half-…
5754dad  reap.ts skips any job inside STARTUP_GRACE_MS again, pid or not
✖ a killed wrapper is reaped at once …  actual: 'running', expected: 'failed'
9e2d7c7  stop.ts discovers escaped descendants after SIGTERM instead of before
✖ a killed wrapper is reaped at once …  orphan 80171 survived stop unnamed
```

With every guard restored, each test passes (green runs: see the candidate message). `501aa0f` (nonblocking process discovery) was not replayed separately. It changes how the same discovery runs, and S9 reaches it only through the `9e2d7c7` path.
