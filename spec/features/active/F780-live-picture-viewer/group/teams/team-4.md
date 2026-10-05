# Team 4 · Stacked layers and context switch

Route: Opus (`anthropic/claude-opus-5-5`). On a 429, switch to Sol and publish it.

Hypothesis: a layer is a larger view of one important item (a Needs Adam item, a place, a feature, a day) that opens over the page. A second item opened inside it stacks one more layer. A thin stack trail at the top of the layers names each layer, so Adam can jump to any depth. Esc and browser Back close one layer. The page behind never moves. The URL holds the whole stack, so a link or a reload restores it.

Start here:

1. Publish the URL format and the `PictureLayers` API in the first 30 minutes (start from the brief defaults). Ask Team 3 and Team 5 to acknowledge.
2. Build `picture/viewer/layers.js` and `layers.css` on Team 3's tokens. Keep focus inside the top layer, return focus to the opener on close, lock the page scroll without a width jump, and use short motion that respects `prefers-reduced-motion`.
3. Context switch: from inside a layer, Adam can move to the next or previous feature, place, or day without closing the stack (for example with arrow keys and visible buttons). Decide and publish how this changes the URL.
4. Mark which items open as a layer: Needs Adam and Wrong items, places, modules, features, and days. Agree the hook in `viewer.js` with Team 3; send it as a patch if Team 3 owns the line.

Done when: open three layers, reload, and the same three layers return; Esc closes one at a time; the trail jumps to layer one; keyboard alone can do all of it. Shots of one, two, and three layers at 1440×900.
