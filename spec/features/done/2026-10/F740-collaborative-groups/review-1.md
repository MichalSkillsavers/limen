FAIL a774d1833a0150eb5bc3d28f2a97923fbdd7953a

The spec is not ready to implement. The design requires team coordinators and workers to stay available for child completions and peer findings. Current code closes, ends or kills exactly the waiting member it describes. The design also rules out continuing a team coordinator. Group artifacts mostly survive the current pruning, but member worktrees do not.

Scope reviewed: `spec/features/active/F740-collaborative-groups/{ticket,design,scenario}.md` and the TRACK section of `spec/build.md`, lines 10–12. These cover the review and reasoning policy, the collaborative-groups review/proof rule, and the group boundary. Ticket, design and board agree on that boundary: opt-in, one lead who alone lands, fixed allowances, separate candidate branches, peer messages that only inform, no recursive coordinators. No board drift.

## Blocking

**1. The headless team-coordinator lifetime can be built, but not as written.** Proven by source; not executed.
- **Detached member.** The engine runs in `--mode json` (`src/engine.ts:132`): one prompt, then the process exits and the job records `done` (`src/wrapper.ts:243-246`). A coordinator gets the same 90-minute timeout and 900-tool-call cap as its worker (`src/wrapper.ts:15-16`), so it can time out alongside or before the worker it waits on.
- **Hosted member.** Design line 25 treats hosted mode as safe. It is not: the supervisor finalizes a clean idle session as `done` after 60 s (`src/supervisor.ts:27`, `:290`, `:189-195`; pinned by `test/hosted-spawn.test.ts:69`). A team coordinator that delegated all its work has a clean worktree by construction.
- **Both modes.** The wake hook returns early whenever `LIMEN_JOB=1` (`hook/wake.ts:424`, `:527`), and jobs load only the steering, communication and hosted hooks (`src/wrapper.ts:105`, `src/supervisor.ts:230`). No member gets child-completion wakes.
- **Waiting inside a tool.** Both supervisors kill a tool whose child tree stays CPU-idle for 3 minutes (`src/stalled-tool.ts:4`, `:113`; `src/wrapper.ts:191-215`; `src/supervisor.ts:165-171`). A blocking `limen wait`, which polls once a second (`src/commands/wait.ts`), has that shape. That it would actually be killed is plausible, not observed.
- **The fallback is closed.** Design line 23 fixes coordinator launches by the roster. Design line 60 forbids automatic respawn. So a coordinator that ends its turn has no counted way back.

