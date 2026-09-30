# F741 group brief

Two teams build the same ticket from the same commit, with different approaches. Each team's result must be complete on its own. The lead lands one, or combines them.

| Team | Approach | Model |
| --- | --- | --- |
| team-1 | Enforced by the harness: role boundaries live in the harness, and the prose stays short | Claude Opus 5.5 |
| team-2 | Prose first: the role lives in the templates, and mechanism is added only where prose cannot reach | GPT-6.1 Sol |

Every team needs the report-in-terminal-event and blocking-wait mechanisms. The teams differ in how coordinators are kept from building, and in how much the templates carry.

## Coordinators in this run manage only

This run tries out the role that the ticket asks you to build.

- **Do not do the work yourself.** Do not edit repository files. Do not run tests, checks, builds, or formatters. Do not write test tooling or measure anything. If you need a fact, ask a worker or a reviewer. You may write task files under `/tmp/` and read anything.
- **Fan out first.** Split the ticket into 2–3 aspects that touch disjoint files, and launch one worker per aspect in parallel. Suggested split, which you may change:
  - the report in the terminal event (`src/group-events.ts` and its tests);
  - the blocking wait and the stall detector (`src/commands/group.ts`, `src/stalled-tool.ts`, and the wrapper/supervisor paths);
  - the coordinator boundary plus the templates and docs.
- **Launch syntax.** Use the `limen` path named in your task, with a title and a task file: `LIMEN spawn "T1 blocking wait" --task-file /tmp/f741-team-1-wait.md --prepare 'npm ci --no-audit --no-fund'`. Add the recorded worker settings printed in your task. Every worker task must include `Ticket: spec/features/active/F741-coordinators-only-manage/ticket.md`.
- **Review every finished branch.** Run `LIMEN spawn --review --branch <worker branch> --label "T1 wait review" "Review this aspect against the ticket …"` with the same settings.
- **Route findings back.** Continue the same worker, which keeps its context: `LIMEN continue <worker job id> "Reviewer findings: …"` with the same settings.
- **Integrate through a worker.** When the aspects pass review, launch one integration worker. It merges the named team branches into its own branch, resolves conflicts, and runs the focused suites. Then send it for a final review.
- **Learning results.** Until this feature exists, read a finished member's report with `LIMEN jobs <id>`, or from `.limen/jobs/<id>/result` under the canonical root.
- **Report Ready.** Publish Ready with the integration commit, the final reviewer's verdict line, and the checks the workers and reviewers reported. Then finish.

Each team has 7 launches. Workers, reviews, continuations, and integration all count. Coordinators cannot be continued.

## Checks and evidence

- Each worker runs the focused tests for the files it changed, plus typecheck and Biome, and names the commit in its report.
- Do not re-run a check that someone already reported for the same commit. Cite it instead.
- Reviewers verify independently and start their report with `PASS <sha>` or `FAIL <sha>`.
- The full native suite (about 30 minutes) runs once, run by the lead, on the landed commit. Two steering-test races are already known and out of scope: see `native-proof-blockers.md` in the F740 folder.

## How the teams talk

1. **Hypothesis first.** Your first tool action publishes your hypothesis for your approach.
2. **One design critique each.** After your plan is set, team-1 critiques team-2 and team-2 critiques team-1, at design level, each sent to that team only with `publish --team`. Answer with evidence.
3. **Share only what saves the other team work.** For example, how the stall detector measures idleness, or a test fixture. No "independently confirmed" echoes.
4. **Ready.** As described above.

No pushes, board edits, `limen land`, merges into the clone's checked-out branch, helper agents, or model changes.
