---
touches:
  - limen.runtime.engine
  - limen.integrations.herdr
opened: 2026-10-05
---

# F777 · A hosted job's Herdr tab shows the agent's true state

## Outcome

When Limen hosts a Pi or OMP job in a Herdr pane, the Herdr tab icon follows the agent: working while it thinks or runs tools, blocked when it asks, idle only when its turn has ended. Today every hosted pane shows green (idle/done) while the agent is visibly working, so Adam cannot trust the tab icons.

## Evidence (live, 2026-10-05 ~23:00 Warsaw)

- Pane `w126:p2` (job `2026-10-05-f040-team-handoff-quality-team-1-62e0bec1`, state running): screen shows spinner and "Writing worker B task file"; title `π ⠸ …`; Herdr `agent_status: idle`; no `agent_session`, no `screen_detection_skipped`. Same for `w126:p3`, `w126:p4`.
- Panes started by hand (`wY5:pP`, same OMP) report `working` with `agent_session` and `screen_detection_skipped: true`.
- Hosted argv: `omp --auto-approve --no-extensions … --extension hook/hosted.ts … --extension ~/.omp/local/pi-claude-bridge`. The pane env has `HERDR_ENV=1` and `HERDR_PANE_ID=w126:p2`.

## Root cause

`argvFor` (src/runtime/engine.ts) passes `--no-extensions`. That also drops the Herdr-managed state extension (`~/.omp/agent/extensions/herdr-omp-agent-state.ts` for OMP, `~/.pi/agent/extensions/herdr-agent-state.ts` for Pi). With no `pane.report_agent` reports, Herdr falls back to screen detection, which reads the OMP pane as idle.

## Scope

- Hosted launches (non-JSON, inside Herdr): name the Herdr state extension explicitly with `--extension`, the same way the pi-claude bridge is named. Find it by the Herdr marker (`HERDR_INTEGRATION_ID=omp` / `=pi`) in the engine's user extension dir; skip silently when absent.
- Other user extensions stay off.

## Out of scope

- Herdr product changes. Coordinator (lead) panes that are truly idle while their jobs run: green there is correct Herdr behavior.
- Detached JSON-mode jobs (no Herdr pane).

## Acceptance

- Unit test: hosted OMP and Pi argv include the Herdr state extension when the file exists, and do not when it is absent; JSON-mode argv never includes it.
- Live: a fresh hosted OMP job shows `agent_status: working` with an `agent_session` in `herdr agent list` while it thinks, and `idle`/`done` only after its turn ends.
- `npm test` and the lint/typecheck gate stay green.
