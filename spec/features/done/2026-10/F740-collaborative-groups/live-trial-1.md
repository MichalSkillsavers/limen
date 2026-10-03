# Live trial 1: two teams build a snake game in Herdr

On 2026-09-30, Adam asked for a real project instead of the disposable fixture. `~/playground/sssnark` (Vite, strict TypeScript, Canvas 2D, Vitest, Biome) was initialized with this candidate and given one feature: a snake race against a trash-talking AI rival. Team 1 started from a pathfinder rival and team 2 from a lookahead rival. The project and its group cabinet are the full evidence; this file records what the trial proved about group mode.

## Run

- Group `32dc7308-15aa-43f1-aadc-49830c68e06c`, 11:36–12:46 UTC budget, 2 teams × 2 worker launches, 45-minute worker budget.
- Package: detached checkout `~/.overment/limen-f740-candidate` at `2683117`; the installed `limen` was left untouched.
- Every member: OMP, `openai-codex/gpt-6.1-sol`. Lead and coordinators used `xhigh`, workers `high`.
- Hosted in Herdr, not detached. The lead ran in workspace `sssnark limen`; coordinators and workers ran in their own hosted tabs, which closed when each finished.
- Each team used one worker launch. Rejected launch attempts consumed no slot.
- 66 events: 32 findings, the rest lifecycle. All four members finished `done` and stop reported no failures. Close left the clean member worktrees for ordinary pruning.

## Proven

- Both approaches produced complete, checked candidates: team 1 `d7107f5`, team 2 `0732e58`.
- Peer findings reached other teams' workers and coordinators in real model turns and were answered with tests or independent enumeration. Examples: tail growth and head-swap fixtures, the pending-turn head-on case, a ten-cell trap, and the seed-1 starvation counterexample. The sssnark synthesis records transcript lines and timestamps for each.
- One team's coordinator disproved its own worker's candidate (the rival could loop forever without eating), repaired it with a regression, and republished. The other team checked the same counterexample against its own rival.
- The lead verified both candidates in clean worktrees, played both in a browser, selected team 1, and landed it on sssnark `main` as `06ca364`. Synthesis and findings are in `48039fe`. The coordinator independently re-ran `npm run check` (13 tests) and `npm run build` on that `main`, and opened a screenshot of the running game.
- First hosted real-agent proof. The design scenario had only planned a detached one.

## Group-mode findings

1. **Fixed in `2683117`:** the OMP lead could not start the group. OMP does not export `PI_SESSION_ID` to tool commands. The lead is now recognized when its registered hook process is an ancestor; the regression failed before the fix and passes after it.
2. **Open, independence:** hosted members' shells put the installed `limen` (without group support) ahead of the running package on PATH, so the first publications failed with `unknown command "group"`. An operator steer told them to use the candidate path. Because of this, the team 1 coordinator received team 2's hypothesis 23 seconds before its own publication succeeded, so independence held for 3 of 4 members, not all. It only happens while the group runs from a package other than the installed one, but member tasks should name the exact `limen` executable of the package that started the group.
3. **Open, noise:** the hosted supervisor's `tool stall observation uncertain` advisory flipped on and off many times. Each flip became a lifecycle event broadcast to every member. Uncertain advisories should not be group events, or should be debounced.
4. **Open, duplicate delivery:** the lead received the same pair of advisory-cleared events twice, under two delivery tokens. The design does not promise exactly once, but the cause of this replay has not been examined.
5. **Existing Limen quirk:** `Ticket:` pointers ending in a period are rejected as missing files, and positional task text plus `--task-file` is rejected. Coordinators asked the lead, which authorized syntax-only retries.
6. **Existing Herdr/OMP gap:** Herdr lost the lead's agent name mid-run while the OMP process stayed alive (compare the planned hosted-engine liveness work, F728).

## Not yet proven

- Full native acceptance: the last full run was 509/511 with two steering-test races, and `2683117` has only focused verification (group module 16/16).
- Detached real-agent transport, a directed team question, worker continuation, and group stop against live members were not exercised by this run.
