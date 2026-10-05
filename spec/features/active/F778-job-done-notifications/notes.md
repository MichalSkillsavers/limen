# Finish routes and rollout

## Failure and repair

`finalizeJob` writes terminal state, updates group lifecycle, attempts the owner wake, sends the optional webhook, and settles the job tab. Group jobs previously skipped the owner wake. Their only lead delivery path was `hook/group-peer.ts`.

The old plant lead session `01a1026b-e482-73a2-9285-8d3837f5412a` did not load that hook. Its transcript records a manual write of PID 8049 into `.limen/group-leads` at 2026-10-04T10:31:12.712Z after group start refused. Eleven groups then retained queued lead receipts with zero attempts. The new hook refreshes its registration after each successful sweep. Group start rejects a registration older than 30 seconds. A team coordinator finish falls back to the recorded Herdr lead pane when the hook is not live. A live hook keeps group-event delivery; a worker does not prompt the lead.

The F771 continuation `2026-10-05-f771-pi-claude-bridge-follows-up-cd62ebce` was started without caller pane or session context. Its parent had `origin-pane wYN:p1`, but the child had no route. Continuation now inherits the parent route when the caller supplies none.

Ordinary Pi jobs use subscribers and `hook/wake.ts`. OMP jobs use the recorded Herdr pane. Both hosted and detached jobs pass through finalization. Webhook acceptance is separate and does not prove an agent turn. `blocked` is a running advisory, not a terminal job state; terminal states remain done, failed, and stopped.

## Limits

- Old pane handles such as `wXK:p5` and `wXK:p6` returned Herdr `agent_not_found`. This change cannot restore removed panes.
- Hook freshness is sampled at finish. It does not recover a hook that dies just after that sample. A later resumed hook can still consume queued group events after a fallback wake.
- Existing processes keep their loaded hook code until reload. Do not kill working agents to roll out this change.
- Load-aware spawn and a worker limit are not implemented.

## Rollout inspection, 2026-10-05

The global package `/Users/overment/.nvm/versions/node/v24.1.0/lib/node_modules/@overment/limen` is a symlink to `/Users/overment/.overment/limen`, not a copied package. The global binary resolves to that plant's `bin/limen`. A merge into the plant updates future CLI invocations without reinstalling. Running hooks still need a reload.

| Plant | Package route | Coordinator reload | `.limen/finish-webhook.env` |
| --- | --- | --- | --- |
| Alice: `~/playground/alice-app/alice` | Live sampled CLI processes resolve to the shared plant. Its `.pi/extensions/limen.ts` instead prefers the separate `~/.overment/limen-groups` checkout. That checkout is at `e04dbbc`, without this repair. No project `.omp/extensions` directory. | Group lead `wY5:pT` needs a loader cutover to the shared package, then a hook reload when safe. Other Alice coordinator sessions using this loader need the same cutover/reload. | Present; `LIMEN_FINISH_WEBHOOK_TARGETS` nonempty. |
| Mega: `~/mega/mega-experience` | Shared global install; live lead has no `LIMEN_PACKAGE` override. | `w11Q:p1` | Present; targets nonempty. |
| Easy: `~/playground/easy` | Project Pi loader resolves PATH's Limen unless overridden. Shared global binary exists; this pane's effective process override was not observed. Loader includes wake/communication/steering but omits group-peer. | `wYC:p1`: update loader to include group-peer before reload if it will lead groups. | Present; targets nonempty. |
| Chilly: `~/playground/easy/chilly` | Shared global install; live lead has no override. | `wZ3:p2`, after its current work. | Present; targets nonempty. |
| Limen: `~/.overment/limen` | Shared global install points here; live lead has no override. | `wYN:p4` | Present; targets nonempty. |
| Virtual screen: `~/overment/lab/virtual-screen` | Shared global install; live lead has no override. | `w123:p1` | Absent. |
| Home: `~` | No project hook loader; shared binary available. Effective Pi process route not observed. | `wXK:p1`, `wXK:p3`: no project hook to reload. Setup is needed only if these are to own Limen jobs. | Absent. |
| Alice document: `~/Alice/profiles/5af4ad1c6d2f288925b3f2e67459bfa0837e1fd7801a44471067ebca40cb5e6b/documents/doc` | No Limen cabinet or project loader. | `wXG:p1`: not a configured plant. | Absent. |

Alice root sessions present in Herdr: `wY5:p9`, `pA`, `pB`, `pC`, `pD`, `pE`, `pF`, `pN`, `pP`, `pQ`, `pR`, `pS`, `pT`, `pV`. Only `pT` had a live group-lead registration in this inspection. Roles of the other root sessions were not inferred from cwd. Worker/team spaces `wZA`, `w128`, and `w129` belong to the Alice and Chilly plants, not separate installs. Working agents were left untouched.

An additional process inherited `wXN:p3` and explicitly used `LIMEN_PACKAGE=~/.overment/limen-groups`, with that checkout's binary. That handle is absent from the current Herdr agent list. It is not evidence of a live coordinator pane.

The inspection checks configuration only. No hook reload, webhook request, or live owner wake was sent. Evidence outside the worktree: `/Users/overment/.overment/limen/.limen/evidence/f778-finish-20261005/`.

## Verification carried from the first run

Before rebase, the targeted wake tests passed 9/9 and the finish-step tests passed 6/6. A copied real F756 cabinet exercised `promptCoordinator` through a fake Herdr executable and produced the correct lead pane, team count, real handoff, and reload instruction. This proves message and route construction, not a live agent turn.

Two timing failures reproduced on pristine base `045085c`: the group deadline probe missed `engine-launched`; a continuation refusal expected a still-running parent but the parent had already finished. The first full check was interrupted by the 90-minute job timeout; it has no completed result. The post-rebase check results are recorded in the final handoff and external evidence logs.
