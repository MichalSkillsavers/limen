# Collaborative-group implementation handoff

The implementation checkpoint is `a95d64d` (bounded activation, membership, launch allowances, informational delivery, deadlines and protected recovery). The ticket's real-agent proof is intentionally unspent. Native mechanics do not prove collaboration, and nothing here authorizes landing or pushing.

## Seams and retained decisions

- `src/commands/group.ts`: explicit preflight, fixed `team-1`… roster, recorded machine settings and deadlines; duplicate start never repairs a roster. Stop records its fence before draining launches. `--new-run` requires a stopped/closed prior run with no live or uncertain member.
- `src/group-cabinet.ts`: canonical identities, serialized launch claims, total worker allowances, parent links and PID/birth recovery evidence. `src/git.ts` routes member commands to the recorded cabinet; `src/lookup.ts` prevents job takeover outside the member's team.
- `src/commands/spawn.ts` and `continue.ts`: membership is recorded before engine launch. New candidates are isolated; worker continuation retains its own branch/session but consumes another slot. Coordinators cannot continue. Explicit machine flags must match the run. Group review requires the team's candidate branch and consumes a worker slot.
- `src/group-events.ts`: durable findings, stable lifecycle identities, per-recipient queue/transport/observation/processing evidence, two automatic attempts, bounded catch-up and inherited proven processing. Receipts do not generate events.
- `hook/group-peer.ts`: peer data enters tool results and agent-attributed lead custom messages, never owner steering. `context` records observed tokens; a non-errored assistant message proves processing, not semantic adoption. `hook/wake.ts` excludes group lifecycle from landing-oriented subscriber/fallback wakes.
- `src/wrapper.ts` and `supervisor.ts`: absolute role/group deadlines apply in both modes. Hosted coordinators with live children are not idle-closed; unread events do not keep finished workers alive. `prune.ts` protects every unclosed group's worktrees and job records; close refuses dirty or live/uncertain members.
- `docs/groups.md` and shipped prompts describe activation, bounded waits, publication, lead synthesis, stop/close and deliberate recovery. Project-owned prompt overlays are not overwritten; an old explicit hook-loader list must include `group-peer` or load it separately.

The hook surface was read from the installed OMP 18.4.4 guide (`omp read omp://docs/extensions.md` and `omp://docs/session.md`) and installed Pi extension docs. Used APIs are `tool_result`, `context`, `message_end`, session lifecycle and custom `sendMessage`; built-in OMP helper launches are refused through documented `before_subagent_spawn`. Model-turn behavior on real engines remains for the lead's live scenario.

## Checks and proof setup

The retained focused lane passed 177/177 native regressions, including 13 group cases and existing spawn, continuation, hosted supervision, wake, steering, pruning and landing cases. Its discriminating checks covered simultaneous activation/worker claims, continuation allowance exhaustion, per-recipient ambiguous retries, context-before-processing evidence, the actual CLI's twenty-second wait cap, hosted/detached deadlines, stop-before-new-launch fencing, and dirty-close/pruning protection. An earlier group-only iteration had two failures (continuation replay of self-authored lifecycle events and PID-zero retry ownership); both were corrected before this passing lane.

A separate real-CLI smoke with a fake engine passed duplicate activation, distinct worktrees/canonical routing, cabinet publication, accepted-without-observed receipt evidence, stop preservation, dirty-close refusal and clean-close pruning release. No model/provider calls occurred. The temporary smoke repository was removed.

Reviewer artifacts are outside the worktree:

```text
/Users/overment/.overment/limen/.limen/jobs/2026-09-29-f740-teams-share-feature-progres-16e7c4d9/group-evidence/
  focused-regressions.log
  cli-smoke.log
  fixture-setup.log
  full-native.log
  init-contract-check.log
  post-native-static-checks.log
  candidate.txt
```

The fixture generator was actually run, exited 0 and prepared `/Users/overment/.overment/f740-live-fixture-20260930-final` at packet commit `6b9c22783c83c5cd8c0591535c9cf58860473b83`. `fixture-setup.log` contains the exact interactive-lead and two-team/one-worker launch recipe. The fixture has no remote or finish-webhook configuration; no agents were launched there. Both teams get the same committed tests and distinct map versus sorting hypotheses. IDs are represented as nonempty strings and revisions as finite numbers; no extra nonnegative/integer restriction is imposed on the scenario's numeric revisions.

Run `bin/limen-group-fixture.mjs` with a new absolute path to reproduce the setup. The lead must perform the unchanged `scenario.md` proof: two checked candidates, initial-hypothesis ordering, an observed peer finding and evidence-based response, an automatic lead update, synthesis and successful stop/clean close. Preserve quota/engine failures without substituting models. Real-agent exchange, semantic use, synthesis and hosted real-agent transport are unproved.

Retained full-native evidence is not acceptance. `full-native.log` records 506/509 passing at `4ddcec3`; after the obsolete hook-count assertion and advisory-occurrence defect were corrected, `repair-full-native.log` records 510/511 passing at `57ad3e9`. TypeScript and Biome passed in both runs. The remaining failure measured 2,034 ms from cold CLI launch through terminal observation against the stop test's 2,000 ms bound. The earlier optional-version failure did not recur; that does not establish its cause.

The coordinator's discriminating probe deliberately added 1,200 ms before CLI dispatch. It measured 3,256 ms for the whole command but 1,572 ms between the durable stop-request and finish records; the cleanup warning and stopped state were correct. `stop-timing-discriminator-corrected.json` retains those values. The test now measures that recorded stop interval with the same 900–1,999 ms bounds and deliberately delays CLI startup so it cannot accidentally measure cold-start overhead again. No runtime timeout or stop behavior was changed. Typecheck, scoped Biome, and the three stop/discovery deadline regressions passed; output is `stop-clock-focused.log`.

The advisory repair persists pending occurrence identity before publication and preserves existing delivery receipts after interruption. Its red/green recurrence proof, 15/15 group module result, and handoff are retained in the same evidence directory. A fresh full native run at the corrected committed candidate is still required before the unchanged real-agent scenario and push.
