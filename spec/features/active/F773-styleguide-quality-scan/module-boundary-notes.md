# Module-boundary slice · Shared wakes and job publication

Scope: synthesis specs 4, 8 (including the continuation-publication fix F729), and 18. Spec 3 remains skipped by owner decision. No vision, ticket, board, sweep, jobs or supervisor edits.

- `src/job/wake-text.ts` owns completion/advisory text and bounded evidence excerpts. The Pi wake hook and Herdr coordinator prompt call the same completion renderer; only route instructions differ. Delivery claims and receipts remain with their existing owners.
- `src/job/publication.ts` owns all new-record files, hidden-directory cleanup, copied continuation sessions and the rename into `.limen/jobs`. Spawn and continue publish complete starting records before creating/restoring worktrees. A prune during hidden continuation writes may remove the finished parent checkout; continuation restores it only after publication protects that path. It never writes the parent transcript.
- Spawn determines the initial base from its planned branch before publication. The prepare phase still runs after worktree creation and before engine launch. The overlap regression waits for prepare explicitly rather than assuming that a complete record means its checkout already exists.
- Spec 18 changes only the cited GitHub trust check/repository comparisons, legacy skill guards, picture path filter, group-review branch guard and Herdr error-code guards. Supervisor, sweep and jobs conditions remain with their other slice owners.

Baseline `9d8db3358e8bc6aa750c6e67a6c395ba0aa1db71`: injected prune before continuation markers caused ENOENT; injected task write failure left a visible child; Herdr wake omitted commits/final message. The new regressions demonstrate these failures against a temporary baseline archive.

Evidence lives outside the worktree in `/Users/overment/.overment/limen/.limen/jobs/2026-10-05-f773-module-boundary-p1s-8409455a/session/module-boundary-evidence/`. `smoke.txt` exercises both real wake routes against the same completed record and CLI prune/continue with a fixture OMP executable. `trust-smoke.txt` covers 16 GitHub trust cases and five dataset-path cases. External Herdr/GitHub services were fixture executables/network replies, not live services.
