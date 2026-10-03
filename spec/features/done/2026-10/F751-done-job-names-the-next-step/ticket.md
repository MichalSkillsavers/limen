# F751 · A done job says it is done and names the next step

## Outcome

A shepherd or coordinator that reads a finish message for a `done` job learns two facts: the job is done, and the next step is to land it. If a check still blocks landing, the message tells the reader to name that check. Today the message says "Waiting on landing owner; merge not ready", and shepherds read that as a stop. Adam locked this change on 2026-10-03, before the group release.

## Scope

- One wording for a `done` job in every finish surface: the webhook `handoff` field, the finish receipt line, the desktop notification, the in-session notice, and both coordinator wake texts.
- Wording: "Job done. Next step: land it, or name the check that still blocks landing."
- Failed and stopped wording stays as it is.

## Out of scope

- The webhook `status: "waiting"` and `jobState: "done"` fields. Receivers may depend on them.
- Any change to when a job is `done`, or to landing behavior.

## Acceptance

- `grep -rn "merge not ready\|merge is not ready\|landing owner" src hook bin docs README.md` prints nothing.
- A `done` webhook payload carries `handoff: "Job done. Next step: land it, or name the check that still blocks landing."`
- A coordinator wake for a `done` job says the job is done and that the next step is to land it.
- Wake and finish webhook tests pass.
