# Collaborative groups

## Ownership and diversity

Group mode is an explicit exception to ordinary Limen's one-coordinator arrangement. The owner still talks to one lead coordinator. That lead starts a fixed roster of team coordinators; each manages only its own bounded worker allocation. A team coordinator is a managed group member, not a second plant owner or an unrestricted `spawn --role coordinator` escape hatch.

All teams receive the same ticket and acceptance criteria. Their approach notes give distinct starting hypotheses, not unrelated subtasks. Each states its own initial approach before adopting another team's solution. Afterwards they may exchange findings, questions, counterexamples, and requests for help without waiting for a formal debate phase. Evidence can change an approach; agreement is not mandatory. This is operating guidance, not a Markdown-driven state machine.

Teams produce separate candidate branches. A coordinator may prepare its team's candidate in its assigned worktree, but never merge into the plant's main branch, change the project board, approve another team's result, or push. The lead compares the evidence and selects or combines candidates under the existing owner policy. Receiving a message never transfers job ownership.

## Explicit activation and a fixed allowance

Proposed public entry point:

```sh
limen group start spec/features/active/FNNN-name \
  --teams 2 --workers-per-team 2 \
  --engine omp --provider openai-codex --model gpt-6.1-sol --thinking high
```

The lead prepares and commits the ticket, `group/brief.md`, and one approach note per team before activation. The brief contains the shared outcome, team approaches, constraints, and synthesis responsibility. The command takes machine settings as explicit arguments and records them; it does not extract configuration from prose. Missing prerequisites are reported before launches. No folder watcher or global setting starts groups.

The team count is fixed for a run. `--workers-per-team` is a total launch allowance, not merely simultaneous concurrency: a continuation or replacement consumes another slot. Team-coordinator launches are separately fixed by the roster. Concurrent starts and spawns cannot overspend the allowance. Exhaustion preserves work and asks the lead rather than creating more agents. No nested groups, recursive team coordinators, hidden retries that generate a new session, or silent model replacement.

Normal engine/provider/model/reasoning flags remain explicit on every actual launch. A group records its chosen settings and passes them to descendants; the lead can select model diversity deliberately, but this release need not add an automatic model chooser. Hosted versus detached follows the existing environment and explicit mode flags. A headless implementation must explain and exercise how a team coordinator stays available for child completions instead of assuming an exited JSON-mode process will receive a wake. An engine-appropriate wait inside a managed team coordinator must not block the owner's conversation.

A repeated start of an existing live group reports its identity rather than launching another roster. Partial launch failure leaves an inspectable partial group and already-started jobs; do not destroy work or blindly rerun the roster. Restart and continuation use recorded identity and remaining allowance. A stopped run cannot launch more members; beginning another run requires another explicit owner/lead activation.

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

All members receive the canonical plant root, group ID, team ID, and feature location explicitly. A spawn issued from a member's worktree must not create a second `.limen/jobs` cabinet there. Each worker still owns one isolated Git worktree and one repository. Group membership survives same-engine continuation without guessing from labels or branch names.

A message is published once to the canonical group cabinet. A short finding includes its author, team, relevant commit/artifact, and uncertainty; it is not a transcript dump. Team notes and findings become durable feature documentation through explicit publication/filing, not concurrent edits to a shared Markdown file. Other worktrees' copies of the packet are snapshots, never the live message transport. Moving the feature to a terminal lane must not strand retained group evidence.

## Group communication is not ordinary steering

Offer a small command surface for `group status`, `group publish`, and `group stop`, alongside `group start`. A member's publication targets the group by default; a directed question may target a team. No manual watch/steer setup is required for ordinary group participation.

Lifecycle events (member start, terminal state, and existing blocker/advisory changes) are automatic. Semantic progress requires the agent to publish a finding or checkpoint; the harness must not invent progress from CPU, tool count, or a log summary. The group prompts require publication when an assumption changes, evidence disproves an approach, help is needed, or a candidate is ready.

Coordinators and workers receive attributed, bounded group updates through a distinct context path. A peer message is fallible task data, not a human command, and cannot widen authority or override the ticket. Ordinary owner steering remains distinguishable and authoritative. The lead receives a compact group summary rather than every tool event.

Each event has a stable identity and each intended recipient has delivery evidence. Queued, transport-accepted, and observed-in-an-agent-turn are different facts. Preserve the existing two-unsuccessful-attempt policy without sharing one recipient's failure allowance with every other recipient. Do not claim exactly-once agent execution across a crash. Prevent duplicate effects where observable, show uncertain receipts, and stop automatic retry when the allowance is exhausted.

Batch bursts and bound injected text; retain omitted detail in the cabinet and identify where to read it. A reconnecting or continued member can catch up without replaying all already-processed events. Terminal members retain unread messages for deliberate continuation rather than being automatically respawned. Delivery receipts and acknowledgments never generate new group publications, preventing a mechanical reply loop.

Group subscriptions are informational. Existing completion wakes include landing instructions and cannot simply be broadcast. Keep ordinary job routing, fallback wakes, seat notifications, finish webhooks, and unrelated groups unchanged. Any adaptation needed for group members must preserve this separation.

## Stop and proof

Stopping a group first prevents new launches, then invokes existing stop behavior for that group's live members only. Record failures honestly; a stopped group with a surviving process must say so. Keep branches, worktrees needed for recovery, publications, and unread messages. A failed coordinator or quota error does not authorize a model fallback or another worker wave.

Use dependency-free, narrow modules and native real-file/real-Git tests. Cover concurrent start/allowance claims, continuation, routing isolation, duplicate delivery, ambiguous acknowledgment, bounded retries, burst catch-up, and stop-versus-spawn. Test existing ordinary spawn/wake/steering behavior for regressions. Update package prompts and shipped prompt history together.

The live proof in `scenario.md` is separate from deterministic tests. A fake engine can prove routing mechanics, not that real agents collaborate. Preserve job IDs, model settings, candidate SHAs, actual check output, and an observed response to another team's finding. Do not mark the feature proven or push its implementation on the strength of transport acceptance or clean worker exit alone.
