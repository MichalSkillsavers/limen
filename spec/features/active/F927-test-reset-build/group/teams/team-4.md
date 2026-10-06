# Team 4 · S5 land, S6 spec keeper, S7 webhooks

Line budget: 520 lines for the three files (S5 about 150, S6 about 160, S7 about 210).

## S5 land (`test/s5-land.test.ts`)

Must catch: landing a running, empty or failed job; landing onto a target with staged changes or with uncommitted changes in files the merge would touch; a branch whose ticket fails the strict check (the refusal prints the keeper command); a group member landing (`LIMEN_GROUP_ID`); and the new test-line cap: a branch that adds test lines past the cap in the plant's `spec/vision.md` is refused, a branch that removes test lines lands. Each refusal leaves `main` unchanged. Story: F925 team-2 design, section 3, S5.

Deletes when S5 lands: `test/land-command.test.ts`.

## S6 spec keeper (`test/s6-keeper.test.ts`)

Must catch: a reused F number across folders, branches and job labels (`2aaf43b`); an unknown place id refused before any file exists; a ticket check that lacks file, line and fix; a keeper started on a running job or on the wrong base (`edbc18d`); two picture builds with different bytes. Story: F925 team-2 design, section 3, S6.

Deletes when S6 lands: `test/ticket-command.test.ts`, `test/keeper-command.test.ts`, `test/picture-work.test.ts`. Shared: `test/ticket-author-command.test.ts`, deleted with whichever of S6 and S7 lands second.

## S7 webhooks (`test/s7-webhooks.test.ts`)

Must catch: a ping to the wrong target or author; a secret in any job file, receipt or output; a failed job with an empty result that sends nothing; a continuation that loses the parent's config and author; an unconfigured plant that sends anything. Story: F925 team-2 design, section 3, S7. Every plant already loads a fetch sink through `NODE_OPTIONS`; `requests(plant)` lists every request. Write `.limen/finish-webhook.env` in the test.

Deletes when S7 lands: `test/finish-webhook.test.ts`. `finish-webhook-helper`, `finish-receipt` and `plant-events` go to team 5's units.

## Order

S5, S6, then S7. S5 is small and proves the land refusals the lead depends on.

## Resume (second run)

- On `main`: S6 (`1cbdd52`). `ticket-command`, `keeper-command` and `picture-work` are deleted.
- Saved: S5 on `limen/2026-10-06-f927-team-4-coordinator-d8c1533c` at `c76b44c` (`test/s5-land.test.ts`, 142 lines). S7 on `limen/2026-10-06-f927-team-4-s6-keeper-and-s7-web-be959c09` at `4fe1670` (`test/s7-webhooks.test.ts`, 119 lines). Both not verified. `4fe1670` also breaks `src/commands/continue.ts` (finish author): that is a probe break; do not carry it.
- Left: S5, then S7. S7 deletes `finish-webhook` and `ticket-author-command` (S6 is on `main`, so S7 lands second).
