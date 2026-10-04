# F758 notes

## Seams

- `hook/group-peer.ts` — `leadSteps()` compares the lead's runs against in-memory marks: `seenClosed` (run ids) and `seenSynthesis` (feature path → content hash). Baseline is taken at `session_start`; the comparison runs at assistant `message_end` unless `stopReason` is `toolUse`, `error`, or `aborted`. Gated on `LIMEN_COORDINATOR=1` and not `LIMEN_JOB=1`.
- `src/integrations/finish-webhook.ts` — `deliverLeadStepWebhook()` claims `.limen/groups/GROUP-ID/lead-steps/<run-id>-synthesis-<hash16>` or `<run-id>-close` with `finish-webhook-attempt` (`wx`), then calls the existing `send()` with state `done` and a handoff. The result goes to `finish-webhook` in the same directory. The run id in the directory name keeps `finishEvent` (hash of the basename) unique.
- `bin/tony-finish-ping.sh` — a `done` payload uses `LIMEN_FINISH_HANDOFF` when set. Job `send()` passes `undefined`, which drops any inherited value, so job payloads are unchanged.

## Decisions

- The lead handoff never says "land it". When `ticket.md` or `group/brief.md` says "do not land", it adds "The feature says do not land." The decision-spec group (F756) and the feature-timeline group (F757) both put that rule in the brief, not the ticket.
- A synthesis whose mtime is older than the run's `startedAt` is not a step. This stops a new run over an old feature folder from ringing on a stale synthesis.
- One turn that writes synthesis and closes the group sends one notice, the close.
- The turn-end handler awaits delivery, bounded by the job sender's 3 s cap. This keeps tests deterministic; it can delay the end of that one turn by up to 3 s.
- Author routing reuses `captureFinishAuthor` on `Ticket: <feature>/ticket.md`.

## Not done

- No live check against a real coordinator pane and a real receiver. Tests run the real sender with `fetch` intercepted.
