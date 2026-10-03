# F741 · Group coordinators only manage their team

## Outcome

A group team coordinator is a manager. It splits its team's work into parallel aspects, launches workers for them, sends each finished branch to a reviewer, routes the findings back to the same worker, has an integration worker merge the passed branches, and reports Ready to the lead with the reviewer's verdict. It never edits code, runs checks, builds test tooling, or measures anything itself. It learns what its workers and reviewers found without opening their files, and waiting costs it nothing.

## Scope

- The coordinator template, the group member contract, `docs/groups.md`, and the group section of `templates/agents.md` describe the manage-only loop: fan-out by disjoint areas, review routing through `limen continue`, an integration worker, and Ready carrying the reviewer's verdict and commit.
- When a team member finishes, its terminal group event carries a bounded excerpt of its final report. For a reviewer, the verdict line leads. The event reaches its coordinator and the lead.
- `limen group wait` sleeps until an event arrives, the group stops, or the member's deadline passes, instead of returning every 20 seconds. The idle-tool check never kills it.
- The harness keeps coordinators from building: they cannot edit files in their worktree. If a team argues prose is enough, it must show why with transcript evidence from `session-review.md` beside this ticket.
- Guidance for sizing a team's launch allowance for fan-out, reviews, integration, and repairs.

## Out of scope

- Lead landing, verification, and scoring changes. Native OMP subagents inside groups. Cross-seat routing. Removing receipts.

## Acceptance

- Real-file regressions: a finished worker's report and a reviewer's verdict reach the coordinator in the terminal event; long reports are bounded.
- A wait longer than three minutes returns on a new event and is not failed by the stall detector, proven against the real detector.
- The coordinator boundary has a regression, or a documented, evidence-backed decision.
- The existing group, spawn, continue, steering-hook, wake-hook, and stalled-tool tests pass, and typecheck and Biome are clean.
- Templates, docs, and CLI help agree.
