# Adam review — narrow Limen 1.0

**Verdict: GO for your review. No tag until you say so.**

On 2026-09-12 you authorized skipping F081 (bad-route refusal) as a 1.0 release gate.

## What shipped

- A hosted job starts itself and keeps a truthful supervisor if that process is lost.
- Owner choices and handoff policy live in one place on resume.
- Finish names are bot-neutral; “sent” is not the same as “Johnny got the turn.”
- Hosted continuation files move without extra leakage into the worker.
- Native checks are repeatable and green.

## Proofs closed

- Native (F709): TypeScript, Biome, and all 370 tests at `aaf2e944`; merge `2181d35`. Lane: `/home/overment/limen-evidence/f709-repair-ccfc0bd3/` and `spec/features/done/2026-09/F709-native-checks-give-a-repeatable-verdict/checks-2.md`.
- Johnny finish (F091): held, then released into his export. Proof: `/home/overment/limen-evidence/johnny-finish-go-20260912/` (job `2026-09-12-f091-johnny-export-hold-proof-03388067`; session `80b76930-cfb0-46e8-945b-64c7bd491f08`).

## Skipped

- F081: a bad or unusable route may still look startable. You deferred that proof as a 1.0 gate.

## Before you say tag

- Read `RELEASE-READINESS.md` and the Johnny proof folder above (control vs observed, attestations, export in `receiver-source`).
- Confirm the landed cut on VPS main (`2181d35` native, `87dd357` inspection, helper `c9f2625`) is the cut you want.
- Optionally start one real hosted job on the Johnny route and confirm a completed turn lands in his export.

Do not tag, publish, or push until you explicitly authorize it.
