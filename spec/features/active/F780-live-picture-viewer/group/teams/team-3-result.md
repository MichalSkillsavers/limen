# Team 3 result · Merged layout renderer

The approved merged picture (F775 reference) is now the real viewer. `picture/viewer/template.html`, `viewer.css`, and `viewer.js` render it from the embedded `architecture-map-model/3`, with no hand data. `src/picture/html.ts` inlines Team 4's `layers.css` after `viewer.css` and `layers.js` before `viewer.js`; it checks the template before it reads the other four files, and a missing file fails the build.

Candidate branch: `limen/2026-10-05-f780-live-picture-viewer-team-3--9d1d0c59`. It contains Team 2 `c50ed30`, Team 4 `122f394`, the lead tips `44a9247` and `c8c44c2`, and the Team 3 worker branch (`b1bc40d`: new `test/picture-viewer.test.ts`, reference and live shots).

## What works

- **Same page as the reference.** Masthead with three sticky pins, the plant atlas (entry band, middle row, floor) with module wires and counts, the selection line, the legend, and the quiet column with the "Where you are" trail, Back, Esc one step up, tabs, filter, purpose lines, open entries, and deep cards. Side-by-side shots: `group/shots/team-3/reference/` and `group/shots/team-3/live/`.
- **Module rows from the map.** The entry module has the most outgoing cross-module links, the floor the most incoming. The middle row order minimises total link span, then wires that dip under the row, then puts modules more linked from the entry on the left. On this plant it reproduces the reference order.
- **Decide column.** Needs Adam (always shown, "Nothing waits for you." when empty), Wrong, In progress (active lane), and Landed recently (10 newest). Planned, dropped, older landed work, and map-only features show when the filter has text; an opened item always shows. Each work item has sources: ticket outcome, board line, map feature (`#work/<id>/evidence/<n>`).
- **Pins.** Newest item per kind with its date and "N more"; an empty pin says so in words and links to the work list.
- **Routes.** `#plant/<tab>`, `#work/<id>[/evidence/<n>]`, `#place/<id>[/via/work/<wid>]`, `#module/<id>`, `#journey/<id>[/step/<n>]`, `#day/<YYYY-MM-DD>`. The viewer reads only the part before the first `~`; layers own the rest. A hash change that only opens or closes a layer does not re-render the page.
- **Tokens.** One spacing scale `--sp-1…--sp-16` (4–64 px), radii, AA greys (`--mute #62676f`, `--faint #646971`, `--wire #868b92`); Team 4's layers use the same names.

## Checks run (on the candidate tip, headless Chrome only)

- `node bin/limen picture build --dir …/.limen/picture --out /tmp/f780-team-3/map.html --json /tmp/f780-team-3/map.json --strict`: exit 0, 4 warnings (old map source paths), 0 errors.
- `npm run typecheck`: exit 0. `npx biome check picture/viewer/viewer.js picture/viewer/viewer.css src/picture/html.ts test/picture-viewer.test.ts`: exit 0.
- `env -u LIMEN_OMP … node --test test/picture-*.test.ts`: 56/56 pass (before the last two viewer commits); `node --test test/picture-viewer.test.ts`: 12/12 pass on the tip. The worker confirmed three viewer mutations each fail exactly one test.
- Route sweep (`/tmp/f780-team-3/pw/sweep.mjs`, copy in `shots/team-3/live/sweep.txt`): 563 routes after reload, 0 failures, no horizontal scroll at 1440, 1240, and 900.
- Atlas fit: 236 routes at 1440×900, the atlas never needs its own scroll.
- Layers smoke on the real build: open as a layer, open a place inside it, reload restores both, Esc closes one, Back closes one, Esc with none goes up one step. `scrollY` and the open row stayed fixed through every step; the atlas lights the top layer's item; no page errors.

## Deliberate changes from the reference

- Pins show two lines (three at 1000 px and below), so the Needs Adam question reads whole; the masthead is 88 px (108 px narrow).
- Dimmed places change colour, not opacity, so their names keep 4.5:1 contrast (Team 6). The lens is a little softer than the reference.
- The selection line wraps to two lines instead of cutting a work title.

## Open risks

- With a different map, many middle modules (8+) skip the order search and keep model order.
- Focus after Esc on a restored stack lands on the page body (Team 5 found it; Team 4 owns `layers.js`).
- `--head` grows at 1000 px; a pin text longer than three lines is still cut (full text is in its title and its layer).
