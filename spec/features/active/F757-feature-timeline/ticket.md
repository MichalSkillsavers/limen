---
opened: 2026-10-04
---

# F757 · A feature shows as a timeline with only what a person needs to decide

## Outcome

A person opens a feature on the map and sees a timeline graph. It shows only what they need to decide how the feature changes the system. Detail stays one click away. The four-field panel from the decision-spec work (F756) goes away, except pieces that a screenshot proves the reader needs. Adam locked this on 2026-10-04.

## Scope

- Start from the F756 result: `decision`, `touches`, `open`, and evidence in the map feature file front matter. Synthesis: `spec/features/done/2026-10/F756-feature-decision-spec/group/synthesis.md`.
- One general file shape for every feature. The model fills the values. `limen picture build` only reads and shows them.
- The file shape lights the timeline automatically. No new app or code for each feature.
- One self-contained HTML sample of the timeline, opened from `file://`, for a real Alice feature (start with `alice.feature.cloud-choice`).
- Screenshots that justify each cut and each piece that comes back.

## Out of scope

- A second change-tracking system. Code that interprets prose.
- Edits to the live Alice map or any `.limen/picture/` dataset. Copy to `/tmp`.
- Landing code on `main`.

## Acceptance

- One recommended file shape: each key, its type, and what the timeline shows for it.
- One HTML sample that opens from `file://` and shows the timeline for one Alice feature.
- Detail is one click from the timeline.
- Each cut or kept piece names a screenshot path and what the screenshot showed.
- Plain technical English (about 80% of ASD-STE100).
