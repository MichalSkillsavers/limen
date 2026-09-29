# Live proof: two teams build a job-summary function

## Fixture

Create one disposable local Git repository outside the Limen checkout. Do not add a remote or enable finish webhooks. Initialize ordinary Limen project files and commit a small Node/TypeScript package with native `node:test` checks and one feature ticket.

The task is to implement `summarizeJobs(records)` without dependencies. Records have an ID, an increasing numeric revision, and a state (`running`, `done`, `failed`, or `stopped`). Keep the highest revision for each ID. Return counts by state and a sorted list of failed/stopped IDs. Reject malformed records and conflicting records at the same ID/revision; do not mutate the input. Empty input produces zero counts. Give both teams the same task and acceptance tests.

Prepare distinct approach notes: team A explores a single-pass map; team B explores sorting/grouping with a separate validation pass. These are initial hypotheses, not implementation restrictions. Neither may read the other's candidate before stating its own approach.

## Run

Start one group with two team coordinators and one worker launch per team, using the approved OMP model and explicit provider/model/reasoning. Use detached mode when no Herdr session is available; record that hosted transport remains unproved by this scenario. Set a finite run budget. No automatic repairs, third team, additional worker wave, or provider fallback is included in this proof.

Each coordinator launches its own worker through the real group path. Each worker publishes an initial hypothesis, then at least one concrete edge-case finding with a test or counterexample. Each must receive a peer finding automatically and publish a brief evidence-based response: adopt it, refute it with a check, or explain why its candidate already handles it. Mere queue or transport acceptance does not count.

Both workers run the fixture checks and commit their candidates. Team coordinators inspect their own candidates and summarize the evidence without merging to the fixture's main branch. The lead writes a synthesis that compares the approaches, identifies the exchanged finding and response, and selects or combines the checked candidates. The fixture may be locally integrated by the lead for the final check; it is never pushed.

Inspect group status and delivery records. Stop the group after the run and confirm no group-owned process remains live. Keep the fixture and its job evidence until the result has been filed.

## Evidence and success

File `checks.md` beside this scenario with the implementation SHA, fixture path, exact launch command, group/member IDs, actual engine/provider/model, candidate SHAs, test outputs, and the finding/response event IDs with observed transcript excerpts. Do not copy credentials, full environments, or unrelated transcripts.

A pass requires two independently started approaches, two passing candidates, cross-team communication observed in a recipient's turn, a reasoned synthesis, and successful stop/cleanup. If transport works but real recipients never use a message, report failure or partial proof, not collaboration success. If one team hits quota or an engine error, preserve evidence and report the blocker without changing models.

Deterministic tests separately prove duplicate delivery, restart/catch-up, concurrent allowance enforcement, and unrelated-job isolation. Run the repository's full native checks in the clean candidate worktree and retain their output before the implementation is merged and pushed.
