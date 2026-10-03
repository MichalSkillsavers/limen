# Outcome

A hosted OMP job now stays running when Herdr loses its agent row but the `omp` process is still on the recorded pane. Before the fix, recovery only accepted a `pi` or `node` process, so the reaper marked such a job failed. The regression (`7cbce5c`) failed on `main` and passed with the fix (`88fd5ac`); the coordinator reran both. Merged as `a1f9e4f`. The test `two long hosted labels keep distinct agent names` is unstable on `main` and on the fix (2 of 4 runs failed on each), so it is not caused by this change. No live Herdr run was done; details are in `reproduction.md`.
