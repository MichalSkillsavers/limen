# Brief

## Shared outcome

Cut the F756 four-field panel down to a timeline graph. Show only what a person needs to decide. Keep detail one click away. Remove most of the panel. Add a piece back only when a screenshot shows that the reader cannot decide without it.

## Start from

- F756 synthesis: `spec/features/done/2026-10/F756-feature-decision-spec/group/synthesis.md`.
- F756 samples (read with `git show <branch>:<path>`): `limen/2026-10-04-f756-feature-decision-spec-team--6b5828e8` and `limen/2026-10-04-f756-feature-decision-spec-team--e5bbf4d3`, file `spec/features/active/F756-feature-decision-spec/sample-team-N.html`.
- Alice map: `file:///Users/overment/playground/alice-app/alice/.limen/picture/map.html#alice.client.ui?feature=alice.feature.cloud-choice&detail=place`. Contract: `templates/picture/CONTRACT.md`. Viewer: `picture/viewer/`.

## Rules

- Seek simplification, one general shape, and flexibility. The model fills values. The build only reads and shows them.
- No second change-tracking system. No code that interprets prose.
- Nearly automatic mapping: the front matter shape lights the timeline with no per-feature app.
- Do not edit `/Users/overment/playground/alice-app/alice/.limen/picture/`. Copy to `/tmp`.
- Use Playwright. Open the HTML from `file://`. Iterate on the real page.
- Screenshots: save each one to `<root>/.limen/groups/<your group id>/shots/team-N/NN-short-name.png` so the other team can see it, and commit a copy on your branch under this folder's `group/shots/team-N/`. Publish the path with `limen group publish`.
- Read the other team's newest screenshots before each next cut.
- Each claim names a screenshot path and what it showed.
- Do not land. Commit notes, HTML, and screenshots only on your job branch.
- Plain technical English (about 80% of ASD-STE100).

## Distinct starting hypotheses

- **team-1:** the timeline axis is the order in which the feature crosses places. Reuse the journey `steps` shape (an ordered list of place ids) for features. Each mark shows the place name and one short effect line. The decision is one line above the axis.
- **team-2:** the timeline axis is the decision history. Each entry is one dated decision with the places it touches. The newest entry sits at the right. Places show as small marks under each entry.

## Deliverable per team

- `group/teams/team-N-result.md`: the file shape (key, type, what shows), each cut with its screenshot, and the risks.
- `sample-team-N.html` in this folder: self-contained, opens from `file://`.
- `group/shots/team-N/`: the screenshots.

## Lead synthesis

The lead compares both results and screenshots and writes `group/synthesis.md` with one recommended shape and the chosen sample.
