# Narrow Limen 1.0 delivery handback

**GO for Adam review.** The VPS has a clean native-verification result, the Johnny-only export-hold helper, and a CLOSED Johnny F091 held/released proof. On 2026-09-12 Adam authorized skipping route refusal (F081) as a 1.0 release gate. Remaining before tag: Adam reviews the landed cut and Johnny finish proof; then an authorized tag only. Current verdict and skim list: `RELEASE-READINESS.md`. Review note: `ADAM-REVIEW.md`. No tag, release, publish or remote push is claimed.

## What landed

- Neutral finish configuration names (F092), merge `a76e0ae`.
- Hosted startup ownership proof (F048), merge `c6d4d6c`.
- Watch-only recovery of lost hosted supervisors (F049), merge `6662bac`.
- One home for owner choices and handoff policy on resume (F087), merge `ec65dc2`.
- Safe hosted continuation file transport (F081 partial), commit `a3872a6`.
- Per-target finish transport and receiver-export inspection (F091), merges `2dabae7` and `87dd357`, plus CLOSED held/released proof at `/home/overment/limen-evidence/johnny-finish-go-20260912` (job `2026-09-12-f091-johnny-export-hold-proof-03388067` done; finishEvent `limen-finish-e646cbfda774d367b3f34859517489d94f52c9f16cc256af22199c0e40b3fe19`; control transport-accepted/unobserved → observed bot-turn for johnny; HTTP receipts unchanged; export in `receiver-source`; attestations present).
- VPS-first Johnny-only proof runbook, documentation candidate `5a9ef82`, and checked export-hold helper `c9f2625`; 11 synthetic checks passed, with no sender or receiver runtime changes beyond the closed live proof above.
- Repeatable native-check fixtures (F709), merge `2181d35`: registry stress retains every operation with fewer Node launches, and the fake Herdr delays only pre-start probes. TypeScript, Biome and all 370 native tests passed at repaired candidate `aaf2e944`.

Adam's 2026-09-12 instruction supersedes the former Alice Mac / Johnny + Tony prerequisite. No Tony coordination occurred. Export hold proves unobserved inspection, not absence of a real turn; the closed proof then released the same genuine export into `receiver-source`.

## What still needs action

Adam reviews the landed cut and the closed Johnny F091 proof. After that review, Adam may authorize a tag. This handback does not tag.

F081 refusal proof is deferred by Adam (2026-09-12), not a remaining 1.0 gate. Local interface comparison confirms installed 0.84.2 is unchanged; no generated probe, auth call or provider request was used to investigate refusal. Its failing counterexample stays locked at `b14b5fe`. Interface decision: `spec/features/planned/F081-spawn-refuses-an-unusable-route/interface-question.md`. Bad routes may still look startable.

Johnny F091 is CLOSED with cited held/released evidence; do not re-send or widen that slice. Native verification is closed by F709.

Wake-ceiling candidate F090 stays parked, unchanged and locked at `0fa48fa` for Adam's later review. Author routing F708 stays spec-only after narrow 1.0, not a blocker. There was no independent review job.

## Checks and evidence

- Johnny F091 closed proof: `/home/overment/limen-evidence/johnny-finish-go-20260912/` — control vs observed, `inspection.diff` exit 1, attestations `mapping-owner.txt` / `control-owner.txt` / `receiver-history.txt` / `release-owner.txt`, export in `receiver-source`, held empty of `.1.json`.
- Johnny-only documentation worker: 117 focused checks passed; six shell blocks parsed; v1 contract and historical result bullets retained. Coordinator inspected the complete patch and synthetic before/after CLI views, then reran static runbook checks after its small correction. `/home/overment/limen-evidence/f091-johnny-only-552a2b2d/`.
- Coordinator: `npm run typecheck` passed; Biome over tracked files passed (81 files). Broad `biome check .` failed with 37 errors while scanning untracked historical evidence. That evidence was preserved, not reformatted; this is not a full native pass. `/home/overment/limen-evidence/release-readiness-2026-09-12/`.
- Prior receiver inspection: 121 coordinator focused checks passed; full-native failures and offline exports retained at `/home/overment/limen-evidence/f091-51bb62b9/`.
- Local no-generation interface check: `route-interface-refresh.log`.

No implementation jobs remain running for the closed gaps; F081 is deferred, not wait-as-blocker. This coordinator retains landing ownership for evidence docs. Protected proof directories retain the closed Johnny artifacts. Generated probes remain unauthorized. This wave needs no runtime reload. Existing coordinators that never reloaded after supervisor recovery still need `/reload`; that is prior landed hook work. Tracked evidence-doc updates may be committed; pre-existing untracked evidence is left untouched. Remaining before tag: Adam cut review. Limen remains untagged until Adam says so.
