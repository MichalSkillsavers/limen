# F761 · An issue body rings the GitHub doorbell like an issue comment

## Outcome

An authorized collaborator can open an issue with `@limen` or `/limen` in its body, and the registered Herdr coordinator wakes the same way it does for an issue comment. Today only a new comment on an open issue counts (F760). Adam asked for this on 2026-10-04. The GitHub App already has Issues read and write.

## Scope

- **Start:** the poll loop in `src/integrations/github-poller.ts`. It reads only `/repos/<repo>/issues/comments` with one cursor (`cursor.json`), and it names each claim by comment ID (`claims/<id>.json`).
- **What counts:** the body of an open issue that is not a pull request, opened after the binding's `connectedAt`. The title alone does not count. A closed issue does not count. A pull request body still does not count.
- **Once per issue:** one claim per issue body. The body as the poller first reads it decides. A later edit to the body never makes a second claim.
- **Who counts:** the issue author must have `write`, `maintain`, or `admin` on the bound repository, the same check as for comments.
- **Order:** the same claim before the handoff, one start reply, and one terminal reply, both posted as issue comments. No merge, no approval.
- **Claim name:** an issue body claim must not share a file name or ID with a comment claim. `limen github work` and `limen github resolve` accept the ID that the coordinator prompt gives. `limen github review` refuses it, as for an issue comment.
- **Cursor:** issue bodies use their own cursor. A missed or failed poll does not skip an issue, and a repeat poll does not claim one twice.

## Out of scope

- Pull request behavior, prompts, and tests.
- Issue comments (F760 behavior stays unchanged).
- A new GitHub App, permission, webhook, or seat change.
- The install at `/opt/limen` on the Alice computer.

## Acceptance

- A test: an authorized issue opened with `@limen` in its body writes one claim and hands off one prompt that names the issue.
- A test: the same issue from a user with `read` or `triage` permission writes no claim.
- A test: `@limen` only in the title writes no claim.
- A test: a closed issue with `@limen` in its body writes no claim.
- A test: a pull request with `@limen` in its body writes no claim.
- A test: a second poll, and an edit to the body, write no second claim.
- A test: an issue body claim and a comment claim on the same issue both exist without a collision.
- A test: `limen github work` on an issue body claim starts one job, and the poller posts one start reply and one terminal reply.
- The existing pull request and issue comment doorbell tests pass unchanged.
- `docs/remote.md` says that the issue body counts and the title does not.
- `npm run check` passes.
