---
opened: 2026-10-06
---

# F782 · Adam can read how specs are laid out and how agents run, on two plain pages

## Outcome

Adam does not read code, but he decides what Limen builds. Two calm, offline HTML pages explain the system in plain technical English. The first shows how specs are filed: the `spec/` folders, one real ticket part by part, the local architecture map files, and how `limen picture build` turns them into the live picture, with today's real warnings. The second shows the roles, the agent loop from task file to land, how steering and hook text reach an agent, and one group run from start to land.

## Scope

- Two self-contained pages in this folder: `limen-spec-structure.html` and `limen-roles-and-loop.html`. Inline CSS and SVG only.
- Every fact comes from the repository: docs, templates, hooks and code. A point the files do not settle carries an "uncertain" label.
- Copies go to `~/Downloads/` for Adam.

## Out of scope

- Changes to code, docs, templates or the board.
- Changes to the live picture viewer or the map dataset.

## Acceptance

- Each page opens from `file://` with no network request.
- At 1440 and 900 px wide, no text is cut off and no page scrolls sideways.
- The warnings on the spec page match a `limen picture build --strict` run on the landed commit.
- Each diagram has a one-line caption.

## Notes

- No `touches`: the pages change no map place, so the build warns `ticket.no-touches` for this ticket. The spec page shows that warning as a real example.
