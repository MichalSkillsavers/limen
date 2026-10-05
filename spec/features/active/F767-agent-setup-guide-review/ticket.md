# F767 · A cold agent sets up a Limen seat correctly from the agent setup guide

## Outcome

Adam pastes `docs/seat/agent-setup.md` into a coding agent on a new VPS, x86_64 or arm64, and the agent sets up a working Limen seat with no guesses. The guide stops at each HUMAN step, checks each step with a command, and follows every owner lock below. This feature reviews the F766 draft and delivers the improved file. Adam asked for this on 2026-10-05, after he read the F766 draft. He reads the result before anything lands.

## Scope

- **Source draft:** `docs/seat/agent-setup.md` at `53a195a` on `limen/2026-10-05-f766-remote-agent-setup-guide-te-b10aa46c` (181 lines). Read it with `git show limen/2026-10-05-f766-remote-agent-setup-guide-te-b10aa46c:docs/seat/agent-setup.md`.
- **Decisions:** the Notes in `spec/features/active/F766-remote-agent-setup-guide/ticket.md`.
- **Shape to adapt, not the stack:** https://ma.ttias.be/remote-coding-environment-vps/ . Tailscale-only access, a seat that works with the laptop lid closed, and a document that you hand to an agent. Limen uses the GitHub App doorbell, not CI runners, T3, or Laravel.
- **Critique:** is it a correct cold-run guide? Check the fill-in block, the HUMAN stops, a check after each step, self-containment for a cold agent, length, and plain technical English.
- **Deliver:** an improved `docs/seat/agent-setup.md`. Fix `docs/seat/github-setup.sh` or a unit next to it only when the guide needs it.

## Owner locks (each one must be in the improved guide)

1. Limen is installed on the Mac and on the VPS seat. A plant can live on both.
2. Setup disables `limen-github.timer` with `systemctl disable --now`, not only stop.
3. Do not register junk projects with `limen init`. The stray `/home/overment/.nvm` entry was already removed from the Alice project list. The guide tells the agent how to check the list and not add such entries.
4. linux-arm64 (aarch64) support: Node, Herdr, and every other binary download and checksum cover arm64 and x86_64. A `uname -m` check runs before any download. Hard gate: F766 and F767 do not land without it.
5. After setup, admin SSH runs over Tailscale only. Public SSH is break-glass only.
6. The Moshi phone ring is a deferred proof, marked "prove later". It does not block the guide.
7. Nothing lands on `main` and nothing is pushed until Adam says "land".

## Out of scope

- Landing, pushing, or releasing.
- Any change on Alice: `/opt/limen`, `/etc/limen-github`, `/var/lib/limen-github`, the timer, the project list, or any checkout. Read-only checks only, under the F766 brief rules.
- Product code in `src/`. Report a bug; do not fix it here.
- A provisioner that runs the setup with no human.

## Acceptance

- One improved `docs/seat/agent-setup.md`, at most about 200 lines. Each owner lock has a line, and the result names that line.
- Every command, flag, path, and environment key in the guide is checked against `src/`, `docs/seat/github-setup.sh`, and the units. Each check names its source.
- Each binary download has an x86_64 and an arm64 source, with a checksum or a named checksum source for each, after a `uname -m` step.
- Two cold-agent runs pass, one for an x86_64 fake user and one for an arm64 fake user. A run gets only the guide. Each run lists every place where it had to guess, and the final guide removes each guess.
- `bash -n` and `shellcheck` (if present) pass on any changed script.
- The lead synthesis names the one candidate to land, what to drop, and how the guide differs from the F766 draft.
- Plain technical English (about 80% of ASD-STE100).
