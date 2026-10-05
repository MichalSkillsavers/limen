# F771 notes · OMP pi-claude bridge follows upstream

## What is installed

- `~/.omp/local/pi-claude-bridge` is now a Git repository cloned from `https://github.com/elidickinson/pi-claude-bridge` at tag `v0.9.1` (commit `9dafd03`, npm `pi-claude-bridge@0.9.1`). The OMP adaptations are the commits on branch `omp` after the tag: `git -C ~/.omp/local/pi-claude-bridge log --oneline v0.9.1..omp`.
- `package.json` is `pi-claude-bridge-omp` `0.9.1-omp.1`, with an `upstream` block naming the tag and commit. The README opens with an "OMP port" section that lists the adaptations and the build, test, and upgrade steps.
- Build: `npm ci && npm run build` writes `bundle/index.js`, which `omp.extensions` names. `bundle/` is git-ignored. The Pi packages and `typebox` stay external, and OMP serves them.
- Old bridge (`omp-claude-bridge-local` 4.0.3-omp.1, a port of `@vanillagreen/pi-claude-bridge` 4.0.3): `~/.omp/local/pi-claude-bridge.bak-2026-10-05`, untouched.

## Rollback

```bash
mv ~/.omp/local/pi-claude-bridge ~/.omp/local/pi-claude-bridge.f771 && mv ~/.omp/local/pi-claude-bridge.bak-2026-10-05 ~/.omp/local/pi-claude-bridge
```

Restart any OMP session afterwards. A running OMP process keeps the bridge it loaded.

## Limen

No Limen code change. The path is unchanged, so `bridgeExtensions()` in `src/runtime/engine.ts`, `docs/setup.md`, and `test/engine.test.ts` keep the same argv: `omp --no-extensions … --extension <realpath> … --model pi-claude/<model>`, with no `--provider`.

Two things change for Limen jobs on `pi-claude/*`:

- Limen's `--append-system-prompt` preamble now reaches Claude Code. The old bridge dropped it: it forwarded only AGENTS.md and the skills list. Live check: an append that held a codeword was echoed back.
- `--thinking xhigh` and `max` now reach Claude Code as effort `xhigh` and `max`. Before this fix, OMP clamped them to `high`, because the registered models carried no `thinking` metadata.

## OMP adaptations (kept; in `src/omp-host.ts` unless noted)

