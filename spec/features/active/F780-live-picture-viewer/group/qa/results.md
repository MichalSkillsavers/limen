# Live picture navigation QA

The lead's integration build from candidate `a4e7d25` passed the full model-driven browser sweep. Input: `/tmp/f780-lead/build/map.html` and `/tmp/f780-lead/build/map.json` (`architecture-map-model/3`, 158 ticket work items). This was the lead's published build #3, not the older pre-polish HTML.

Run from the Team 5 worktree after `npm install --prefix /tmp/f780-team-5 --no-save playwright`:

```sh
node spec/features/active/F780-live-picture-viewer/group/qa/sweep.mjs /tmp/f780-lead/build/map.html /tmp/f780-lead/build/map.json
```

Observed output, exit 0:

```text
routes=563 checked_links=45032 layer_depths=3 scroll_y=700 widths=1440,1240,900 failures=0
```

An independent `node bin/limen picture build --dir /Users/overment/.overment/limen/.limen/picture --out /tmp/f780-team-5/integration.html --json /tmp/f780-team-5/integration.json --strict` from the lead's `a4e7d25` worktree exited 0: `picture: 23 places, 41 edges; wrote /tmp/f780-team-5/integration.html`. It reported four `source.missing` warnings for old map citations (F741, F728 twice, F740), with no errors. Sweeping that independently built HTML and JSON produced the same output above, exit 0. `npm run typecheck` and scoped `npx biome check` also exited 0 on the Team 5 candidate.

Each route came from the JSON model and was loaded from its hash as a fresh document in headless Chrome. The sweep checked the opened target, visible `undefined`/`null`/`NaN`, each rendered in-page link against model referents, script errors, external network requests, and horizontal overflow. It exercised 1/2/3 layer deep links after reload; Esc, Back, trail jumps to a layer and to Page, and arrow context switching; opening by click and page scroll after open/reload/Back; Tab order, visible focus after closing a restored layer, `/` filter focus, and Esc from the filter. Browser viewport widths were 1440, 1240, and 900 px.

A real earlier failure was reproduced on build #1: `#plant~work/f013` after reload and Esc focused `BODY` instead of a visible page control (`failures=1`). Team 4 fixed that in `1ff1c4f`; the same check passed on its candidate and in this integration build. The earlier data-only builder sample was not a viewer candidate. Renderer candidate `9186c68` passed 549 routes before the lead backfilled touches; final renderer candidate `855c92d` and layer candidate `1ff1c4f` each passed 563 routes.

The lead then found one path the sweep did not cover and added it to `sweep.mjs`: open the page with no hash, scroll to 300, open the Needs Adam pin as a layer, reload, and press Esc. On build #3 the page redrew (`failures=1`, `FAIL (no hash) closing the last layer after a reload redrew the page: {"before":300,"closed":{"hash":"","scroll":0,"focus":"BODY"}}`). The lead fixed it in `52430fd` (an empty hash counts as the plant in `viewer.js`). The same sweep on the fixed build printed `routes=563 checked_links=45032 layer_depths=3 scroll_y=700 widths=1440,1240,900 failures=0`.

Headless-only screenshots of the integration build are in `group/shots/team-5/`: `overview-1440.png`, `overview-1240.png`, `overview-900.png`, and `layers-1440.png` (the settled two-layer view). Browser-check changed desktop focus once during an attempted visual preview; the session was closed and the lead was notified. No further on-screen or hidden-window preview was used.
