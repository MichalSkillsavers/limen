# Outcome

The GitHub doorbell now treats a registered coordinator as live when its pane id matches the binding, its `agent_status` is idle, working, blocked, or done, and `interactive_ready` is true or absent. Herdr 0.9.3 omits that field for OMP panes, so a warm OMP coordinator now passes `limen github doctor` and receives `@limen` wakes. An explicit `interactive_ready: false` still counts as not live. One rule, `liveCoordinator` in `src/commands/github.ts`, serves both `limen github ensure` (used by `deliver` and the poller) and the doctor check. Landed on `main` as `abf1e84`.

Checks: `npx tsc --noEmit` and `npx biome check .` pass; `test/github-doctor.test.ts`, `test/github-doorbell.test.ts`, and `test/github-issue-body.test.ts` pass 19 of 19 in two runs. One earlier run failed the multi-project doctor test once; it passed alone and in both reruns. The live seats still run their installed release; a seat needs an upgrade to this commit before an OMP coordinator passes doctor.
