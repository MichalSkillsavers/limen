# Team 1 · Spec-link failures with evidence

The starting hypothesis is only partly true. Most misses were not agents skipping a contract. Two other causes did most of the damage. First, the ticket front matter contract did not exist on `main` until the F780 merge (`b27db47`, 2026-10-06 08:26). Before that merge, the template on `main` had no front matter, and the writers that read it (F781, F776) followed it correctly. Second, nothing ran a check that could catch the rest. `limen picture build --strict` exits 0 on every known miss, `limen land` and worker finish read no ticket, picture tick ignores `spec/`, and only 4 of 30 merges on `main` since 2026-10-03 have the `limen land` merge message. There is one real copy-a-neighbor case: the first F778 job read the F777 ticket and never read the template. The duplicate number came from a number that was reserved only inside a running job's task text, so nothing on `main` showed it.

Times: Git dates are local (+0200). Job logs use UTC (Z).

## Failures

Causes: (a) the agent never saw the rule, (b) the agent saw the rule and skipped it, (c) no check caught it.

| # | Miss | Evidence | Cause | Note |
| --- | --- | --- | --- | --- |
| 1 | First F778 folder (`F778-job-done-notifications`) | Job `2026-10-05-f778-job-done-notifications-408a5818`, commit `7d07a32` (10-05 23:18), log line 245 `write …/F778-job-done-notifications/ticket.md`. `task.md`: "You own F778 … Open ticket `spec/features/active/F778-job-done-notifications/ticket.md`". `finish-webhook-author`: `missing Ticket: pointer` | a, c | The spawner chose the number. The number existed only in `task.md`: no folder on `main`, no board line. The worker copied a neighbor: its session runs `cat spec/features/active/F777-hosted-pane-shows-true-agent-state/ticket.md` and has 0 reads of `_template/ticket.md` or `CONTRACT.md`. |
| 2 | Second F778 folder (`F778-coordinator-and-lead-finish-signal`) | Commit `9be55f9` (10-06 00:14). This commit was made directly on `main`, not by a job. Steer `408a5818/steer/delivered/0001/text` names the writer: "Tony already pushed ticket F778 on main (commit 9be55f9)". I found no transcript in `~/.omp`, `~/.pi` or `~/.codex` sessions. | c | At 00:14, `main` had no F778 folder and `spec/build.md` had no F778 line (`git show 9be55f9:spec/build.md`). A free-number check on `main` passes. Job `408a5818` had been running under the label `f778-…` since 23:06. [INFERENCE] The writer checked folders only, not `.limen/jobs` or `limen/*` branches. |
| 3 | The duplicate was found, then still merged | Steer 0001 at 22:16:35Z said: "Use THAT ticket … do not create a second F778 folder". `408a5818/log:519`. The job then timed out at 22:37:01Z (log end). Continuation `2026-10-05-f778-job-done-notifications-cont-b47fc607` has a `task.md` that drops the instruction ("note them open in the F778 ticket"), and its log lines 11 and 91 keep writing to `F778-job-done-notifications/`. Hand merge `4903bac` (10-06 01:24) added that folder to `main`. | b, c | The steer arrived 20 min before the timeout while the job was stalled. The continuation task lost it. `4903bac` is a hand merge: `limen land` uses `git merge --no-edit` (`src/project/git.ts:164`), which gives a `Merge branch 'limen/…'` message. |
| 4 | The duplicate became a permanent warning | F780 lead job `2026-10-05-f780-live-picture-lead-4a931240`, session at 2026-10-06T00:28:37Z: "making it an error would break `--strict` on this plant without an obvious fix". Commit `7e11c21` (`src/picture/tickets.ts:45-55`, level `warn`) | c | This was a deliberate choice: the check was made a warning so the plant stays green. No later step renumbers or merges the two folders. The duplicate still shows in today's strict output. |
| 5 | F781 committed with no front matter | Job `2026-10-05-finish-webhook-for-all-job-and-c-564eb769`, commit `ac4d369` (10-06 02:17), log:169 `cat spec/features/_template/ticket.md`, log:172 ticket write. Fixed by `c0c0e29` (after the F780 merge `b27db47`). | a | Counterexample: the agent read the template and did not copy a neighbor. The template at base `2855cd5` had no front matter (`git show 2855cd5:spec/features/_template/ticket.md`). The register rule "Front matter. The picture fields only" (`5d1f1f6`) is not an ancestor of `ac4d369`. The contract existed only on the unlanded F780 branch. |
| 6 | F776 and the first F778 ticket had no front matter | Job `2026-10-05-f776-trim-low-signal-tests-37ff3007`, commit `45d93a9`, log:9 `cat spec/features/_template/ticket.md`. Both tickets were fixed by the F780 lead in `7e11c21` (10-06 02:29). | a | The F776 writer read the old template, which had no front matter (same as row 5). The F778 writer copied F777, which also had none (row 1). |
| 7 | About 45 tickets backfilled during F780 | Job `2026-10-05-f780-backfill---ticket-front-mat-da742456`, commit `be3dc1c` (10-06 00:30): 41 tickets (13 active, 28 done) plus both templates and `CONTRACT.md`. Then `7e11c21` (2 tickets) and `c0c0e29` (1 ticket). Total: 44. | a | This was not an agent miss. These tickets had no front matter at all (no `touches`, `opened` or `landed`) because no ticket had ever had it. Of 63 tickets added since 09-20, 60 were created without front matter (`git log --diff-filter=A --since=2026-09-20 -- 'spec/features/**/ticket.md'`); the 3 with front matter are F780, F782 and F783. The first ticket with front matter is F780 (`3e15477`, 10-06 00:19). The reader that parses it is `b5c0b86` (00:28). |
| 8 | Map cites `active/F741…` after the move | Picture job `2026-10-03-f750-limen-features-and-journeys-d66f5833` (base `1cecf60`, ran 15:44–16:04Z) read `active/F741…` (log:73). It wrote `journeys/limen.journey.hosted-finish.md` (mtime 10-03 17:57). The move commit `c41b457` (10-03 17:46) came from the coordinator pane, during that job. | a, c | The move landed after the job's base, so the job could not see it. The coordinator's move step (`templates/agents.md:150`) says nothing about the map. |
| 9 | Map cites `active/F728…` and `active/F740…` after the moves | Same job `d66f5833` (log:133-134). It wrote `nodes/limen.plant.md` and `nodes/limen.integrations.herdr.md` (mtime 17:53–18:03). Moves came from the coordinator pane: `e78cd2d` (F728, 18:41) and `7dd9734` (F740, 19:05). | a, c | No agent was told to update the map. Picture tick drops every `spec/` path even when a map source cites it (`src/project/picture-tick.ts:142`). The watch is off on the plant (`.git/hooks` has only samples), and the dataset has not changed since 10-03 18:04. A dry-run tick today lists 40 code paths and no ticket path. |
| 10 | F782 has no `touches` | Job `2026-10-06-explainer-pages-spec-layout-and-33c86e3d`, commit `56a5887`. The session has 20 `--strict` runs, 8 `CONTRACT.md` hits and 4 template reads. Log:296: "F782 has no `touches` because the pages change no code." | b | The agent skipped `touches` on purpose, and the contract allows it: `ticket.no-touches` is a warning (`templates/picture/CONTRACT.md:67`, `src/picture/tickets.ts:121,180`). The task asked for front matter and a free number, and the agent did both. |
| 11 | 12 active folders have no board line (not in the brief) | F763–F767 group-planning commits `447ef3d`, `cb9d95e`, `05a4577`, `dc81aeb`, `ba2ed7f` came from the coordinator pane and do not touch `spec/build.md`. F776, F778 ×2, F780, F781, F782 and F783 were written by jobs. `spec/build.md` was last changed in `045085c` (10-05 23:02). | a, c | The group recipe (`templates/agents.md:27`) lists the ticket, brief and team files, but not the board. Workers must never edit the board (`templates/worker.md:14`), and the F780 and F783 leads ran as workers. No diagnostic reads the board against the tickets (team-1 map, `a0ac398`). |
| 12 | F768 and F769 tickets never reached `main` (not in the brief) | `1ca6e03` and `be53fa6` exist only on `limen/2026-10-05-f764-picture-log-methods-planning` and the team branches. Both groups ran: 8 and 7 jobs, for example `2026-10-05-f768-picture-dig-down-nav-team-1-0fa226a1`, whose `task.md` has `Ticket: spec/features/active/F768-…`. | c | A free-number check on `main` sees F768 and F769 as free. This is the same mechanism as rows 1–2. |
| 13 | F779 landed with no ticket (not in the brief) | Job `2026-10-05-f779-lead-overlay-waiting-wordin-488495ef`, merge `8dc40d3`. `finish-webhook-author`: `missing Ticket: pointer`. `git log --all -- 'spec/features/*/F779-*'` finds 0 commits. | c | Spawn checks a `Ticket:` pointer only when the task has one (`src/commands/spawn.ts:168-171`). |
| 14 | Free-number checks are improvised each time (not in the brief) | `564eb769` and `37ff3007` both use `ls spec/features/*/ \| grep -oE '^F[0-9]+'`. This lists one level and misses `done/YYYY-MM/*` and `dropped/YYYY-MM/*`. The F783 lead `81acb6b0` (log:13) uses `find spec/features -maxdepth 3`, a board grep and `ls .limen/jobs`. Only this one also sees running jobs. | a | `templates/agents.md:56` states the rule ("allocate the next unused `FNNN`") but gives no method. Of the sampled writers, only the F783 lead would have caught row 2. |

