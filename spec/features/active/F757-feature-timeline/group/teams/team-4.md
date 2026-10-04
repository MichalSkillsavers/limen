# Team 4 · Generic dated marks

Hypothesis: one general list fits every feature: `marks`, a block list of strings in the form `"YYYY-MM-DD · kind · text"`, where `kind` is one word from a fixed set (`decided`, `shipped`, `open`). The build splits each string only on ` · ` and places it on a date axis; it does not read the text. A missing date puts the mark in an undated lane at the end. Color comes from `kind`. A click on a mark opens the cited place or source detail. A stronger model writes better marks; the shape stays the same.

Test it on a `/tmp` copy of `alice.feature.cloud-choice`. Cut first: start with the marks only, then add back a piece only when a screenshot shows a reader cannot decide without it. Check that the split on ` · ` is the only parsing, so it is not prose interpretation.

Same brief rules: Playwright on `file://`, shared screenshots in the group `shots/team-4/` folder, read the other teams' newest screenshots before each cut, a screenshot path and what it showed for each claim, commits only on your job branch, no landing.
