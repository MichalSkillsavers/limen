---
touches:
  - limen.integrations.github
opened: 2026-10-04
landed: 2026-10-04
---

# F760 · An issue comment rings the GitHub doorbell like a pull request comment

## Outcome

An authorized collaborator can write `@limen` or `/limen` in an issue conversation comment, and the registered Herdr coordinator wakes the same way it does for a pull request comment. Today the poller reads every issue comment, but it drops a comment whose issue is not an open pull request. Adam asked for this on 2026-10-04. The GitHub App already has Issues read and write, so no new App or permission is needed.

## Scope

- **Start:** `accept` in `src/integrations/github-poller.ts`, where a failed `/pulls/<n>` lookup ends the handoff.
- **What counts:** a comment in the conversation of an open issue that is not a pull request. The issue body and issue titles do not count. Closed issues do not count, the same as closed pull requests.
- **Who counts:** the same permission check as today: `write`, `maintain`, or `admin` on the bound repository.
- **Order:** the same claim before the handoff, one start reply, and one terminal reply, as for a pull request.
- **Prompt:** the issue title, body, recent conversation, the trigger comment, and links are untrusted bounded context, with no base or head SHA. The coordinator prompt says that it is an issue.
- **Coordinator commands:** `limen github work` and `limen github resolve` accept an issue claim. `limen github review` refuses an issue claim with a clear message, because no pull request head exists to review.

## Out of scope

- Any change to pull request behavior or prompts.
- A new GitHub App, permission, webhook, or seat change.
- The install at `/opt/limen` on the Alice computer.
- Merge, approval, or automatic replies without a job or an explicit no-job answer.

## Acceptance

- A test: an authorized `@limen` comment on an open issue writes one claim and hands off one prompt that names the issue.
- A test: the same comment from a user with `read` or `triage` permission writes no claim.
- A test: the issue body with `@limen` and no comment does nothing.
- A test: a comment on a closed issue does nothing.
- A test: `limen github work` on an issue claim starts one job, and the poller posts one start reply and one terminal reply.
- A test: `limen github review` on an issue claim refuses, and no job starts.
- The existing pull request doorbell tests pass unchanged.
- `docs/remote.md` says that issue comments count and the issue body does not.
- `npm run check` passes.
