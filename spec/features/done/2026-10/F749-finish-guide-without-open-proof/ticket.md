---
opened: 2026-10-03
landed: 2026-10-03
---

# F749 · The finish guide keeps setup and drops the finished proof steps

## Outcome

An operator who opens the finish webhook guide sees setup, inspection, and retry steps only. The receiver-owned finish proof is finished. Its result is filed in the outcome of the bot-turn receipt feature (F091). The guide links to that record and does not say that the proof is open or outstanding.

## Scope

- In `docs/finish-webhooks.md`, remove the step-by-step operator procedure for the receiver-owned proof (the section marked "outstanding").
- Keep the reference facts that operators still need: the `finishEvent` identity, the payload fields, and the file exchange format.
- Add one short paragraph that names the finished proof and links to `spec/features/done/2026-09/F091-finish-job-shows-bot-turn-receipt/outcome.md`.
- Fix links in other docs that point at the removed anchor.

## Out of scope

- A new live webhook send or a new proof.
- Changes to the finish helper, sender, or receipts in `src/` or `bin/`.
- Research history under `spec/research/`.

## Acceptance

- `grep -n -i "outstanding" docs/finish-webhooks.md` prints nothing.
- No guide contains the step-by-step receiver-owned proof procedure.
- The guide links to the F091 outcome file, and that link resolves.
- No doc links to a heading that no longer exists in `docs/finish-webhooks.md`.
- `npm run check` passes.
