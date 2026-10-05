# Team 1 · GitHub integration study and App guide

Read the GitHub code in `src/`, `docs/seat/github-setup.sh`, the units, and the doorbell sections of `docs/remote.md`. Publish a fact sheet early (in the first 15 minutes) for team-3. It covers: the App permissions that the code really uses (the endpoints it calls), webhook off, how the PEM is read, the poller environment keys, the sudo handoff lines, what `connect`, `status`, `doctor`, and `ensure` check, what triggers a wake (PR `/limen review`, issue comment `@limen`, issue body `@limen`) and what does not, the claim and cursor paths, and the `/opt/limen` same-version rule.

Then make the clarity pass on the "GitHub doorbell" section of `docs/remote.md` and on the `github-setup.sh` comments and error text. Optional: a small preflight in `github-setup.sh`, only if it removes a real step. Do not change other sections of `docs/remote.md`; team-2 owns them.

Same brief rules: sources for every fact, read-only Alice checks only, commits only on your job branch, no landing, no push, plain technical English.
