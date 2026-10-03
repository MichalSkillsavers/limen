# F748 · The guides say the map is a local file, not a live feature list

## Outcome

A reader learns three facts about the architecture map before they trust it. The map is a local file that is not in Git. A board-only change does not refresh it. Its feature and journey list shows which places a feature touches; it does not show feature state. The vision note that says the picture lives in Git changes to match (Adam authorized this edit on 2026-10-03).

## Scope

- README "Architecture picture" section: state the three facts above in plain words.
- Picture contract (`templates/picture/CONTRACT.md`): say that `spec/` changes, including the board, never start a refresh, and that the overlay list is not a status list.
- Vision picture bullet (`spec/vision.md`): remove "lives in Git" and "where each feature stands". Keep the rest of the bullet.

## Out of scope

- Map content for Limen or Alice (separate ticket).
- Changes to `limen picture build`, `tick`, or `watch` behavior.
- New map features, such as a Changes list.
- Other vision bullets.

## Acceptance

- `grep -n "lives in Git" spec/vision.md` prints nothing.
- The README picture section says the map is local, not in Git, and not refreshed by a board-only change.
- The README and the contract say the feature list is not a live feature or status list.
- `limen picture tick --dry-run` after a commit that changes only `spec/build.md` reports no refresh.
- `npm run check` passes.