### Ticket guidance each sampled writer had

Source: counts in each job's `session/*.jsonl`. Sessions do not record the system prompt, so I took the register content from the job's base commit.

| Job | Base | Read `_template/ticket.md` | `CONTRACT.md` | `--strict` | Ticket written | Front matter in the template at base |
| --- | --- | --- | --- | --- | --- | --- |
| `408a5818` (F778 job-done) | `045085c` | 0 (read F777 instead) | 0 | 0 | yes | no |
| `37ff3007` (F776) | `1c04fc3` | 2 | 0 | 0 | yes | no |
| `564eb769` (F781) | `2855cd5` | 2 | 0 | 3 | yes | no |
| `4a931240` (F780 lead) | `5e4b5df` | 11 | 29 | 38 | yes, with front matter | it wrote the contract |
| `da742456` (F780 backfill) | `d33147a` | 24 | 52 | 21 | 41 tickets | it wrote the contract |
| `33c86e3d` (F782) | `c0c0e29` | 4 | 8 | 20 | yes, no `touches` | yes |
| `81acb6b0` (F783 lead) | `56a5887` | 5 | 14 | 18 | yes, valid | yes |

Pattern: every writer whose base already held the contract wrote front matter. Every writer whose base did not hold it followed the old template. Only `408a5818` copied a neighbor.

