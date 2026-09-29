# Collaborative groups

## Ownership and diversity

Group mode is an explicit exception to ordinary Limen's one-coordinator arrangement. The owner still talks to one lead coordinator. That lead starts a fixed roster of team coordinators; each manages only its own bounded worker allocation. A team coordinator is a managed group member, not a second plant owner or an unrestricted `spawn --role coordinator` escape hatch.

All teams receive the same ticket and acceptance criteria. Their approach notes give distinct starting hypotheses, not unrelated subtasks. Each member's first tool action publishes its own initial hypothesis from the supplied approach note, before reading peer findings or using other tools; this ordering is carried by the launch prompt, not a new phase machine. Afterwards they may exchange findings, questions, counterexamples, and requests for help without waiting for a formal debate phase. Evidence can change an approach; agreement is not mandatory. This is operating guidance, not a Markdown-driven state machine.

Teams produce separate candidate branches. A coordinator may integrate its workers' committed branches with ordinary Git in its own assigned worktree, but never merge into the plant's main branch, change the project board, approve another team's result, or push. `limen land` refuses a group-member caller; an explicit group root is routing context, not landing authority. The lead compares the evidence and selects or combines candidates under the existing owner policy. Receiving a message never transfers job ownership. This remains process isolation, not a hostile-code sandbox.

## Explicit activation and a fixed allowance

Proposed public entry point:

```sh
limen group start spec/features/active/FNNN-name \
  --teams 2 --workers-per-team 2 \
  --timeout 30m --worker-timeout 20m \
  --engine omp --provider openai-codex --model gpt-6.1-sol \
  --thinking xhigh --worker-thinking high
```

The lead prepares and commits the ticket, `group/brief.md`, and one approach note per team before activation. The brief contains the shared outcome, team approaches, constraints, and synthesis responsibility. The command takes machine settings as explicit arguments and records them; it does not extract configuration from prose. Missing prerequisites are reported before launches. No folder watcher or global setting starts groups.

The team count is fixed for a run. `--workers-per-team` is a total launch allowance, not merely simultaneous concurrency: a worker continuation, replacement, or separately authorized review job consumes another slot. Each team has exactly one coordinator launch; coordinator continuation is not supported in this first release. Concurrent starts and spawns cannot overspend the allowance. Exhaustion preserves work and asks the lead rather than creating more agents. No nested groups, recursive team coordinators, hidden retries that generate a new session, or silent model replacement.

Normal engine/provider/model/reasoning flags remain explicit on every actual launch. This release records one engine/provider/model for the group, with separate coordinator and worker reasoning levels; diversity comes from approaches, not an automatic model chooser. Hosted versus detached follows the existing environment and explicit mode flags. The group timeout is a fixed wall-clock deadline shared by the run; a worker also has its shorter role timeout. A new worker's budget is clipped to leave a recorded 60-second coordinator wrap-up reserve before the group deadline; reject launches with no remaining worker time. Group supervision enforces these deadlines in hosted mode too, rather than passing unsupported `spawn --timeout` flags to hosted jobs. A deadline produces a truthful stopped/failed member with preserved evidence, not a successful synthesis.

A repeated start reports the existing run and launches nothing, including missing roster slots. Partial launch failure leaves an inspectable partial group and already-started jobs. There is no automatic roster repair. The lead stops the partial run and explicitly uses `group start --new-run` to authorize another run against the same feature, after inspecting retained work. That flag is refused while a prior run is live. This starts a newly budgeted run, never quietly replenishes the old allowance.

## Member availability

Team coordinators stay inside their assigned turn while their children are live. Idle members use `limen group wait`, which returns the next eligible event batch, a child terminal event, a stopped-group indication, or a deadline/timeout result. Each call is capped at 20 seconds, below the existing three-minute CPU-idle confirmation window. It returns normally even without events; prompts tell members to re-enter the bounded wait until their task is complete or the group deadline expires. Do not solve waiting by disabling process-liveness checks or keeping an exited process marked running. Apply the wait cap to the actual CLI child; no unbounded wrapper, busy loop, or repeated fake activity stamps.

A group-specific hook also attaches pending peer events to normal tool results while a member is working. Both paths present peer messages as attributed tool data, never as human steering. The hook records which events actually entered the next model turn; printing CLI output alone is only transport acceptance. Wait timeouts, receipts, and acknowledgments do not publish new events. Hosted idle-close skips a live group member that still owns live children, but the group deadline still applies. Unread events alone never keep an otherwise finished hosted worker alive; retain them for deliberate worker continuation instead of turning a successful finish into a timeout. This exception leaves ordinary hosted idle-close unchanged.

Workers use the same bounded wait primitive when collaboration is part of their assigned acceptance. In the live scenario, neither worker finishes until it has responded to one peer finding or its deadline expires. A coordinator that exits early is terminal, not a dormant listener: report the incomplete team, preserve its children and evidence, and leave recovery to the lead. Never silently continue a coordinator.

## Feature packet and live cabinet

