# Team 3 · Merged layout renderer

Route: Opus (`anthropic/claude-opus-5-5`). On a 429, switch to Sol and publish it.

Hypothesis: the reference page (`F775-picture-merge-broad-digdown/limen-picture-merged.html`) can become the real viewer almost line for line. Its renderer already works from one data object; replace the hand data with the builder model and keep the layout, the spacing, and the routes.

Start here:

1. Take shots of the reference at 1440×900 first. They are the pixel target.
2. Port its markup, CSS, and render code into `picture/viewer/template.html`, `viewer.css`, and `viewer.js`. Keep the markers that `src/picture/html.ts` needs. Add the `layers.css` and `layers.js` inlining described in the brief.
3. Publish the CSS tokens (one spacing scale, colours) and the route table early. Team 4 builds layers on them.
4. Read only the model. Until Team 2 publishes `map.json`, adapt from the model 2 fields plus a stub of the brief's `work`, `pins`, and `days` shapes; then merge Team 2's commit.
5. Keep the atlas, sticky pins, purpose lines, "Where you are" trail, Back, Esc, and hash links that survive reload.

Done when: your build of the plant map matches the reference shots side by side, and `test/picture-viewer.test.ts` passes with the new viewer.
