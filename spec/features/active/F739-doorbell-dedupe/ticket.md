# F739 · Every finished job rings the doorbell once

## Outcome

The automatic finish ping deduplicates on the job and its final state, not on the commit the job ended at. Read-only jobs and reviewers that finish at the same commit each ring. When the sender times out under load, one bounded retry runs, and the job records what each attempt did. On the Alice plant 12 of 13 board-cleanup jobs never rang because they shared a commit, and 34 rings ended "acceptance unknown" at the 3 s sender budget.

## Scope

- Replace the plant-wide tip claim (`.limen/finish-webhook-tips/<sha>`) with a claim keyed on job id + final state. Starting seam: the tip block in `deliverFinishWebhook`, `src/finish-webhook.ts`.
- Keep the no-reclaim rule: a crash after acceptance never re-sends automatically.
- On `failed: sender exceeded …; acceptance unknown`, retry once within the remaining shutdown deadline. No retry on any other failure or skip.
- Record both attempts in the job's `finish-webhook` file and log.
- Remove the tips directory usage and update `docs/finish-webhooks.md` in the same change.

## Out of scope

- Capping seat bell re-rings (`limen sweep`), owned by the seat-bell-once ticket (F731).
- Changing `bin/tony-finish-ping.sh`, its protocol, or the receiver.
- Showing ring outcomes in `limen status`, owned by the plate-as-inbox ticket (F738).

## Acceptance

- Two jobs that finish `done` at the same tip both send, each recording `accepted` (intercepted sender).
- Delivering twice for the same job and final state sends once.
- An existing `.limen/finish-webhook-tips/<sha>` marker for the job's tip does not suppress its ring.
- A sender that hangs once, then succeeds, records a timeout and an accepted retry.
- A sender that hangs twice records two timeouts and no third attempt.
- A retry never starts after the shutdown deadline; that case is recorded as not retried.
- A stopped or failed job with an empty result still skips.
- `npm run check` passes.

## Notes

- Adam accepted (2026-09-27) that a retry after "acceptance unknown" can duplicate a ring the receiver already took.
- Detached jobs give the sender less than the 5 s termination grace; two 3 s attempts do not fit, so the retry takes the remaining budget or records why it did not run.
- The tip claim came from `1cd1f68` (quiet continuations at the same tip); a continuation now rings as its own job.
