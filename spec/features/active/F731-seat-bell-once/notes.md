# Seat bell candidate

Preserves the implementation from `8305e66`, rebased onto `e943fb4` (current main when this finish started). Git carried the former `hook/seat.ts` timeout edit into `src/project/seat.ts`; no wake or group implementation changed.

- `src/commands/sweep.ts`: event identity is terminal state plus latest state/finish mtime, or advisory mtime plus birthtime. Numeric legacy receipts at or after the event suppress it. Exclusive creation of the event receipt precedes transport; failed or ambiguous transport is deliberately not retried automatically.
- `src/project/seat.ts`: Herdr notification followed by macOS fallback. The retained `LIMEN_SEAT_NOTIFY_TIMEOUT_MS` override permits slow fake transports; the normal timeout remains two seconds.
- `test/sweep-command.test.ts`: separate CLI processes prove restart suppression; synchronized child processes prove concurrent claims. A test-only Node preload redirects `/usr/bin/osascript` to fake transport, so the failed-transport regression now runs on macOS without a real bell.

Focused native file: 5/5 pass. Typecheck and Biome on the three implementation/test files pass. Separate CLI smoke: ten fresh sweep processes, five events, five fake bells; legacy event never rings. Smoke includes done/failed/stopped, advisory recreation, and no coordinator receipt. An earlier focused run was 2/3 because Node's type-stripping warning violated an empty-stderr assertion; that incidental assertion was removed, not re-pinned.

Proof artifacts are outside the worktree at `/Users/overment/.overment/limen/.limen/jobs/2026-10-02-f731-one-seat-bell-finish-1-8bd9e19a/proof/`. The final handoff there records the post-commit full native result. The launchd sweep remains paused; deployment and any real notification proof require the owner's decision. Do not resume it as part of reviewing this candidate.
