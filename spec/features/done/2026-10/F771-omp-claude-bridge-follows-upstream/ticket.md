---
opened: 2026-10-05
landed: 2026-10-05
---

# F771 · OMP pi-claude jobs run on a bridge that follows the upstream pi-claude-bridge

## Outcome

An OMP job with a `pi-claude/<model>` model runs on a local bridge whose behavior follows the public `elidickinson/pi-claude-bridge` (npm `pi-claude-bridge` 0.9.1). That includes its rate-limit handling, usage and quota mapping, and session rebuild and resume. The OMP adaptations stay, so Limen's launch contract does not change. Today the bridge at `~/.omp/local/pi-claude-bridge` is a private OMP port of `@vanillagreen/pi-claude-bridge` 4.0.3 (`omp-claude-bridge-local` 4.0.3-omp.1), with its own stall-to-529 "peak load" shaping. Adam asked to integrate and replace it on 2026-10-05.

## Scope

- **Source:** https://github.com/elidickinson/pi-claude-bridge at a named commit or tag. Record that revision in the bridge `package.json` and README.
- **Keep the OMP adaptations:** `registerProvider("pi-claude", …)`, the OMP session lifecycle, model ids `pi-claude/*`, and the build to `bundle/index.js` that `package.json` names under `omp.extensions`.
- **Load shaping:** the stall, retry, and rate-limit behavior follows upstream. Drop a private behavior only when upstream covers the same case. Say which ones in the notes.
- **Safe swap:** build and test the new bridge in a separate directory first. Then back up the old directory to `~/.omp/local/pi-claude-bridge.bak-<date>` and move the new one into place. Make the new directory a local Git repository, so its provenance can be inspected.
- **Limen:** start at `bridgeExtensions()` in `src/runtime/engine.ts`. Change the pin, `docs/setup.md`, or `test/engine.test.ts` only if the path or the install story changes.

## Out of scope

- Global Pi (`~/.pi/agent` with `npm:@vanillagreen/pi-claude-bridge`). Name the split in the notes only.
- The GitHub doorbell, `interactive_ready`, and board work.
- Credential scraping of any kind. A Claude Code login stays required.
- Alice or any other seat.

## Acceptance

- Limen argv is unchanged: `omp --extension <realpath of ~/.omp/local/pi-claude-bridge> … --model pi-claude/<model>` with no `--provider pi-claude`. `test/engine.test.ts` passes.
- The new bridge builds `bundle/index.js`, and its own unit tests pass, if it has any.
- A short live smoke: `omp --no-extensions --extension ~/.omp/local/pi-claude-bridge --model pi-claude/<model> -p "reply ok"` returns a reply with the real Claude Code login.
- The old bridge is kept as a dated backup, and the notes give the one-line rollback.
- The notes list the private behaviors that were dropped or kept, and why.
- `npx tsc --noEmit` and `npx biome check .` pass on any Limen change.
