# Brief

## Shared outcome

Merge the **best of both worlds**: the live limen picture's **broad architecture atlas / overview** with the F769/F774 **fast-read dig-down** (quiet column, sticky Changed / Wrong / Needs Adam pins, purpose lines, labelled crumbs). Deliver **one polished merged HTML** Adam can click through. Stable path for the lead pick: `/Users/overment/Downloads/limen-picture-merged.html`. Write that path into `group/synthesis.md`. No land on main unless synthesis asks Adam park vs land.

## Why now (Adam feedback on F774 endgoal)

Adam on `~/Downloads/limen-picture-endgoal.html`:

1. UI does **not** show the broad picture.
2. Padding struggles.
3. Links / nav between features and architecture elements are broken.
4. Lost the main value of understanding the broad picture — only surfaces what is already in place.

So F774 dig-down clarity is valuable, but it threw away the atlas. This group restores overview without abandoning decide-speed.

## Locked dig-down assets (must survive in every sample)

From F768 + F769 + F774:

1. **Shape:** quiet reading column for dig-down; mid under row; deep under mid (not three competing detail panes as the only view).
2. **Signal:** sticky Changed / Wrong / Needs Adam pins, full contrast at depth, with date/scope. Red = problem; indigo = decide; nav stays ink.
3. **Purpose:** written kind + purpose on every entry, plus a plain place gloss.
4. **Where am I:** labelled breadcrumbs / trail as default back at mid and deep.

## Broad-picture assets to restore (must appear)

From live picture (`docs/picture.md`, `picture/viewer/`, `.limen/picture/map.html`):

1. **Architecture overview** a cold reader can hold: plant / modules / places and edges between them.
2. **Feature ↔ place lighting:** selecting a feature (or journey) shows which places it touches — not only a flat list of work already in place.
3. **Working nav** between features and architecture elements (hash deep links preferred; no broken feature→place or place→feature routes).
4. Overview must remain usable when dig-down is closed (atlas is not a one-shot splash that vanishes forever).

## Step 0 — side-by-side critique (mandatory before design)

Write 8–15 lines covering:

- What the **live atlas** does well (name concrete UI from map.html / viewer template).
- What the **F774 endgoal** does well (pins, column, purpose, crumbs).
- What Adam lost in F774 (broad picture, padding, broken feature↔architecture nav).
- One concrete keep-from-atlas and one keep-from-digdown for your hypothesis.

Sources (read-only; copy live picture data to `/tmp` if needed):

- `docs/picture.md`, `templates/picture/CONTRACT.md`, `picture/viewer/{template.html,viewer.css,viewer.js}`
- `.limen/picture/map.html` (live; do not edit)
- `/Users/overment/Downloads/limen-picture-endgoal.html`
- `/Users/overment/Downloads/f768-team-*.html`, `f769-team-*-sample.html`, `f769-grasp-results.html`, `f769-grasp-assets/`
- F774 ticket/brief/teams and any committed samples in worktrees / group `3ad17c81-966d-4dc5-b95e-6bd2c6a2b359`

Take `00-source.png` (1440×900) of the best starting reference you will refine (atlas **or** endgoal).

## Phase A — Competing merged samples

Each team ships `sample-merged.html` (or `sample-team-N-merged.html`) in this feature folder on its job branch:

- Offline, self-contained `file://` **product UI** — not a results / scoreboard deck.
- Realistic limen content: features, days, places, modules/systems, owner decisions, wrongs, needs-Adam — drawn from real picture data (copy to `/tmp`).
- Must include: architecture overview **and** dig-down decide path; sticky pins; purpose lines; labelled crumbs; working feature↔architecture nav; hash deep links preferred.
- Fix padding / spacing so the overview does not collapse or fight the dig-down chrome.
- Playwright screenshots 1440×900 under `<limen root>/.limen/groups/<group id>/shots/team-N/` and commit copies under `group/shots/team-N/`. Publish paths with `limen group publish`.
- **HTML preview: vscreen only. Never `open` (or equivalent) on Adam's main display.**

## Phase B — Lead synthesis

Lead compares samples, picks one direction (may merge strengths), and:

1. Writes polished `/Users/overment/Downloads/limen-picture-merged.html`.
2. Writes `group/synthesis.md` with the pick, why, named shots, Downloads path, and how the merge restores atlas + dig-down.
3. Optional small compare deck — never as the primary deliverable.
4. States park vs land ask for Adam; **do not land** without that ask.

## Engine note (rate limits)

Anthropic Opus remains rate-limited on this plant (F773/F774 still 429 as of 2026-10-05 ~20:20 Europe/Warsaw; earlier window was ~20:40). **All teams use Sol** `openai-codex/gpt-6-sol`. If someone retries Opus and hits 429, publish the error and continue on Sol. Never Cursor CloudAgent. OMP only. Thinking: coordinators xhigh, workers high.

## Rules

- Product language. Plain technical English (~80% ASD-STE100).
- Commit only on your job branch. Do not land. Do not push.
- Do not edit live viewer, map, `src/`, templates, or picture data.
- Each claim names a screenshot.
- Read peer findings and shots before each next cut.
- First tool action: `limen group publish "Initial hypothesis: ..."` from the approach note only.

## Deliverable per team

- `group/teams/team-N-result.md`: Step 0 side-by-side critique, how the sample merges atlas + dig-down, click-through, risks.
- Merged HTML sample on the job branch.
- Screenshots in `group/shots/team-N/`.

## Lead synthesis

`group/synthesis.md` + `/Users/overment/Downloads/limen-picture-merged.html`. Path must be in the synthesis. Nothing merges to main.
