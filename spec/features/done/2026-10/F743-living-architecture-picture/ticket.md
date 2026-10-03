# F743 · A local architecture map stays current without a model call per land

## Outcome

A returning reader opens one local HTML map of a project: its places (plant and modules), the edges between them, and later the features and journeys that cross them. A quiet watcher spends a model call only when code the map cites, or the project's file structure, changed on the checked-out tip. Limen ships the reusable piece (contract, generator, thin `limen picture`); each plant owns its own dataset. Alice is the first dataset; its gold sample (2026-10-02, gitignored on the Alice VPS) is the shape to reproduce.

## Scope

- Contract: `templates/picture/CONTRACT.md` (schema `architecture-map/1`, plant `revision` cursor, feature `touches`, journey `steps`, build and tick behavior).
- `limen picture build`: deterministic Markdown dataset → one offline HTML file; no model.
- `limen picture tick`: one pass for an operator timer; classifies the diff from plant `revision` to `HEAD` and starts at most one detached picture job.
- Picture role prompt maintains the gitignored dataset instead of a committed `spec/picture.md`.
- Sequence: base map (nodes, edges, build, tick) lands first; feature and journey overlay second.

## Out of scope

- Alice's dataset, places, journeys, and its local view (Alice plant work).
- Committing or merging any dataset or HTML map onto a tip.
- A loop, interval, or quiet-period scheduler inside Limen; style-lint packs; links derived from Git history.

## Acceptance

- `limen picture build` over the gold Alice dataset renders one offline HTML file with zero error diagnostics.
- `tick` with no plant `revision` prints one advisory line and starts no job.
- `tick` after a spec-only, docs-only, or picture-only commit prints nothing and starts no job.
- `tick` after a structural code change or an edit to a cited source starts exactly one detached picture job; a second `tick` at the same tip starts none.
- No map file appears in `git status` or on `main` after a refresh.
- In the overlay slice, a feature lights only the modules listed in its `touches`.

## Notes

The earlier study (proposal, example, notes, checks) stays here as history. The locked owner direction of 2026-10-03 supersedes its publication and scheduling suggestions.
