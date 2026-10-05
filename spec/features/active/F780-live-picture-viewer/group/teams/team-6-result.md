# Team 6 · Cold-reader review and contrast

Status of each fix lives in the table at the end. Shots are in `group/shots/team-6/`. Contrast ratios are WCAG 2.x, computed against the effective background with ancestor opacity applied (`/tmp/f780-team-6/audit.mjs`).

## Findings on the reference page (input to the port)

Shots of the reference at 1440, 1240, and 900 wide: `group/shots/team-6/reference/`. No width has horizontal scroll. No route shows `undefined`, `null`, or `NaN`.

### Contrast (owner: Team 3, `viewer.css`)

- **C1 · faint text.** Reference `--faint:#8b9098` is 2.6–3.2:1 (meta lines, counts, arrows, footer). Team 3 already moved it to `#6b7078`. That value still fails on the tab strip `#ebe9e2` (4.10:1, the tab counts), on `--teal-bg` (4.25), `--indigo-bg` (4.41), and `--red-bg` (4.48). Replace with `--faint:#646971`: at least 4.55:1 on every palette background, 5.02:1 on paper. `--mute:#62676f` passes everywhere (at least 4.69:1). Keep it.
- **C2 · dimmed places.** `.lens .place{opacity:.42}` and `.atlas.preview .place:not(.pv):not(.lit):not(.focus){opacity:.42}` drop place names to about 2.6:1 while they stay clickable. Dim with colour, not opacity:

  ```css
  .lens .place:not(.lit):not(.focus):not(.near):not(.hov),
  .atlas.preview .place:not(.pv):not(.lit):not(.focus){opacity:1;color:var(--mute);background:var(--sheet);border-color:var(--line2)}
  ```

  Muted names stay at about 5:1 and lit places still stand out by teal fill and bold.
- **C3 · connection lines.** `--wire:#a3a7ad` is 2.31:1 on the atlas sheet. The lines carry meaning, so WCAG 1.4.11 asks for 3:1. Replace with `--wire:#868b92` (3.28:1 on sheet, 3.11:1 on paper), and use the same value in the grey arrow marker that `DEFS` hard-codes as `#a3a7ad`.

### Words only an engineer reads (owner: Team 3, `viewer.js` and `template.html`)

| # | Reference text | Replacement |
| --- | --- | --- |
| W1 | `map snapshot 1cecf60 · 3 Oct · design sample, not live` | `Built from the plant map of 3 Oct` (revision hash in a `title` attribute). "design sample, not live" is false on a built page. |
| W2 | Footer `Design sample for Adam, 5 Oct. … Nothing here is live state.` | `Built by limen picture build from the plant map of <map date>. Work, pins, and days come from the tickets and the board.` |
| W3 | Legend `module connection · number = place-level links` | `line between modules · number = connections between their places` |
| W4 | Legend `lit by the selected work or journey` | `lit: a place the open work, journey, or day touches` |
| W5 | Legend `partial in the map` | `only partly described in the map` |
| W6 | Selection line `(proposed touches)` | By `touchSource`: `ticket` → ` (places named in its ticket)`; `map` → ` (places named in the map)`; `none` → whole line `<b>F780 · title</b> names no place yet.` instead of "lights 0 places in 0 modules". |
| W7 | `1 entries`, `1 journeys`, `13 work` | Singular and plural for every count: `1 entry`, `1 journey`, `13 work items`, `1 connection`. |
| W8 | Edge kind `depends-on →` | Show the kind with spaces: `depends on →` (`kind.replace(/-/g,' ')`). |
| W9 | `Connections 0 out · 2 in` | `Connections 0 outgoing · 2 incoming` |
| W10 | Filter placeholder `Filter ( / )` | `Filter (press /)` |
| W11 | Group `Map features · snapshot 3 Oct` / `Source-backed features in the local map` | `Map features` / `Features the plant map describes` |
| W12 | Trail item `F775 · Adam sees the bro…` | Cut at a word boundary: `F775 · Adam sees the broad plant…`. |

Place glosses and "How it works" lines come from the plant map (for example "containment drill-down", "birth identity before signaling attributed descendants"). The map is read-only and out of scope, so they are not filed.

### Crowding and clipping (owner: Team 3, `viewer.css`)

- **L1 · pins clip the question at 900 px.** The Needs Adam pin reads `Park this merge, or request a live b…`. A cold reader loses the decision. At 1240 px and below, let pin text take two lines and raise the mast:

  ```css
  @media (max-width:1240px){
    :root{--head:88px}
    .pin .txt{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
  }
  ```

  Also put the full text in the pin's `title` attribute.
- **L2 · module glosses clip at 1440 and 900 px.** `Hooks carry guidance, steering, and wakes into…`. Change `.mod p` to `-webkit-line-clamp:3`. The stage has free height at 1440×900, so the plant still fits.

### Empty pins (owner: Team 3)

