# Brief

## Shared outcome

Review the F766 agent setup guide and deliver one improved `docs/seat/agent-setup.md` that a cold agent can run on an x86_64 or arm64 VPS. The ticket lists seven owner locks. Each one must be in the final guide.

## Who owns what

- **team-1** owns the guide file. Only team-1 commits `docs/seat/agent-setup.md`. Other teams publish findings and line-level fixes for team-1.
- **team-2** checks every command against the code and owns any `docs/seat/github-setup.sh` fix.
- **team-3** owns the arm64 and network sections (downloads, checksums, `uname -m`, Tailscale-only admin SSH) and publishes them as exact text for team-1.
- **team-4** runs the cold-agent tests and publishes every guess to team-1.

## Start from

- The draft: `git show limen/2026-10-05-f766-remote-agent-setup-guide-te-b10aa46c:docs/seat/agent-setup.md` (commit `53a195a`). Also read `git show limen/2026-10-05-f766-remote-agent-setup-guide-te-b10aa46c:spec/features/active/F766-remote-agent-setup-guide/group/teams/team-3-result.md` for the draft's cold-test history.
- The F766 decisions in `spec/features/active/F766-remote-agent-setup-guide/ticket.md`.
- `docs/remote.md`, `docs/seat/README.md`, `docs/seat/github-setup.sh`, and the units in `docs/seat/`.
- The GitHub code in `src/` (`rg -l github src`).
- https://ma.ttias.be/remote-coding-environment-vps/ . Read it before the first edit. Take the shape, not the stack.

## Rules

- First tool action: publish your hypothesis.
- Every fact names its source: a code path with a line, a command output, a vendor release page, or the post. No fact from memory. Checksums come from the vendor's published list, not from a hash you compute yourself.
- Alice is read-only, as `overment` over `ssh alice` only, with the commands in the F766 brief. Never print or read the PEM. Never run `limen github poll`. Never stop, start, or edit a unit. No sudo on Alice.
- Do not edit `src/`. Do not delete docs.
- Commit only on your job branch. Do not land. Do not push.
- Short beats complete. Cut a sentence if it does not change what the agent does.
- Plain technical English (about 80% of ASD-STE100): short sentences, one idea each, active voice, one word for one thing (seat, window, worker, poller, coordinator, plant).
- No Cursor CloudAgent. Engine OMP only.

## Deliverable per team

`group/teams/team-N-result.md` with: the findings (each with line and source), what changed (file list and commit), each owner lock that your work covers, open questions for Adam, and your verdict on the final guide.

## Lead synthesis

`group/synthesis.md` names the one candidate to land and its commit, lists how each owner lock is met (guide line), reports both cold-agent runs, and lists what to drop. Nothing merges.
