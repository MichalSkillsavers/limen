---
touches:
  - limen.picture.build
  - limen.picture.viewer
opened: 2026-10-06
---

# F780 · Adam reads the live picture and its decisions from one built page

## Outcome

Adam opens one offline page that `limen picture build` makes from the plant's Markdown. It shows the merged layout he approved on 5 October: the plant atlas beside a quiet decide column, with sticky Changed, Wrong, and Needs Adam pins. Ticket front matter feeds the decide column, so the page stays current with no hand assembly. Important items open as stacked layers. Adam can step back one layer, jump to any layer, change context, and share a link that restores the whole stack.

## Scope

- The builder reads the picture map, the feature tickets, and the board into one deterministic offline model.
- Ticket front matter names the places a feature touches (map module ids), a Needs Adam ask, a Wrong problem, and dates. The ticket template and the picture contract define it.
- Build diagnostics and `--strict` cover tickets, so a bad place id cannot link silently.
- The viewer renders the merged layout from the model, with one spacing scale.
- Stacked layers with a visible stack trail, Esc, Back, context switches, and deep links.
- Backfill the front matter on the active tickets.

## Out of scope

- A background linker agent, or any model call during build.
- Changes to the tick trigger rules or to the place and edge schema of the map.
- Board edits by the builder. The board stays the owner of feature state.

## Acceptance

- `limen picture build --strict` on this plant exits 0. The output is one HTML file that makes no network request.
- A ticket that names an unknown place id makes `limen picture build --strict` exit 1. Stderr names the ticket path and the id.
- The page shows Needs Adam, Wrong, and Changed pins from ticket front matter, each with its date.
- A headless sweep opens every hash route after a reload. Each route opens its target, and no route shows `undefined`, `null`, or `NaN`.
- An item opened inside a layer stacks a new layer. Esc closes only the top layer. The stack trail jumps to any layer. A reload restores the whole stack.
- At 1440, 1240, and 900 px wide, the page has no horizontal scroll, and opening a layer does not move the page behind it.

## Notes

- Reference design: `spec/features/active/F775-picture-merge-broad-digdown/limen-picture-merged.html`.
- Final page for Adam: `/Users/overment/Downloads/limen-picture-live.html`.
