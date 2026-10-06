# Synthesis

## Answer

Agents left tickets unlinked for two reasons. The front matter contract did not exist on `main` until the live picture merge (F780, `b27db47`), and no check ran where spec changes merge. The fix has three parts: give every worker the four facts it needs at the moment it writes a ticket, make the strict messages name the fix, and run a short spec keeper job after the work, with `limen land` refusing a branch whose tickets fail the check.

## 1. Presentation (Team 1, `teams/team-1-map.md`)

- Every agent already gets the ticket shape rules: the speech register Specs section rides every system prompt.
- No job got four facts: the template path, a method for the next free number, where place ids for `touches` come from, and the strict command. A worker in a worktree that ran `limen picture build --strict` got "no map yet", because the map lives only in the plant.
- A lead that runs as a job gets the worker preamble, which forbids board edits, and no shop manual.

## 2. Support and failures (Team 1, `teams/team-1-failures.md`; Team 2)

- 14 real misses, each with a job id or commit. Every writer whose base held the contract wrote front matter. The writers of F781 and F776 followed the old template correctly. Only one job copied a neighbour ticket (the first F778).
- The duplicate F778 came from a number that lived only in a job task and a branch, not in a lane folder. The F768 and F769 tickets live only on branches.
- Most spec changes bypass any merge gate: 53 of 64 direct commits on `main` since 3 October touched `spec/`, and 26 of 30 merges did not use `limen land`.

## 3. Link guarantee today

Nothing at worker finish or at `limen land` read a ticket. `picture build --strict` exited 0 on every known miss, because a missing front matter, a duplicate number and a stale map source were warnings. Picture tick ignores `spec/`, so a lane move never refreshes the map.

## 4. Keeper decisions

| Question | Decision |
| --- | --- |
| Who triggers | The coordinator, or the group lead. No hook spends a model run by itself. `limen land` only checks. |
| Context | A packet in the keeper task: ticket, board, map folder, candidate branch and tip, changed tickets, the land check output, and per job its id, label, state, branch, base, tip, worktree, newest session file and task file. |
| Time budget | 20 minutes by default, on the cheaper model (Sol). |
| Blocks a land | An error on a ticket the branch adds or changes (unknown place id, bad field, no front matter on an active ticket), or an added ticket whose number another folder uses. `--yes` does not bypass it. |
| Only warns | No `touches`, no board line, a board state that does not match the lane, a map source that cites a moved ticket path. |
| No fights | The keeper refuses while a listed job runs, and it commits only on its own branch made at the candidate tip. Landing the keeper lands the work and the fixes together. |
| Single job and group | Same command. A group passes every member job and the lead's integration branch with `--candidate`. |

## Interface changes during the run

- Team 3 added `--candidate BRANCH` and exported `landTicketCheck(repository, root, branch, target, job)`.
- Team 2 declined `limen ticket check`, a worktree map fallback and a branch number scan as outside its ticket scope. The lead took the first and the last into integration.
- The lead added `--group GROUP-ID` expansion to `limen keeper`, so a lead does not list each member job.

## What landed

- `limen ticket new` writes a ticket from the template with a number that no lane, local `limen/*` branch or job label uses.
- `limen ticket check [BRANCH]` runs the land gate on demand, before a hand merge or as the keeper's last step.
- Every ticket diagnostic ends with `fix:` and one action. An active ticket with no front matter is an error (`ticket.no-front-matter`).
- Worker and team coordinator instructions carry a four-line ticket contract: new ticket, front matter, place ids, check.
- `limen keeper` and `templates/keeper.md`: the keeper job, its packet, and its own branch.
- `limen land` refuses a branch whose changed tickets fail the check, and prints the keeper command. `--yes` does not skip it.
- The completion wake and the coordinator manual name the keeper step; a keeper's own wake says to land it.

## Proof (Team 4, `qa/results.md`)

Three live runs on a throwaway plant with real Sol jobs. Run 3 used the integrated commit `e423ef1` exactly. The keeper refused while the worker ran. After a scripted break (unknown place id, missing board line, stale map source), `limen ticket check` and `limen land --yes` both refused with exit 1. The keeper followed the moved ticket, fixed all three links in one commit in 38 seconds, and its own `limen ticket check` passed. `limen land` of the keeper job then succeeded, and the strict build had zero diagnostics. Limit: the breaks were scripted after the worker finished, so the proof tests the keeper and the gate, not whether a worker leaves links broken.

Live run on this plant, after the land (`ce96460`): `limen keeper spec/features/active/F783-spec-structure-and-keeper/ticket.md --group f79c4724-3bbd-4c02-b10d-23acc60e9cd0 --candidate main` on Sol at `high` started `2026-10-06-f783-spec-keeper-93143e7a`. Its packet listed all seven member jobs with their session files. It finished in about 80 seconds with one commit (`43d91c2`, the missing F783 board line under NOW), strict build exit 0, and its own `limen ticket check` passed. `limen land … --yes` then fast-forwarded `main`. Finding: the packet said "Changed tickets: none", because a group's feature ticket reaches `main` before the work starts. The keeper checked it anyway; `templates/keeper.md` now says to check the packet's ticket as well.

The lead also fixed the four stale map sources for F728, F740 and F741 in the plant map (outside Git), as the new lane-move step says. The strict build on this plant now shows two warnings and no error: the F778 duplicate and F782 without `touches`.

## Open

- The two F778 tickets still share a number. Renumbering one is a coordinator decision; the build keeps a warning.
- F782 has no `touches` because it changes no code. The contract allows this; a marker for "no code place" is a product decision.
- A direct commit on `main` is checked only when the coordinator runs the strict build. A Git hook would gate it; that is a separate decision.
- Picture tick still ignores `spec/` paths, so a lane move does not refresh the map by itself. The coordinator step and the keeper now cover it by hand.
- A lead that runs as a job still gets the worker preamble, which forbids board edits.
