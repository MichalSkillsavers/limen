# Synthesis · live picture built from specs, with stacked layers

**Result:** one integrated candidate, merged from all six teams, landed on `main`. `limen picture build` now renders the merged layout Adam approved on 5 October from the map, the tickets, and the board. No hand data.

**Page for Adam:** `/Users/overment/Downloads/limen-picture-live.html`. Shots of the final build: `group/shots/lead/`.

## What each team gave

| Team | Took | Commit |
| --- | --- | --- |
| 1 · Data contract (Sol) | Ticket front matter (`touches`, `opened`, dated `needs-adam`, dated `wrong`, `landed`), ticket reader with strict checks, template, contract, docs, backfill of active and October done tickets | `88fb3dc` |
| 2 · Builder model (Sol) | Board reader, `architecture-map-model/3` with `work`, `pins`, `days`; byte-identical builds; diagnostics print `ticket.md:line` | `c50ed30` |
| 3 · Renderer (Opus) | The F775 merged page as the real viewer: atlas, decide column, two-line pins, purpose lines, "Where you are" trail, Back, Esc, hash links | `855c92d` |
| 4 · Layers (Opus) | `layers.js` and `layers.css`: stacked layers, stack trail, Esc and Back close one, arrows switch context, URL holds the stack, focus and scroll kept | `1ff1c4f` |
| 5 · Navigation QA (Sol) | Headless route sweep (563 routes, 45,032 links, 1/2/3 layers, three widths) and keyboard checks | `f70c46b` |
| 6 · Cold-reader polish (Opus) | Contrast to AA, plain wording, one spacing scale, no page move when a layer opens; patches taken by Teams 3 and 4 | `e0ad02d` |

## Lead decisions and fixes

- Pins are never invented. Needs Adam shows the one open owner choice found in a file (the F759 synthesis question about change counts). Wrong shows the open hosted-pane problem (F777). Empty pins read "Nothing waits for you." and similar.
- Default column stays quiet: Needs Adam, Wrong, In progress, newest landed; the full list of 158 tickets sits behind the Work tab and the filter.
- Backfilled `touches` on the 11 active tickets Team 1 left empty: the seven picture studies touch the viewer, the two seat guides touch the seat registry, the styleguide scan touches the plant, and the finish-signal ticket touches four places. After merging `main`, the two new active tickets (F776, the second F778 folder) got front matter too.
- Fixed one defect the sweep missed (`52430fd`): opening a layer from a page with no hash, reloading, and closing the last layer redrew the page (scroll to top, focus lost). The sweep now covers that path; it failed before the fix and passes after.
- `main` now has two active folders numbered F778. The builder keeps the first folder in lane order as the work item and warns `ticket.duplicate-id` for the second (`7e11c21`, with a test that fails without the change). Renumbering one folder is the coordinator's call.
- The speech register now allows the picture front matter in tickets (`templates/communication.md`).

## Checks

All on the final integrated tip, headless Chrome only:

- `limen picture build --strict` on this plant: exit 0. Warnings: four stale map source paths and the duplicate F778 folder; no errors.
- A throwaway repository with one ticket that names `limen.picture.viewr`: exit 1, stderr `error ticket.unknown-touch spec/features/active/F999-bad/ticket.md:3: unknown place id "limen.picture.viewr"`.
- QA sweep (`group/qa/sweep.mjs`): `routes=565 checked_links=45642 layer_depths=3 scroll_y=700 widths=1440,1240,900 failures=0`.
- Lead layer probe at 1440, 1240, and 900: Needs Adam pin opened by keyboard, two more layers stacked, reload restored all three, Esc closed one, Back and Forward moved one, the trail jumped to layer one, ArrowRight switched context with no new history entry, closing the last layer kept scroll 300 and put focus on a page row; no page move on open, no horizontal scroll, no network request, no script error.
- Typecheck and Biome: clean. Full test suite: see the landing note.

## Friction

- `group start` refuses a lead that is a limen job (`LIMEN_JOB=1`). The lead registered its own session under `.limen/group-leads/` and ran lead commands with `LIMEN_JOB` unset and `PI_SESSION_ID` set. Peer messages then reached the lead only through `limen group wait`.
- One route per team: a Sol and Opus mix inside one team is not possible.
- Team 5's worker launch timed out under a load average near 350; Team 5 worked inline.
- A hidden-screen preview (browser-check on vscreen) changed Adam's keyboard focus once (1Password to Helium). All later checks were headless only.
- `limen land` needs a done job; the lead is a running job, so the integrated branch landed by a plain merge into `main`.

## Limits

- The map dataset is the local snapshot from 6 October; four of its source paths are stale (`source.missing` warnings).
- The F780 work item shows no board line, because the board has no F780 entry yet.
- The page is rebuilt by `limen picture build`; nothing rebuilds it when a ticket changes.
