PASS d563d5917a7f672ba29e9f5e6d380b52b79fc091

The corrected spec clears the blocking finding in `review-1.md`, the review that failed the first candidate, `a774d18`. The contract for how long a group member lives is now one decision that fits together. Members stay inside their turn by repeatedly calling a bounded `limen group wait`. Each call lasts at most 20 seconds. Each role gets a recorded time budget. Continuing a coordinator is ruled out. A coordinator that exits early is terminal and ends up with the lead. The pruning finding is also fixed. The spec does not break any acceptance bullet. The notes below are ambiguities to settle before or during implementation. None of them blocks.

## Prior blocking findings, checked against d563d59

**1. Member lifetime: resolved.** The four open questions review-1 required (`design.md` §Member availability, lines 33–37) are all answered:

- **The CPU-idle stall kill no longer applies to waiting.** The 20-second cap per call fits the existing detector. Proven by reading source; not executed.
  - The detached wrapper builds its stall key from the tool count (`src/wrapper.ts:191`). Every new call changes the key and resets the window (`src/stalled-tool.ts:84-90`).
  - Each call's new CLI child also has a new pid, which breaks `stableChildren` (`src/stalled-tool.ts:107-112`).
  - Hosted mode uses the same observer (`src/supervisor.ts:140`).
  - Calls of 20 seconds or less therefore never add up to the 180-second window (`src/stalled-tool.ts:4`).
- **Hosted idle-close has an exception.** It skips a member that still owns live children or has unread events, and the group deadline still applies (line 35). The idle-close check only runs when the pane is not working and activity is `wait` (`src/supervisor.ts:280-290`). A pane inside a `group wait` call is working, so the exception can go in just before the clean-close return at `:290`.
- **Each role has its own budget.** The flags are `--timeout 30m --worker-timeout 20m`. A worker's budget is clipped to leave a 60-second wrap-up reserve for the coordinator. Hosted deadlines are enforced by group supervision, not by `spawn --timeout` (lines 18, 27).
  - This fits the detached limits: `LIMEN_TIMEOUT_MS` defaults to 90 minutes (`src/wrapper.ts:15,63,227`).
  - It also fits the 900-call cap (`:16,:133`), since a 30-minute run makes at most about 90 wait calls.
- **Continuing a coordinator is ruled out.** Each team gets exactly one coordinator launch (line 25). A coordinator that exits early is terminal and recovery goes to the lead (line 37). The only restart is an explicit `group start --new-run`, which is refused while a prior run is live (line 29). The TRACK line on the board says the same.
- **Workers use the same wait, and delivery no longer depends on the wake hook.** In the scenario, no worker may finish until it has answered a peer finding or its deadline passes (design line 37, `scenario.md:15`). A new group hook attaches events to tool results. The repo already patches tool results this way (`hook/communication.ts:70`). Wait output is the other path. The wake hook's early return under `LIMEN_JOB=1` (`hook/wake.ts:424,527`) no longer matters.

**2. Pruning: resolved.** "Worktrees needed for recovery" has been replaced. Every unclosed group's member worktrees and job records are now excluded from pruning and retirement, and members must commit before finishing (line 76).
- The only code that removes a worktree is `src/commands/prune.ts:96`. Its callers are spawn (`src/commands/spawn.ts:132`) and `limen prune`. Retirement is `prune --retire` (`src/commands/prune.ts:21-57`). The design names all of them.
- `limen stop` removes no worktree, so "invokes existing stop behavior" really does preserve work. Proven by grep.

**Required decisions from review-1: all answered.**
- `limen land` refuses a group-member caller (line 9). This is new behavior; `src/commands/land.ts` has no caller check today.
- A new group takes its root from the feature and working directory, not an inherited `LIMEN_CONTEXT_ROOT` (line 56).
- `group publish` writes only the group store, and the lead files findings (line 58).
- Member lifecycle goes through group delivery instead of ordinary subscriber or fallback wakes (line 72).
- A partial roster is never repaired automatically (line 29).
- The lead in the live proof is an interactive session (`scenario.md:13`).
- The run budget has flags (design lines 18, 27).

