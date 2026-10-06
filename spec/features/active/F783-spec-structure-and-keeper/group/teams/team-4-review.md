# Team 4 · Cold review of the new texts

Verdict: the texts work for a cold reader. Two live keepers followed `templates/keeper.md` with no help and fixed all three broken links (`group/qa/results.md`). Two findings still change what an agent does; fix them before landing. The other open findings are wording only. Team 3 fixed four behavior findings during the proof; they are listed at the end.

Scope: every new or changed line that an agent or Adam reads. That is the templates, the help and usage lines, the diagnostics, the land refusal, the keeper packet, the done wake and the docs. Line numbers are on the integrated proof build `dce7e21` (lead `2aaf43b` plus team 3 `2172c65`). The owner of each file is in brackets.

## Findings that change behavior

1. **The keeper's last check is a command that does not exist.** `templates/keeper.md:20` and `templates/agents.md:152` (team 3) tell the agent to run `limen ticket check`. The integrated build has only `limen ticket new`. Both live keepers ran it and got the usage text, exit 1 (run 2 keeper result in `group/qa/results.md`). The lead plans to add the command. When it lands, check one more risk: the keeper runs it in its worktree with no branch. If the default compares `HEAD` with `HEAD`, it checks nothing and passes. Replacement if the command does not land: "Then run `limen picture build --dir <Map> --out /tmp/keeper-FNNN/map.html --strict` once more as the last check." If it lands: "Then run `limen ticket check <keeper branch>` from the plant root."
2. **The place-id advice fails in a worktree.** `templates/worker.md:17` and `templates/coordinator.md:18` (lead), and `src/picture/tickets.ts:76` (team 2). All three say "limen picture build --json <file>". In a job worktree that command prints "No map yet in <worktree>/.limen/picture" and exits 1, because the map is gitignored. Replacements: worker and coordinator line: "Place ids: the `id:` lines in `$LIMEN_CONTEXT_ROOT/.limen/picture/nodes/*.md`; do not guess (source: …)". Diagnostic: `unknown place id "X"; fix: replace it with the id: of a file in the map's nodes/ folder`.

## Wording findings

