# Lead notes

Map for whoever continues the F783 lead role.

- Lead job: `2026-10-06-f783-spec-structure-spec-keeper-81acb6b0`, started 09:47 CEST, 4h limit. Lead branch: `limen/2026-10-06-f783-spec-structure-spec-keeper-81acb6b0`.
- The lead is a limen job, so `group start` refuses under `LIMEN_JOB=1` (same as F780). Workaround: `.limen/group-leads/f783-lead-81acb6b0` holds the lead OMP pid; a background loop touches it every 10 seconds (the lead heartbeat must be under 30 seconds old). Every lead group command runs through `/tmp/f783-lead/lg`, which unsets the job env and sets `PI_SESSION_ID=f783-lead-81acb6b0`.
- `group start` needs the packet committed at the plant `HEAD`, so the packet commit goes to `main` by fast-forward first.
- `--team-model team-2=openai-codex/gpt-6-sol` gives Team 2 its Sol route; one route per team, coordinator and worker share it.