The optional refinements were also taken: one model with separate coordinator and worker reasoning, peer messages as attributed tool data, the independence-evidence ordering in `scenario.md:23`, and review jobs consuming a slot. No drift between the board and the spec: the new TRACK line and the NOW line in `spec/build.md` match the design.

## Notes (non-blocking)

1. **A hosted member held open for unread events cannot be reached.** Proven from the design text and source; the consequence is plausible.
   - Design line 35 keeps an idle hosted member open while it has unread events. But the design gives no way to deliver to an idle job:
     - tool-result attachment needs a working turn;
     - the wake hook exits under `LIMEN_JOB=1`;
     - the only injection API in the repo is `sendUserMessage` (`hook/steering.ts:97`, `hook/wake.ts:202-204`), which the design forbids for peer messages.
   - So the member sits until the group deadline and is recorded stopped/failed (line 27). This conflicts with line 37 ("terminal, not a dormant listener") and line 70 ("terminal members retain unread messages for deliberate continuation").
   - Example: a group broadcast published just after a hosted worker went idle cleanly would turn its successful finish into a deadline failure.
   - Fix: either drop "or has unread group events" and let line 70 keep the messages, or say what re-engages the member.
   - The live scenario is detached, so this does not affect acceptance.
2. **What happens to a dirty worktree after close is ambiguous.** Plausible data loss.
   - Line 76 excludes an unclosed group's members "until the lead closes it". It also says close "reports retained dirty worktrees rather than discarding them" and "releases only safe-to-prune member paths". Separately it says "Do not force-delete it to make close succeed".
   - Read literally, closing lifts the protection. The next `limen spawn` prune would then run `git worktree remove --force` (`src/git.ts:125`) on the dirty worktree that close had only reported.
   - Fix: pick one. Either close refuses while any member worktree is dirty, or dirty paths stay excluded after close until the lead resolves them.
3. **Independence ordering depends on timing.** Plausible.
   - `scenario.md:23` requires each worker's initial hypothesis to predate its first observed peer delivery.
   - Automatic tool-result attachment (line 35) will hand a late-starting worker the other team's hypothesis on its first tool call, possibly before it has published its own. Nothing in the design holds peer findings back.
   - Fix: withhold peer findings (not lifecycle events) from a member until its first publication, or have the prompt require publishing the hypothesis as the member's first action.
4. **The 20-second cap multiplies model turns.** Plausible.
   - A coordinator waiting through a 20-minute worker budget spends about 60 xhigh turns, most of them on empty results. The main risk the design guards against is a model ending its turn early, and a long run of empty loops raises that risk.
   - Any cap below 180 seconds is compatible with the stall detector. For example, 120 seconds would cut the turn count about sixfold.
5. **Ticket style.** Acceptance bullet 5 (delivery states, then restart/concurrency) and bullet 6 (stop/close preservation, then deadline/wait regressions) each still bundle two checks.

## Checks run

- `git rev-parse HEAD` returned `d563d5917a7f672ba29e9f5e6d380b52b79fc091`, matching the candidate. `git status --short` was clean.
- `git diff a774d18 d563d59` showed the delta. I read `design.md`, `scenario.md` and `ticket.md` at the candidate, plus `spec/build.md` lines 1–30.
- Source reads only, nothing executed:
  - `src/stalled-tool.ts`, `src/wrapper.ts` (timeout, tool-call cap, stall key), `src/supervisor.ts` (idle-close, stall observer)
  - `src/commands/prune.ts` and the spawn call to prune, `src/commands/land.ts`
  - `hook/{wake,steering,communication,hosted}.ts` (job early returns, `tool_result` patching, injection APIs)
- Not run: `npm ci` and all runtime suites, per the task (this candidate is documentation only).
