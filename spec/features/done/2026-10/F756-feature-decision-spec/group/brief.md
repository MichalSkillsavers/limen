# Brief

## Shared outcome

Propose one small fixed structure that lets a person decide how a feature changes the system: **Decision**, **Effect** (places touched), **Evidence**, **Open**. Then make one self-contained HTML sample of it for a real Alice feature (start with `alice.feature.cloud-choice`).

## Constraints

- No second change-tracking system. No code that interprets free prose.
- The model writes the fields. `limen picture build` only reads and shows them.
- Same four fields for every feature. Front matter if that is the smallest form.
- Do not edit `/Users/overment/playground/alice-app/alice/.limen/picture/` or any live dataset. Copy what you need to `/tmp`.
- Do not land code. Commit only notes and the HTML sample in this feature folder on your branch.
- Plain technical English (about 80% of ASD-STE100).

## Inputs

- Alice map: `file:///Users/overment/playground/alice-app/alice/.limen/picture/map.html#alice.client.ui?feature=alice.feature.cloud-choice&detail=place`
- Picture contract: `templates/picture/CONTRACT.md`. Viewer: `picture/viewer/`.
- Ticket template: `spec/features/_template/ticket.md`.

## Distinct starting hypotheses

- **team-1:** the four fields belong on the map's feature overlay file (`features/*.md` front matter). `touches` already is Effect.
- **team-2:** the four fields belong on the ticket (`spec/features/*/ticket.md` front matter), and the map reads the ticket.

## Deliverable per team

- `group/teams/team-N-result.md`: the structure (field, type, rule, where it lives), why, and the risks.
- `sample-team-N.html` in this folder: self-contained, opens from `file://`.

## Lead synthesis

The lead compares both results and writes `group/synthesis.md` with one recommended structure and the chosen sample.
