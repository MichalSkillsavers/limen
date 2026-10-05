# Brief

## Shared outcome

`limen picture build` renders the merged picture that Adam approved on 5 October, live from Markdown, with stacked layers for important items. One integrated result lands on `main`. The lead integrates and lands; teams never land, push, or edit the board.

Reference design (read it first, in a hidden test Chrome): `spec/features/active/F775-picture-merge-broad-digdown/limen-picture-merged.html`. Its decisions are in `F775-picture-merge-broad-digdown/group/synthesis.md` and its shots in `group/shots/synthesis/`. It is hand-assembled; the new page must look and behave the same, with data from the builder.

Live inputs on this plant (read-only):

- Picture map: `/Users/overment/.overment/limen/.limen/picture/` (nodes, edges, features, journeys). Never edit it. Pass it with `--dir`.
- Tickets: `spec/features/<lane>/…/ticket.md`. Lanes are `planned`, `active`, `done/YYYY-MM`, `dropped/YYYY-MM`.
- Board: `spec/build.md` (sections NOW, NEXT, PARKED, DROPPED, PROVEN; one line per feature).

Build from your worktree: `node bin/limen picture build --dir /Users/overment/.overment/limen/.limen/picture --out /tmp/f780-team-N/map.html --json /tmp/f780-team-N/map.json --strict`.

## Interface decisions (lead defaults)

These are the starting contract so all six teams can start at once. The owning team may change one, but it must publish the change with `limen group publish` before it commits code that depends on it. Each consuming team acknowledges it with a short publish. Publish the final shape of each interface in the first 30 minutes.

**1. Ticket front matter (owner: Team 1).** YAML between `---` lines at the top of `ticket.md`, before the `# FNNN · …` title. Same parser rules as the map (`src/picture/frontmatter.ts`): scalars, `null`, block lists.

```yaml
---
touches:            # block list of map place ids (plant or module), same ids as .limen/picture/nodes
  - limen.picture.build
opened: 2026-10-06  # ISO date the ticket was written
needs-adam: Park this merge, or request a live build?   # optional; present = flag on; one line
needs-adam-on: 2026-10-05                              # required when needs-adam is present
wrong: The end-goal view lost the broad plant.         # optional; present = flag on; one line
wrong-on: 2026-10-05                                   # required when wrong is present
landed: 2026-10-06  # done lane only
---
```

Diagnostics (all go through the existing `Diagnostic` type; `--strict` fails on errors): an unknown place id in `touches` is an **error** (`ticket.unknown-touch`), not a dropped warning. A malformed key, a bad date, a flag without its date, or a multi-line ask is an error (`ticket.bad-field`). An active ticket with no front matter or no `touches` is a warning (`ticket.no-touches`). Every diagnostic names the ticket path and line.

**2. Model (owner: Team 2).** `architecture-map-model/3` keeps every field of model 2 and adds:

- `work[]`: one entry per ticket. `id` (`f780`), `code` (`F780`), `slug`, `title` (ticket heading text after `·`), `lane`, `board` (`{ section, state, line }` or `null`), `purpose` (first sentence of Outcome), `outcome` (Outcome paragraph), `touches` (place ids from the ticket; else from the map feature `limen.feature.fNNN`; else empty), `touchSource` (`ticket` | `map` | `none`), `opened`, `landed`, `needsAdam` (`{ ask, on }` or `null`), `wrong` (`{ problem, on }` or `null`), `path` (ticket path), `mapFeature` (id or `null`).
- `pins`: `{ changed, wrong, needs }`, each a list of `{ work, date, text, scope }`, newest first. Changed comes from `landed` dates. Dates come from files only, never from the clock, so the same inputs give the same bytes.
- `days[]`: `{ date, items: [{ work, kind, text }] }`, newest first; `kind` is `opened`, `landed`, `needs-adam`, or `wrong`.

