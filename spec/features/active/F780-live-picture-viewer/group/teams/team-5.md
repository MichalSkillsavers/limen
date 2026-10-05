# Team 5 · Navigation and links QA

Route: Sol (`openai-codex/gpt-6-sol`) for the coordinator and the worker. Opus teams 3, 4, and 6 give the other view; compare your findings with theirs.

Hypothesis: most picture failures Adam saw were broken links and lost places after a click or a reload. A full route sweep in headless Chrome on every build catches them before Adam does.

Start here:

1. Port the F775 sweep idea (228 routes) to the live build: list every route from the model, open each with a reload, and check that the target opens, that no text shows `undefined`, `null`, or `NaN`, and that every in-page link resolves.
2. Add the layer routes from Team 4: one, two, and three layers, reload, Back, Esc, trail jumps.
3. Keyboard checks: Tab order, visible focus, Esc, `/` for the filter, and arrow keys in layers.
4. Run the sweep on each published candidate and on the lead's integration build. File each failure to its owner with `limen group publish --team team-N`, with the route, the expected result, and what happened.

Keep scripts and results in `spec/features/active/F780-live-picture-viewer/group/qa/`. Done when: the sweep runs on the integration build with zero failures, and the result file lists the route count and the real output.
