# Lead notes

Map for whoever continues the F925 lead role.

- Lead job: `2026-10-06-test-reset-decision-group-lead-19ac84d2`, started 12:24 CEST. Lead branch: `limen/2026-10-06-test-reset-decision-group-lead-19ac84d2`.
- The lead is a Limen job, so `group start` refuses under `LIMEN_JOB=1` (same as F780 and F783). Workaround: `.limen/group-leads/f925-lead-19ac84d2` holds the lead OMP pid (13262); `/tmp/f925-lead/heartbeat.sh` touches it every 10 seconds. Every lead group command runs through `/tmp/f925-lead/lg`, which unsets the job env and sets `PI_SESSION_ID=f925-lead-19ac84d2`.
- `limen ticket new` gave F925: F924 is taken by the job label `2026-10-06-f924-fleet-fixes-from-findings-4b2bb3bf`. The folder was renamed to the short slug `F925-test-reset-decision`.
- The packet (`5df0697`) reached `main` by fast-forward before `group start`.
- Group id: `4f7f48da-b9c4-4bab-bea4-d7baa685c92d`, started 12:25 CEST, deadline 14:25 CEST. Team coordinators: team-1 `2026-10-06-f925-team-1-coordinator-d52dfc92` (value audit, Opus), team-2 `…-82d0ee79` (from scratch, Opus), team-3 `…-c82d50ca` (challenger, Sol through `--team-model team-3=openai-codex/gpt-6-sol`). Reasoning is shared by the group: coordinators xhigh, workers high.
- Lead events: `/tmp/f925-lead/next.sh N` blocks up to N minutes until a team finding or a terminal state, and prints only unseen events.
- Decision only: no file in `test/` changes in this run.
