# F761 worker notes

## Seams

- `src/integrations/github-poller.ts` `pollGithubIssues`: lists `/repos/<repo>/issues?state=all&sort=created&direction=asc&since=<cursor - 1s>`. Its cursor is `issue-cursor.json` (`{ number, createdAt }`) beside the comment `cursor.json`. An issue is skipped when its `(created_at, number)` is at or before the cursor. The cursor moves only after `acceptIssue` returns, so a thrown call leaves it in place. `project()` runs it after the comment loop.
- `acceptIssue`: counts only an open issue without `pull_request`, whose body (never the title) passes `mentionsLimen`, created at or after `connectedAt`, in the bound repository, by an author that `authorized()` finds with `write`, `maintain`, or `admin`. `authorized()` is the same permission call the comment path uses.
- `request()`: the claim, discussion, mirror, and handoff code that `accept` (comments) and `acceptIssue` share. `Trigger.command` is absent for a body claim, so the claim has no `command` field.
- Claim name: `issue-<number>` (string) for a body, the numeric comment ID for a comment. `claimId()` in `src/commands/github.ts` parses both for `work`, `review`, `resolve`, `deliver`, and the poller's reconcile loop. `GithubClaim.id` is `number | string`.
- Prompt and job text: a body claim says "opened by <actor> with the request in its body, claim issue-<n>" and "Triggering comment: none; the issue body carries the request". Comment and PR prompt text is unchanged.

## Decisions

- `state=all`, not `state=open`: an issue closed during paging would shift later pages and could be skipped for good. A closed issue is rejected per item instead.
- Cursor by `(created_at, number)`, not number alone: a transferred issue can carry an old `created_at` and a high number; a number-only cursor would then skip newer, lower-numbered issues.
- Branch for a body claim is `limen/github-issue-<n>-issue-<n>` through the existing `githubBranch`. Redundant but unique; no special case.

## Open

- `limen github status` still lists only numeric (comment) claims when it picks the latest local handoff. A body claim is not shown there.
- `npm run check` at `17a8e1d`: 597 of 598 tests pass. The one failure, `independent jobs can run concurrently and are merely announced` (`test/spawn-command.test.ts`), fails the same way on the base commit `037b08c`: the 400 ms fake agent ends before the second spawn looks, so no "already running" note prints. It is not in the GitHub code.
