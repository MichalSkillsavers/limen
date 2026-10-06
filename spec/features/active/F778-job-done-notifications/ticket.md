---
touches:
  - limen.sessions.wake
  - limen.integrations.herdr
opened: 2026-10-05
---

# F778 · A finished job wakes the agent that must act next

## Outcome

When a Limen job reaches a terminal state, the agent pane that owns the next step gets one clear wake: which job, what state, and what to try next. Today a group lead can wait for hours while its team coordinators are finished, and a continued job can finish with no wake at all. Adam then has to tell the lead by hand that its teams are done.

## Evidence (plant, 2026-10-04 and 2026-10-05)

- Lead session `01a1026b` led 11 groups (F756 to F769). Every lead receipt stayed `queued` with 0 attempts. The pane never loaded `hook/group-peer.ts`; after `group start` refused, the agent wrote `.limen/group-leads/01a1026b…` by hand. The pid check passed, so every later group start passed too.
- `finalizeJob` skips the Herdr prompt for every group member, so a team coordinator's finish had no route except the missing hook.
- The F771 continuation was started from a shell with no Herdr pane and no Pi session. It recorded no wake route, although its parent had `origin-pane wYN:p1`.
- The plant loaders (`.omp/extensions/limen.ts`, `.pi/extensions/limen.ts`) skip `group-peer` silently when the package does not ship it.

## Scope

- One finish path: `promptCoordinator` decides for every job, group members included.
- A lead hook proves it runs: the group-peer sweep refreshes its registration; `group start` refuses a stale one.
- A team coordinator's finish wakes the lead pane through Herdr when the lead hook is not live, with the group status and the reload hint.
- `limen continue` from a shell with no wake route keeps the parent's route.

## Out of scope

- Herdr changes. A pane that Herdr no longer finds (`agent_not_found`) stays a Herdr-side gap; Limen records the failed attempts and the five-minute coordinator fallback still applies.
- The pane state icon (F777) and the test trim (F776).
- Worker finishes inside a team: the hosted team coordinator always loads group-peer.

## Acceptance

- A team coordinator that finishes while the lead hook is not live starts a Herdr turn on the lead pane. The text names the group, the team, the count of finished teams, `limen group status`, and the reload hint.
- With a live lead hook, the same finish sends no Herdr prompt; the job log says that group events carry it.
- A group worker's finish never prompts the lead pane.
- `group start` refuses a registration that the hook did not refresh in the last 30 seconds, and names the reload fix.
- A continuation started with no wake route records the parent's `origin-pane`.
- `npm run check` passes.

## Notes

- Load-aware spawn and a worker limit remain open. This slice does not implement either.
- Existing coordinator processes must reload the hooks after landing. Alice still prefers the separate `limen-groups` checkout; that loader must use the shared install before a reload can pick up this fix.
