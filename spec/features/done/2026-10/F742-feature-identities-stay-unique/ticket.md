# F742 · Feature identities stay unambiguous

## Outcome

A reader can distinguish the landed branch-diff viewer from the parked application field-guide proposal. Commands and future references no longer encounter two different features called F050, while the existing landed history remains intact.

## Scope

- Start with the two F050 folders: the landed diff viewer and planned living-architecture proposal.
- F743 is reserved for the parked proposal; move its complete folder to planned/F743-living-architecture-picture and update its current ticket identity.
- Preserve historical material and explain the former F050 address with a small standalone cross-reference; do not globally replace every F050.
- Update current, nonhistorical pointers outside the board where needed. Provide the exact board correction in the handoff for the coordinator.

## Out of scope

- Changing the architecture proposal, implementing its watcher, or refreshing the application picture.
- Renumbering the landed diff viewer or rewriting historical outcomes, reviews, and commits.
- Editing spec/build.md or introducing a feature registry or Markdown parser.

## Acceptance

- The active/planned/done cabinet has no two distinct feature folders using the same number after the correction.
- The parked proposal is present in full at planned/F743-living-architecture-picture; its current ticket says F743.
- The landed F050 diff-viewer folder is unchanged.
- A future reader can follow the proposal's former address without confusing it with the diff viewer.
- Native checks applicable to changed files pass; the handoff identifies current pointer changes and the board line awaiting coordinator filing.
