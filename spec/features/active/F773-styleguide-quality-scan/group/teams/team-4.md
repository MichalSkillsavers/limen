# Team 4 · Readability of code

Hypothesis: compression costs more readability than length does. Look for long one-line expressions, nested ternaries, dense boolean conditions, chained regular expressions, unnamed magic values, and names that do not match the repository words (job, worktree, pulse, wake, ticket, board). Scan `src/`, `hook/`, and `bin/` (`bin/limen`, `bin/limen-group-fixture.mjs`, `bin/tony-finish-ping.sh`). For each case, show the current code and a short sketch of the clearer shape. Keep the styleguide bar: plain functions and early returns, no new helpers for a single use, no rewrite to match a model's taste. Report a pattern once with its worst examples, not every instance.

Same brief: read the sources of truth fully first, cite path, lines, and a quote for each finding, publish findings, read peers before each new finding, commit only `group/teams/team-4-result.md` on your job branch, no land, no product edits.
