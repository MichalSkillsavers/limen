# Narrow Limen 1.0 checklist

Current verdict: **GO for Adam review**. See `RELEASE-READINESS.md` and `ADAM-REVIEW.md`. On 2026-09-12 Adam authorized skipping F081 as a 1.0 release gate. Adam's 2026-09-12 instruction also makes this wave VPS-first and Johnny-only; the older Alice Mac / Johnny + Tony prerequisite is superseded. This coordinator alone lands and edits the board; Adam owns review and any later tag.

## Required outcomes

- [x] Neutral finish configuration keys (F092), landed `a76e0ae`.
- [x] Hosted startup ownership proof (F048), landed `c6d4d6c`.
- [x] Watch-only recovery of a lost hosted supervisor (F049), landed `6662bac`.
- [x] One home for owner-choice and handoff policy (F087), landed `ec65dc2`.
- [x] Live finish-to-Johnny proof (F091) CLOSED: inspection landed `87dd357`; held/released proof at `/home/overment/limen-evidence/johnny-finish-go-20260912` (job `2026-09-12-f091-johnny-export-hold-proof-03388067` done; control unobserved → observed bot-turn for johnny session `80b76930-cfb0-46e8-945b-64c7bd491f08` turn `90e7cf62-a64f-47cf-b668-8cd8980778fe` at `2026-09-12T18:01:59.760Z`; HTTP receipts unchanged; attestations present).
- [x] Clean native verification (F709): test-only fixtures landed `2181d35`; repaired candidate `aaf2e944` passed TypeScript, Biome and all 370 tests, with the earlier red lane retained.
- [ ] Adam's review of the landed cut and Johnny finish proof; then authorized tag only. No tag, publish or release claim until Adam says so.

## Operator boundaries

- Use only Johnny's privately verified single-target route; do not contact Tony or infer receiver identity from a config path.
- Keep the webhook accepting HTTP during processing or export hold; 4xx fails it, and export hold proves unobserved inspection rather than absence of an actual completed turn.
- Johnny actively follows the named job and receiver history; do not depend on the finish webhook to wake its observer.
- Preserve one automatic send and existing claims. A timeout may have accepted; no blind retry or routine manual duplicate.
- Use hosted workers with literal `--provider openai-codex --model gpt-6-astra --thinking high`; documentation workers opt out of finish sending.
- Refusal candidate `b14b5fe` and wake-ceiling candidate `0fa48fa` remain unchanged and worktree-locked.

## Deferred, not blockers

- **F081 (Adam skip, 2026-09-12).** Real unusable-route refusal is not a 1.0 gate. Safe hosted task transport landed `a3872a6`, but an auth-ready batch-only route may still plant a job. Planned pending a supported non-generating Pi check; no generated probe authorized. Bad routes may still look startable.
- Wake-attempt ceiling (F090) is parked for Adam's later review. No merge.
- Author routing (F708) remains spec-only: narrow 1.0 can use an explicitly selected project destination.
- Field guide, Claude perspective, closing overview, history retirement, remote-seat rollout and GitHub doorbell remain planned beyond this cut. A VPS proof does not claim that the broader remote-seat rollout shipped.

## Evidence addresses

- Release verdict and skim list: `RELEASE-READINESS.md`. Review note: `ADAM-REVIEW.md`.
- Johnny-only proof prerequisites: `JOHNNY-PROOF-OPERATOR-NOTE.md`; copyable runbook: `docs/finish-webhooks.md`.
- Closed Johnny F091 proof: `/home/overment/limen-evidence/johnny-finish-go-20260912/`.
- Unchanged Pi interface check: `route-interface-refresh.log`.
- Native verification: `spec/features/done/2026-09/F709-native-checks-give-a-repeatable-verdict/checks-2.md` and `/home/overment/limen-evidence/f709-repair-ccfc0bd3/`; earlier red lane retained under `/home/overment/limen-evidence/f709-ffbfa542/`.
- Prepared receiver helper: `ASK-JOHNNY.md` and `JOHNNY-HARNESS-CHECKS.md`; 11 synthetic checks, plus closed live held/released proof cited above.
- Historical cut checks and landing addresses: `DELIVERY-HANDOFF.md` and each feature folder's retained check files.
