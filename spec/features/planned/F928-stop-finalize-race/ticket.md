---
touches:
  - limen.runtime.detached
opened: 2026-10-06
---

# F928 · limen stop and a stopping job write one terminal record, not two

## Outcome

When `limen stop` ends a detached job whose engine exits quickly on TERM, the job record today gets two terminal log lines: one from the job's own wrapper (`stopped: process group interrupted`) and one from the stop command (`stopped: <reason>`). Both processes pass the "already terminal?" check in `finalizeJob` within the stop command's 25 ms grace, so both run the finish path. The new S3 scenario of the test reset (F927) saw it in 3 of 3 runs. Afterwards exactly one process finalizes a job, so the log, the commit record and every finish side effect happen once.

## Scope

- One exclusive finalize per job; the seam is `finalizeJob` in `src/job/record.ts` and its callers in `src/commands/stop.ts` and `src/runtime/wrapper.ts`.
- The loser of the race leaves the record as the winner wrote it.
- The S3 scenario's stop check asserts one terminal log line again.

## Out of scope

- Hosted job finalization, unless it shares the same finalize path.
- The stop command's TERM and KILL timing.

## Acceptance

- `limen stop` of a detached job whose engine exits at once on TERM leaves exactly one terminal line in `.limen/jobs/<id>/log`, in 10 runs of 10.
- The job still ends `stopped`, with one `finished-at` and one wake.
- S3 checks one terminal line for the stopped job and passes.
