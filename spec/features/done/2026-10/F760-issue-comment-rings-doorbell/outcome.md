# Outcome

An authorized `@limen` or `/limen` comment in an open issue conversation now wakes the registered Herdr coordinator, with the same permission check, claim, start reply, and terminal reply as a pull request comment. The issue body, the title, and comments on a closed issue do not count. `limen github work` and `limen github resolve` accept an issue claim; `limen github review` refuses it, because an issue has no pull request head. Pull request behavior and its tests are unchanged. Landed fast-forward on `main` as `086aeb9`.

Checks: the worker's full check had 592 of 594 pass; it fixed the template history failure, and the other failure was a wake-sweep timing limit. On the tip, typecheck and Biome pass, and the doorbell, doctor, template history, communication hook, and wake-sweep tests pass 66 of 66. The live bot on the Alice computer still runs the old install at `/opt/limen`; an issue comment works there only after that install is upgraded.
