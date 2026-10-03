# Second run: managers held the boundary; no candidate reached review

Group `97ee2f20-e479-4be4-b89b-5f71010b2b15` started at `2026-10-01T00:26:23.867Z`, with a 150-minute group deadline, 60-minute worker budgets, and seven launches per team. Both coordinators ended failed at `02:58:03Z`. Neither produced Ready, an integration commit, or a final reviewer verdict. No implementation landed or was pushed; the primary checkout's implementation remains `f02da6e`.

## Approaches and retained commits

Team 1 used OMP `anthropic/claude-opus-5-5`, coordinator `xhigh`, workers `high`. Its harness-first approach built a 110-line coordinator command/tool guard and manage-only templates/docs (`020561f`), drafted terminal reports, and implemented blocking wait with detector hardening. Final recovery checkpoints are report `8b903f5` and wait `adc555b`; the wait's earlier implementation checkpoint is `24c724c`. These are aspect branches, not a final team candidate.

Team 2 used OMP `openai-codex/gpt-6.1-sol` with the same reasoning levels. Its prose-first approach rewrote the manager loop and documented why old transcripts do not establish revised-prose failure (`04cca16`), committed bounded terminal reports with late-result delivery (`60a97c2`), and drafted birth-bound wait exemption (`6ac9b3a`). Final wait/evidence recovery checkpoint is `5c0e9ae`. It adopted team 1's bounded self-identity query; it did not claim that idea proved acceptance.

The lead preserved exact interrupted files in three explicitly unverified commits to retain recovery work and permit clean close. No source fix or verification was performed during preservation. Branch names use the corresponding member IDs in `.limen/groups/<group-id>/run.json`.

## Manage-only behavior

Each coordinator launched three workers. Final transcripts and clean coordinator worktrees show **zero repository edits and zero tests/checks/builds per coordinator**; temporary task files and management wait wrappers are excluded. No reminder was needed. **Reviews launched: zero. Repairs routed through continue: zero.** Review, integration, and repair phases were never reached, so this run does not prove the boundary through rejection or allowance exhaustion.

Team 1 declared it would skip individual aspect reviews to reserve integration, review, repair and re-review slots. Team 2 planned one reviewer issuing separate aspect verdicts. Three workers plus three separate reviews, a new integrator and final review require eight launches, exceeding seven. Neither deviation produced a reviewed result.

Both coordinators hit the host loop detector after identical 20-second waits. They were still executing the supplied pre-feature CLI, so this is evidence for blocking wait, not proof of the new wait or guard in a live coordinator.

## Checks: reported results, not lead reruns

- Team 1 guard/docs: real-hook regressions 4/4; inheritance 3/3; typecheck and Biome passed. Its broader focused lane passed 86/94; deadline, reaper and Herdr-related failures remained, with some passing separately or failing on base. No final independent review.
- Team 2 reports: dedicated real-file regressions 7/7; typecheck, Biome and actual finalizer-to-delivery smoke passed. Sanitized existing group suite passed 15/22: six fixture/start/deadline failures had unproven causes; one shared busy-cabinet assertion needed report-contract adaptation.
- Team 2 wait: actual CLI stayed alive 306,850 ms without a stalled observation, but the smoke failed before event publication on its unrelated control. This does **not** satisfy the required event-return proof beyond three minutes. The replacement smoke did not produce retained completion evidence.
- The lead did not run the prescribed landed-commit typecheck, Biome, focused lane, or full `npm run check`: there was no eligible implementation to land. Running them on unchanged base would misrepresent the requested scenario. The two known steering races were not exercised by a lead full-suite run.

## Runtime exceptions and limits

A 30-second enclosing tool deadline cut off team 2's queued wait launch before membership or allowance consumption. Adam confirmed automatic lock recovery and authorized its initial launch; it succeeded. Both teams were told every spawn/continue needs a tool timeout of at least 300 seconds. Other exceptions were rejected title/task-file/label combinations, refused owner steering, and inherited group identity contaminating legacy test fixtures.

Four workers and both coordinators logged `failed: group deadline or stop`; Herdr queries also logged `herdr agent get failed: ETIMEDOUT`. Team 2's coordinator recorded `The operation was aborted, session still open`. The lead lost a shell-backend response and its observer reset. Exact lines are retained in `.limen/lead-notes-2.md`; these observations do not establish one root cause.

After committing synthesis, `limen group stop` passed; its stop report had no failures. `group status` confirmed all eight members terminal (two done, six failed), and `limen group close` passed its liveness/clean-worktree checks. Branches, worktrees, cabinet and receipts remain retained; no pruning occurred. No member restart, helper agent, model substitution, push, or acceptance downgrade occurred.