```text
spec/features/active/FNNN-name/
  ticket.md
  group/
    brief.md
    teams/<team>.md
    findings/<finding>.md
    synthesis.md

.limen/groups/<group-id>/
  machine-readable membership, settings, events, and receipts
```

The feature packet is ordinary versioned documentation, not executable workflow state. The cabinet supplies routing only. Existing `.limen/jobs/<job-id>/` records remain the authority for whether a job is running or finished. Group inspection derives member progress from those records instead of maintaining a second job-state store.

All members receive the canonical plant root, group ID, team ID, and feature location explicitly. A new group resolves its root from the explicitly selected feature and command working directory, not a stray inherited `LIMEN_CONTEXT_ROOT`. A member's later commands verify its recorded identity against that group's cabinet before using the canonical root. A spawn issued from a member's worktree must not create a second `.limen/jobs` cabinet there. Each worker still owns one isolated Git worktree and one repository. Worker membership survives same-engine continuation without guessing from labels or branch names; the new job consumes a worker slot and does not erase its predecessor's receipts.

A message is published once to the canonical group cabinet. A short finding includes its author, team, relevant commit/artifact, and uncertainty; it is not a transcript dump. `group publish` writes only that cabinet, never the primary checkout's tracked feature packet. The lead files selected findings, team summaries, and synthesis into the primary feature folder in one ordinary documentation commit. Other worktrees' copies of the packet are snapshots, never the live message transport. Moving the feature to a terminal lane must not strand retained group evidence.

## Group communication is not ordinary steering

Offer a small command surface for `group status`, `group publish`, `group wait`, `group stop`, and `group close`, alongside `group start`. A member's publication targets the group by default; a directed question may target a team. No manual watch/steer setup is required for ordinary group participation. The lead is the interactive owner-facing coordinator session that starts the group; it subscribes to compact group updates. A headless team coordinator is a managed member, not a substitute for an absent lead.

Lifecycle events (member start, terminal state, and existing blocker/advisory changes) are automatic. Semantic progress requires the agent to publish a finding or checkpoint; the harness must not invent progress from CPU, tool count, or a log summary. The group prompts require publication when an assumption changes, evidence disproves an approach, help is needed, or a candidate is ready.

Coordinators and workers receive attributed, bounded group updates through a distinct context path. A peer message is fallible task data, not a human command, and cannot widen authority or override the ticket. Ordinary owner steering remains distinguishable and authoritative. The lead receives a compact group summary rather than every tool event.

Each event has a stable identity and each intended recipient has delivery evidence. Queued, transport-accepted, and observed-in-an-agent-turn are different facts. Preserve the existing two-unsuccessful-attempt policy without sharing one recipient's failure allowance with every other recipient. Do not claim exactly-once agent execution across a crash. Prevent duplicate effects where observable, show uncertain receipts, and stop automatic retry when the allowance is exhausted.

Batch bursts and bound injected text; retain omitted detail in the cabinet and identify where to read it. A reconnecting or continued member can catch up without replaying all already-processed events. Terminal members retain unread messages for deliberate continuation rather than being automatically respawned. Delivery receipts and acknowledgments never generate new group publications, preventing a mechanical reply loop.

Group subscriptions are informational. Existing completion wakes include landing instructions and cannot simply be broadcast. Group-member starts, completions, and advisories use group lifecycle delivery instead of ordinary subscriber/fallback wakes, so the lead does not receive a second landing instruction for each child. Existing seat and finish-webhook transports keep their recorded opt-in behavior but do not become group-message transports. Jobs outside groups keep their ordinary routing and fallback behavior unchanged.

## Stop and proof

Stopping a group first prevents new launches, then invokes existing stop behavior for that group's live members only. Record failures honestly; a stopped group with a surviving process must say so. Retain branches, publications, and unread messages. Exclude every unclosed group's member worktrees and job records from automatic/explicit pruning and retirement until the lead closes it with `group close`. Stop is not close: it preserves uncommitted recovery work. Close refuses while any member is live or any retained member worktree is dirty; refusal leaves all pruning protection intact. Only a successful close releases the group's clean member paths and records for ordinary pruning. Clean members commit before finishing; the lead explicitly resolves dirty recovery work. Do not force-delete it to make close succeed. A failed coordinator or quota error does not authorize a model fallback or another worker wave.

Use dependency-free, narrow modules and native real-file/real-Git tests. Cover concurrent start/allowance claims, continuation, routing isolation, duplicate delivery, ambiguous acknowledgment, bounded retries, burst catch-up, and stop-versus-spawn. Test existing ordinary spawn/wake/steering behavior for regressions. Update package prompts and shipped prompt history together.

The live proof in `scenario.md` is separate from deterministic tests. A fake engine can prove routing mechanics, not that real agents collaborate. Preserve job IDs, model settings, candidate SHAs, actual check output, and an observed response to another team's finding. Do not mark the feature proven or push its implementation on the strength of transport acceptance or clean worker exit alone.
