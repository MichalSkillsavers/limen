# Brief

## Shared outcome

Make the picture extremely appealing and minimal. Propose ONE visual system (typography, spacing, color, density, navigation chrome, motion) and prove it on HTML samples that use real F764 content. Write a short style guide that an implementer can follow without taste calls.

## Step 0: see before you design (mandatory)

- Before any design, open the four F764 first views and their notes (paths in `ticket.md`). Also open each F764 `sample-team-N.html` from `file://` with Playwright (extract with `git show <branch>:<path> > /tmp/f765-src/...`).
- Write 5 to 10 lines in your result: what each F764 view does well visually, and what makes it look busy, cheap, or unclear. Name the screenshot for each point.
- Take `00-source.png`: the F764 first view you restyle first, at 1440 × 900.

## Your direction

Each team starts from a distinct visual direction (see `group/teams/`). Do not copy another team's direction. Read the other teams' newest screenshots before each next cut, and borrow a detail only when a screenshot proves it helps.

## First principles

- Content first, chrome last. Every border, box, color, and label must earn its place. Cut it if the screenshot reads the same without it.
- Hierarchy comes from type size, weight, and space before it comes from color or boxes.
- Color carries meaning only (status, the one open decision). Never decoration.
- Minimal does not mean empty: the first screen must still answer "what changed, what matters, what needs a decision" in 5 seconds.
- Navigation: the reader must always know where they are and how to go back. At most 2 first-screen controls.

## Bar (hard, all teams)

- One type family plus at most one mono (system stacks are fine; no web font downloads, the sample must work offline from `file://`).
- A written type scale (at most 5 sizes) and spacing scale (for example 4/8/12/16/24/32/48).
- At most one accent color plus at most three status colors, each with a hex value and a one-word meaning.
- At most 2 first-screen controls. Motion: none, or one transition ≤150 ms.
- Light theme required. Dark theme optional; if offered, it uses the same tokens.
- Contrast: body text meets WCAG AA.

## Deliverable per team

- `group/teams/team-N-result.md`:
  - Step 0 notes on the four F764 views (with screenshot paths).
  - The style guide (one page): tokens, layout grid, navigation chrome, states (hover, selected, empty, long content), do/don't list.
  - How the chrome maps onto the live three-pane atlas (one static sample shot is enough).
  - Before/after table: F764 source shot vs restyled shot, same content.
  - Cut list: each visual element considered, kept or cut, with a screenshot.
  - Risks and what an implementer must not get wrong.
- `sample-team-N.html` (primary content shape) and `sample-team-N-b.html` (second F764 shape) in this folder: self-contained, open from `file://`.
- Screenshots: save each one to `<limen root>/.limen/groups/<group id>/shots/team-N/NN-short-name.png`, commit a copy under `group/shots/team-N/` on your branch, and publish each path with `limen group publish`.

## Rules

- Playwright at 1440 × 900 from `file://`. Iterate on the real rendered page, not on a mental model.
- Use real Alice content from the F764 samples. Copy any picture data to `/tmp`. Do not edit `/Users/overment/playground/alice-app/alice/.limen/picture/` or any live `.limen/picture/`.
- Do not edit `picture/viewer/`, `src/`, or templates. Samples only.
- Do not land. Commit notes, HTML, and screenshots only on your job branch. Nothing goes to `main`.
- No Cursor CloudAgent.
- Plain technical English (about 80% of ASD-STE100).

## Lead synthesis

The lead compares the four systems side by side (same content where possible) and writes `group/synthesis.md`: **one visual system** (or a mix of at most two), the deciding screenshots, the final token table, and a short build plan for the live viewer as a later, separate feature that waits for Adam's "land". The bar and the 5-second read decide ties. Nothing merges.
