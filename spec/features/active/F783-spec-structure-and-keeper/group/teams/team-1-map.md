# Team 1 · How spec structures reach each reader

Answer: the coordinator pane gets the ticket rules as long prose every turn, but no reader is told the template path, the next-free-number method, the place ids for `touches`, or the strict command. A worker does get the ticket rules (the speech register's Specs section rides every job's system prompt), so the original hypothesis is half wrong: the gap is not prose, it is the four facts a writer needs at the moment of writing. The strict check, even when run, exits 0 on every known miss, because missing front matter, duplicate numbers and stale map sources are warnings. Nothing at finish or at land reads tickets.

Draft 1, 2026-10-06. Package paths are relative to this repository; plant paths are under `/Users/overment/.overment/limen`.

## Readers and their channels

| Reader | System prompt (every call) | Per-turn cue | Preamble | Task |
| --- | --- | --- | --- | --- |
| Coordinator pane | `hook/communication.ts:78-99` with job=false: shop manual `templates/agents.md` (only when the plant has no `AGENTS.md`, `:160-164`; this plant has none), full register `templates/communication.md` above `## Cue:`, vision, styleguide, board NOW/NEXT digest (`:187-195`) | Shared + Human cue, drift and board-size advisories (`:128-133`) | none (not a job; loaded by `.omp/extensions/limen.ts` = `templates/limen-extension.ts`, hooks wake, communication, steering, group-peer) | the human |
| Worker job | job=true: full register and styleguide only (`:81-97` skip shop manual, vision text and board digest) | `Ticket: <first pointer in task.md>`, `Vision (read-only)`, `Board (read-only) … do not edit` (`:116-126`) | `templates/worker.md` via `resolvePreamble` (`src/commands/spawn.ts:55-59`) and `--append-system-prompt` (`src/runtime/engine.ts:150`) | coordinator instruction |
| Group team coordinator | same as worker job | same as worker job | `templates/coordinator.md` | `templates/group-member.md` + root/group/team/feature + team note inline + `Pursue the feature with your team. Ticket: …` (`src/commands/spawn.ts:190-194`, `src/commands/group.ts:161-168`). The brief path is not given in committed mode. |
| Group worker | same as worker job | same as worker job | `templates/worker.md` | `group-member.md` wrap + team note + coordinator's task (`spawn.ts:190-194`) |
| Group lead run as a job | same as worker job (no shop manual) | same as worker job | `templates/worker.md` ("Never edit the board, ticket status, or outcome files", `:14`) | owner's lead task. F780 lead `2026-10-05-f780-live-picture-lead-4a931240` and F783 lead `2026-10-06-f783-spec-structure-spec-keeper-81acb6b0` both have `role=worker`. |
| Picture job | same as worker job | same as worker job | `templates/picture.md` | tick handoff names the CONTRACT absolute path (`src/project/picture-tick.ts:94`) |
| Reviewer | same as worker job | same; usually no `Ticket:` line, because the review task says "against <path>" without `Ticket:` and `ticketPointers` needs the prefix (`src/project/planning.ts:48-51`) | `templates/reviewer.md` | `Review the FNNN candidate against …` |

Jobs start with `--no-extensions` and only the named hooks (`src/runtime/engine.ts:146-155`; `src/runtime/supervisor.ts:207`, `src/runtime/wrapper.ts:93`), so no job loads the wake hook.

## Structure × reader

Legend: **full** = text in the system prompt every call. **ref** = a path or name in injected text; the agent must open it. **ptr** = one line in the per-turn cue. **cue** = appended to the tool result after a write or edit under `spec/` (`hook/communication.ts:63-71, 219-228`). **—** = never reaches.

| Structure | Coordinator pane | Worker job | Team coordinator | Group worker | Lead as job | Picture job | Reviewer |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ticket shape rules (register Specs, `templates/communication.md:19-42`) | full | full | full | full | full | full | full |
| Specs cue after a spec write (`communication.md:152-154`) | cue; no front matter, template or strict | cue | cue | cue | cue | cue | cue |
| Ticket template, package `templates/spec/features/_template/ticket.md`; plant copy `spec/features/_template/ticket.md` from `limen init` (`src/commands/init.ts:52`; identical today) | ref, folder only: "`_template/` — ticket and terminal-outcome templates" (`agents.md:55`); no "copy it" step | — | — | — | — | — | — |
| Next free F number | full: "allocate the next unused `FNNN`" (`agents.md:56`); no method or command | — | — | — | task only when the owner writes it: F783 lead task says "check `ls spec/features/active spec/features/*`", which misses `done/YYYY-MM/*` and `dropped/YYYY-MM/*` | — | — |
| Front matter fields (`templates/picture/CONTRACT.md:53-67`) | ref twice: register `:31` names CONTRACT; `agents.md:152` names it for the dataset only | ref (register `:31`) | ref | ref | ref | ref via handoff, read first (`picture.md:3`) | ref |
| Place ids for `touches` (`<plant>/.limen/picture/nodes/*.md`) | ref (`agents.md:152` names the dataset dir) | — ; the map is gitignored and absent in a worktree | — | — | — | full ownership | — |
| Strict check `limen picture build --strict` | — (not in `agents.md`; only `docs/commands.md:86`, `docs/picture.md:27`, `CONTRACT.md:67`) | — | — | — | — | build without `--strict`, "fix every error diagnostic" (`picture.md:17`) | — |
| Board `spec/build.md` | full rules (`agents.md:49, 150`) + NOW/NEXT digest | ptr, "do not edit" (`communication.ts:123-125`, `worker.md:14`) | ptr | ptr | ptr + worker "never edit the board" | ptr; `picture.md:18` "do not edit the board, tickets" | ptr; drift "is a finding to report" (`reviewer.md:16`) |
| Lane moves (`planned` → `active` → `done/YYYY-MM`) | full (`agents.md:51-57, 144, 150`); "Nothing validates moves" (`:57`) | — | — | — | — | — | — |
| Map sources that cite a ticket path | ref only through CONTRACT `sources` rules | — | — | — | — | full (`picture.md:15`), but a tick never starts for `spec/` changes (`src/project/picture-tick.ts:142`; CONTRACT `:102-103`) | — |
| `outcome.md` and `_template/outcome.md` | full (`agents.md:150`, register `:42`) | "never edit … outcome files" (`worker.md:14`) | — | — | worker rule says never edit | — | out of scope (`reviewer.md:15`) |
| Group packet (`ticket.md`, `group/brief.md`, `group/teams/team-N.md`) | full (`agents.md:27`) + ref `docs/groups.md:15` | — | team note inline; brief by convention only (`coordinator.md:7`) | team note inline | owner task only | — | — |
| Group results (`group/findings/`, `group/synthesis.md`) | ref `docs/groups.md:83`; group-peer lead steps (`hook/group-peer.ts:50-69`) | — | "the lead files" (`group-member.md:7`) | same | lead steps never fire: gated on `LIMEN_JOB !== "1"` (`group-peer.ts:51`) | — | — |

