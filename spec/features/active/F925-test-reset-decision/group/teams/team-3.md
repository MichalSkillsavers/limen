# Team 3 · Challenger

Route: Sol (`openai-codex/gpt-6-sol`) for the coordinator and the worker.

Shape: argument. Deliverable: `group/teams/team-3-challenge.md` committed on your branch.

Hypothesis to test: a full rip-out is the wrong first move. While no scenario test exists, Limen has no safety net for the hard-won edge cases: process races, stale locks, hosted pane state, webhook security. Agents land code every hour on this plant.

Start here:

1. Find the real risk of deleting everything at once. Look for tests that encode a bug that cost real time: a race, a lost wake, a lock, a security allowlist, a dirty-target land. Use `git log` and the feature folders in `spec/features/done/` to find the incident behind each one. Name each with its commit.
2. Find the cost of keeping the suite: run time (`/tmp/f783-lead/full-suite.tap` has per-test `duration_ms`), random failures under load, and the friction each refactor pays.
3. Compare three paths: rip out all tests at once and rebuild; delete in stages behind new scenario tests; keep and cut. For each, give the time to the end state, the risk window, and what could break unseen.
4. Pick the fastest safe path. If you find that a full rip-out is safe, say so; the job is to find the truth, not to win.
5. Publish your strongest risk by minute 35. Challenge Team 2's design: which real bug would its scenarios miss? Challenge Team 1's scores: which "delete" is a test that caught a real bug?

Done when the note has the risk list with commits, the cost list with numbers, the three-path comparison, your pick, and the section "Points from other teams".
