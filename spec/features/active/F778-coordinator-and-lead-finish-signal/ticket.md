---
opened: 2026-10-06
---

# F778 The shepherd learns when coordinators and group leads finish, block or stall

Reported by Adam, 2026-10-06 00:12, from the Alice plant (F922 and F923 work).

## Problem
The shepherd agent (Tony) gets a finish webhook only when a limen job ends. It gets no signal from:
1. **Coordinators and group leads in interactive Herdr tabs.** They are omp sessions, not limen jobs. On 2026-10-05 the F922 group lead finished at about 22:20, and the shepherd learned it only when Adam asked at 22:45. The shepherd now reads panes on a 20-minute timer, which is slow and costly.
2. **Group events to the lead.** The F922 lead did not see that the team-2 coordinator was done. It kept waiting until the shepherd steered it by hand.
3. **Group start without the group-peer hook.** `limen group start` refused in a fresh coordinator pane. The lead wrote the lead registration file itself and polled group events by hand.
4. **Detached worker liveness.** Under high load, `limen status` shows "ownership: tool stall observation uncertain: detached engine ownership unavailable" for all detached omp workers. Neither the shepherd nor the coordinator can tell "working" from "stuck". 15 of 19 workers showed 15 to 29 minutes of silence.
5. **Spawn under load.** With a load average near 400, spawns failed the 10-second startup check again and again (one worker failed 6 times). Coordinators had to find LIMEN_HANDSHAKE_MS=120000 by themselves, and failed attempts left empty branches.
6. **No load limit.** Six coordinators started 19 workers at once. That caused 30 rustc processes on 16 cores. Nothing finished for more than 75 minutes, so no finish signal came at all.

## Outcome
- A coordinator or group lead can emit the same finish webhook as a job, with the states done, blocked (one-line reason) and stalled. The payload names the plant, the label and the next step. One shared rule, not a second notifier.
- The group lead gets team-finished events reliably, or `limen group status` gives the truth and the lead polls it.
- `limen group start` works in any pane where LIMEN_COORDINATOR=1, or it fails with the one command that fixes it.
- `limen status` reports detached omp worker liveness from the process and log, not "uncertain".
- The spawn startup check adapts to machine load, and a failed spawn removes its empty branch.
- A plant-level limit on concurrent workers (or concurrent heavy builds) queues extra spawns instead of starting them all.

## Rules
Follow spec/vision.md. Lean: reuse the job finish webhook and existing state files. No new daemon. Overlaps F773 (OMP watch/steer, blocked mark, shared wake text, already on main); extend that, do not duplicate it.
