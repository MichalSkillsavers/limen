---
opened: 2026-10-04
---

# F756 · A feature spec shows its decision, effect, evidence, and open questions

## Outcome

A person who opens a feature on the map can decide how that feature changes the system. Today the map shows which places a feature touches, but not the decision, the effect, the evidence, or what is still open. This feature defines one small fixed structure for that, and one HTML sample of it. Adam locked the goal on 2026-10-04.

## Scope

- Four fields for every feature: **Decision**, **Effect** (places touched), **Evidence**, **Open**.
- The smallest fixed form, front matter if that is smallest. The model writes the fields; `limen picture build` only reads and shows them.
- The same fields for every feature, so a stronger model writes clearer values without a new tool.
- Reference: the Alice map at `/Users/overment/playground/alice-app/alice/.limen/picture/map.html#alice.client.ui?feature=alice.feature.cloud-choice&detail=place`, the picture contract `templates/picture/CONTRACT.md`, and the ticket template `spec/features/_template/ticket.md`.
- Deliverable: a recommended structure and one self-contained HTML sample in this folder.

## Out of scope

- A second system that tracks changes.
- Code that interprets free prose.
- Edits to the live Alice map or any `.limen/picture/` dataset.
- Landing code on `main`.

## Acceptance

- One recommended structure that names the four fields, their type, and where they live.
- One HTML sample in this folder that opens from `file://` and shows the four fields for one real Alice feature.
- The sample shows how the fields appear beside the places that the feature touches.
- Plain technical English (about 80% of ASD-STE100).
