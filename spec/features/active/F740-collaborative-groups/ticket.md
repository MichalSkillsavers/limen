# F740 · Teams solve one feature together without losing their different approaches

## Outcome

An owner can explicitly start a bounded group of teams on one feature. Each team has a coordinator and workers pursuing the same outcome through a distinct approach; findings and progress reach the other participants without manual forwarding. The owner's existing coordinator remains the lead and sole landing owner.

## Scope

- Add per-feature group activation with explicit team and worker limits; merely creating the feature's `group/` folder never launches work.
- Keep the shared brief, approach notes, findings, and synthesis inside the existing feature folder; keep live membership and delivery evidence beside job records.
- Give each team its own managed coordinator and isolated candidate work; workers inherit group membership without taking over another team's jobs.
- Deliver lifecycle updates automatically and meaningful findings when published, with bounded catch-up and per-recipient receipts.
- Extend the existing spawn, wake, and steering seams without changing ordinary jobs or turning peer messages into owner instructions.
- Document activation, inspection, publication, stop, and recovery; retain the executable scenario and its evidence.

## Out of scope

- Cross-seat collaboration, external chat transports, or a new database.
- Automatic merge, push, review approval, or changes to unrelated feature state.
- Unbounded team growth, recursive coordinator trees, or automatic model substitution.
- Runtime interpretation of Markdown as workflow state.

## Acceptance

- Explicit activation starts only the requested roster and records its limits; an invalid or duplicate start does not create another group of agents.
- A team coordinator's workers use the canonical group cabinet, remain isolated in Git, and cannot exceed the group's recorded launch allowance through concurrent spawn or continuation.
- A published finding reaches another team's running worker and coordinator without manual `watch` or `steer`, while an unrelated job receives nothing.
- Delivery distinguishes queued, accepted, and processed evidence; restart and concurrent delivery do not silently lose updates or cause an unbounded replay loop.
- Group stop prevents further launches, stops owned members through existing job controls, and preserves branches, findings, and unread messages.
- The two-team live scenario in `scenario.md` demonstrates different approaches, an observed cross-team response, two checked candidates, and one evidence-backed synthesis; native checks pass at the candidate commit before push.

## Notes

`design.md` defines the first-release contract. The scenario uses a disposable local repository; success there does not authorize autonomous merging in a real project.