**3. Viewer files and tokens (owner: Team 3).** The viewer stays `picture/viewer/`. `template.html`, `viewer.css`, and `viewer.js` render the merged layout from the embedded model. `src/picture/html.ts` also inlines `layers.css` after `viewer.css` and `layers.js` before `viewer.js`. Team 3 publishes the CSS tokens (one spacing scale, ink, red for a problem, indigo for a decision) and the route table.

**4. Layers and URL (owner: Team 4).** The base routes keep the reference format: `#plant`, `#plant/<tab>`, `#module/<id>`, `#place/<id>`, `#place/<id>/via/work/<id>`, `#work/<id>`, `#journey/<id>`, `#day/<date>`. Each open layer appends `~<kind>/<id>`, for example `#work/f780~place/limen.picture.viewer~work/f775`. Each layer step is one history entry, so browser Back closes the top layer. Esc closes the top layer; with no layer open, Esc goes up one step as in the reference. `layers.js` exposes one global `PictureLayers` with `open(kind, id)`, `close()`, `jump(depth)`, and `restore(hash)`; `viewer.js` calls it and gives it a render function per kind.

## File ownership

Each team commits only its own files. To ask for a change in a file you do not own, publish the exact patch or repro to the owner with `limen group publish --team team-N`.

| Team | Owns |
| --- | --- |
| 1 | `templates/spec/features/_template/ticket.md`, `spec/features/_template/ticket.md`, `templates/picture/CONTRACT.md`, `docs/picture.md`, new `src/picture/tickets.ts`, its tests, ticket front matter backfill in `spec/features/**/ticket.md` |
| 2 | `src/picture/picture-model.ts`, `src/picture/picture-build.ts`, `src/commands/picture.ts`, new board and work files in `src/picture/`, their tests |
| 3 | `picture/viewer/template.html`, `viewer.css`, `viewer.js`, `src/picture/html.ts`, `test/picture-viewer.test.ts` |
| 4 | new `picture/viewer/layers.js`, `picture/viewer/layers.css`, layer tests |
| 5 | route sweep and keyboard checks under `spec/features/active/F780-live-picture-viewer/group/qa/` (scripts and results only) |
| 6 | review notes and wording findings under `group/teams/`; fixes go to owners as patches |

New TypeScript basenames must be unique in the repository (`test/structure.test.ts`).

## Building on a peer

To build on a peer, merge its published commit into your branch (`git merge <commit>`). Never rebase or cherry-pick a peer's commits. The lead also merges candidates into one integration build and publishes its HTML path; Teams 5 and 6 test that build first.

## Rules

- First tool action: `limen group publish "Initial hypothesis: …"`, from your approach note only.
- HTML preview only through `/Users/overment/.local/bin/vscreen` (hidden virtual screen) or headless Chrome. Never `open` on Adam's main display. Install Playwright in `/tmp/f780-team-N/`, never in the repository.
- Product language for Adam: plain technical English (about 80% of ASD-STE100). Adam does not read code.
- No model call in the builder. No background agents. No new runtime dependency.
- Before you publish a candidate, run `npm run typecheck`, `npx biome check <your files>`, the tests for your files, and the build command above. Report the real output.
- Commit on your job branch. Do not land, push, merge into `main`, or edit the board.
- Opus 429: change that team to Sol (`openai-codex/gpt-6-sol`) and publish the error text.

## Deliverable per team

- Commits on the job branch, each published with its hash and what it changes.
- `group/teams/team-N-result.md`: what works, the checks you ran with their output, shots, and open risks.
- Shots at 1440×900 (and 1240, 900 wide where layout matters) in `group/shots/team-N/`.

## Lead

The lead merges candidates in the order 1, 2, 3, 4, then applies fixes from 5 and 6. It runs the full check and `limen picture build --strict` on this plant, writes `/Users/overment/Downloads/limen-picture-live.html`, lands on `main`, pushes, and closes the group.
