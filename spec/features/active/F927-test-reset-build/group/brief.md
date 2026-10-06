# F927 group brief · rebuild Limen's tests from scratch under a 3,500-line cap

## Outcome

Carry out the test-reset verdict Adam approved on 2026-10-06 (F925): a staged replace, written from scratch. Each team writes its seam scenarios on the shared throwaway plant, proves the incident guards it owns, deletes the old files its scenarios replace, and hands the lead one checked candidate per scenario. The lead lands each candidate on `main` right away. End state: about 3,350 lines in `test/` in about 20 files, a full run of about 4 minutes.

## Read first

- `spec/features/active/F925-test-reset-decision/group/synthesis.md`: the plan, the seams, the ten scenarios and what each must catch, the five incident families, the accepted risks.
- `spec/features/active/F925-test-reset-decision/group/teams/team-2-design.md`, section 3: the story of each scenario (setup, commands, checks, what it replaces). Section 8b: the bug-to-test table.
- `spec/features/active/F925-test-reset-decision/group/findings/file-actions.md`: one action for each old file.
- `spec/features/active/F925-test-reset-decision/group/teams/team-3-incidents.md`: how each incident was reproduced.

## What is already on main (stage 0)

- `spec/vision.md` caps `test/` at 3,500 lines. Only Adam changes that line.
- `test/structure.test.ts` fails when the new files in `test/` pass the cap. An old file starts with `// F925 old suite, frozen at N lines.`; it does not count, and it may only shrink. Never edit an old file; delete it.
- `limen land` refuses a branch that adds test lines and leaves `test/` over the cap.
- `test/plant.ts`, the shared fixture: `plant()`, `limen()`, `spawnJob()`, `waitJob()`, `jobDir()`, `jobFile()`, `until()`, `release()`, `engineEvents()`, `requests()`, `respond()`, `repository()`, `git()`. Read its header and doc comments.
- `test/fake-engine.mjs`, the one fake `pi`/`omp`. It loads the real hook extensions Limen passes and runs the task text as a script: `commit`, `fail <code>`, `error`, `say <text>`, `tool <command>`, `block`, `orphan`, `finish <handoff>`. It records argv, environment names, task bytes, the system prompt and every steer, follow-up and notice in the job dir. Run it with `--extension hook/wake.ts` and `PI_SESSION_ID` to act as a coordinator session (see how `release()` and `engineEvents()` take a dir).

## Rules (Adam, binding)

1. No mocks of our own code, no copies of the code, no wording checks, no sleep-based or wall-clock waits. Scenarios run the real `bin/limen` on a throwaway plant. Wait with `waitJob`, `until` (file events) and `release` (FIFO). Age a file with `fs.utimes`, never by waiting. The one allowed hold is S8's real 12-second launch-lock hold.
2. A scenario lands together with the deletion of the old files it replaces. A file that two scenarios replace is deleted with the second one to land; the first team publishes when its part is on `main`.
3. Incident guards: before you delete an old test of one of the five incident families, prove your new test catches the old bug. On a scratch branch, revert the fix (`git revert --no-commit <fix>`, or check out `<fix>^ -- src hook bin` under the new tests when the revert does not apply) and show the new test going red, then green on `main`. Put the commands and the real output in your candidate message. If nothing reaches the bug, keep the old test and say so.
4. The fixture is shared. Do not fork it and do not edit `test/plant.ts` or `test/fake-engine.mjs` in a scenario commit. When you need a change, commit it alone on your branch and publish `Fixture change: <commit> <why>` to the lead. The lead lands it on `main` and you rebase.
5. Stay inside your team's line budget (team note). Publish your line count with every candidate. New work replaces tests; it does not only add them.
6. Names: scenarios `test/s<N>-<seam>.test.ts`, units `test/u<N>-<name>.test.ts`. One `plant()` per file where you can; each plant costs about 2 seconds.

## Candidate hand-off

Members cannot land. For each scenario, rebase your branch onto `main` (worktrees share refs: `git rebase main`), then run `npx tsc --noEmit`, `npx biome check .`, `node --test test/structure.test.ts test/s*.test.ts test/u*.test.ts`. Then publish to the lead:

`Candidate ready: S<N>, branch <branch>, commit <sha>. Deletes: <files>. test/ new-suite lines: <n> (+a -d). Checks: <commands and results>. Replay: <fix, red output, green output> or none. Wall time of the scenario file: <s>.`

The lead runs the checks again, lands the candidate on `main`, pushes and publishes `Landed`. Rebase before your next candidate. Teams land one at a time.

## Lead

The lead lands, keeps the fixture and the cap, answers questions, and writes the outcome. Ask early; a blocked team costs more than a question.