- `PROVIDER_ID = "pi-claude"` (`src/convert.ts`). The model ids stay `pi-claude/<id>`. Internal `api`/`baseUrl` stay `claude-bridge`, as upstream has them.
- Lifecycle: OMP fires `session_start` without a reason, and reports `/new`, `/resume`, and fork as `session_switch`. Both events now feed upstream's handler. A later module instance checks `hasProvider` (OMP) or `getProvider` (Pi).
- System prompt: OMP sends `string[]` blocks and gives no `systemPromptOptions`, so upstream's capture would throw on every turn. The bridge records a capture at the provider boundary. It drops block 0 (OMP's harness) and forwards the `# Skills & Rules` section plus blocks 1 and later (project context, OMP's closing rules, user append). A one-block prompt is forwarded whole. `before_agent_start` recording is skipped for arrays.
- Compaction and branch summary: these keep upstream's takeover into an isolated Claude Code subprocess. OMP's `compact` and `generateBranchSummary` come from `@earendil-works/pi-agent-core/compaction`, use `completeImpl`, and are loaded with a literal dynamic import. A variable specifier fails in OMP with "Cannot find package".
- Missing Pi exports (`formatSkillsForPrompt`, `contentText`, `getCurrentSystemMessage`, `getCurrentTools`) use namespace imports, so the bundle passes OMP's static export check (`src/skills.ts`, `src/transcript.ts`).
- Models (`src/models.ts`): the bridge forwards OMP's `thinking` metadata and derives an identity `thinkingLevelMap` for `anthropic-adaptive` models. These are the same values Pi's catalog has.

## Private behaviors of the old bridge

Kept:

- `developerMessagesAsUser`. OMP's `developer` role (hidden continuations and reminders) is mapped to `user` after the first user message. Without it, a trailing developer message became an empty prompt. This was reproduced live: diag `empty_prompt`, and Claude answered without the prompt. After the port, the same run delivered the prompt.
- The named `registerProvider("pi-claude")` registration and the session lifecycle (above).

Dropped. In each case, upstream covers the case or the feature has no consumer here:

- Stall-to-529 shaping (`stream-idle-watchdog.ts`). After 90 s with no first output, the old bridge killed Claude Code, emitted a synthetic "retryable 529 overloaded" error, and sent a `kendex:rate-limit` event (`CLAUDE_BRIDGE_STREAM_IDLE_TIMEOUT`). Upstream lets Claude Code's own stream retry and non-streaming fallback run. It drops the abandoned partial blocks and delivers the fallback message (`dropAbandonedStreamBlocks`, `processAssistantMessage`). Residual risk: a Claude Code child that hangs silently is no longer cut at 90 s. The turn waits until it is aborted.
- Rate-limit shaping (`rate-limit.ts`, the `kendex:rate-limit` auto-resume event, the 80% warning gate, and `isUsageLimitMessage` text matching). Upstream handles `rate_limit_event` itself. `rejected` notifies, and the next failure is prefixed `Claude rate limit (<type>) — resets <time>:`. `allowed_warning` notifies at each new 5% step. Nothing in OMP or Limen consumes the Kendex event.
- Credential-presence gating (`auth-presence.ts`). Upstream registers the models unconditionally. A missing login now fails the first turn with Claude Code's auth error, so the models no longer vanish from the picker. Neither version reads credentials.
- Persisted bridge state in Pi session entries (`session-persistence.ts`, request lanes). Upstream rebuilds the Claude Code session from Pi history on resume (cc-session-io import) and keys live state by Pi session id. Live check: `--continue` in a new process recalled a tool-read codeword.
- Integrity custom entries and the tool-pairing audit. Upstream repairs pairing on import (`repairToolPairing`) and logs to its diag file.
- Kendex embedding features with no consumer in OMP or Limen: the account router and account host (managed profiles, failover), the billing identity store, claude.ai connectors (off by default), `/pi-claude` status commands, opt-in prompt hooks (project agents, task panel, caveman, APPEND_SYSTEM.md via settings), `forceEffort`/`modelEffortOverrides`, `fastMode`. Upstream does not cover these. Port them again if a seat starts to need one.
- The fixed 9-model list with Fable/Opus-5.x → Opus 4.8 fallback metadata. Upstream builds the list from the catalog. OMP now shows 18 `pi-claude/*` models (opus-5-5, fable-5-1, sonnet-5-5 included). No safety `fallbackModel` is set.
- Settings in `~/.pi/agent/settings.json` (Kendex) and `~/.pi/agent/claude-bridge.json`. Upstream reads `claude-bridge.json` in OMP's agent dir (`~/.omp/agent/`) and in a project's `.omp/`. Neither old file existed, so nothing was carried over. Upstream defaults to `provider.plan: "pro"`. Opus 5.5, Opus 4.7/4.8, Sonnet 5.x, and Fable use 1M; Sonnet 4.6 and Opus 4.6 serve 200K unless `plan`/`longContextExtraUsage` is set.

## Global Pi split

Global Pi (`~/.pi/agent`, `npm:@vanillagreen/pi-claude-bridge`) is unchanged and still runs the Kendex fork. Only OMP uses this port.

## Checks run (2026-10-05)

- `npm run test:unit` in the bridge: 295 pass, 0 fail. That is upstream's 285 tests plus `tests/unit-omp-host.mjs`. The upstream tests that pinned the `claude-bridge` provider id now name `pi-claude`.
- `npx tsc --noEmit` in the bridge: clean.
- Live with the real Claude Code login, through `omp --no-extensions --extension <bridge>`:
  - `reply ok` returned on `pi-claude/claude-opus-5-5` and `claude-sonnet-4-6`.
  - A run with no flags (the `config.yml` extension) returned.
  - A `read` tool call returned the file's codeword.
  - `--continue` in a new process recalled that codeword.
  - An append codeword was echoed back.
  - A Limen-shaped `--mode json --auto-approve … --thinking xhigh -p @task.md` run ended `agent_end`/`stopReason: stop` with the preamble codeword.
  - A task-tool subagent returned its text to the parent.
  - RPC `compact` on a 190 KB session: the takeover completed (`session_before_compact: takeover complete`), and the session gained a compaction entry.
  - Effort for opus-5-5 with `--thinking high`/`xhigh`/`max`: the debug log showed `effort=high`/`xhigh`/`max`. Before the effort fix, it showed `high`, then `max`/`default`. Sonnet 4.6 with `xhigh` sends `high`, because OMP's catalog offers it no higher.
- Limen worktree: `node --test test/engine.test.ts` 7/7 pass, `npx tsc --noEmit` clean, `npx biome check .` clean. The live argv for an OMP `pi-claude/claude-opus-5-5` job is `… --append-system-prompt PREAMBLE --extension /Users/overment/.omp/local/pi-claude-bridge --model pi-claude/claude-opus-5-5 --thinking xhigh @/job/task.md`, with no `--provider`.

## Open

- OMP one-shot requests (title generation, eval completions, image questions) carry no Pi `cacheRetention: "none"` marker. If one is routed to a `pi-claude/*` model, it goes down the main query path. The old bridge had the same exposure. A fix needs a reliable OMP one-shot marker.
- In the subagent smoke, OMP's task tool sent one such request to the default-role model (`pi-claude/claude-opus-5-5`, no tools, prompt starting `State: <solution_space>`). It ran as a reentrant fresh query and was then aborted. The parent's next turn resumed its own Claude Code session, so the run was correct, but the request costs a Claude Code process.
- The upstream integration tests (`tests/int-*`) drive real Pi and were not run.
