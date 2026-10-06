# Brief

## Shared outcome

Agents write tickets that link to the board and the map on the first try. After the work, a short spec keeper job repairs what is still unlinked, and `limen land` refuses a branch whose tickets fail the strict check. One integrated result lands on `main`. The lead integrates and lands. Teams never land, push, edit the board on `main`, or edit `.limen/picture/` on the plant.

Owner request (Adam, 2026-10-06): find how feature templates and structures reach agents, how agents get help to create them, and how the links are checked before the work stops. To keep workers fast, the coordinator sends a separate keeper job after the work and hands it the workers' job ids and session ids.

## Live inputs (read-only)

- Plant: `/Users/overment/.overment/limen`. Board `spec/build.md`. Tickets `spec/features/<lane>/…/ticket.md`; lanes `planned`, `active`, `done/YYYY-MM`, `dropped/YYYY-MM`.
- Map: `/Users/overment/.overment/limen/.limen/picture/` (gitignored; nodes, edges, features, journeys). Never edit it. Copy it to `/tmp` when you need a writable map.
- Job records and transcripts: `/Users/overment/.overment/limen/.limen/jobs/<id>/` (`task.md`, `log`, `session/`, `branch`, `base`, `state`, `worktree`, `role`).
- Strict check today: `node bin/limen picture build --dir /Users/overment/.overment/limen/.limen/picture --out /tmp/f783-team-N/map.html --strict`. On this plant it prints six warnings and no error: four `source.missing` (F728, F740, F741), one `ticket.duplicate-id` (F778), one `ticket.no-touches` (F782).
- Known failures to explain: duplicate F778 ids; the F781 ticket committed with no front matter (`c0c0e29` added it later); stale map sources for moved tickets F728, F740 and F741; about 45 tickets backfilled by hand in F780 (`spec/features/active/F780-live-picture-viewer/group/`).

## Interface decisions (lead defaults)

These defaults let all four teams start at once. The owning team may change one. It must publish the change with `limen group publish` before it commits code that depends on it.

**1. Ticket check API (owner: Team 2; consumer: Team 3).** Keep `readTickets(root)` and `checkTickets(tickets, placeIds)` in `src/picture/tickets.ts`. Every ticket diagnostic message has this shape: `<problem>; fix: <one action>`. The action names a command or an exact edit, for example `fix: add "touches:" with a place id from limen picture build --json`. Codes stay stable: `ticket.unknown-touch`, `ticket.bad-field`, `ticket.no-touches`, `ticket.duplicate-id`, plus new codes if needed (for example `ticket.no-front-matter`).

**2. Scaffold (owner: Team 2).** `limen ticket new "what becomes true" [--lane planned|active] [--touches id,id]` takes the next free F number across every lane, writes `spec/features/<lane>/FNNN-<slug>/ticket.md` from the template with `opened` set to today, and prints the path. The number check covers every lane, including `done/*` and `dropped/*`.

**3. Keeper command (owner: Team 3).** `limen keeper <ticket-path> --job ID [--job ID …] [--group GROUP-ID] --engine E --provider P --model M --thinking T [--timeout D]`. It refuses while a listed job is still running. It creates a keeper branch at the candidate tip (the job branch, or the lead's integration branch for a group) and spawns a `--role keeper` job on that branch, so the keeper never commits on a worker's branch. The lead then lands the keeper job, which carries the worker commits plus the spec fixes. Default timeout: 20 minutes.

**4. Handoff packet (owner: Team 3).** The keeper command writes the packet into the keeper's task. One block per job, plain Markdown:

```
Ticket: spec/features/active/FNNN-slug/ticket.md
Board: spec/build.md
Map: /abs/plant/.limen/picture
Group: <group id or none>
Job: <id>
  Label: <label>
  State: <done|failed|stopped|timed-out>
  Branch: <branch> (base <sha>, tip <sha>)
  Worktree: <path>
  Session: <path to the engine session file or dir>
  Task: <path to task.md>
```

**5. Keeper role (owner: Team 3).** `templates/keeper.md`: read the packet, the diff and the transcripts; fix only `spec/features/**`, `spec/build.md`, and map files that cite this ticket; run the strict check until it has no error; commit; end with a short list of fixes and the warnings left.

**6. Land gate (owner: Team 3).** `limen land` runs the ticket check for the tickets the branch adds or changes, against the plant map place ids. An error refuses the land and prints the `limen keeper` command as the fix. A warning prints and does not block. A plant with no map skips the place id check and says so.

## File ownership

Each team commits only its own files. To ask for a change in a file you do not own, publish the exact patch or repro to the owner with `limen group publish --team team-N`. `src/main.ts` is shared: Team 2 and Team 3 each add one command line there; the lead resolves that merge.

| Team | Owns |
| --- | --- |
| 1 | read-only survey: `group/teams/team-1-map.md`, `group/teams/team-1-failures.md` |
| 2 | both ticket templates, `templates/picture/CONTRACT.md` ticket section, `src/picture/tickets.ts`, new `src/commands/ticket.ts`, `docs/picture.md`, the worker-facing contract lines in `templates/worker.md` and `templates/group-member.md`, their tests |
| 3 | new `src/commands/keeper.ts`, new `templates/keeper.md`, `src/commands/land.ts`, the keeper step in `templates/agents.md`, the completion wake text (`src/job/wake-text.ts` and the instruction line in `src/integrations/coordinator-wake.ts`), `docs/jobs.md` and `docs/groups.md` keeper sections, their tests |
| 4 | proof scripts and results in `group/qa/`, wording review in `group/teams/team-4-review.md`; fixes go to owners as patches |

## Checks

Before you finish: `npx tsc --noEmit`, `npx biome check <your files>`, and `node --test --test-concurrency=1 test/<touched>.test.ts`. The Mac can be loaded; a timing test that fails with "did not reach done" may also fail on `main`. Check `main` before you call it yours.
