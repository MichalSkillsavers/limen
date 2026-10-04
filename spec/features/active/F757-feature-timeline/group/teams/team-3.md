# Team 3 · Status strip, no axis model

Hypothesis: the simplest timeline is one horizontal strip with three fixed columns: **Was**, **Now**, **Next**. Each column holds at most three short lines that the model writes (`was`, `now`, `next` block lists in front matter). The build puts the lines in the columns; it does not order or interpret them. The places in `touches` show as small marks under the strip, and a click on a mark opens its place detail. Every feature uses the same three columns, so no feature needs its own layout.

Test it on a `/tmp` copy of `alice.feature.cloud-choice`. Cut first: start with the strip only, then add back a piece only when a screenshot shows a reader cannot decide without it.

Same brief rules: Playwright on `file://`, shared screenshots in the group `shots/team-3/` folder, read the other teams' newest screenshots before each cut, a screenshot path and what it showed for each claim, commits only on your job branch, no landing.
