# Brief

## Shared outcome

Make the picture log clearer than the F763 samples, and keep it simple. Each team tests one proven method for reports that people read under time pressure. Recommend one file shape and one first view. The page can mix list and graph, or put the list first, when a screenshot proves it helps.

## Start from

- The ticket (`ticket.md`): F763 branches and results, F759 synthesis, Adam's observational-memory example.
- Baseline: before your first cut, open one F763 sample (pick the one closest to your method) from `file://` and take one shot `00-baseline.png`. Compare each of your first views to it.
- Alice map: `file:///Users/overment/playground/alice-app/alice/.limen/picture/map.html`. Contract: `templates/picture/CONTRACT.md`. Viewer: `picture/viewer/`.
- Real log data from F763: `git show` the `group/teams/team-3-log/`, `group/shots/team-2/data/`, and `group/shots/team-4/data/` files on the F763 branches.

## First principles

- What must a reader know first? Put it first. Cut the rest from the first view.
- A method is a tool, not a ritual. Keep only the parts that a screenshot proves useful.
- Severity is the weakest part of F763 (inflation). A method that fixes severity with a written rule is worth more than a new layout.
- Simple beats complete. If two shapes are equally clear, choose the one with fewer keys and fewer controls.

## Simplicity bar (hard, all teams)

- One line grammar for an entry. At most 6 parts in an entry line.
- At most 2 page controls in the first view.
- A first-time reader knows what the first view says in 5 seconds. Legend: one line at most.
- The build splits lines and checks forms only. It never reads the meaning of text. No new change-tracking system. No per-feature app code.
- Write a cut list: each part the method offers, kept or cut, with a screenshot.

## Rules

- Keep Adam's preference in mind: Map-with-time and question pins with a keyed log beat a timeline-only page. You can shrink, move, or drop the graph from the first view only when a screenshot proves the change helps.
- Do not edit `/Users/overment/playground/alice-app/alice/.limen/picture/`. Copy it to `/tmp`.
- Use Playwright. Open the HTML from `file://` at 1440 × 900. Iterate on the real page.
- Screenshots: save each one to `<limen root>/.limen/groups/<group id>/shots/team-N/NN-short-name.png`, and commit a copy under this folder's `group/shots/team-N/` on your branch. Publish each path with `limen group publish`.
- Read the other teams' newest screenshots before each next cut.
- Each claim names a screenshot path and what it showed.
- Do not land. Commit notes, HTML, and screenshots only on your job branch.
- Plain technical English (about 80% of ASD-STE100).
- Distinct starting hypotheses only. Do not copy another team's method.

## Deliverable per team

- `group/teams/team-N-result.md`:
  - Method: name, source in one line, the parts kept and the parts cut.
  - File shape: key, where, type, what the page shows.
  - First view and navigation path for a human and for an agent (bytes read for 2 sample questions).
  - Severity rule in writing, if the method gives one.
  - Comparison with `00-baseline.png`. Risks.
- `sample-team-N.html` in this folder: self-contained, opens from `file://`.
- `group/shots/team-N/`: the screenshots.

## Lead synthesis

The lead compares the four results and screenshots with the F763 baseline and writes `group/synthesis.md`: **one recommended method** (or a mix of at most two), **one file shape**, **one first view**, and the chosen sample. The simplicity bar decides ties. Nothing merges.
