# Narrow Limen 1.0 quality and alignment

**Verdict: ALIGNED WITH NITS.** The landed cut makes job ownership and finish evidence more dependable without adding another workflow authority. No must-fix-before-tag violation was found in this review. Adam can authorize the tag after his skim of this report and the Johnny proof; this report does not authorize or perform a release.

## What matches the vision

- **Real ownership:** hosted startup belongs to the supervisor, not the calling shell. Recovery watches the existing worker rather than starting another; uncertain Herdr answers do not justify adopting or failing it (`src/supervisor.ts`, `src/recovery.ts`, `src/reap.ts`).
- **Clearer finishes:** HTTP acceptance stays separate from a completed receiver turn. Inspection needs an explicitly selected, correlated receiver export and labels it operator-trusted, not origin-authenticated (`src/finish-receipt.ts`, `src/finish-turn.ts`).
- **Less duplicate notification pressure:** automatic finish delivery claims one durable attempt and does not resend an ambiguous result (`src/finish-webhook.ts`). Coordinator wakes remain subscription/ownership-scoped and settled history is skipped (`hook/wake.ts`). This is not a claim that every wake-storm path is fixed.
- **Judgment stays prose:** owner choices outrank package defaults on launch, resume and recovery; unavailable models must not silently change. The shop manual owns that policy, with no board-driven model resolver or review engine (`templates/agents.md`).
- **Ordinary files remain truth:** hosted continuation uses a durable file argument, not instruction text embedded in shell argv (`src/supervisor.ts`). Recovery and finish receipts extend job files, not the board's workflow state.

## Gaps and nits

- **Must-fix-before-tag: none found** within the authorized narrow cut.
- **Post-1.0, known reliability gap:** errored/aborted coordinator wakes release their claim without consuming the attempt ceiling (`hook/wake.ts`, `releaseUncounted`). Wake-ceiling work (F090) remains parked by instruction, not reopened as a blocker. Reduced duplicate pressure is not a universal two-attempt guarantee.
- **Post-1.0, steering load:** `spec/build.md` still says NO-GO, leaves Johnny proof pending, and calls route refusal a blocker. The release handoff records the newer owner decision. `spec/vision.md` also describes landed startup work as still ahead. The authorized owners should reconcile these summaries; neither file was edited here.
- **Post-1.0, size pressure:** `src/` is 4,006 lines against a 4,010-line structure budget. `hook/wake.ts` is 980 lines and mixes delivery, lifecycle and display concerns; `src/herdr.ts` is 544. Prefer subtraction in later scoped work, not a pre-tag split or new helper bag.
- **Explicit exception:** bad-route refusal (F081) was skipped by Adam as a 1.0 gate; it does not fail this review. A bad route may still look startable. Author routing (F708) and beyond-narrow work remain deferred.

## Styleguide hits and misses

- **Hits:** runtime dependencies remain empty (`package.json`); finish inspection and recovery are small, direct functions with bounded inputs and explicit uncertainty. Real-file/Git tests exercise receipt rejection, killed processes and competing sweeps (`test/finish-receipt.test.ts`, `test/recovery.test.ts`, `test/hosted-spawn.test.ts`). No helper bag, Markdown workflow engine or blanket review gate was added by this cut.
- **Misses:** the nearly full source budget and concentrated wake/Herdr files leave little maintenance headroom. Stale board prose makes the model reconcile competing instructions unnecessarily. Follow-up pointers are in `QUALITY-NITS.md`; no runtime rewrite was warranted.

## Evidence and limits

- Opened Johnny's mapping, control, history and release attestations, plus both CLI views and their diff at `/home/overment/limen-evidence/johnny-finish-go-20260912/`.
- The independent offline check passed: exactly two bot-turn lines change; HTTP acceptance is identical; event, target, session, turn and completion time match the released export. Current inspection of copied receipts stays unobserved without that export and observes Johnny with it. Original proof files were not altered.
- **Important limit:** Johnny's turn had already completed before control capture. Holding its export proves unobserved inspection, not absence of an actual turn. Receiver provenance rests on operator attestations. No new live send or provider request was made.
- Focused native checks passed **13/13**: hostile/mismatched receipts stay unobserved; competing sweeps replace a killed supervisor without starting a worker or changing coordinator ownership; architecture checks pass.
- `npm ci --ignore-scripts` installed from the lockfile: 0 vulnerabilities. One fresh full **`npm run check` passed** at the clean report checkpoint: TypeScript, Biome (82 files), **370/370 tests**, 0 failures/cancellations/skips, exit 0 in 495 seconds. Commit and cleanliness are recorded in `native-meta.txt`; raw output is `native.log` in the review-artifact directory below. The reviewed executable/test/template tree also matches the prior proven candidate.
- The native killed-caller tests returned IDs in 971 ms (spawn) and 893 ms (continuation), then preserved startup beyond the simulated 20-second caller deadline. Hosted quoted/multiline tasks stayed out of shell arguments. These use fake Herdr/Pi with real files, Git and processes, not a fresh live-provider or VPS-pane proof.
- Review artifacts and rerunnable offline check: `/home/overment/limen-evidence/quality-align-e624b598/`. This change contains evidence Markdown only; no runtime reload, board edit, tag, push or publish.
