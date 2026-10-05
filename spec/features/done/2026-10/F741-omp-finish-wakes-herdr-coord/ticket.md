---
touches:
  - limen.commands
  - limen.cabinet.records
  - limen.integrations.herdr
opened: 2026-10-02
landed: 2026-10-03
---

# F741 · OMP finish wakes the Herdr coordinator; wait refuses under LIMEN_COORDINATOR

## Outcome

A terminal watched job wakes the subscribed Herdr coordinator pane into an observed turn via Herdr itself (`herdr agent prompt` or an equivalent that starts a turn on the recorded coordinator pane). Interactive coordinators cannot block on `limen wait`. Cloud Automations finish ping remains an opt-in side channel and is never claimed as Herdr follow-through.

## Scope

- Under `LIMEN_COORDINATOR=1`, `limen wait` refuses with a clear error that points operators at `limen jobs` / job `state` / wake delivery instead of blocking the pane.
- On job terminal + subscription: deliver the completion wake through a path that starts a turn on the recorded coordinator pane (prefer `herdr agent prompt`), not only webhook HTTP to `api2.cursor.sh`.
- Record whatever coordinator identity the prompt path needs (pane/session/subscription already present where possible) so OMP Herdr coordinators get the same follow-through Pi already gets from in-process inject.
- Native tests for refuse-wait and the wake path; prefer one live hosted OMP proof on Mac that an observed Herdr turn follows worker DONE.
- Keep Cloud Automations / finish-webhook opt-in and honestly labeled as a side channel.

## Out of scope

- Editing Alice `alice/` or `api/`.
- Making finish-webhook mandatory or claiming HTTP acceptance as a Herdr turn.
- CloudAgent.
- Changing unrelated group (F740) or seat-bell (F731) work.

## Acceptance

- `LIMEN_COORDINATOR=1 limen wait <id>` exits non-zero with an error naming jobs/state/wake; without that env, wait still blocks for terminal state as today.
- A subscribed terminal job delivers a wake that starts a turn on the recorded Herdr coordinator pane; native tests cover refuse-wait and the wake delivery seam.
- Finish-webhook remains optional; docs/tests do not treat webhook acceptance as Herdr follow-through.
- Prefer live hosted OMP proof: worker DONE → observed coordinator turn on the plant Herdr pane.

## Notes

Board ops wave (Adam 2026-09-27): OMP finish wakes with `limen wait` refused under `LIMEN_COORDINATOR=1`. Engine omp, provider anthropic, model claude-opus-5-5, thinking high/xhigh. Never CloudAgent.
