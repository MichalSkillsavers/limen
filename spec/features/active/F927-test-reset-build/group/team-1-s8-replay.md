# Team 1 · replays of `b62b837` (group launch lock) and `af9f35e` (lead updates as followUp)

`git revert --no-commit` applies to neither: the group code moved from `src/group-cabinet.ts` to `src/job/group-cabinet.ts`, and both fixes also changed `test/group-command.test.ts`. Each fix was hand-reverted in a scratch worktree (`git worktree add --detach /tmp/f927-t1-replay-<fix> HEAD`, the final `test/s8-groups.test.ts` copied in). All scratch trees are removed.

## `b62b837`: a queued launch fails behind a slow sibling past 10 seconds

Hand-revert in `src/job/group-cabinet.ts`: `groupLock` gets the old fixed deadline (`Date.now() + 10_000` for every mode) and loses the `skip` return, so every caller waits 10 s and throws, as before the fix.

S8 holds the first worker's checkout (a Git `post-checkout` hook reading a FIFO), and with it the launch lock, for the one real 12-second hold. Team 2 asks for its one worker slot twice while the lock is held.

```
node --test --test-timeout=60000 test/s8-groups.test.ts                      # fix reverted
✖ launches queued behind a slow sibling wait past the old 10-second lock deadline, and one slot makes one member
  group lock busy or uncertain: …/.limen/groups/<id>/launch/.lock; inspect its owner before recovery
  actual: [ 1, 1 ], expected: [ 0, 1 ]
```

The same revert does not turn the busy-cabinet test red: it passes after a 10 s wait (13.5 s), because `finalizeJob` now catches a failed lifecycle sync (`src/job/record.ts:46`, added after `b62b837`). With that catch removed as well, the finish of a member that ends while the test holds the cabinet lock never arrives:

```
node --test --test-timeout=60000 --test-name-pattern="stale lead|queued behind|finish completes" test/s8-groups.test.ts
✖ a member's finish completes while another process holds the cabinet; … (60001 ms, test timed out)
```

## `af9f35e`: a lead update must wake an idle lead as a followUp

Hand-revert in `hook/group-peer.ts`: `deliverAs: "followUp"` back to `"nextTurn"`. The lead in S8 is the fake engine running the real group hook; it records how each delivery arrived.

```
node --test --test-timeout=60000 test/s8-groups.test.ts                      # fix reverted
✖ each recipient reads a finding once, the lead hears it as a followUp, and a synthesis write sends a lead-step ping
  actual: [ 'nextTurn' ], expected: [ 'followUp' ]
```

`triggerTurn` is not checked: the fake engine starts a turn for every queued message.

## Green

`node --test test/structure.test.ts test/s[0-9]*.test.ts test/u[0-9]*.test.ts` on the branch: 58/58 pass, real 53 s.
