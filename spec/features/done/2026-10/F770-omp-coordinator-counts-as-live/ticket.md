---
touches:
  - limen.commands
  - limen.integrations.herdr
opened: 2026-10-05
landed: 2026-10-05
---

# F770 · A warm OMP coordinator counts as live for the GitHub doorbell

## Outcome

A seat whose registered Herdr coordinator runs OMP passes `limen github doctor`, and `@limen` wakes reach that coordinator. Today Herdr 0.9.3 reports an OMP pane as `idle` or `done` but leaves `interactive_ready` out of `herdr agent get`, because it skips screen detection for OMP. Limen requires `interactive_ready === true`, so doctor stays FIX and the poller never delivers, though `herdr agent prompt` works. Adam asked for this on 2026-10-05, after a proof on the limen-test seat.

## Scope

- One live rule for a registered coordinator: the pane id matches the binding, `agent_status` is `idle`, `working`, `blocked`, or `done`, and `interactive_ready` is `true` or absent.
- An explicit `interactive_ready: false` is not live.
- The same rule serves `limen github ensure` (which `limen github deliver` and the poller use) and the `limen github doctor` live-agent check. Start at `ensureGithubCoordinator` in `src/commands/github.ts`.
- Docs: one line in `docs/remote.md` where it says that `interactive_ready: true` is required.

## Out of scope

- Herdr itself, OMP screen detection, or `limen status`.
- Any other doorbell check, claim, or reply.
- The live seats.

## Acceptance

- A doctor test: an agent row with `agent_status: idle` and no `interactive_ready` reports the live-agent check as OK.
- A doctor test: `interactive_ready: false` still reports FIX (existing test).
- A doorbell test: a coordinator row with no `interactive_ready` receives the handoff prompt.
- Existing doorbell and doctor tests pass unchanged.
- `npx tsc --noEmit` and `npx biome check .` pass.
