---
opened: 2026-10-04
---

# F759 · The graph shows only what the owner must decide, under high change volume

## Outcome

Autonomous work makes hundreds of changes. The owner cannot read them all. The picture keeps the infrastructure graph and mixes it with time, and the first view shows only what the owner needs for one decision. One click opens the detail. Adam locked this on 2026-10-04, after the timeline group (F757).

## Scope

- Start from the F757 synthesis: `spec/features/active/F757-feature-timeline/group/synthesis.md`.
- Keep the infrastructure graph. Mix it with time. A timeline-only page is not acceptable.
- Remove the left and right panels. The first view is almost empty: the graph, a clear search, and the connections. A control comes back only when a screenshot shows that the owner cannot decide without it.
- A few reusable primitives. The model fills values. `limen picture build` only reads and shows them.
- One self-contained HTML sample per team, opened from `file://`, on a `/tmp` copy of the Alice dataset.

## Out of scope

- A second change-tracking system. Code that interprets prose. Per-feature app code.
- Edits to the live Alice map or any `.limen/picture/` dataset.
- Landing code on `main`. Merging F756 or F757 branches.

## Acceptance

- One recommended set of primitives: each key, where it lives, its type, and what the graph shows for it.
- One HTML sample per team that opens from `file://` with no side panels on first load.
- The first view fits one 1440 × 900 screen with no scroll.
- One click from the first view opens the detail for the thing that needs a decision.
- A synthetic high-volume probe (at least 200 changes) shows that the first view stays readable.
- Each kept control and each cut names a screenshot path and what it showed.
- Plain technical English (about 80% of ASD-STE100).
