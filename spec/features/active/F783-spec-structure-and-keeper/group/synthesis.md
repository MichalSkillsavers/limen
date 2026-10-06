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
