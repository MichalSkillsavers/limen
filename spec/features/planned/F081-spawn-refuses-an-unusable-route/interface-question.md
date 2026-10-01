# Unusable-route refusal remains blocked; hosted transport is a safe partial

The auth-ready batch-only regression in `test/spawn-command.test.ts` deliberately remains failing, not skipped or converted into an authentication failure. Spawn returns status 0, creates a job/worktree, and the fake provider rejects the first turn with `404 model is only available through the Batch API`. The test requires status 1, that reason, and no planted records. No production route refusal was added.

## Installed interface

Inspected Pi 0.84.2 at `/home/overment/.nvm/versions/node/v24.19.0/lib/node_modules/@earendil-works/pi-coding-agent`:

- `pi auth check --help` supports `--provider`, `--model`, `--json`, `--credentials`, and `--no-refresh`. It refreshes expired OAuth credentials by default. Do not use `--credentials` for preflight.
- `dist/cli/auth-check.js:checkProviderAuth` resolves the model, then discards it except for its provider ID. `checkAuth(provider)` and optionally `getAuth(provider)` determine readiness. `createAuthCheckModelRuntime` disables model-network refresh. No inference route is called.
- `docs/sdk.md` defines `getAvailable()` as models with authentication configured. `PromptOptions.preflightResult(true)` means accepted/queued/handled; later provider failures are events, not preflight rejection. Calling `prompt()` runs a generated turn, including Pi-owned retries.
- `dist/core/model-runtime.d.ts` exposes catalog/auth operations and generated `stream`/`complete` operations, but no non-generating model-route validation method.

Owner decision (Adam via Johnny, 2026-09-12): keep waiting for a Pi-supported non-generating probe that validates the exact resolved model/provider/API endpoint and returns its refusal reason. No generated probe is authorized. The readiness check found the installed 0.84.2 auth implementation and model interface byte-identical to the retained inspected copies; it made no provider request. Evidence: `tmp/evidence/limen-1.0-ship/route-interface-refresh.log`. A future change of spend policy must explicitly bound tokens/spend, latency and Pi-owned retries; catalog/auth readiness must never be represented as route proof.

## Decision needed to close narrow 1.0

**Recommended: wait.** Pi must expose a supported non-generating check of the exact resolved provider/model/API route, returning its refusal reason before Limen plants a job. The GO-plan coordinator rechecked installed 0.84.2 locally: both previously inspected interfaces remain byte-identical (`tmp/evidence/limen-1.0-ship/route-interface-go-plan.log`). No provider request was made; no new zero-spend refusal capability was found in those interfaces.

The retained fake-Pi counterexample was also rerun against an archived copy of main `c9f2625`, without touching either locked worktree: 1 test failed because spawn still returned 0 and planted a job after fake auth readiness. Evidence: `/home/overment/limen-evidence/route-refusal-go-20260912/` (`counterexample.log`, `counterexample.exit`, archived source and exact test). This is a synthetic regression, not a generated provider probe or evidence about the usability of Adam's actual model route.

Adam's alternative is explicit authorization for a generated probe with a numeric total spend cap, input/output token caps, wall-time cap and Pi-owned retry budget, including what happens when a cap cannot be enforced. Authorization would permit investigation, not instantly prove refusal or guarantee cost. No such limits are currently authorized, and auth/catalog readiness remains insufficient under either choice. The failing route candidate stays locked at `b14b5fe`; waiting keeps the accepted cut NO-GO rather than dropping this requirement.

## Safe transport seam

`src/runtime/supervisor.ts` already passes fresh hosted tasks as `@task.md` and the preamble as a file path. Continuations alone read the whole instruction into a shell argument. They now pass `--continue @<job>/continue`, using Pi's existing file-argument transport, without changing detached continuation.

Installed `dist/cli/args.js` treats `--continue` as a boolean and `@file` independently. `dist/cli/file-processor.js` reads text bytes and wraps them in `<file name="...">`; the continuation therefore arrives as attached text rather than a bare message. Session selection and literal provider/model/thinking flags are unchanged.

The hosted regression uses a fake Herdr that refuses CR/LF in agent argv, checks both fresh spawn and continuation become agents, and checks quotes, backticks, command substitution text, and newlines stay in the referenced files. It failed before the change on continuation with the reported shell-encoding reason. It does not prove a live Herdr/Pi model turn.

Evidence is retained outside the worktree at `/home/overment/limen/tmp/evidence/f081-3241d718/`. Read its candidate/checks records for exact command results. No private config/credential edits, provider substitution, generated probes, new retries, F090 dependency, or board changes belong to this partial.
