---
touches:
  - limen.commands
  - limen.cabinet.records
  - limen.sessions.worker
  - limen.integrations.herdr
opened: 2026-09-29
landed: 2026-10-03
---

# F740 · Teams solve one feature together without losing their different approaches

## Outcome

An owner can explicitly start a bounded group of teams on one feature. Each team has a coordinator and workers pursuing the same outcome through a distinct approach; findings and progress reach the other participants without manual forwarding. The owner's existing coordinator remains the lead and sole landing owner.

## Scope

- Add per-feature group activation with explicit team and worker limits; merely creating the feature's `group/` folder never launches work.
- Keep the shared brief, approach notes, findings, and synthesis inside the existing feature folder; keep live membership and delivery evidence beside job records.
- Give each team its own managed coordinator and isolated candidate work; workers inherit group membership without taking over another team's jobs.
- Deliver lifecycle updates automatically and meaningful findings when published, with bounded catch-up and per-recipient receipts.
- Extend the existing spawn, wake, and steering seams without changing ordinary jobs or turning peer messages into owner instructions.
- Document activation, bounded waiting, publication, stop/close, and recovery; retain the executable scenario and its evidence.

## Out of scope

- Cross-seat collaboration, external chat transports, or a new database.
- Automatic merge, push, review approval, or changes to unrelated feature state.
- Unbounded team growth, recursive coordinator trees, or automatic model substitution.
- Runtime interpretation of Markdown as workflow state.

## Acceptance

- Explicit activation starts only the requested roster and records its limits; an invalid or duplicate start does not create another group of agents.
- Member commands use one canonical group cabinet while candidate work stays in separate Git worktrees.
- Concurrent spawn and worker continuation cannot exceed the group's recorded launch allowance.
- A published finding reaches another team's running worker and coordinator without manual `watch` or `steer`, while an unrelated job receives nothing.
- Delivery distinguishes queued, accepted, and processed evidence; restart and concurrent delivery do not silently lose updates or cause an unbounded replay loop.
- Stop prevents new launches and preserves recovery work until deliberate close; deadlines and waiting behavior are exercised in native regressions.
- The live scenario in `scenario.md` passes with observed peer exchange and lead synthesis, not merely accepted messages.
- Full native checks pass at the candidate commit before push.

## Notes

`design.md` defines the first-release contract. The scenario uses a disposable local repository; success there does not authorize autonomous merging in a real project.

Release decision (Adam, 2026-10-03): groups already work well. Release the group command on `main` with its guide. Keep the full two-team trial and the full native proof; do not shrink either. Start only after the status, setup, map, finish-guide, wake, and map-content slices are on `main`. The candidate branch predates the move of `src/` into subfolders. Its trial feature folder reuses the number F741, which already names the OMP finish wake; file that evidence under this folder instead.
