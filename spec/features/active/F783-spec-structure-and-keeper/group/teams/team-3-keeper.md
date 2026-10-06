# Team 3 · Spec keeper: result

Candidate: branch `limen/2026-10-06-f783-team-3-coordinator-d004832d`. Worker job `2026-10-06-f783-keeper-command-and-land-tic-a19dc892` wrote the command, the gate and the wake line (`cfbe3e7`, `f2dcf35`). The coordinator wrote the keeper role, the docs and the fixes from the live proof.

## What a coordinator gets

- `limen keeper <ticket> --job ID [--job ID …] [--candidate BRANCH] [--group ID] --engine E --provider P --model M --thinking T [--timeout D]` (`src/commands/keeper.ts`). The coordinator or the lead starts it. No hook starts it. It refuses under `LIMEN_GROUP_ID` and while a listed job is running or its process is alive. It follows a ticket that the job moved to another lane. It creates `limen/keeper-<fnnn>-<tip7>` at the candidate tip and spawns `--role keeper --detached --timeout 20m`. The keeper's task is the handoff packet.
- `landTicketCheck(repository, root, branch, target, job)` in `src/commands/land.ts`. `limen land` runs it before it merges. It checks the tickets that the branch adds, moves or changes (`target...branch`), as they are at the branch tip. A refusal comes from an error diagnostic or from an added ticket with a number that is already used. Every error line starts with `error`, and the refusal ends with the `limen keeper` fix line. Warnings never block. They cover the map place ids, a missing or wrong board line for an active or done ticket, and a map source that cites a ticket path missing at the tip.
- `templates/keeper.md`: the keeper edits only `spec/features/**`, `spec/build.md` and map `.md` files that cite a changed ticket. It checks the board line and the map sources itself, because the strict check does not report them as errors. It never renumbers a ticket. It ends with `limen ticket check`.
- The coordinator path: one paragraph in `templates/agents.md` plus one map clause in step 7. The done wake has one sentence: a worker's wake points to the keeper, and a keeper's own wake says to land it. The lead step is in `docs/groups.md`.

## Checks run

- `npx tsc --noEmit`: clean. `npx biome check` on the 7 changed TS files: clean.
- Test files keeper, land, coordinator-wake, wake-hook, structure and inherit: 54 of 55 passed. The wake-hook test "same-feature jobs retain useful names" timed out once. It passed on a rerun at the same commit, in a clean worktree, and at `be71876`.
- CLI smoke on a scratch plant with a fake engine. `land` refused the branch: it printed a map warning, a board warning, `error … unknown place id` and the fix line. `keeper` followed the ticket from planned to active, and its packet had no fix line. The fake keeper fixed all three. Landing the keeper job fast-forwarded main with both commits and printed no warning.
- Team 4 ran a live proof with a real Sol keeper at `ec149cc`, before the fixes (event `00000058`). The keeper fixed touches, the board line and the map source, and the land then succeeded.

## Peer findings

- Used: Team 4's map.html grep, place ids, keeper-of-keeper loop, wake without route flags, a moved ticket, the fix line in the packet, the read-only board cue and the group refusal text. All were reproduced or read in code before the fix. Also used: Team 1's finding that the strict check is silent on a board line or a map source, and the lead's decisions on duplicate numbers, board warnings and `ticket check`.
- Not used: a branch and job-label number scan. That belongs to Team 2 and the lead.

## Uncertainty

- `limen ticket check` does not exist on this branch. The lead adds it at integration as a thin call to `landTicketCheck`. Until then, the `agents.md` and `keeper.md` lines that name it have nothing to run.
- After the lead merges `templates/agents.md`, `test/inherit.test.ts` needs `LIMEN_WRITE_HISTORY=1` again.
- Map edits by the keeper apply to the plant map at once and do not land. A picture tick that runs at the same time could race them.
