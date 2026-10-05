# Brief

## Shared outcome

Design the **best target layout** for the live limen picture / dashboard app, using **all** lessons from F768 dig-down and F769 grasp-test. Deliver **one polished end-goal HTML** Adam can click through as the **target product UI** (not a results summary deck). Stable path for the lead pick: `/Users/overment/Downloads/limen-picture-endgoal.html`. Write that path into `group/synthesis.md`. No land on main unless synthesis asks Adam park vs land.

## Locked lessons (must appear in every sample)

From F768 synthesis + F769 lead pick (all four grasp teams agreed):

1. **Shape:** one quiet reading column; mid opens under the clicked row; deep opens under mid (not three competing panes).
2. **Signal:** sticky Changed / Wrong / Needs Adam pins, one line each, full contrast at mid and deep, with date/scope. Red only for problem; indigo only for decide; nav stays ink.
3. **Purpose:** written kind + purpose clause on every entry, plus a plain place gloss. Bare IDs fail. Rule-made glosses that only repeat the place are not enough — prefer a real `why`.
4. **Where am I:** breadcrumbs / labelled trail as the default way back at mid and deep (adds no first-screen control). Escape and browser Back restore scroll.

Also keep F768 depth model: surface / mid (Decision · Touches · Evidence · Open) / deep / stop. At most 2 first-screen controls. No loud dashboard.

## Step 0 — study first (mandatory)

- Open `/Users/overment/Downloads/f769-grasp-results.html` and skim `f769-grasp-assets/team-*-result.md` plus the four `f769-*-sample.html` files.
- Open F768 samples `/Users/overment/Downloads/f768-team-1.html` … `f768-team-4.html`.
- Read F768 synthesis from a worktree, e.g. `git -C /Users/overment/.overment/.limen-limen-worktrees/2026-10-05-f769-t1-purpose-merge-92accd7e show HEAD:spec/features/active/F768-picture-dig-down-nav/group/synthesis.md` (or Read that path).
- Write 5–10 lines: what the endgoal must keep from F768 and from F769; name one concrete sample file for each point.
- Take `00-source.png` (1440 × 900) of the best starting sample you will refine.

## Phase A — Competing end-goal samples

Each team ships `sample-endgoal.html` (or `sample-team-N-endgoal.html`) in this feature folder on its job branch:

- Offline, self-contained `file://` product UI — **not** a results / scoreboard deck.
- Realistic limen picture content: features, days, places, owner decisions, wrongs, needs-Adam items drawn from real picture data (copy to `/tmp`; do not edit live `.limen/picture/`).
- Sticky pins; single-column dig-down; purpose lines; labelled crumbs; hash deep links preferred.
- Playwright screenshots 1440 × 900 under `<limen root>/.limen/groups/<group id>/shots/team-N/` and commit copies under `group/shots/team-N/`. Publish paths with `limen group publish`.

## Phase B — Lead synthesis (after teams publish)

Lead compares samples, picks one direction (may merge strengths), and:

1. Writes polished `/Users/overment/Downloads/limen-picture-endgoal.html` (the file Johnny will open in Adam's browser).
2. Writes `group/synthesis.md` with the pick, why, named shots, and the Downloads path.
3. Optional: a small compare deck — never as the primary deliverable.
4. States park vs land ask for Adam; **do not land** without that ask.

## Engine note (rate limits)

Anthropic Opus is rate-limited until roughly 20:41 Europe/Warsaw (2026-10-05). Prefer Sol (`openai-codex/gpt-6-sol`) for exploration and HTML craft now. If an Opus team hits 429, publish the error, keep Sol samples moving, and note that Opus polish can wait. Never Cursor CloudAgent.

## Rules

- Product language. Plain technical English (~80% ASD-STE100).
- Commit only on your job branch. Do not land. Do not push.
- Do not edit live viewer, map, `src/`, templates, or picture data.
- Each claim names a screenshot.
- Read peer findings and shots before each next cut.

## Deliverable per team

- `group/teams/team-N-result.md`: Step 0 notes, what the sample encodes from F768/F769, how to click through, risks.
- End-goal HTML sample on the job branch.
- Screenshots in `group/shots/team-N/`.

## Lead synthesis

`group/synthesis.md` + `/Users/overment/Downloads/limen-picture-endgoal.html`. Path must be in the synthesis. Nothing merges to main.
