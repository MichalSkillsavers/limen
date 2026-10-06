---
touches:
  - limen.sessions.guidance
  - limen.picture.build
  - limen.commands
  - limen.sessions.wake
opened: 2026-10-06
---

# F783 · Agents write linked tickets, and a spec keeper checks the links before a land

## Outcome

Agents now leave spec work half linked. Two active tickets share the number F778, the plant webhook ticket (F781) was committed with no front matter, map files still cite tickets that moved (F728, F740, F741), and about 45 tickets were backfilled by hand during the live picture work (F780). After this change, an agent sees the ticket contract in a few lines where it writes a ticket, and gets a scaffold and `--strict` messages that name the fix. After the work, the coordinator starts a short spec keeper job. The keeper reads the workers' transcripts and diffs, fixes the ticket, board, `touches` and map links, and `limen land` waits for a clean strict check.

## Scope

- How templates and structures reach a coordinator and a worker today, and the gaps, with evidence from `.limen/jobs`.
- Authoring help: ticket template, a scaffold command if needed, and `picture build --strict` wording that names the fix.
- The keeper: a short, separate job on a cheaper model, with a handoff packet of job ids, session ids, branches and the ticket path.
- Wiring: the coordinator and group lead start the keeper after the work; `limen land` checks before it merges.
- One live proof on a throwaway plant.

## Out of scope

- The language hook text (`hook/communication.ts`).
- The picture viewer layout and the map dataset format.
- Automatic spawn from a finish hook without the coordinator.

## Acceptance

- A worker task shows the ticket contract in at most ten lines, and the source of each line is named.
- A new ticket made with the scaffold gets the next free F number and passes `picture build --strict` with no edit.
- Each strict ticket diagnostic names the file, the line and the fix.
- `limen land` refuses a branch whose tickets fail the strict check, and prints the command that starts the keeper.
- On a throwaway plant, a keeper job repairs a broken ticket front matter, a missing board line and a stale map source, and the land then succeeds.
- A keeper never commits on the branch of a job that is still running.

## Notes

- Lead defaults for the keeper interfaces are in `group/brief.md`. A team may change one with a `limen group publish`.