- **E1.** With no open ask, the mast still shows three pins with plain text: `Nothing waits for you.`, `No open problem.`, `Nothing landed yet.`, muted, linked to the work list. No empty box and no `undefined`. The lead adopted this wording.

## Findings on the data (Teams 1 and 2)

- **D1 · answered ask pinned (Team 1).** The first backfill pinned F775 with `Park the merged picture, or approve its landing?`. Adam had already answered it: F780 is the live build he asked for. Removed in `b2c965c`.
- **D2 · Wrong on the wrong ticket (Team 1).** F775 carried the end-goal layout's problem, which its own merge fixed. Removed in `b2c965c`. The open Wrong pin is now F777, an observed live problem.
- **D3 · pins never leave (Team 1).** The docs did not say when to remove a flag. `docs/picture.md` now says: remove a Needs Adam request after Adam answers, and a Wrong problem after the fix.
- **D4 · unclear ask (Team 1).** The F759 owner choice was first worded `Should change counts be written when the map refreshes, or read from Git during build?`. It now reads `Count each place's code changes when the map refreshes, or read them from Git at every build?` (`c667ef7`).
- **D5 · empty pin scope (Team 2).** 9 of 26 Changed pins had scope `Limen coding-job plant` because their ticket names no place. Scope is now empty for those, a module title when all places share one module, else `N places in M modules` (`f1c114e`).
- Checked and clean: no Markdown, link, or backtick leaks into work titles or purposes; no empty purpose (158 work items).

## Findings on the layers (owner: Team 4)

Reviewed `94c4747` inside the reference page with Team 2's model sample. Shots: `group/shots/team-6/layers-94c4747/`.

- Passes: the page behind does not move at any width (scroll position, column and atlas boxes unchanged after one and two layers). With forced 15 px classic scrollbars, the lost scrollbar width is compensated exactly. No horizontal scroll. No `undefined`, `null`, or `NaN`. Motion is 160 ms and stops under reduced motion.
- **Y1 · the sheet hides the atlas it lights.** At 1440 px the 760 px sheet covers x 656–922 of the atlas: all of External adapters. Above 1240 px, make the sheet the reading column's width (470 px) and wrap the head tools under the title.
- **Y2 · sliced pin text between trail and sheet.** An 8 px gap shows half-cut mast text. Join the trail to the sheet.
- **Y3 · `158 of 158`.** Count siblings in the same lane and name them: `2 of 9 active features`.
- **Y4 · connection rows read out of order.** `Publish a self-contained browser map: from Dataset validation and HTML build generates`. Use `<place> generates this place`, then the label.
- **Y5 · trail crumbs cut at 200 px** with free room. Let the current crumb take the free width.
- **Y6 · two date formats.** Layers print `6 Oct 2026`; pins print `6 Oct`. Use one.
- **Y7 · `Work that names it`.** The page says "touches". Use one word.

## Findings on the viewer candidate (owner: Team 3)

Reviewed `9186c68` (`/tmp/f780-team-3/map.html`) at 1440, 1240, and 900 wide. Before and after shots: `group/shots/team-6/team-3-9186c68/`. Tested patch: `group/teams/team-6-patches/team-3-viewer-on-9186c68.patch`.

- Passes: no horizontal scroll, no `undefined`, `null`, or `NaN`. Every padding, margin, and gap is on the `--sp` scale, except the intended `60vh` scroll room under the column. C1–C3, W1–W12, L1, and E1 are in.
- **V1 · pins still cut the question.** At 1440 px each pin is one line, so the Needs Adam question stops at `…when the map …`. At 900 px two lines still cut it. The patch gives pins two lines at every width and three at 1000 px and below.
- **V2 · module glosses cut** (L2 not enough with live text). The patch removes the clamp. The atlas still fits 1440×900 with no inner scroll.
- **V3 · dimmed connection counts at 2.15:1.** The patch dims only the lines. After it, the contrast audit finds no failing text on eight routes.
- **V4 · `25 more` is cut first** from a long Changed label. The patch moves it before the scope.
- **V5 · words.** `15 map notes` → `15 warnings`; `1 needs adam` → `1 Needs Adam`; `0 places` dropped from row meta; `0 places · lit in the plant` → `none yet`; `named by` and `names it` → `touched by` and `touches it`.
- Team 5 asked whether hiding the brand at 1240 px and below costs navigation. Checked: the atlas title links to the plant overview and sits in the first screen at 900×900, and Esc goes up. Not filed.

## Fix status

| Fix | Owner | Filed | Taken |
| --- | --- | --- | --- |
| C1–C3, W1–W12, L1, E1 | Team 3 | yes | yes (`9186c68`) |
| L2, V1–V5 | Team 3 | yes, as a patch | open |
| D1–D4 | Team 1 | yes | yes (`b2c965c`, `c667ef7`, `8d6f11d`) |
| D5 | Team 2 | yes | yes (`f1c114e`) |
| Y1–Y7 | Team 4 | yes | open |
