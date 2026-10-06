# Lead notes

Map for whoever continues the F783 lead role.

- Lead job: `2026-10-06-f783-spec-structure-spec-keeper-81acb6b0`, started 09:47 CEST, 4h limit. Lead branch: `limen/2026-10-06-f783-spec-structure-spec-keeper-81acb6b0`.
- The lead is a limen job, so `group start` refuses under `LIMEN_JOB=1` (same as F780). Workaround: `.limen/group-leads/f783-lead-81acb6b0` holds the lead OMP pid; a background loop touches it every 10 seconds (the lead heartbeat must be under 30 seconds old). Every lead group command runs through `/tmp/f783-lead/lg`, which unsets the job env and sets `PI_SESSION_ID=f783-lead-81acb6b0`.
- `group start` needs the packet committed at the plant `HEAD`, so the packet commit goes to `main` by fast-forward first.
- `--team-model team-2=openai-codex/gpt-6-sol` gives Team 2 its Sol route; one route per team, coordinator and worker share it.
- Group id: `f79c4724-3bbd-4c02-b10d-23acc60e9cd0`, started 09:54 CEST, deadline 12:54 CEST. Team coordinators: team-1 `2026-10-06-f783-team-1-coordinator-789f35ef`, team-2 `…-60b40d72` (Sol), team-3 `…-d004832d`, team-4 `…-b5e7b3a7`.
- Team-2 declined `limen ticket check` and a worktree map fallback as out of its scope. The lead wires `limen ticket check [BRANCH]` at integration as a thin call to Team 3's `landTicketCheck(repository, root, branch, target, job)` from `src/commands/land.ts`.
- After merging any change to `templates/agents.md`, `worker.md` or `group-member.md`, regenerate `templates/.history/` with `LIMEN_WRITE_HISTORY=1 node --test test/inherit.test.ts` (the test pins it to git log).
- Lead events: `limen group wait` wakes on lifecycle noise; `/tmp/f783-lead/next.sh N` blocks until a team finding or a terminal state and prints only unseen events.
- Landed `ce96460` on `main` (plain merge; the lead job was running) and pushed. The live keeper `2026-10-06-f783-spec-keeper-93143e7a` added the F783 board line (`43d91c2`), landed with `limen land --yes`.
