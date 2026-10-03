# Collaborative groups release on current main

The release ports candidate `e04dbbc5c4fe4e08a9d078657711dbd656a72430` onto main's source folders. The board, ticket, design, scenario, owner policy, fixed team allowances, and two-team proof requirements are unchanged. `docs/groups.md` is the operator guide.

## Source seams

- `src/commands/group.ts` owns activation, bounded wait, inspection, publication, stop, and close.
- `src/job/group-cabinet.ts` owns canonical membership, launch claims, deadlines, and recovery protection. `src/job/group-events.ts` owns lifecycle occurrences, informational delivery, and receipts.
- Spawn and continuation stay in `src/commands/`. Detached and hosted supervision stay in `src/runtime/`; current main's hosted OMP process fallback remains intact.
- `src/job/record.ts` remains the only finalizer and handshake implementation. It publishes group lifecycle and records the process birth identity. Group completion does not send main's ordinary landing-oriented Herdr prompt; recorded finish-webhook opt-ins remain unchanged.
- `hook/group-peer.ts` uses the relocated modules. Project loaders include the group hook. Project-owned older loader lists need an explicit update or a separately loaded hook.

## Trial evidence and feature identity

`live-trial-1.md`, `live-trial-1.html`, `live-trial-2.html`, and `session-review.md` retain the hosted sssnark trials. The successful two-team run produced checked candidates `d7107f5` and `0732e58`, observed peer responses, and lead synthesis. Its raw cabinet remains at `/Users/overment/playground/sssnark/.limen/groups/32dc7308-15aa-43f1-aadc-49830c68e06c/`; member sessions remain beside that repository's job records. This release does not claim a new real-agent trial or repair the historical first-publication ordering failure.

The candidate's incorrectly numbered manage-only trial packet now lives in `trials/manage-only/` under this feature. `trial-ticket.md`, the approach notes, brief, and both syntheses retain their original content, including historical F741 paths and failed/unverified results. They are records, not an active release contract. The shared `session-review.md` is retained once at the feature root. F741 continues to name the OMP finish wake. No manage-only guard, blocking wait, terminal report, or unreviewed trial implementation is released here.

## Open findings addressed at this seam

The candidate already names the exact package executable in each member's task, excludes uncertain tool-stall advisories from peer lifecycle, accepts a title with `--task-file`, and accepts punctuation after a Ticket pointer. It serializes sibling launches and skips busy lifecycle sweeps. Main already contains the hosted OMP liveness repair.

The two known steering regressions now wait for the durable receipt/log boundary rather than a fake agent's earlier callback write, and exclude expected PID cleanup from refused-command snapshots. Their receipt and refusal assertions remain intact.

Duplicate transport after ambiguous observation remains bounded by the existing two-attempt receipt contract; exactly-once execution is not claimed. Historical trial replay remains recorded in `live-trial-1.md`. Native delivery regressions cover concurrent claims, processed-token suppression, interrupted publication, and independent recipient retry allowances.

The release check results and exact candidate commit are filed separately after verification. Prior failed full-native output remains evidence, not acceptance.
