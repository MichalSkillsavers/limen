# F754 notes

## Seams

- Tick sources: `pictureTick` in `src/project/picture-tick.ts` collects `sources` from nodes, edges, features, journeys, and the plant. `relevantPicturePaths` is unchanged.
- Dry-run lines: `pictureTick` prints `picture <head8>: map is current; dry run` and `picture <rev8>..<head8>: no relevant change; dry run` only with `--dry-run`. Without it, both cases stay silent; the watch log and the existing silence test depend on that.
- Source check: `buildModel` takes an optional `exists(path)` predicate, so the model stays free of file I/O. `buildPicture(dir, out, json, tip, root)` passes `existsSync(join(root, path))`. Only `limen picture build` passes `root`; `readPicture` from the tick does not check sources. The diagnostic is `warn source.missing` with the record file, id, and the line of the `sources` key.
- Place panel: `overlayLinks(box, n)` in `picture/viewer/viewer.js`, called from `renderNodePanel` (after Parts) and `renderProjectPanel` (`n` null is the plant, for journeys that step on it). Exact match on `o.places[].node`; ancestors and children do not list. A click calls `selectOverlay(o)`.

## Decisions

- A source path is missing when `join(root, path)` does not exist. Directory sources and `./` prefixes pass. Paths outside the root (`../x`) are not rejected.
- The panel section is hidden when the map has no features and no journeys; otherwise it shows `None.` for a place that nothing names.

## Evidence

- Browser frames and the built fixture map: `/tmp/f754-artifacts/` (`place-panel-before-click.png`, `place-panel-after-click.png`, `map.html`).
