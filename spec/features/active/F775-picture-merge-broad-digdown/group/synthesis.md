# Synthesis · one merged picture

**Pick:** a merge of the three finished team samples. The plant atlas stays on screen beside a quiet decide column. Team 4 stopped and is not used.

**File:** `/Users/overment/Downloads/limen-picture-merged.html`. A copy is in this folder as `limen-picture-merged.html`. It is offline and self-contained, with no network requests.

## What the merge keeps

From the atlas (live map, Teams 1–3):

- The whole plant on the first screen. It shows 6 modules, 18 places, and all 41 connections of map snapshot `1cecf60` (3 Oct). Operator commands is the top band, the four working modules are the middle row, and the Job cabinet is the floor. Module links show their count of place-level connections (`01-overview.png`).
- Feature-to-place lighting from the real touch lines. A selected feature lights its places and draws its own connections (`03-feature-lights-plant.png`).
- Journeys as numbered steps on the places (`05-journey-step.png`).
- Each place lists the work and journeys that name it (`06-place-names-work.png`).

From the dig-down (F768, F769, F774):

- Sticky Changed, Wrong, and Needs Adam pins, each with a date and scope. Red means a problem and indigo means a decision.
- One quiet reading column. Mid opens under its row and deep opens under the mid.
- A written purpose on every row and a plain gloss on every place.
- A labelled "Where you are" trail and a "Back to …" button at every depth. Esc goes up one step.

## How it answers Adam's four points

1. **Broad picture.** The atlas never closes. It stays sticky at 1440×900, and when the window is narrower than 1240 px it moves above the column.
2. **Padding.** One spacing scale is used. The whole plant fits without scrolling at 1440×900.
3. **Links.** Every state has a hash link that survives a reload. A place opened from a feature (`#place/<id>/via/work/<id>`) opens under that feature and keeps its lighting (`04-place-under-feature.png`). Place to feature, feature to journey, and day to feature links all work in both directions.
4. **More than what is in place.** Work is grouped as Needs Adam, Wrong, recent picture work, and map features. Days show what changed on each date (`07-day.png`).

## Try first

Click the **Needs Adam** pin (`02-needs-adam.png`). Then click **Offline map viewer** in its place list. Press Esc twice to go back up.

## Checks run

- I opened 228 hash routes in a hidden test Chrome. No route showed `undefined`, `null`, or `NaN`. No in-page link resolved to a missing target, and every non-plant route opened its entry.
- Click-through tests passed for pins, place-under-feature, deep links, atlas chips, Esc, the Back buttons, and the filter. When a reader goes up, the column reveals the parent row.
- I captured the shots at 1440×900 in `group/shots/synthesis/`. I also looked at the layout at 1180 px and 900 px wide. No human was timed for reading speed.

## Limits

- The 15 map features and 5 journeys come from the 3 Oct snapshot, not live state.
- The F754–F775 picture entries and their place touches are composed from tickets and the board. F774, F775, F756, F768, and F769 touches are marked *proposed*.
- The Days list shows 5, 4, and 3 Oct only.

## Ask

Park this as the reference picture, or request a live build of the picture viewer? Nothing is landed.
