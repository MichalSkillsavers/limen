# Manage-only coordinator comparison

The authorized run `e0f39f4f-8a85-45e2-98c2-983750d1c65d` started at `2026-09-30T16:45:33.521Z`. Both hosted coordinators failed at approximately `16:57:13Z` before either reported Ready. No implementation landed or was pushed; the clone remains at `3ea0bb2debd43dfe622e0bffcd9b4845ddb089ed` before this synthesis commit.

## Approaches and retained work

- **Team-1 — `anthropic/claude-opus-5-5`, harness-first.** Launched three workers for terminal reports, blocking wait/detector exemption, and coordinator tool guards. The report worker committed its aspect as `e27d5bbaa717246dda12567c1619649bf5594209`; interrupted wait and guard work was saved unchanged as unverified recovery commits `7bae34630d1ed6a557d3b42016432dea326fc6f5` and `3ac96bbe9809e3f43149e89f9c5a58fd154da015`. There is no final integration commit or reviewer verdict.
- **Team-2 — `openai-codex/gpt-6.1-sol`, prose-first.** Launched two workers for runtime reports/wait/detector behavior and manage-only templates with an evidence-backed boundary decision. Interrupted runtime and guidance work was saved unchanged as unverified recovery commits `2f2f83bb775e3913e1355b67e3ea2103efc9661a` and `aadb29db0a5469677f8973c9b1065ec9a1c1fbf3`. There is no final integration commit or reviewer verdict.

Both published their initial hypothesis first and exchanged design critiques. Team-1 argued for a process-identity-bound wait exemption and hard coordinator guards. Team-2 identified false-positive risks in shell-command parsing and distinguished the old permissive role from strengthened manage-only prose. The run ended too early to compare checked designs or select a winner.

## Manage-only behavior

Inspection of both complete coordinator transcripts and their clean worktrees found **zero repository edits, zero tests/checks/builds/formatters, zero test-tooling writes, and zero timing/benchmark measurements**. Task-file writes and one edit under `/tmp/` were allowed. Each team launched **zero reviews** and routed **zero repairs through continue** before failure. Team-1 used three worker slots; team-2 used two.

The lead incorrectly classified `wc -l` as measurement. Adam clarified that reading and file sizing are allowed; the lead retracted the reminder once, and team-1 corrected its critique. This is a lead false positive, not a coordinator violation.

## Verification and defects

The authorized start command succeeded once with the specified models, reasoning, budgets, and hosted mode. Job logs independently record the same terminal error for both coordinators and two team-1 workers:

```text
failed: group lock busy or uncertain: /Users/overment/.overment/limen-groups/.limen/groups/e0f39f4f-8a85-45e2-98c2-983750d1c65d/.lock; inspect its owner before recovery
```

Inspection found lock owner PID `44650` still live with parent PID `1`; no lock or process was manually removed. This is evidence of shared-cabinet contention causing hosted jobs to fail, not proof of its underlying cause. Three workers remained running when candidate evaluation began.

Team-2 also reported concurrent spawn lock contention: one launch waited 11.38 seconds and failed while its sibling launch took 18.57 seconds. It inspected the roster and empty launch directory before retrying successfully. Both teams encountered launch ergonomics problems; a positional title plus `--task-file` plus `--label` is invalid.

No complete team Ready candidate exists. The lead confirmed the report aspect commit and read its full diff and final worker report; no final reviewer verdict exists. That worker reported 61/63 combined group-events/group-command/steering-hook/wake-hook tests passing, with two wake-hook failures; wake-hook alone passed 40/40, and typecheck and Biome were clean. Its timing-flake explanation remains an inference, not a clean combined pass. The lead did not rerun those checks.

No implementation landed on which to run the required lead typecheck, Biome, focused suites, or background full `npm run check`. These lead checks were **not run**, not passed. The two known steering-test races were not exercised.

The synthesis was committed before `group stop`, which succeeded with an empty failure report. All seven recorded engine PIDs were absent from `ps`, and every session recorded shutdown. First close correctly refused a dirty worker worktree. The lead preserved all four dirty worktrees through the unverified checkpoint commits above, without editing or testing their code; the second close succeeded. The cabinet, transcripts, branches, task files, and clean recovery worktrees remain. No coordinator was continued, no helper was launched, and no model was changed.
