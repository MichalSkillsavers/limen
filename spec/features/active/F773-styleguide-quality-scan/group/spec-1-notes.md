# Spec 1 notes · OMP coordinator watch and steer

## Decision

An OMP coordinator is identified by its Herdr pane, not by a session ID. `limen watch`, `limen unwatch`, and `limen steer --running` use the same wake route as spawn: a Pi session subscribes in `notify/subscribers/<session>`; a Herdr coordinator without a Pi session is the job's `origin-pane`, which `promptCoordinator` reads at finalize.

Why not the session route for OMP:

- OMP 18.4.4 does not export a session ID to its Bash tool. `env` in an OMP pane has no `PI_SESSION_ID`.
- The OMP binary has no `agent_settled` event. `hook/wake.ts` confirms an in-process wake on `agent_settled`, so an OMP in-process wake could be injected but never confirmed.
- Pi's Bash tool deletes an inherited `PI_SESSION_ID` and sets it from its own session (`pi-coding-agent/dist/core/tools/bash.js`, `resolveSpawnContext`). So the old `process.env.PI_SESSION_ID = leadSession` in `hook/group-peer.ts` had no effect in Pi and did not reach OMP commands. It is removed.

## Seams

- `src/commands/watch.ts` owns `WakeRoute`, `coordinatorWakeRoute(command, next)`, and `watches(job, route)`. `steer.ts` imports them.
- `src/commands/spawn.ts` `currentNotificationSession()` and `herdrWakePane()` are the route readers that spawn, continue, watch, and steer share. `stop.ts` and `group-cabinet.ts` still read `PI_SESSION_ID` on their own.
- A job has one wake pane. `watch` replaces `origin-pane`; `unwatch` removes it only when it is this pane.
- The pane wake is sent once at finalize. Watching a job that already ended prints that no wake will follow.

## Open, outside this slice

- `hook/wake.ts` footer: `subscribed()` checks only the session, so an OMP coordinator's footer still marks its pane-routed jobs `unwatched`. The fix is to treat `origin-pane === HERDR_PANE_ID` as watched there.
- `src/commands/stop.ts` `markCallerDelivered` reads only `PI_SESSION_ID`. From code reading, a job that an OMP coordinator stops still sends a Herdr wake to that same pane. This was true before this slice for every OMP-spawned job.
- `src/integrations/coordinator-wake.ts` header says "the Herdr pane that spawned this job"; after a takeover it is the pane that watches the job. `origin-pane` is now a misleading name (synthesis spec 43).
- `docs/jobs.md:30` describes the OMP route and could say that `limen watch` moves `origin-pane`.
