# Team 1 · Value audit

Route: Opus (`anthropic/claude-opus-5-5`) for the coordinator and the worker.

Shape: survey. Deliverable: `group/teams/team-1-scores.md` committed on your branch.

Hypothesis to test: most lines in `test/` are mocks, copies of the code, wording checks, timing checks and duplicates. Fewer than a third of the lines guard a seam, and most real bugs were caught by a few end-to-end tests.

Start here:

1. Score every file in `test/` with the shared table in the brief. Read the tests, not only the names. A file can hold several classes; give the line split when it matters.
2. Sum the lines per class and per seam. Name the seams that have no real end-to-end test today.
3. Git history: for each file, find commits where a test change came with a `src/` fix for a real bug (the test caught or pinned a bug), and commits where the test changed only because the code was refactored or reworded. Useful starts: `git log --follow --format='%h %s' -- test/<file>`, commit messages with `fix`, and the F776 notes. Give a short list of tests that caught real bugs, with the commit, and the files that only broke on refactors.
4. Timing: use the per-test `duration_ms` in `/tmp/f783-lead/full-suite.tap` for the slowest files and tests. Name the tests that sleep or wait on wall-clock windows.
5. Publish the class totals and the five worst files by minute 35. Send Team 2 the list of tests that caught real bugs: their scenarios must cover those bugs.

Done when the note has the full table (all 58 files), the class and seam totals in lines, the bug-catch list with commits, the refactor-only list, the slow-test list, and the section "Points from other teams".
