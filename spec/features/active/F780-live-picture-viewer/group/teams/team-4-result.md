# Team 4 result · stacked layers and context switch

Important items open as stacked layers over the live picture page. Owned files: `picture/viewer/layers.js`, `picture/viewer/layers.css`, `test/picture-layers.test.ts`. Proven on the real built page (Team 3 viewer 9186c68 merged, model/3 from this plant), not only on a harness.

## What works

- **Open.** A pin, an "Open as a layer ↗" control, or any item link inside a layer opens a feature, map feature, place, module, day or journey as a new layer. Each open is one history entry. Opening an item already in the stack goes back to its depth.
- **Close.** Esc and browser Back close exactly one layer. Close buttons and a click on the scrim do the same.
- **Trail.** A thin trail on top of the sheet names each layer: `Page / F770 / Operator commands / F013 · remote-seat · One disk…`. Every crumb except the top one jumps to its depth; "Page" closes all. Lower crumbs use short names (code, or 18 characters) so four fit at 470 px; the trail scrolls sideways and keeps the newest crumb in view. The hint "Esc closes the top one" shows on the first layer only.
- **Context switch.** ← Previous / Next → buttons and ArrowLeft/ArrowRight move the top layer to the previous or next item of the same kind. The count names what it counts, for example "3 of 141 done features" or "14 of 18 places" (both seen on this plant). The URL changes with `replaceState`, so no history entry is added and Back still closes the layer.
- **URL.** `hash = base ('~' kind '/' id)*`, as published in contract v1. A reload restores the same stack and trail. A shared link with N layers rebuilds N+1 history entries, so Back closes layers one by one. Unknown kinds, dead ids and repeated segments are dropped and the URL is corrected.
- **Page never moves.** Scroll lock with the scrollbar width given back as body padding, and the sheet shifted by the same width. Layer history entries use manual scroll restoration and carry the page scroll (`pageY`), so Back, Forward, Esc and reload leave `scrollY` unchanged. This fixes the scroll jump that the Team 4 coordinator found on a deep link (scroll 700 became 0 after Esc ×3).
- **Placement.** At 1241 px and wider the sheet covers exactly the reading column (470 px), so the atlas that `onChange` lights stays in view, and the scrim is light. At 1240 px and narrower the sheet is up to 760 px wide. Lower layers show an 8 px edge in the column gap. The sheet reaches the bottom edge of the window, so no cut page text shows below it.
- **Focus.** On open, focus moves to the layer title. Tab and Shift+Tab cycle only through the trail and the top layer. On close, focus returns to the control that opened the layer. If the page redrew that control, focus goes to the control with the same `data-layer` value. After a reload no opener is known, so focus falls back to the page control for the closed item, or to the body.
- **Motion.** 160 ms slide and fade; none under `prefers-reduced-motion` (checked in Chrome: `animation-name` is `none`). A context switch has no motion.
- **Wording (Team 6 findings taken).** "Work that touches this place / module"; no "Layers" label; first crumb "Page"; plural-aware counter; "On the board · Now · active" (or "Proven" when the section and the state are the same); "The ticket names no places; these come from the map."; connections read "<a>X</a> generates this place" or "This place depends on <a>X</a>", with the edge title as small text; dates read "6 Oct", with the year only when it differs from the build year (from `model.generatedAt`, not the clock); day rows read "Opened <a>6 Oct</a>"; journey steps show their step sentence under the place.

## Sibling order (context switch)

- Ticket work: the same lane as the open item, newest ticket number first. This is the same order the decide column uses, and it does not mix 158 items across lanes.
- Map features, places, modules, journeys: model order (the order the atlas lists them).
- Days: newest first (model order).
- A switch skips items that are already lower in the stack.

## Checks run (real output)

- `npm run typecheck`: exit 0.
- `npx biome check picture/viewer/layers.js picture/viewer/layers.css test/picture-layers.test.ts`: "Checked 3 files … No fixes applied", exit 0. The first run found a formatter error in layers.js; `--write` fixed it.
- `node --test test/picture-layers.test.ts test/structure.test.ts`: 9 tests, 9 pass, 0 fail.
  - The layer test covers: split/join round trip with `~` as `%7E`; empty base; unknown kinds and bad encoding; one entry per open and Esc goes back one; going back to the depth of an item already open; a context switch replaces the entry, keeps the lane order, and Back closes; a three-layer link rebuilds four entries and Back closes them one by one; a reload keeps its history; dead segments are dropped and the URL is corrected.
  - Mutation check: three changes made the test fail as expected. Changing the switch to `pushState` failed the context-switch test. Removing the base `replaceState` from the rebuild failed the shared-link test. Removing the `%7E` encoding failed the round-trip test. Each change was then reverted.
- `node bin/limen picture build --dir /Users/overment/.overment/limen/.limen/picture --out /tmp/f780-team-4/map.html --json /tmp/f780-team-4/map.json --strict`: exit 0, 15 warnings (11 no-touch tickets, 4 old map citations), 0 errors.
- Headless Chrome on `/tmp/f780-team-4/map.html` (`/tmp/f780-team-4/worker-smoke.mjs`; scrollbars shown, reduced motion), at 1440, 1240 and 900 wide, ALL PASS (29, 28, 28 checks). The run uses the keyboard only to: open with Enter on a pin; Tab to a link inside the layer and press Enter twice to reach three layers; reload; Esc; Back and Forward; Tab to the layer-one crumb and press Enter; ArrowRight; Back; Tab to the Page crumb and press Enter. It also checks that focus returns to the opener. Through all of this, `scrollY` stays at 700 and the reading column's left edge does not move, with no horizontal scroll. At 1440 the sheet edges equal the column edges (931–1401) and the atlas (right edge 907) is not covered. It also checks a fresh-tab deep link (four entries plus about:blank; Esc ×3 reaches `#plant/work` and keeps scroll) and a dead-segment link (corrected to `#plant/work~place/limen.commands`).
- All-items sweep (`/tmp/f780-team-4/sweep-kinds.mjs`): all 216 items (158 work, map features, 23 nodes, top modules, 9 days, 5 journeys) open as layers. No layer text shows `undefined`, `null`, `NaN` or `[object`. No page errors.
- Not run: the full `npm test`. `test/picture-viewer.test.ts` fails 18/18 on this branch, and fails the same way with my layer changes stashed. It belongs to Team 3: their test still targets the old viewer, and their worker is rewriting it.

## Shots

`group/shots/team-4/`: `layers-1440-1.png`, `layers-1440-2.png`, `layers-1440-3.png`, `layers-1240-3.png`, `layers-900-3.png`. All are from the real built page, with the lit atlas beside the layers at 1440.

## Open risks

- After a reload, focus cannot return to the original opener, because no opener is known. Esc to the page then leaves focus on the body when the closed item has no page control.
- Layer history entries stay on manual scroll restoration. The page entry goes back to automatic when the stack empties. A viewer change that scrolls the page from a layer entry would not be undone by Back; viewer.js does not do this today.
- Layer bodies render their own wording. If Team 3 changes the column wording, the two can drift apart. The lead decision (event 00000058, item 4) asks Team 6 to review both.
- With a very deep stack (5 or more layers) at 470 px, the left of the trail scrolls out of view. The newest crumb stays visible. Tab should scroll a focused crumb into view; this was not shot at 5 or more layers.
