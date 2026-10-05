---
opened: 2026-10-05
landed: 2026-10-05
---

# F772 · The seat setup guide avoids every snag from the live limen-test cold run

## Outcome

The next person who hands `docs/seat/agent-setup.md` to a coding agent sets up a seat without the snags that Adam hit on the limen-test seat. The guide says on which machine each step runs, which steps only the human can do, and what to check before going on. It is easy to scan: a phase map, short phase titles, and labeled HUMAN, agent, Check, and STOP lines. Adam asked for a polished guide on 2026-10-05, after his live run.

## Scope

- `docs/seat/agent-setup.md` only. Encode each snag in general terms, not as limen-test facts:
  1. HUMAN logins (`gh`, `omp`) run from the laptop into the seat's Tailscale name. The keys are on the laptop. A run from another server gives `Permission denied` or a missing `IdentityFile`.
  2. A VPS can keep a provider hostname such as `ubuntu-s-…`. Identify the seat by its public IP and Tailscale address, not by hostname.
  3. Moshi pairing: a real token with no angle brackets (the shell reads `<` as a redirect); the phone path is Settings → Hooks (Agent Hooks); the token is not an SSH key; pair on the seat with `--store file`; host setup (Easy Pair) is SSH access, not agent hooks.
  4. After `github-setup.sh`, the old Herdr server and the lingering user session do not have the new `limen-github` group. Stop the server; if `id -nG` still misses the group, restart the user manager.
  5. A passphrase-locked SSH key on the seat breaks Git over SSH in batch mode. HTTPS with the `gh` credential helper is the supported path.
  6. Tailscale Serve can need a one-time admin enable step before `tailscale serve --bg`.
  7. The GitHub App Authorize page cannot change scopes. Click Authorize; change permissions in the App settings.
  8. Herdr with OMP can omit `interactive_ready`. Limen counts absent as live and explicit `false` as not live (F770, already landed).
  9. Phase order: each step names who runs it and where (`mac$`, `root$`, `worker$`, `pane$`).
- Keep the pins and checksums: Node 24.21.0, Herdr 0.9.3, omp 18.6.1, moshi-hook 0.3.19.

## Out of scope

- Code changes. The `interactive_ready` rule already landed in F770.
- The pi-claude bridge work (F771).
- Changes to any live seat.

## Acceptance

- Each of the nine snags has a line in the guide, and the outcome names each line.
- The guide starts with a phase map: phase, who, where.
- Every pin and checksum is the same as before the change.
- A cold read of the changed phases finds no contradiction between phases.
- No `<…>` placeholder appears inside a command that the human types into a shell.