## Never reaches

- **The template path, to anyone but the coordinator, and to the coordinator only as a folder name.** No preamble, cue or task names `spec/features/_template/ticket.md`.
- **A method for the next free number.** `agents.md:56` states the rule; no command exists; `readTickets` sees duplicates only after the fact (`src/picture/tickets.ts:46-58`).
- **The strict command, to any job.** A worker that runs `limen picture build --strict` in its worktree gets `No map yet in <worktree>/.limen/picture` and exit 1 (run 2026-10-06 in this worktree). The working form is `limen picture build --dir <plant>/.limen/picture --strict`, which reads the worktree's tickets (`src/commands/picture.ts:45-53`) against the plant map. No text gives that form. Every job already has the plant root in `LIMEN_CONTEXT_ROOT` (`src/commands/spawn.ts:255`), so `limen picture build --dir "$LIMEN_CONTEXT_ROOT/.limen/picture" --strict` works from any worktree; run in this worktree, it printed the same six warnings and exit 0.
- **Place ids, to any job but the picture job.** `touches` must name ids from `nodes/` (`CONTRACT.md:59`); the dataset is gitignored and lives only under the plant root.
- **Map upkeep after a lane move, to anyone.** Moving a ticket folder changes only `spec/`, which the tick ignores (`picture-tick.ts:142`); the picture watch is off on this plant (`limen picture watch` prints `picture watch off`), and the last picture job is `2026-10-03-architecture-picture-through-cf6-bad3beb1`.
- **The shop manual, to a lead run as a job.** It writes tickets, the board and the packet with the worker preamble that forbids board edits.

## What checks links today

| When | What runs | Reads tickets? |
| --- | --- | --- |
| Spawn | committed mode: each `Ticket: spec/...` pointer must exist at the base commit (`src/commands/spawn.ts:168-171`) | existence only |
| Group start | ticket, brief and team notes committed at `HEAD` (`src/commands/group.ts:108-118`) | existence only |
| Worker finish | wrapper writes state, commits, result; completion wake says "land it, or name the check that still blocks landing" (`src/job/wake-text.ts:43-51`) | no |
| `limen land` | done state, branch and base recorded, current branch, clean target, commits exist, confirm, `git merge --no-edit` (`src/commands/land.ts:7-31`) | no |
| Ordinary Git merge by a coordinator or lead | nothing; `agents.md:148` allows it | no |
| `limen picture build --strict` (by hand only) | exit 1 on errors: `ticket.unknown-touch`, `ticket.bad-field` (`tickets.ts:71, 95-180`). Warnings only, exit 0: `ticket.no-touches`, `ticket.duplicate-id`, `source.missing` (`tickets.ts:49-56, 121, 180`; `picture-model.ts:208`) | yes |
| Board ↔ ticket | `readBoard` joins a ticket to a board line or null, with no diagnostic either way (`src/picture/board.ts:11-30`; `picture-model.ts:292`). The board line regex takes only three-digit numbers (`board.ts:11`). | no check |

Today's plant: `node bin/limen picture build --dir /Users/overment/.overment/limen/.limen/picture --out /tmp/f783-team-1/map-coord.html --strict` printed four `source.missing` (F741 journey, F728 twice, F740), one `ticket.duplicate-id` (F778), one `ticket.no-touches` (F782), and exit 0.

A land gate only in `limen land` would miss most merges: since 2026-09-01, 49 of 83 first-parent merges on `main` carry a hand-written message (`git log --first-parent --merges --since=2026-09-01 main`), and `limen land` always uses `--no-edit` (`src/project/git.ts:162-165`). [INFERENCE] those 49 were ordinary Git merges by a coordinator or lead, for example `b27db47` (F780) and `cbc5391` (F781).

## What this means for Teams 2 and 3

- The ten-line worker contract should carry the four missing facts, not more shape prose: template path (or `limen ticket new`), the numbering method, where place ids come from, and the exact strict command with `--dir <plant>/.limen/picture`.
- The strict check must turn today's misses into errors for the tickets a branch adds or changes, or the land gate passes every known failure.
- The gate needs a home that ordinary `git merge` also passes through, or the keeper step must be in the coordinator and lead text (`agents.md` steps 5–7, the completion wake), not only in `limen land`.
- A lead run as a job needs the ticket contract through its task or role; it gets neither the shop manual nor lead hook steps.
