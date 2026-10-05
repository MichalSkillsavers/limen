---
touches:
  - limen.picture.tick
  - limen.picture.build
  - limen.picture.viewer
opened: 2026-10-03
landed: 2026-10-03
---

# F754 · The map refreshes for everything it cites and shows what touches each place

## Outcome

An owner who opens a place on the map sees the features and journeys that touch it. The map refreshes when any file it cites changes, including files that only a feature or journey cites. A wrong source path shows as a build warning, and `limen picture tick --dry-run` always says what it decided. Today the Mega map shows these gaps: the place `mega.convex.access` lists no features in its panel, though three features and two journeys touch it, and two code files cited only by features can change without a refresh.

## Scope

- **Tick sources.** `limen picture tick` counts `sources` from features and journeys, not only from places, edges, and the plant. Start at the `sources` list in `src/project/picture-tick.ts`.
- **Dry-run.** `tick --dry-run` prints one line in every case, including "map is current" and "no relevant change".
- **Source check.** `limen picture build` warns for each cited source path that does not exist in the project root (`source.missing`). `--strict` stays errors-only.
- **Place panel.** The viewer panel for a place lists the features and journeys whose `touches` or `steps` name it, as links that select that overlay.
- **Role prompt.** `templates/picture.md` tells the picture job to cite every project file that a body names, so a change to that file refreshes the place.
- Update `templates/picture/CONTRACT.md` and the README picture section to match.

## Out of scope

- Any dataset under a project's `.limen/picture/`, including Mega and Alice.
- A Changes list, history, or feature state on the map.
- New picture subcommands, timers, or watch behavior.

## Acceptance

- A tick test: a commit that changes a file cited only by a feature makes the tick report that path as relevant.
- `limen picture tick --dry-run` prints one line when `revision` equals `HEAD`.
- A build test: a node that cites a missing file produces a `source.missing` warning, and the map still renders.
- In a browser, the panel for a place touched by a feature lists that feature, and a click on it lights that feature.
- `npm run check` passes.
