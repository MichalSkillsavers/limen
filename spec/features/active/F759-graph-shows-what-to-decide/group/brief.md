# Brief

## Shared outcome

A person cannot read hundreds of changes. Keep the infrastructure graph, mix it with time, and show only what the owner needs for one decision. One click opens the detail.

## Start from

- F757 synthesis: `spec/features/active/F757-feature-timeline/group/synthesis.md`. Its samples are on the F757 coordinator branches named there (read with `git show`).
- Alice map: `file:///Users/overment/playground/alice-app/alice/.limen/picture/map.html`. Contract: `templates/picture/CONTRACT.md`. Viewer: `picture/viewer/`.

## First principles

Ask: what must be on screen for one decision when change volume is high? Cut everything else. Start from an almost empty first view: the graph, one clear search, and the connections. No left panel. No right panel. Add a control back only when a screenshot shows that the owner cannot decide without it.

## Rules

- Keep the graph. Mix it with time. No timeline-only page.
- A few reusable primitives. The model fills values. The build only reads and shows them. No second change-tracking system. No code that interprets prose. No per-feature app code.
- Do not edit `/Users/overment/playground/alice-app/alice/.limen/picture/`. Copy it to `/tmp`.
- Use Playwright. Open the HTML from `file://` at 1440 × 900. Iterate on the real page.
- Build one synthetic high-volume probe with at least 200 changes, and screenshot the first view with it.
- Screenshots: save each one to `<limen root>/.limen/groups/<group id>/shots/team-N/NN-short-name.png`, and commit a copy under this folder's `group/shots/team-N/` on your branch. Publish each path with `limen group publish`.
- Read the other teams' newest screenshots before each next cut.
- Each claim names a screenshot path and what it showed.
- Do not land. Commit notes, HTML, and screenshots only on your job branch.
- Plain technical English (about 80% of ASD-STE100).

Do not copy the F757 approaches: place order, decision history, Was/Now/Next strip, or dated cards.

## Deliverable per team

- `group/teams/team-N-result.md`: the primitives (key, location, type, what shows), each cut and each kept control with its screenshot, the high-volume result, and the risks.
- `sample-team-N.html` in this folder: self-contained, opens from `file://`.
- `group/shots/team-N/`: the screenshots.

## Lead synthesis

The lead compares the four results and screenshots and writes `group/synthesis.md` with one recommended set of primitives and the chosen sample.
