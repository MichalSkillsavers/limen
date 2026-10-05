---
opened: 2026-10-05
---

# F766 · An agent can set up a Limen seat, GitHub App, and integrations from one short document

## Outcome

Adam pastes one short document into a coding agent. The agent sets up a VPS seat for a user: Tailscale-only access, break-glass SSH, a worker without sudo, Node, Git, `gh`, OMP, Herdr, and Limen, a persistent Herdr session, the Moshi bell, the prune timer, and the opt-in GitHub doorbell (GitHub App, PEM, `limen-github` poller user, doctor before timer). The agent stops at each step that only a human can do: create the App in the GitHub UI, approve the Tailscale node, the Moshi pairing token, and the provider login. The agent checks each step with a command. The remote, seat, and GitHub docs agree with the code and with each other.

## Scope

- Study the GitHub integration as built: the doorbell App, `limen github connect|disconnect|status|doctor|ensure|poll|deliver|review|work|resolve`, `docs/seat/github-setup.sh`, `limen-github.{service,timer}`, and the wakes from a PR `/limen review`, an issue comment, and an issue body (F014, F760, F761). The code under `src/` is the truth.
- Clarity passes on `docs/remote.md`, `docs/seat/README.md`, `docs/vps.md` (it stays an old record), `docs/seat/github-setup.sh`, and the units next to it.
- One new agent-fillable document, for example `docs/seat/agent-setup.md`: a fill-in block at the top and numbered phases. Each step is a command, a check, and a stop condition. Very short.
- Small script changes only if they remove real steps, for example a read-only seat preflight or a clearer `github-setup.sh` preflight. Prefer doc fixes to new scripts.
- Ideas source (must read): https://ma.ttias.be/remote-coding-environment-vps/ . Take the shape, not the stack (no T3, Laravel, MySQL, or btrfs advice): hand this post to your agent, tailnet-only services, one public break-glass SSH port, no unattended reboot under live jobs, bind to 127.0.0.1 and use `tailscale serve`, Docker `-p` bypasses ufw, check each step.

## Out of scope

- Landing on `main`, pushing, or releasing.
- Any change to the live Alice poller, `/opt/limen`, `/etc/limen-github`, the timer, or the Alice checkout `/home/overment/alice`.
- A provisioner that runs the whole setup with no human. Webhooks or any inbound port.
- Product code changes in `src/`. If a doc check proves a bug, report it. Do not fix it here.

## Acceptance

- One agent-ready document, at most about 180 lines, with a fill-in block, HUMAN-only steps marked, and a check after each step.
- Its GitHub App section covers: permissions (checked in code), webhook off, install only on chosen repositories, the PEM goes straight to a root path and never to a worker home or a chat, the `limen-github` poller user, the narrow sudo handoff, `limen github doctor` clean before `systemctl enable --now limen-github.timer`, and doctor again after.
- `docs/remote.md`, `docs/seat/README.md`, and the `github-setup.sh` comments agree with each other and with the code: box size, Moshi, Herdr remote, and the `/opt/limen` same-version rule. Each fixed contradiction is listed.
- Any script change is small, read-only or root-only as stated, passes `bash -n` and `shellcheck` if present, and names the steps it removes.
- A cold agent that gets only the new document (no repository tour) writes a correct filled-in plan for a fake user. Its stuck points are listed and fixed.
- The lead synthesis says what to land, in which order, and what to drop.
- Plain technical English (about 80% of ASD-STE100).

## Notes

Live Alice facts. All checks on Alice are read-only for this feature.

- `ssh alice` from the Mac uses the Tailscale MagicDNS name. Public SSH is break-glass only, with a separate root identity.
- `/opt/limen` is the root-owned release that the poller uses. `/usr/local/bin/limen` links to it. The poller runs as `limen-github` from `limen-github.timer`.
- The worker and coordinator user `overment` has no sudo. The Alice checkout is `/home/overment/alice` (origin `iceener/alice`). Its Herdr coordinator is the registered doorbell target.
- The Limen plant is the Mac checkout `~/.overment/limen`. It is not on Alice.
- Known contradiction: `docs/seat/README.md` says 4 GB / 80 GB. `docs/remote.md` and `docs/vps.md` say 8 GB / 150 GB.

Decisions (Adam, 2026-10-05):

- Limen is installed and available on both the Mac and the VPS seat. A plant checkout on the seat, such as `/home/overment/limen` on Alice, is intended. The docs say that a plant can live on the Mac and on the seat.
- The stray `limen init` entry for `/home/overment/.nvm` in the Alice project list (`/home/overment/.limen/projects`) is approved for removal.
- `github-setup.sh` disables `limen-github.timer` (`systemctl disable --now`), not only stops it. So a reboot during an upgrade cannot start polling again before `limen github doctor` is clean and the operator enables the timer again.
- The agent guide supports linux-arm64 (aarch64) as well as x86_64. Node, Herdr, and every other binary download and checksum cover both architectures. A step checks the architecture with `uname -m` before any download. F766 does not land until the guide has this.
- After setup, admin SSH runs over Tailscale only. Public SSH is break-glass only.
- The Moshi phone ring from the coordinator is a deferred proof. It does not block the guide. The guide marks it as "prove later", not as a gate.
