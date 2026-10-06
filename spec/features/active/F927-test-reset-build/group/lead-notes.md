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
