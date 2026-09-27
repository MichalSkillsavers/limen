# F738 · The plate is an inbox that answers in seconds

## Outcome

`limen status` answers "what needs me?" on one screen: what is running, what is ready to land, and what needs a decision, with older history behind `--all`. Work that already landed by cherry-pick or through an integration branch stops showing up. Stopped and failed jobs are never listed as waiting on the owner. On the Alice plant the plate listed 248 "waiting on owner" rows, mostly landed or stale, and took up to 137 s against a claimed 5 s, so coordinators and Adam stopped trusting it.

## Scope

- Default view, in this order: `Running (n)` with label · tab · minutes · last tool; `Ready to land (n)` for done jobs with commits not yet landed, last 7 days; `Needs a decision (n)` for failed or stopped jobs with commits, last 7 days; then `Older: N records (limen status --all)`. Coordinator tabs stay.
- "Landed" means reachable by ancestry or patch-equivalent (`git cherry` / patch-id) against the checked-out branch. Status and `limen prune --retire` use the same answer.
- Decide recency and state from cheap job files before rendering anything; batch Git per repository, not per job. Starting seam: the loop in `src/commands/status.ts`, which calls `renderJobDirectory` for every record before filtering.
- `limen status --all` shows older records under the same headings.

## Out of scope

- Recording an owning tab or land policy on the job — a later slice in this wave.
- Stall or liveness wording for running jobs.
- Reading `spec/build.md` or ticket lanes to clear rows; no Markdown parsing.
- Changing `limen jobs` output.

## Acceptance

- On a synthetic cabinet of about 2,000 job records and 1,500 `limen/*` branches, `limen status` returns in under 5 s; the measured time is in the commit message.
- A done branch whose commits were cherry-picked onto the checked-out branch appears under no heading.
- `limen prune --retire --dry-run` treats that cherry-picked branch as landed.
- A stopped or failed job with commits appears under Needs a decision and never under Ready to land.
- A stopped or failed job with no commits appears under no heading.
- A job older than 7 days is absent from the default view, counted in the `Older:` line, and listed by `--all`.
- `npm run check` passes.

## Notes

- A branch merged through an intermediate integration branch counts as landed when its patches are in the checked-out branch; no integration-branch registry.
- Parallel with the doorbell dedupe slice (F739); both may press the `src/` line budget in `test/structure.test.ts`, so expect a rebase at landing.
