# F765 · The picture has one visual language that is minimal and appealing

## Outcome

A person opens the picture and the page looks calm, clear, and good. Type, spacing, color, and navigation chrome follow one written visual system. An implementer can apply the system from a short style guide, with no taste calls left open. The system starts from what the F764 method teams produced, and it keeps their content shapes intact.

## Decision

Owner asks for one visual system (typography, spacing, color, density, navigation chrome, motion) for the picture, proven on HTML samples with Playwright screenshots. The live picture stays the three-pane atlas until Adam says "land". This feature produces samples and a style guide only.

## Start from (study first, before any design)

- F764 group `af0401ed-4e81-48d2-9981-074f12031dca`. Shots: `<limen root>/.limen/groups/af0401ed-4e81-48d2-9981-074f12031dca/shots/team-{1,2,3,4}/`.
- Key F764 first views:
  - team-1 BLUF + SITREP: `team-1/12-v2-decide-first-view.png` (bottom line, day log, graph beside).
  - team-2 OODA: `team-2/10-three-stage-first-view.png` (open decision card, place index).
  - team-3 COP symbols: `team-3/09-final-first-view.png` (atlas graph with 3 symbols, keyed list on the right).
  - team-4 CCIR/SEV: `team-4/04-final-first-view.png` (dark, place index, daily log, "Red only").
- F764 notes and samples (read with `git show`):
  - team-1 `limen/2026-10-05-f764-team-1-worker-07e09c1c`: `group/teams/team-1-result.md`, `sample-team-1.html`.
  - team-2 `limen/2026-10-05-f764-picture-log-methods-team-2--22152bf2` (`team-2-result.md`) and `limen/2026-10-05-f764-team-2-ooda-html-sample-fb77dde0` (`sample-team-2.html`).
  - team-3 `limen/2026-10-05-f764-team-3-worker-cop-symbols-7dee0983`: `team-3-result.md`, `sample-team-3.html`.
  - team-4 `limen/2026-10-05-f764-picture-log-methods-team-4--0673957f`: `team-4-result.md`, `sample-team-4.html`.
  - All paths above sit under `spec/features/active/F764-picture-log-methods/`.
- F764 synthesis, if the lead has written it: `spec/features/active/F764-picture-log-methods/group/synthesis.md`.
- Optional: F763 group `07dfda81-b059-43bf-8857-b8d167e2153f` shots.
- Live viewer (read only): `picture/viewer/`. Contract: `templates/picture/CONTRACT.md`. Alice map: `/Users/overment/playground/alice-app/alice/.limen/picture/map.html`.

## Touches

- Docs, HTML samples, and screenshots under this feature folder, on job branches only.
- No edits to `picture/viewer/`, `src/`, templates, or any live `.limen/picture/` dataset.

## Scope

- Each team proposes ONE visual system and proves it on HTML samples built from F764 content.
- Each system must work on at least two F764 content shapes (one primary, one second) so it is a system, not one page.
- Each team shows how its chrome maps onto the live three-pane atlas frame (a static sample, not a viewer edit).

## Bar (hard)

- At most 2 controls in the first screen. Motion: none, or one short transition (≤150 ms) that a screenshot or note justifies.
- One type family plus at most one mono. At most one accent color plus at most three status colors. A fixed spacing scale.
- A first-time reader knows what the first screen says in 5 seconds.
- Playwright screenshots at 1440 × 900 from `file://`, light and (if offered) dark. Each style claim names a screenshot.

## Out of scope

- Landing on `main`. Edits to the live picture or the viewer. Merging F763/F764 branches.
- New log keys or content methods. F764 owns content; F765 owns look and navigation.

## Acceptance

- Per team: `group/teams/team-N-result.md` with the style guide, `sample-team-N*.html` (self-contained, opens from `file://`), and shots in `group/shots/team-N/`.
- The style guide fits on one page: tokens (type scale, spacing scale, colors with hex, radii, borders), layout rules, navigation chrome, states, and a do/don't list.
- A before/after pair per team: the F764 source first view and the restyled first view, same content.
- The lead synthesis picks one system (or a mix of at most two), names the screenshots that decide it, and states the build plan for the live viewer as a later, separate feature.
- Plain technical English (about 80% of ASD-STE100).
