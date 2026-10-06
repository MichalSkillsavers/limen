# Seams and decisions

## Seams

- Sender: `bin/tony-finish-ping.sh` stays the only transport. Event data rides env: `LIMEN_FINISH_KIND`, `LIMEN_FINISH_PLANT`, `LIMEN_FINISH_ID`, `LIMEN_FINISH_REASON`, `LIMEN_FINISH_HANDOFF`. The body adds `event`, `plant`, `title`, `jobId`, `reason`; old fields are unchanged.
- Job terminal: `finalizeJob` passes its detail to `deliverFinishWebhook` (`src/integrations/finish-webhook.ts`). The empty-result skip is gone. `terminalKind` maps `timeout after` and `stalled tool` details.
- Hosted stall: `noteHostedIdle` (`src/runtime/supervisor.ts`) calls `deliverJobStall` once per armed advisory. A standing advisory of the same kind (recovered supervisor) does not ping again.
- Non-terminal claims: `deliverEventWebhook(dir, …)` claims by `mkdir(dir)`; receipt `dir/finish-webhook`. Event id is a hash of the claim path, so a receiver that dedupes on `finishEvent` keeps distinct events.
- Coordinator: `coordinatorSignals()` (`src/integrations/coordinator-signal.ts`), driven by `hook/wake.ts` handlers. Registration: `.limen/coordinators/<session>/` (`pid`, `born`, `pane`, `session-file`, `started-at`, `title`, `tool`, `shutdown`, `last-signal`, `events/`).
- Exit: `sweepCoordinators` from `limen sweep` (LaunchAgent, 60 s). Reads the newest omp `session_exit` record after `started-at`.

## Decisions

- A coordinator is an interactive session with `LIMEN_COORDINATOR=1` or a Herdr pane; never `LIMEN_JOB=1` or a subagent.
- Idle and todo-done need no running job owned by the coordinator (`origin-pane` or `notify/subscribers/<session>`); blockers ring regardless.
- Aborted turns never ring: the owner is at the pane.
- Every omp exit kind except `normal` rings, including `signal: sighup`.
- `born` is retried at each turn end, because the 1 s process query can miss on a loaded machine.

## Open

- Pi coordinators have no goal or todo events, so they only get exit and failed-turn signals.
- Exit detection depends on the sweep LaunchAgent; a machine without `limen sweep --install` gets no exit pings.
