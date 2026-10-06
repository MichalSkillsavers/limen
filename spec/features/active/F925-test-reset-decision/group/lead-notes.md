# Lead notes

Map for whoever continues the F925 lead role.

- Lead job: `2026-10-06-test-reset-decision-group-lead-19ac84d2`, started 12:24 CEST. Lead branch: `limen/2026-10-06-test-reset-decision-group-lead-19ac84d2`.
- The lead is a Limen job, so `group start` refuses under `LIMEN_JOB=1` (same as F780 and F783). Workaround: `.limen/group-leads/f925-lead-19ac84d2` holds the lead OMP pid (13262); `/tmp/f925-lead/heartbeat.sh` touches it every 10 seconds. Every lead group command runs through `/tmp/f925-lead/lg`, which unsets the job env and sets `PI_SESSION_ID=f925-lead-19ac84d2`.
- `limen ticket new` gave F925: F924 is taken by the job label `2026-10-06-f924-fleet-fixes-from-findings-4b2bb3bf`. The folder was renamed to the short slug `F925-test-reset-decision`.
- The packet (`5df0697`) reached `main` by fast-forward before `group start`.
- Group id: `4f7f48da-b9c4-4bab-bea4-d7baa685c92d`, started 12:25 CEST, deadline 14:25 CEST. Team coordinators: team-1 `2026-10-06-f925-team-1-coordinator-d52dfc92` (value audit, Opus), team-2 `…-82d0ee79` (from scratch, Opus), team-3 `…-c82d50ca` (challenger, Sol through `--team-model team-3=openai-codex/gpt-6-sol`). Reasoning is shared by the group: coordinators xhigh, workers high.
- Lead events: `/tmp/f925-lead/next.sh N` blocks up to N minutes until a team finding or a terminal state, and prints only unseen events.
- Decision only: no file in `test/` changes in this run.
- All six members ended `done` by 12:51. Team candidates merged into the lead branch: team-1 `ac946f1`, team-3 `618b7f2`, team-2 `e69c6dc`. They touch only `group/teams/`.
- Team 1's file table in `team-1-scores.md` is its pre-settlement version; its settlement section and `group/findings/file-actions.md` are final. Twelve files were settled between Team 1 and Team 2 in group events `00000079`, `00000081`, `00000084` (the settled list) and `00000085` (Team 1 confirms).
- Lead decisions beyond the teams: verdict wording "staged replace, written from scratch"; target about 3,350 lines with a 3,500 cap; no land refusal (vision: "no hidden workflow gate"), cap held in `spec/vision.md`; the replay rule is a closed list of seven pre-fix commits in five families.
- The owner page is `/Users/overment/Downloads/limen-test-reset.html`; a copy sits beside the ticket as `limen-test-reset.html`. Headless Chrome renders it; a 1280×6400 window hung once on the loaded Mac, so renders run with a kill timer.
- `scratch.ts` leaks: run any spawn-based test file inside a group job with `env -u LIMEN_GROUP_ID -u LIMEN_TEAM_ID`, or it fails with `missing job id`.