| File:line | Problem | Suggested text |
| --- | --- | --- |
| `templates/worker.md:14`, `templates/coordinator.md:15` | Two ways to start a ticket in two lines: "start from the template", then `limen ticket new`. A reader does not know which one to use. | "New ticket: run `limen ticket new "what becomes true"`; it copies `spec/features/_template/ticket.md` and picks the number (source: that template)." Then drop "scans every lane" from the next line or merge the two lines. |
| `docs/picture.md:31` (team 2) | "the main plant" is a new term. | "In a job worktree, the map is not in the branch. It stays in the plant root." |
| `src/picture/tickets.ts:52` (team 2) | Three clauses and two semicolons before `fix:`. | `F778 is also used by <path>, so this ticket is left out; fix: give this folder and its heading an unused F number (limen ticket new picks one)`. |
| `src/commands/land.ts:76` (team 3) | The map warning gives an absolute path and no line. Every ticket diagnostic gives `file:line`. | Add the `sources:` line: `warn <map>/features/limen.feature.f002.md:10: …`. The record has `lines.sources`. |
| `src/commands/keeper.ts:34` (team 3) | Three clauses joined by semicolons. | "job X is still running. A keeper never commits beside a live job. Wait for it, or stop it." |
| `templates/keeper.md:3` (team 3) | One sentence lists seven packet parts. | "Your task is a packet from `limen keeper`. It names the ticket, the board, the map and the candidate branch. It lists the changed tickets and the current land check. It has one block per job: branch, worktree, session transcript and task." |
| `templates/keeper.md:14` (team 3) | The lane-to-section rule is one long sentence. | A short list: "active: `NOW`, 🟠 ACTIVE · planned: `NEXT` or `PARKED`, 🔴 PLANNED · done: `PROVEN`, 🟢 PROVEN · dropped: `DROPPED`, ⚪ DROPPED". |
| `templates/agents.md:152` (team 3) | "it carries both" — both of what. One sentence holds three actions. | "It works on its own branch at the job's tip. It fixes the ticket front matter and the board line there. It fixes map sources in the map itself. Then land the keeper job, not the worker job: it carries the work and the fixes." |
| `templates/agents.md:150` (team 3) | "strands" is an idiom. | "A lane move leaves map sources that cite the old path." |
| `docs/groups.md:85` (team 3) | "After merging the team branches it keeps" reads as "it keeps merging". | "After the lead merges the chosen team branches onto one integration branch, it starts one keeper for the feature ticket." |
| `templates/picture/CONTRACT.md:55` (team 2) | "The board owns status; the lane holds it." says two things own status. | "The lane folder is the status. The board reports it." |
| `templates/picture/CONTRACT.md:67` (team 2) | The field table became one long sentence with four rules. A table suits a field reference. | Restore the five-row field table under the example, or split into one sentence per field. |
| `templates/picture/CONTRACT.md:69` (team 2) | "Run `limen picture build --strict`" fails in a job worktree. | "Run `limen picture build --strict` at the plant root, or add `--dir <plant>/.limen/picture` in a worktree." |
| `src/commands/ticket.ts:71` (team 2) | The error does not say where the errors are or how to see them. | "the map at <dir> has errors; run limen picture build --dir <dir> --strict to see them". |
| `src/commands/ticket.ts:72` (team 2) | The scaffold accepts any map node id. The strict check and the land gate accept only module and plant ids. A node with an unknown kind passes the scaffold and fails the gate. | Accept only `kind: module` and `kind: plant` ids, as `picture-model.ts:251` does. |
| `src/picture/tickets.ts:169` (team 2) | "unpadded" is jargon. | "fix: replace this entry with one place id, with no spaces around it". |
| `src/picture/tickets.ts:110` (team 2) | "using scalar or block-list syntax" assumes YAML vocabulary. | "fix: write this line as `key: value`, or as a list with one `  - item` per line". |

## Fixed during the proof

- **A keeper's done wake asked for a keeper of the keeper** (`src/job/wake-text.ts`). A keeper always changes a ticket, so a coordinator that obeyed would loop. Run 2 keeper wake now says "This is the spec keeper: land it, since it carries the work and the spec fixes." Team 3, `edbc18d`.
- **The worker wake's command did not run as written.** It had no route flags, and it named the `planned/` path after the worker moved the ticket. The hint now has the four flags, and `limen keeper` follows a moved ticket: run 2 printed "ticket moved: spec/features/planned/… -> spec/features/active/…". Team 3, `edbc18d`.
- **The keeper packet told the keeper to start a keeper.** The "Land check now:" block copied the `fix: limen keeper …` line. Run 2 packet has no such line. Team 3, `edbc18d`.
- **The group refusal named a role it had just refused.** `limen keeper` under `LIMEN_GROUP_ID` said "the team coordinator or the owner-facing lead does". It now says "the owner-facing lead starts one after it merges the team branches", and `templates/agents.md:152` says "In a group, only the lead starts the keeper." Team 3, `edbc18d`.
- **Land error lines had no level word.** Warnings started with `warn`; errors started with the path. Errors now start with `error`. Team 3, `edbc18d`.
- The template had a fixed date, `opened: 2026-10-06`. A copied ticket would pass the strict check with a wrong date. The lead restored `YYYY-MM-DD` (`2aaf43b`).
- The package template note linked `../../../picture/CONTRACT.md`. The link works inside the package, but `limen init` copies the template into every plant, where that path does not exist. The lead replaced the link with the package path in words (`2aaf43b`).
- `templates/keeper.md` sent the keeper to `map.html` through `grep -rln 'FNNN-'`. It said "today" in a durable rule. It gave no source for place ids and no rule for a taken number. It did not tell the keeper that it may edit the board despite the read-only board cue. Team 3 fixed all five (`6c6876e`, `9f10644`).
