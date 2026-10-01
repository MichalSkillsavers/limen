# Johnny-only receiver proof on this VPS

Adam's 2026-09-12 instruction supersedes the Alice Mac / Johnny + Tony requirement. This VPS can send the proof job; Johnny is the only receiver and controls the receiver side himself. Do not coordinate with Tony. The source platform does not change the file-exchange contract or prove a completed bot turn.

## What is available here

- The installed `limen` resolves to `/home/overment/limen/bin/limen`, whose main already includes receiver-inspection merge `87dd357cde8740cb5b129ee909cc42129eb88b0a`.
- `.limen/finish-webhook.env` exists, is ignored by Git, and is mode 600. Its values were not opened or changed in this readiness session; existence does not attest that it selects Johnny alone.
- This session has local shell/filesystem tools but no supplied authorized Johnny completed-history export interface. A file-based export hold needs no processing API, but still needs Johnny's actual receiver history/export. No endpoint/API was guessed, no webhook sent, and no real receiver turn was claimed.
- The documentation job explicitly opts out of automatic sending. Its normal Pi work is not a receiver proof and must not be exported as Johnny's turn.

## Prepared handoff on this plant

`ASK-JOHNNY.md` now gives the one-screen launch/capture/release commands. The protected directory `/home/overment/limen-evidence/johnny-finish-go-20260912/` exists with separate mode-700 held/source directories; neither contains a receiver map or real turn yet. The dedicated `.limen/finish-webhook-johnny.env` is absent, and no authorized history/export was supplied. `preflight.txt` retains those observations without opening the existing private project config.

The committed `johnny-export-proof.sh` helper never sends or creates exports. It captures both views, validates the supplied v1 export, performs the atomic release and checks unchanged automatic receipts. Eleven synthetic checks pass; their artifacts and limitations are in `JOHNNY-HARNESS-CHECKS.md`. This is ready tooling, not F091 proof. No live send or finish-ping retry was attempted; Johnny must establish his mapping/history channel before the single authorized proof launch.

## The required control

Johnny verifies a separate private single-target configuration selecting his authorized webhook. Choose one control before starting the job: hold processing through a supported receiver workflow, or let the actual turn complete and hold its genuine export outside Limen's inspected source. In both cases ingress stays enabled and acknowledges within Limen's three-second finalizer budget. No processing API is needed for the export-hold option Adam suggested.

After the automatic send settles, retain its event, safe transport receipts and both CLI views. For processing hold, Johnny attests from real history that no completed turn exists at capture time, then releases the already accepted event. For export hold, Johnny stages the genuine export in `$PROOF/receiver-held`, captures unobserved inspection and explicitly records whether the actual turn already completed, then moves the export into `$PROOF/receiver-source`. The runbook includes the exact atomic file-release commands. Neither path resends the event.

Retain the actual v1 export and a sanitized history excerpt containing the exact event and durable session/turn lookup. Capture precedes release; record actual completion time honestly, including completion before capture during export hold. Pausing the webhook into 4xx fails the control. Export hold proves unobserved inspection, not absence of a real completed turn. A fake receiver or invented completed-turn JSON file cannot close the gap.

## Stop or complete

Use the copyable commands in `docs/finish-webhooks.md`, under the Johnny-only operational proof section. Use the VPS project `/home/overment/limen`, not an Alice checkout. A Mac sender is optional and carries exactly the same Johnny-only control, not an additional release gate.

If Johnny cannot arrange accepted ingress with one of these controls and access the real history/export, retain that limitation and do not send just to collect another HTTP receipt. If HTTP rejects or times out, preserve that result; a timeout may have accepted, so inspect the receiver before any deliberate retry. Do not remove the once-only claim or send a routine manual duplicate.

After success, supply the protected source directory, mapping attestation, control attestation, authorized export, history excerpt/reference, job ID, package revision and both before/after CLI views. The coordinator can then verify inspection and file proof for Adam's review. Until those artifacts exist, the release report says live receiver proof is missing, not that this host or a second bot is required.
