# Outcome

A finished job tab now closes, and the job log records the result (`closed`, `closed on retry`, `already closed`, or `failed after one retry`). A refused close is retried once. A running job tab label ends in `· running`. The coordinator title tail shows ` · N running · M finished`; a finished job stays in the count until it lands, its feature closes, or the owner writes again. Merged as `a73c023`.

Checks: the full `npm run check` on the merge passed 568 of 568 with exit 0. Live proof: hosted job `2026-10-03-f755-tab-closes-on-finish-proof-19e0e8f9` showed the label `tab closes on finish proof · F755 · running`, finished at 21:21:07.913Z, logged `herdr tab close wZ2:t2: closed` at 21:21:08.759Z, and its tab was gone at 21:21:09.7Z, about 1.8 s after finish. The tail word is `finished`, not the ticket's `done`, because failed and stopped jobs count too.
