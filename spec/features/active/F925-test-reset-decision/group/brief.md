# Brief

## Shared outcome

Adam gets one verdict on Limen's tests: **full restart**, **staged replace**, or **deep cut**. The verdict comes with a numbered plan, a target size in lines, a target run time, the list of seam scenarios, an anti-bloat rule, and a file-by-file action for every file in `test/`. This run decides. It deletes nothing.

Owner request (Adam, 2026-10-06 12:21): most Limen tests are bloated and have no value. Be strict. Rethink the tests, even if every test is ripped out and rebuilt from scratch, but first decide if that should be done. Agents move very fast, so the old rule "do not remove something you would have to rebuild" does not hold. "We are all about hacking away the unessential."

## Facts at the start

- `test/`: 17,094 lines in 58 files (57 `*.test.ts` plus `test/scratch.ts`, a shared helper). `src/`: 11,434 lines.
- Biggest files: `wake-hook` 1,889, `hosted-spawn` 1,340, `spawn-command` 930, `group-command` 879, `finish-webhook` 829, `github-doorbell` 700.
- The last full run on `main` (F783 lead, 2026-10-06 11:03): 532 tests, 530 pass, 2 skipped, **1,502 seconds** (about 25 minutes) on a loaded Mac. Output: `/tmp/f783-lead/full-suite.tap` (TAP with per-test `duration_ms`).
- `npm test` runs `node --test --test-concurrency=1 --test-timeout=60000 test/*.test.ts`. No runtime dependencies (`test/structure.test.ts` pins that).
- The F776 trim (`spec/features/active/F776-trim-low-signal-tests/`): 17,543 to 15,120 lines, 516 to 428 test blocks. New work since then added about 2,000 lines back. Its `notes.md` lists the classes it cut and the timing tests it kept.
- Some group timing tests fail at random under load and pass on rerun.

## The seams

These are the paths a user feels. The three pages describe them for a reader; read them as files or with headless Chrome. Never run `open` on Adam's display. For a visual look use only `/Users/overment/.local/bin/vscreen`.

- `/Users/overment/Downloads/limen-roles-and-loop.html` (roles, the agent loop, steering and context injection, the finish signal)
- `/Users/overment/Downloads/limen-spec-structure.html` (tickets, front matter, the strict check)
- `/Users/overment/Downloads/limen-picture-live.html` (live map; for example `#place/limen.sessions.worker`)

Lead's starting list. A team may split or merge seams, but must publish the change with its reason:

1. **Spawn**: a task becomes a job with its own worktree and branch, hosted or detached, and the engine starts.
2. **Finish and wake**: a job ends as done, failed, stopped or timed out; the state file is written; the coordinator or lead wakes.
3. **Steering and context injection**: `limen steer` and `limen continue` reach the agent; the hooks add the speech register, styleguide, vision and board pointers, and peer findings.
4. **Land**: `limen land` merges a done job onto a clean target and refuses unsafe cases.
5. **Spec keeper**: `limen ticket new`, `limen ticket check`, `limen keeper`, and the land gate on tickets.
6. **Webhooks**: the plant's finish and event pings reach only the allowed targets.

Open question for all teams: are groups, the GitHub doorbell, the picture, sweep and prune seams of their own, or details under the six above?

## Rules

- Read-only for `test/`, `src/`, `hook/`, `bin/`, `templates/`. You may run tests, time them, and run `git log`, `git show` and `git blame`.
- Write only under `spec/features/active/F925-test-reset-decision/group/teams/`. File names start with your team, for example `team-1-scores.md`. Commit them on your own branch. The lead copies selected parts to `group/findings/` and writes `group/synthesis.md`.
- Do not run two full suites at once on this Mac. To time the suite, run single files with `node --test --test-concurrency=1 test/<file>.test.ts` and say the load average (`uptime`) next to each number.
- Every number names its source: a command, a commit, or a file and line.

## Talk to each other

- Your first action publishes your hypothesis: `limen group publish 'Initial hypothesis: …'`.
- Publish a checkpoint finding by **minute 35** and your draft verdict by **minute 70**.
- Answer every point another team addresses to you with `limen group publish --team team-N 'Answer to team-N: …'`. Agree, or say what evidence would change your mind. Silence is not an answer.
- Your final note has a section **Points from other teams**: each point, your answer, and whether it changed your result.
- Final notes committed by **minute 105**. The group deadline is 2 hours.

## Shared format for the file table

One row per file in `test/`, sorted by lines, largest first:

| File | Lines | Seam | Class | Action | Reason |
| --- | --- | --- | --- | --- | --- |

- **Seam**: one of the six, another seam you name, or `none`.
- **Class**: `seam` (drives the real product path), `unit` (pure tricky logic), `mock`, `copy` (restates the code), `wording`, `timing`, `duplicate`, `trivia`.
- **Action**: `delete`, `scenario` (rewrite into a seam scenario), or `keep`.