Without a decision here, acceptance bullet 3 (a finding reaches the other team's running coordinator) and the scenario step where coordinators inspect candidates after their workers finish cannot be met.

Smallest correction: add one "member availability" paragraph to `design.md`. Members stay inside their turn by calling a bounded `limen group wait`. It returns on the next undelivered event for that member, on a child reaching a terminal state, or at the member's deadline, and prints the events as tool output. That output is also the distinct non-user context path and the in-turn delivery receipt. The paragraph must also say:
- the wait is exempt from, or compatible with, the CPU-idle tool-stall kill;
- hosted idle-close skips a member that still has live children or unread events;
- `group start` records a per-role budget, with the coordinator budget longer than the worker budget;
- whether a team coordinator may be continued, and which counted allowance that uses.

The same primitive must serve workers. The scenario allows one worker launch per team (`scenario.md:13`), and a continuation spends a launch. A worker must therefore not finish until it has answered one peer finding or its recorded deadline passes. Without that rule, whether the two workers ever overlap long enough to respond is timing luck (plausible).

## Pruning: which group artifacts survive

Proven by source; not executed.
- **Survive:** the `.limen/groups/<id>/` store for group membership, events and receipts (the design's "cabinet"). Also the job records of finished members and Git branches. `pruneFinishedWorktrees` reads only `.limen/jobs`. It removes only records that have no state and are past startup grace (`src/commands/prune.ts:59-99`), and it uses `git worktree remove --force`, which keeps branches (`src/git.ts:124-125`).
- **Do not survive:** member worktrees. Every `limen spawn` runs prune over the whole project (`src/commands/spawn.ts:132`) and force-removes the worktree of every job that is not live, uncommitted work included (`prune.ts:85-96`). That includes a team coordinator's own spawn in the middle of a run. This contradicts "Keep … worktrees needed for recovery" (design line 66). Acceptance bullet 5 promises only branches, findings and unread messages, so it can still be met.
- **Correction:** drop "worktrees" from design line 66 and require members to commit before finishing or stopping. Or state that prune skips members of a group until the group is closed.
- **Unverified:** the explicit `limen prune` command body beyond line 59 was not read.

## Required decisions (not blocking)

- **Where the project root comes from, and landing.** All commands resolve the root with `git rev-parse --show-toplevel` from the current directory (`src/git.ts:6-15`, `src/lookup.ts:5`). Once members are pointed at the main project root, `limen land` from a team coordinator merges into that checkout's current branch, which is normally main (`src/commands/land.ts:18-28`). That breaks design line 9. The root must also come from explicit group identity: every job already inherits `LIMEN_CONTEXT_ROOT` (`spawn.ts:199`, and it is set in this job), including a job that runs the live proof against a separate fixture. Correction: refuse `land` for group members; team coordinators integrate worker branches with Git in their own worktree.
- **Filing findings.** `group publish` goes to the group store, but the ticket and design line 48 put findings and synthesis in the feature folder. Nothing says who writes them or into which checkout. If publish writes into the main checkout, the untracked files block `limen land` (`git.ts:144-148`, `land.ts:24`). Correction: publish writes the group store only; the lead files chosen findings and the synthesis in one normal commit.
- **Ordinary completion wakes for team workers.** Detached jobs strip `PI_SESSION_ID` (`wrapper.ts:118`; also absent in this job). A team coordinator's spawn therefore records no subscriber (`spawn.ts:76`, `:153-158`). After the fallback grace, the lead gets the ordinary "waiting on landing owner" wake for every team worker (`hook/wake.ts:232-254`, `:871-879`). Design line 62 keeps this unchanged. Say that this is intended, or route member completions through group lifecycle events only.
- **Partial roster.** "Do not blindly rerun" and "remaining allowance" (design line 27) leave it open whether a repeated start fills team slots that never launched. Pick one.
- **The lead in the live proof.** The scenario does not name the lead. A detached job acting as lead has no wake hook. Correction: the lead is an interactive coordinator session opened in the fixture.
- **Run budget.** The scenario requires a "finite run budget" (`scenario.md:13`). The proposed command has no budget flag (design lines 15-19), and hosted spawn refuses `--timeout` (`spawn.ts:68`).

## Optional refinements

- **Model settings.** "The lead can select model diversity" conflicts with the single `--model` flag. The board sets `xhigh` for coordination and `high` for ordinary jobs, but the design passes one recorded setting to every member.
- **Message path.** Today the only way to inject text mid-turn is `sendUserMessage`, which carries user authority (`hook/steering.ts:97`, `hook/wake.ts:202-204`). Tool output from a group wait, or patching tool results (the precedent is `hook/communication.ts:70-77`), would give a separate path for peer messages.
- **Independence evidence.** `checks.md` should show each team's initial-hypothesis event before that member's first observed peer delivery.
- **Reviewers.** Say whether a reviewer spawned by a team coordinator counts against the team's allowance.
- **Ticket style.** Acceptance bullets 2 and 6 each bundle several checks; split them.

## Checks run

- `git rev-parse HEAD` returned `a774d1833a0150eb5bc3d28f2a97923fbdd7953a`, matching the candidate. `git status --short` was clean.
- `npm ci` completed and added 12 packages.
- Focused suites were started and then cancelled at the owner's direction before any result: `hosted-spawn`, `stalled-tool`, `wake-hook`, `steering-hook`, `spawn-command`, `continue-command`, `land-command` and `wait-command`. They are unverified. Every behaviour claim above comes from reading source at this commit.
- Environment check inside this detached OMP job: `LIMEN_JOB`, `LIMEN_CONTEXT_ROOT` and `LIMEN_JOB_ID` are set; `PI_SESSION_ID` is absent.
