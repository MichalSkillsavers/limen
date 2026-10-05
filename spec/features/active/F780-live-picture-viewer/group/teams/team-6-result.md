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

## Fix status

| Fix | Owner | Filed | Taken |
| --- | --- | --- | --- |
| C1–C3, W1–W12, L1–L2 | Team 3 | yes | open |
