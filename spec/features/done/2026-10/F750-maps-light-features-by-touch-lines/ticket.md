# F750 · The Limen and Alice maps light features through explicit touch lines

## Outcome

The owner opens the Limen map and sees Limen features and journeys in the list beside it. Selecting one lights the places it touches. The Alice map uses only explicit touch lines: its old feature edges are gone, and no build warning reports a dropped feature edge. This content comes before any new map feature, such as a Changes list.

## Scope

- Limen dataset (`/Users/overment/.overment/limen/.limen/picture/`): add `features/` and `journeys/` files under the picture contract (`templates/picture/CONTRACT.md`). Each feature has a `touches` list; each journey has `steps`. Write them from source and specs, never from Git history.
- Alice dataset (`/Users/overment/playground/alice-app/alice/.limen/picture/`): for each `edges/alice.feature.*` file, make sure the matching feature's `touches` lists the target, then delete the edge file.
- Both datasets are local and gitignored. No repository commit is part of this work.

## Out of scope

- Alice product code (`alice/`, `api/`) and any Alice commit.
- Changes to the picture builder, viewer, tick, or watch.
- A Changes list or other new map surface.
- Feature state on the map.

## Acceptance

- `limen picture build --strict --dir <Limen dataset>` exits 0 and reports at least one feature and one journey.
- Each Limen feature file has a `touches` list, and each id in it names a module in the dataset.
- `limen picture build --dir <Alice dataset>` prints no `edge.feature` warning.
- No Alice feature lost a place it lit before the edge files were removed.
- Selecting a feature in each rendered `map.html` lights only the places in its `touches`.
