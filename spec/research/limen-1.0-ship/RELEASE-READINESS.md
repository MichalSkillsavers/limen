# Narrow Limen 1.0 release readiness

**GO for Adam review — 2026-09-12, VPS plant `/home/overment/limen`.** Native verification is green and Johnny F091 held/released proof is CLOSED. On 2026-09-12 Adam authorized skipping unusable-route refusal (F081) as a Limen 1.0 release gate. Narrow 1.0 is GO pending Adam's review of the landed cut and Johnny finish proof; then an authorized tag only. No tag, publish, push or release is claimed.

## Delivered

- **Clean native verification (F709), merge `2181d35`.** Test-only corrections preserve every registry operation/dead-lock round and stop the fake Herdr from repeating its startup delay after startup. One full `npm run check` at repaired candidate `aaf2e944` passed TypeScript, Biome and all **370 tests**, with no failures, cancellations or skips. Existing timeouts and warm-sweep assertions remain unchanged; production code did not change.
- **Johnny F091 held/released proof CLOSED.** Proof dir `/home/overment/limen-evidence/johnny-finish-go-20260912`. Job `2026-09-12-f091-johnny-export-hold-proof-03388067` state `done`; finishEvent `limen-finish-e646cbfda774d367b3f34859517489d94f52c9f16cc256af22199c0e40b3fe19`. Helper capture-then-release succeeded: control shows transport accepted + bot-turn unobserved; observed shows bot-turn observed for johnny (session `80b76930-cfb0-46e8-945b-64c7bd491f08`, turn `90e7cf62-a64f-47cf-b668-8cd8980778fe`, completedAt `2026-09-12T18:01:59.760Z`). HTTP receipts unchanged across release; `inspection.diff` exit 1 as expected (bot-turn lines only). Attestations present: `mapping-owner.txt`, `control-owner.txt`, `receiver-history.txt`, `release-owner.txt`. Export is in `receiver-source`; `receiver-held` empty of the `.1.json`. Helper tooling commit `c9f2625` and `ASK-JOHNNY.md` remain the operator path; no second HTTP send.
- **Adam skip of F081 as a 1.0 gate (2026-09-12).** Adam authorized skipping bad-route refusal as a release gate. Installed Pi 0.84.2 interfaces remain byte-identical; the fake-Pi refusal test still fails because auth readiness admits the unusable route. That remaining risk is a known deferred follow-up, not a 1.0 blocker. Neither check made a real provider request. Refusal candidate `b14b5fe` is preserved.

Earlier dependable-core landings remain intact: neutral finish keys, killed-caller startup ownership, watch-only supervisor recovery, owner policy in one prompt home, safe hosted task transport, and transport versus receiver-export inspection. Addresses remain in `DELIVERY-HANDOFF.md`. Review note for the cut: `ADAM-REVIEW.md`.

## Quality

**ALIGNED WITH NITS** — see `QUALITY-ALIGN.md` for the vision/styleguide review, independent finish-evidence check and non-blocking follow-ups. No must-fix-before-tag violation was found in the authorized cut. A fresh full native lane passed TypeScript, Biome and all 370 tests; retained logs are at `/home/overment/limen-evidence/quality-align-e624b598/`. F081 remains skipped by Adam; F090 and F708 remain deferred. **GO for Adam review is unchanged**; no tag, push or publish is authorized by this quality report.

## Remaining before tag

| Owner | Required action |
|---|---|
| Adam | Review the landed cut and actual receiver evidence (Johnny F091 proof cited above). After that review, Adam may authorize a tag. This task does not tag. |

Johnny F091 is closed with cited held/released evidence. Keep ingress enabled; no Tony, paused-webhook control or synthetic substitute for that closed gap. HTTP 2xx remains transport-only; the closed proof is the held-then-released operator-trusted export, not a tag claim.

## Deferred, not 1.0 gates

- **F081 refusal proof.** Bad routes may still look startable. Deferred by Adam on 2026-09-12. Interface evidence: `route-interface-go-plan.log`, `/home/overment/limen-evidence/route-refusal-go-20260912/`, and the planned ticket's `interface-question.md`.
- **Wake ceiling F090** stays locked and unchanged at `0fa48fa`. No merge, rebase, repair or widening without Adam.
- **Author routing F708** stays deferred beyond narrow 1.0.
- Field guide, Claude advisor, closing overview, history retirement, remote rollout and GitHub doorbell remain deferred.

## Retained evidence

- Native: `spec/features/done/2026-09/F709-native-checks-give-a-repeatable-verdict/checks-2.md`; raw clean lane at `/home/overment/limen-evidence/f709-repair-ccfc0bd3/`. The earlier 369-pass/1-failure lane and diagnostic remain under `/home/overment/limen-evidence/f709-ffbfa542/`. The landed executable/native-check tree matches the proven candidate.
- Johnny F091 closed proof: `/home/overment/limen-evidence/johnny-finish-go-20260912/` (control vs observed, `inspection.diff`, attestations, receiver-source export). Preparation notes: `JOHNNY-HARNESS-CHECKS.md`, `ASK-JOHNNY.md`. Synthetic mechanics alone are not receiver evidence; the closed proof uses the genuine held/released export.
- Route (deferred): `route-interface-go-plan.log`, `/home/overment/limen-evidence/route-refusal-go-20260912/`, and the planned refusal ticket's `interface-question.md`.

No implementation jobs remain running for the closed gaps. This coordinator alone landed evidence updates; Adam retains review and any later tag. No independent review lane or silent model fallback. No runtime reload is needed for these evidence/doc updates.
