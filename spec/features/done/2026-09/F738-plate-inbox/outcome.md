# Outcome

`limen status` is now a one-screen inbox: Running, Ready to land (done with unlanded commits), Needs a decision (failed or stopped with unlanded commits), and an `Older: N records` line, with `--all` for history. A commit counts as landed by ancestry or patch-id, so cherry-picked and integration-merged work clears; `limen prune --retire` uses the same answer. Landed fast-forward on `main` as `39a22e1`.

Evidence: synthetic cabinet of 2,000 records and 1,500 branches ran in 1.7–1.8 s with Herdr off (previous code 64.9 s); `npm run check` passed in the worker. On this plant with Herdr on, `limen status` took 4.7 s wall, so Herdr enumeration uses most of the 5 s budget. The Alice plant's 1,988-record cabinet was not measured.
