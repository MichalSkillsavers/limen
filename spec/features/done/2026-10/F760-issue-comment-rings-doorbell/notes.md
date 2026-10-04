# F760 worker notes

## Seams

- `src/integrations/github-poller.ts` `accept`: after the permission check, `/pulls/<n>` is looked up first. A 404 there falls through to `/issues/<n>`. An issue counts only when it is open, its number matches, it has no `pull_request` field, and its `repository_url` is the bound repository. An issue claim reads only `/issues/<n>/comments` for discussion; there are no review threads.
- `src/integrations/github-review.ts` `GithubClaim`: a union. A pull request claim has no `kind` and keeps `base`, `baseRef`, `head`. An issue claim has `kind: "issue"` and none of them. `pr` holds the number for both, because GitHub numbers issues and pull requests in one sequence and persisted claims on seats already use `pr`.
- `githubSubject(claim)` gives `PR #n` or `issue #n` for every App reply and for `limen github status`. Pull request text is byte-identical to before.
- Work branch: `limen/github-pr-<n>-<id>` for a pull request, `limen/github-issue-<n>-<id>` for an issue. `matchedGithubJob` and `startGithubJob` share `githubBranch`, so the poller can match the job it started.
- `startGithubJob` refuses an issue claim without `--task` before it takes the inflight gate. A refused review leaves `work` and `resolve` open.
- `src/commands/github.ts` `deliver`: an issue claim gets its own coordinator prompt. It says it is an issue, has no base or head, and offers only `work` and `resolve`.

## Decisions

- Old claims on seats have no `kind`, so they stay pull request claims. No migration is needed.
- The issue body never triggers anything. The poller lists only `/issues/comments`, and `accept` reads only the comment body. The test proves that an `@limen` issue body with a plain comment makes no GitHub call.
- No change to App permissions: Issues read and write already covers the issue lookup and the replies.
