# F781 · The shepherd gets one webhook for every job and coordinator event that needs it

## Outcome

The plant finish webhook today rings only when a job ends, and a failed job with an empty result rings not at all. A shepherd agent (for example Easy for the Chilly plant) then learns about a failed job, a stalled worker, an idle or blocked coordinator, or a coordinator whose process died during a land only when a human asks. After this change the same plant targets get one ping per event, with the event kind, the plant, the title, the id, and a one-line reason. This extends the coordinator finish signal (F778) without a second notifier.

## Scope

- Job events: done, failed, timed out, stalled, stopped, with the finish reason or the stall line.
- Coordinator events from the wake hook, which every plant loader already loads: idle with work left, blocked, goal done.
- Coordinator process exit, found by the `limen sweep` timer from a registration the coordinator wrote while it lived.
- `limen webhook test` sends one test ping to the plant's targets.
- Same sender, same env file, same target list and author map.

## Out of scope

- The language hook (`hook/communication.ts`).
- Herdr changes, and load-aware spawn or worker limits (F778 notes).
- A new daemon. Exit detection uses the installed sweep timer.

## Acceptance

- A failed job with an empty result sends one ping whose `reason` is the finish detail.
- A detached timeout sends `event: "job.timed-out"`; a hosted stall sends one `job.stalled` while the job runs, and a clean idle close sends only `job.done`.
- A coordinator turn that ends with open todos and no running owned job sends one `coordinator.idle`; the same state at the next turn sends nothing.
- An omp goal that becomes complete sends one `coordinator.goal-done`; a blocked todo sends one `coordinator.blocked`.
- A coordinator process killed without a normal exit sends one `coordinator.exited` on the next sweep, naming the tool it was running; a normal exit sends nothing.
- Tests use a fake receiver; typecheck, Biome and the touched test files pass.

## Notes

- Without goal mode, a turn that closes every todo counts as goal done.
- Exit kinds other than omp's `normal` ping, including a closed pane (`signal: sighup`). A missed crash costs more than one extra ping.
