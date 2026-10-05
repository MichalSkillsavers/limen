---
touches:
  - limen.integrations.finish
opened: 2026-10-04
landed: 2026-10-04
---

# F758 · A finished group step by the lead sends the finish webhook

## Outcome

When the interactive lead finishes a group step, the project's finish webhook sends one notice, the same way it does for a done job. So Johnny learns that the lead step is done without watching the pane. Today only a job sends a finish webhook. The F757 lead wrote `group/synthesis.md`, went idle, and nobody was notified. Adam locked this on 2026-10-04.

## Scope

- **Who sends.** Only the interactive coordinator pane: `LIMEN_COORDINATOR=1` and not `LIMEN_JOB=1`. Start at the turn-end handling in `hook/group-peer.ts`, which already knows the lead's root and session.
- **When.** At the end of a lead turn, and only when that turn finished a group step. A group step is one of: the turn created or changed `group/synthesis.md` in the feature folder of a group this session leads, or the turn closed that group. Detect it from files and group records (for example the file's content hash or mtime, and the run's `closed` flag), not from prose.
- **What.** The same sender and the same project opt-in as a done job (`.limen/finish-webhook.env`, `bin/tony-finish-ping.sh`). Use the same payload fields. `job` names the feature and the group step, for example `F757 lead synthesis`. `handoff` says the lead step is done and names the next step.
- **Next step wording.** "Lead step done: <step>. Next step: <owner decision or close the group>." Never say "land it" when the feature ticket says not to land.
- **Once.** One notice per group step: a second idle turn with no new change sends nothing. Record a receipt under the group cabinet.

## Out of scope

- Notices for ordinary idle turns or for chat with no group step.
- Changes to job finish webhooks, coordinator wakes, or the seat bell.
- A new transport, receiver, or config file.

## Acceptance

- A test: a lead turn that writes `group/synthesis.md` sends exactly one finish webhook with the feature named and a lead-step handoff.
- A test: a second idle turn with no file change sends nothing.
- A test: a turn that closes the group sends one notice.
- A test: a hosted job (`LIMEN_JOB=1`) with the same file change sends nothing from this path.
- A test: the handoff for a feature whose ticket says "Do not land" does not contain "land it".
- A test: a project without `.limen/finish-webhook.env` sends nothing.
- `npm run check` passes.