## What checks links today

At spawn:

- `src/commands/spawn.ts:168-171` (committed mode). Each `Ticket: spec/…` path must exist in the base commit. A task with no pointer passes (rows 1, 13). This is the only spec check that can refuse anything.

At worker finish:

- Nothing reads tickets, the board or the map. `src/integrations/finish-webhook.ts:38-40` reads the `Ticket:` pointer only to name an author (`missing Ticket: pointer` in rows 1 and 13).
- The completion wake text (`src/job/wake-text.ts`) does not mention specs.

At `limen land`:

- `src/commands/land.ts` (71 lines) reads no ticket, board or map. It runs `git merge --no-edit` (`src/project/git.ts:164`).
- Most landings bypass it anyway. Since 2026-10-03, 4 of 30 first-parent merges on `main` have the `Merge branch 'limen/…'` message. Spec commits `9be55f9`, `c0c0e29`, `56a5887` and `be71876` went straight to `main`. [INFERENCE] I read the merge path from the message shape.

On demand:

- `limen picture build --strict` (`src/picture/picture-build.ts`, `src/picture/tickets.ts`, `src/picture/picture-model.ts`). Only `ticket.unknown-touch`, `ticket.bad-field` and map shape errors fail the build. `ticket.no-touches`, `ticket.duplicate-id` and `source.missing` are warnings and exit 0. Nothing checks board lines. Tests: `test/picture-tickets.test.ts`, `test/picture-work.test.ts`.
- `limen picture tick` drops `spec/` paths (`src/project/picture-tick.ts:142`), so a lane move never refreshes the map. The watch hook that would run tick is off on this plant.

Strict output today, run once from this worktree (`node bin/limen picture build --dir /Users/overment/.overment/limen/.limen/picture --out /tmp/f783-team-1/map.html --strict`):

```
warn source.missing journeys/limen.journey.hosted-finish.md:19: source "spec/features/active/F741-omp-finish-wakes-herdr-coord/ticket.md" does not exist in the project root
warn source.missing nodes/limen.integrations.herdr.md:9: source "spec/features/active/F728-hosted-engine-liveness/ticket.md" does not exist in the project root
warn source.missing nodes/limen.plant.md:10: source "spec/features/active/F728-hosted-engine-liveness/ticket.md" does not exist in the project root
warn source.missing nodes/limen.plant.md:10: source "spec/features/active/F740-collaborative-groups/ticket.md" does not exist in the project root
warn ticket.duplicate-id spec/features/active/F778-job-done-notifications/ticket.md:1: F778 is also spec/features/active/F778-coordinator-and-lead-finish-signal/ticket.md; this ticket is left out
warn ticket.no-touches spec/features/active/F782-explainer-pages/ticket.md:1: active ticket has no touches
picture: 23 places, 41 edges; wrote /tmp/f783-team-1/map.html
exit=0
```

The output does not show rows 11–13. It has no board diagnostic, and it cannot see branches.

## Three changes that would have stopped most of them

1. **Reserve the number where everyone can see it.** `limen ticket new` should take the next number after scanning every lane, the `limen/*` branches and the labels in `.limen/jobs`. A spawn whose label or task names an `FNNN` with no ticket at base should warn with that command. This stops rows 1, 2, 3 (no clash left to steer around), 12 and 14, and it flags row 13 at spawn. The branch and job scan is the part a lane-only scan misses: rows 2 and 12 were invisible from `main`.
2. **Run one ticket check where spec changes actually merge, not only in `limen land`.** The check runs at land, in the keeper, and named in the completion wake. A new or changed ticket fails when it has no front matter, has a duplicate id, or has no board line. The check reports a map source that cites a path the branch renamed. This stops rows 4, 8, 9 and 11, and it would have listed rows 5 and 6 when `b27db47` merged the contract. It must also cover hand merges and direct commits to `main`: 26 of 30 recent merges bypassed `limen land`.
3. **Make a lane move carry the map with it.** The coordinator's move step (`templates/agents.md:150`) should say: grep the map for the old ticket path and fix each source. Picture tick should stop dropping `spec/` paths that a map source cites (`src/project/picture-tick.ts:142`). This stops rows 8 and 9, and it keeps change 2 from only reporting the stale sources forever.

Not stopped by any of the three: row 10. F782 has no `touches` because the contract allows it (`CONTRACT.md:67`). The lead must decide whether a ticket with no code effect needs a place id or a marker that says so.
