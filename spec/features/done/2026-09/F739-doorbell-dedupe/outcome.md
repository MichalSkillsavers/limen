# Outcome

The automatic finish ping now claims once per job and final state, so jobs that end on the same commit each ring; the plant-wide `.limen/finish-webhook-tips/<sha>` claim is gone and old markers are ignored. A sender timeout gets one retry, and the job's `finish-webhook` file and log record both attempts or why the retry did not run. Landed fast-forward on `main` as `16939e1`, after `cf273fd` fixed the init stub test that failed inside any worker shell with `LIMEN_JOB=1`.

Evidence: finish-webhook and init tests 57/57 with `LIMEN_JOB=1`; full suite 494/496 under load, and the two failures (`continue` engine refusal, `diff` hunk version) passed 22/22 when rerun alone. A live receiver turn was not observed.

The retry is bounded by a 4 s total delivery budget, so after a 3 s timeout it has about 1 s, even for hosted jobs with no shutdown deadline. Under the load that caused the Alice timeouts it may time out again; widen the budget for hosted jobs if rings keep ending "acceptance unknown".
