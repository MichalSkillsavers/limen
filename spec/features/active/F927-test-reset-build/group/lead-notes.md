# Lead notes

Map for whoever continues the F927 lead role.

- Lead job: `2026-10-06-test-reset-build-lead-4827b87e`, started 13:04 CEST with a 6-hour limit (ends about 19:04 CEST at the latest; plan for 17:00). Lead branch: `limen/2026-10-06-test-reset-build-lead-4827b87e`.
- Stage 0 on `main` (`e2fe63d`, pushed): the vision cap line, the cap check in `test/structure.test.ts` and `limen land` (`landTestCap` in `src/commands/land.ts`), the fixture `test/plant.ts` + `test/fake-engine.mjs`, the old-suite marker on 58 old files, the replace-not-add rule in `templates/agents.md` and `templates/worker.md`, this group packet.
- Old-suite marker: `// F925 old suite, frozen at N lines.` on line 1. Such a file does not count toward the cap and may only shrink. `hosted-spawn` was re-frozen at 1,347 and `worker-extensions` (new in PR 7) marked old when `origin/main` moved during stage 0. A marker per file avoids merge conflicts on a shared list.
- `limen land` reads the cap from the target's `spec/vision.md` and refuses only a branch that adds test lines and ends over the cap. During the reset `test/` is over the cap, so a team land must delete more test lines than it adds.
- The lead is a Limen job, so `group start` refuses under `LIMEN_JOB=1` (same workaround as F925). `.limen/group-leads/f927-lead-4827b87e` holds the lead wrapper pid (63856); `/tmp/f927-lead/heartbeat.sh` refreshes it every 10 seconds. Every lead group command runs through `/tmp/f927-lead/lg`, which unsets the job env and sets `PI_SESSION_ID=f927-lead-4827b87e`.
- Group id: `ec30a9bd-fff3-49a9-934a-148f1e7f650b`, started 13:37 CEST, 5 h. Coordinators: team-1 `…-d477bf38`, team-2 `…-a0f12c7b`, team-3 `…-f814daf2`, team-4 `…-d8c1533c`, team-5 `…-6a91ae96`. `/tmp/f927-lead/next.sh N` blocks up to N minutes for a team event and prints unseen events.
- Line budgets under the cap: fixture and structure 360; teams 640 / 530 / 530 / 520 / 740; total about 3,320.
- Land procedure per candidate: scratch worktree from `main`, merge the candidate, `npx tsc --noEmit`, `npx biome check .`, `node --test test/structure.test.ts test/s*.test.ts test/u*.test.ts`, `limen ticket check <branch>`, strict picture build; then `git merge --no-ff <branch>` in the main checkout and `git push origin main`.
- The fixture smoke script is `/tmp/f927-lead/smoke.ts` (`W=<checkout> node --no-warnings /tmp/f927-lead/smoke.ts`): commit, steer, fail, provider error, and two wakes to a fake coordinator running the real wake hook; about 10 to 20 seconds at load 130.

## Second run (after the 13:49 Anthropic 429)

- Every run and job of the first group failed at 13:49 on an Anthropic 429. Adam: use only `--engine omp --provider pi-claude --model pi-claude/claude-opus-5-5` (xhigh coordinators, high workers), never `--provider anthropic`.
- `limen continue` refuses a group coordinator (`src/commands/continue.ts:63`) and a worker whose model differs from the run's (line 68), so the old run `ec30a9bd` was stopped (not closed; it protects the saved worktrees) and a new run of the same packet started with `--new-run`: group `034fb9e2-5077-40a4-9df5-170a580df030`, 15:48 CEST, deadline 18:33. Coordinators: team-1 `…-c42c89d1`, team-2 `…-34427139`, team-3 `…-9d9d7840`, team-4 `…-bf0bccd4`, team-5 `…-a11220e6`.
- The lead now runs as continuation job `2026-10-06-test-reset-build-lead-continue-46d68907` (wrapper pid 18851). The heartbeat refreshes `.limen/group-leads/f927-lead-4827b87e` with that pid. A later continuation must restart `/tmp/f927-lead/heartbeat.sh` with its own wrapper pid.
- Saved first-run work per team is listed in each team note's "Resume" section. Two saved commits carry deliberate product breaks (`herdr.ts` on team 2's S2 branch, `continue.ts` on team 4's S7 branch). `/tmp/f927-lead/check.sh` refuses any candidate that changes `src/`, `hook/` or `bin/`; `/tmp/f927-lead/land.sh <commit> <message>` lands and pushes.
- Close both runs at the end: `ec30a9bd…` and `034fb9e2…`.

## End state (17:10 CEST, `main` at `e177377`)

- `test/` holds 2,417 lines in 22 files: the fixture (`plant.ts`, `fake-engine.mjs`), S1 to S10, U1 to U7, U9, U10 and the structure test (U8). No old file remains. Before the reset: 17,247 lines in 58 files (about 17,330 in 59 after PRs 7 and 8 added tests during the run).
- Real run time on a fresh checkout: `npm test` (four files at a time) 63/63 in 62 s at load 42 to 72 on `6442923`, and 63/63 in 64 s on `6442923` plus team 4's follow-ups (now `e177377`, with `--test-force-exit`); serial 63/63 in 151 s at load 43 to 67. The old suite took 1,502 s in the F783 run.
- Incident replays, each red on the old bug and green on `main`: F043 seat registry (S9, three fixes), F042 wakes (S3 batched half, U4 live-claim half), `b62b837` group launch lock (S8), `43c01cf` status index lock (U10, a narrow unit: S1 cannot reach it), `88fd5ac` hosted lost agent row (S2). Notes: `group/team-1-s8-replay.md`, `group/team-1-s9-replay.md`, `group/team-2-s1-replay.md`, and the merge commit messages.
- Found during the run: a stop finalize race (filed as planned F928; S3 leaves the stop line count out until it lands); an FSEvents start-up gap in the fixture's `until()` (fixed with a one-second re-check); the fake engine needed Pi's `context` event and custom-role messages for the group hook (fixed by team 1); `limen group status` publishes lifecycle only when it gets the cabinet (S8 now reads until the event appears).
- The SSH agent lost its GitHub key at about 16:40. From S8 on, the lead fetched and pushed over HTTPS with the GitHub CLI as credential helper (`/tmp/f927-lead/land.sh`); the `origin` remote is unchanged.
