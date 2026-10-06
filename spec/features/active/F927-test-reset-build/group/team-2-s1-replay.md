# Team 2 · replay of `43c01cf` (status read takes the worker's index lock)

The fix added `--no-optional-locks` to the background `git status` that `cleanWorktree` runs on a worker tree. Plain `git status` on stale stat data takes `index.lock` and rewrites the index under the worker's own `git add`.

## Can S1 reach it?

No. `limen jobs`, `limen status` and `limen jobs <id>` no longer run `git status` on a worker tree. `cleanWorktree` (`src/project/git.ts:204`) has two callers: `limen group close` (`src/commands/group.ts:320`) and the hosted idle-stall check (`src/runtime/supervisor.ts:273`, behind a wall-clock threshold). S1 still checks that the reads leave a running job's index byte-identical, which guards against a new read path, but the replay guard is the unit `test/u10-git-status.test.ts` (lead approval, group message 00000025).

## Commands

`git revert --no-commit 43c01cf` does not apply (`src/git.ts` moved to `src/project/git.ts`; conflicts in `test/structure.test.ts` and `test/git-status.test.ts`). The fix was hand-reverted on the scratch tree instead: `--no-optional-locks` removed from `cleanWorktree`.

```
node --test test/u10-git-status.test.ts test/s1-spawn.test.ts     # fix reverted
✔ each spawn refusal exits 1, names its cause and leaves no job, worktree or branch
✔ a detached job runs in its own worktree from the base with the exact task and a clean engine environment
✔ a workspace job works in one child repository and loads a selected Pi extension once
✖ cleanWorktree reads a tree with stale stat data without rewriting its index
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:  (index bytes differ)
ℹ pass 3
ℹ fail 1

node --test test/u10-git-status.test.ts                            # fix restored
✔ cleanWorktree reads a tree with stale stat data without rewriting its index
ℹ pass 1
ℹ fail 0
```

## Other probe

Removing the `HERDR_*` scrub in `src/runtime/wrapper.ts:115` turns the S1 detached-job test red with `actual: [ 'HERDR_ENV', 'HERDR_PANE_ID' ]`; restored, green.
