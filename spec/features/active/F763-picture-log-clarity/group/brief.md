# Brief

## Shared outcome

Make picture logs extremely easy for a human to skim and token-efficient for agents. Keep the infrastructure graph mixed with time (prefer F759 Map-with-time). Shape the log like observational memory: dated blocks, severity indicators, nested detail, and clean labels. Recommend one file shape and one navigation pattern.

## Start from

- F759 synthesis: `spec/features/active/F759-graph-shows-what-to-decide/group/synthesis.md`. Its samples are on the F759 coordinator branches named there (read with `git show`).
- Adam’s observational-memory example (in the ticket): day header, severity emoji, clock time, parent line, nested detail lines.
- Prefer Map-with-time (F759) over Feature-timeline (F757). Do not copy F757 place-order / Was-Now-Next / dated-card timeline-only approaches unless a screenshot proves the graph must leave the first view.
- Alice map: `file:///Users/overment/playground/alice-app/alice/.limen/picture/map.html`. Contract: `templates/picture/CONTRACT.md`. Viewer: `picture/viewer/`.

## First principles

Ask: can a person skim one day in seconds, and can an agent load only the lines it needs? Cut noise. Keep severity and time obvious. Nest detail under the parent observation. Labels name the kind of fact without a long sentence.

## Rules

- Keep the graph. Mix it with time. No timeline-only page unless a screenshot proves otherwise.
- A few reusable primitives. The model fills values. The build only reads and shows them. No second change-tracking system. No code that interprets prose. No per-feature app code.
- Do not edit `/Users/overment/playground/alice-app/alice/.limen/picture/`. Copy it to `/tmp`.
- Use Playwright. Open the HTML from `file://` at 1440 × 900. Iterate on the real page.
- Screenshots: save each one to `<limen root>/.limen/groups/<group id>/shots/team-N/NN-short-name.png`, and commit a copy under this folder's `group/shots/team-N/` on your branch. Publish each path with `limen group publish`.
- Read the other teams' newest screenshots before each next cut.
- Each claim names a screenshot path and what it showed.
- Do not land. Commit notes, HTML, and screenshots only on your job branch.
- Plain technical English (about 80% of ASD-STE100).
- Distinct starting hypotheses only. Do not copy another team's approach.

## Deliverable per team

- `group/teams/team-N-result.md`: the log/file shape (key, location, type, what shows), the navigation pattern, each cut and each kept control with its screenshot, and the risks.
- `sample-team-N.html` in this folder: self-contained, opens from `file://`.
- `group/shots/team-N/`: the screenshots.

## Lead synthesis

The lead compares the four results and screenshots and writes `group/synthesis.md` with **one recommended file shape** and **one navigation pattern**, plus the chosen sample. Nothing merges.
