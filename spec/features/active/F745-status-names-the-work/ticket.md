# F745 · Status names the work before its addresses

## Outcome

The plant inbox shows recognizable coordinator subjects and handles rather than making the operator decode tab IDs. Unlanded work from a cleanly ended job is presented as a candidate to inspect, not as evidence that checks or approval are complete.

## Scope

- Start at coordinatorLines in src/commands/status.ts, which currently emits tab IDs, activity, and cwd without human names.
- Join Herdr tab labels and live handles by explicit IDs; prefer the conversation tab label over an application-generated terminal title.
- Rename the ready category to Candidates to inspect while preserving its existing branch-evidence selection.
- Preserve unknown and partial evidence, recent-history filtering, and compact output without adding workflow state.

## Out of scope

- Another dashboard, approval registry, automatic merge, or changes to job phases and Git landing detection.
- Workspace identity, liveness, wake routing, or model policy.
- README/manual edits owned by the engine-accurate setup-guidance slice.

## Acceptance

- A named coordinator appears subject-first with its handle, activity, and useful lookup IDs.
- Missing labels/handles and unavailable Herdr still show an honest fallback rather than disappearing.
- A done job with unlanded work is listed under Candidates to inspect without implying checks passed.
- Existing running/decision/history and cherry-pick handling retain their behavior.
- Focused status tests and typecheck pass; retain a rendered terminal example with long names and an unavailable-Herdr example.
