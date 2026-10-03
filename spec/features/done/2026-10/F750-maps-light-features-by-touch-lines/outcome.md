# Outcome

The Limen map now lists 15 features and 5 journeys. Each feature names its places in a `touches` list, and each journey names its places in `steps`. A picture job wrote them from source and specs at `1cecf60` (job `2026-10-03-f750-limen-features-and-journeys-d66f5833`). The Alice map no longer has feature edges. The coordinator removed 38 `edges/alice.feature.*` files and added their 4 missing targets to the touch lists of two features (apps, grants). A backup of the old Alice dataset is at `/tmp/alice-picture-backup-20261003`.

Checks: `limen picture build --strict` exits 0 on both datasets with 0 diagnostics. Alice still has 81 places and 151 place edges. In a browser, each of the 14 Alice features lit exactly its touched places. The picture job ran the same check for all 20 Limen overlays. Both datasets are local and gitignored, so this landing commits only this folder and the board. No Alice product code changed.
