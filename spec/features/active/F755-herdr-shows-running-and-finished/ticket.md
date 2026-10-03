# F755 · Herdr shows which jobs run and which finished

## Outcome

An owner who looks at Herdr sees which jobs are still working and which finished, without reading a recap. A finished job tab closes. A running job tab stays open. The coordinator tab title and the job line keep that split current. Adam locked this on 2026-10-03.

## Scope

- **Close on finish.** `settleJobTab` in `src/integrations/herdr.ts` starts `herdr tab close` and does not wait or record the result. Make the close observable: record `closed` or the failure in the job log, and retry once. Evidence: Alice job `2026-10-03-web-remove-merged-lane-3fcb7431` finished at 18:13 and its tab `wYZ:t3` stayed open with no log line.
- **Running tab state.** A running hosted job tab shows `idle` in Herdr when its pane waits for input. Add the job state to what Herdr shows, so a running job reads as running.
- **Coordinator title.** The title tail says ` · N running` only. Keep it current from job files, and add a finished count since the last owner turn, for example ` · 2 running · 1 done`.
- **Job line.** The coordinator's status line names each running job by label, and names each finished job once until it is landed or closed.

## Out of scope

- Closing coordinator tabs, human tabs, or tabs of jobs this coordinator does not watch.
- Changes to job completion, wake delivery, or landing.
- A new Herdr workspace layout.

## Acceptance

- A test with fake Herdr: a job that finishes closes its tab, and the log records the close; a refused close is retried once and logged.
- A running hosted job whose pane is idle shows a running label in Herdr.
- The coordinator title shows the running count and the finished count, and drops a finished job after it lands or closes.
- A live hosted job on this plant: its tab closes within 10 seconds of finish.
- `npm run check` passes.
