# Brief

## Shared outcome

The ticket outcome: one short document lets a coding agent set up a Limen seat, the GitHub App, and the doorbell, and the seat docs agree with the code. Teams split the work by area and share facts with `limen group publish`. Team-3 owns the agent document. It builds on the facts that team-1 and team-2 publish. Team-4 tests and challenges.

## Start from

- The ticket.
- `docs/remote.md`, `docs/vps.md`, `docs/seat/README.md`, `docs/seat/github-setup.sh`, and the units in `docs/seat/`.
- The GitHub code in `src/` (find it with `rg -l "github" src`).
- Done tickets: F013 remote seat, F014 GitHub doorbell, F760, and F761 (under `spec/features/done/`).
- The `spec/build.md` board lines on F014.
- The post https://ma.ttias.be/remote-coding-environment-vps/ (fetch it). Read the post before the first edit.

## Rules

- First tool action: publish your hypothesis (see the group rules).
- Every fact in a doc names its source: a code path with a line, a command output, or the post. No fact from memory.
- Do not delete existing docs. `docs/vps.md` stays as an old record. Move text; do not lose it.
- Read-only Alice checks are allowed, as `overment` over `ssh alice` only: `id -nG`, `sudo -n -l` (expect refusal), `systemctl is-active limen-github.timer`, `systemctl cat limen-github.service`, `ls -l /opt/limen /usr/local/bin/limen /etc/limen-github` (metadata only), `readlink`, `git -C /opt/limen rev-parse HEAD` if readable, `limen github status`, `limen github doctor`, `tailscale status`, `ufw status` if readable, `herdr --version`, and `node --version`. Nothing else on Alice.
- Never print or read the PEM. Never run `limen github poll`. Never stop, start, or edit a unit. No sudo on Alice. No edit under `/opt/limen`, `/etc/limen-github`, or `/var/lib/limen-github`.
- Commit only on your job branch. Do not land. Do not push.
- Short beats complete. If a sentence does not change what an agent or operator does, cut it.
- Plain technical English (about 80% of ASD-STE100): short sentences, one idea each, active voice, one word for one thing (seat, window, worker, poller, coordinator).
- No Cursor CloudAgent. Engine OMP only.

## Deliverable per team

`group/teams/team-N-result.md` with:

- what changed (file list),
- each fact with its source,
- each contradiction fixed,
- open questions for Adam,
- what the lead should land.

## Lead synthesis

`group/synthesis.md` compares the four results. It names the files to land, in order, and what to drop. It confirms that the final agent document passed the team-4 cold-agent test. Nothing merges.
