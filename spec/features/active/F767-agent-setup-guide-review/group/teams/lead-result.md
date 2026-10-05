# F767 lead result (Adam pin + omp decisions)

## Land candidate

- Branch: `limen/2026-10-05-f767-lead-adam-pins-worker-omp`
- Tip: `215e773df86c85543ae4947a318bba1fb514337c`
- Guide: `docs/seat/agent-setup.md` (214 lines, SHA-256 `2ef36ff1f78ab7103310650267adb302d7eac84991f7dc00e7fd73b62a5bba33`)
- Script: `docs/seat/github-setup.sh` includes `systemctl disable --now limen-github.timer` (cherry-pick `5f1318c`)
- Do **not** land until Adam says "land". Do not push.

## Adam decisions applied (ticket Notes + lead-decisions)

1. Worker-owned `~/.local/bin/omp` (checksum before run). No root-owned `/usr/local/bin/omp`.
2. Pins bumped now: Node **24.21.0**, Herdr **0.9.3**, omp **18.6.1**, both arches.
3. Public port 22 remains break-glass only; admin SSH Tailscale-only after setup (unchanged from frozen guide).

## Vendor verification (2026-10-05)

| Pin | Tag | x86_64 / x64 sha256 | arm64 / aarch64 sha256 | Source |
|---|---|---|---|---|
| Node | v24.21.0 (latest v24 LTS) | `fd8e59d5…cb2d6` | `6ad1325e…89ad2` | nodejs.org SHASUMS256.txt |
| Herdr | v0.9.3 (latest) | `18a8dc65…4dba7` | `4de7aa3e…1f5c0` | GitHub asset digest |
| omp | v18.6.1 (latest) | `c92a6846…7463` | `cb781533…07f4a` | SHA256SUMS.txt / asset digest |

Docker `ubuntu:24.04` download+checksum+install blocks: arm64 ELF `b7`, x86_64 ELF `3e`; `node -v` `v24.21.0`; `herdr --version` `herdr 0.9.3`; worker `omp --version` `omp/18.6.1` at `~/.local/bin/omp`; `test ! -e /usr/local/bin/omp` OK. Logs: lead cold paper files below.

## Diff from frozen team-1 guide (`358ce75`)

- Split phase 4: root installs Node+Herdr only; worker installs omp into `~/.local/bin` with PATH ensure in `~/.bashrc`.
- Pins and checksums updated; laptop pre-phase Check expects Herdr 0.9.3.
- Phase 4 Check expects `command -v omp` = `$HOME/.local/bin/omp`, `omp/18.6.1`, and no `/usr/local/bin/omp`.
- Script fix `5f1318c` on the same branch (phase 12 Check needs `disable --now`).

## Drop

- F766 draft `53a195a`
- Frozen root-owned omp / old pins at `358ce75` alone (superseded by this tip)
- Team evidence-only branches remain evidence; land this combined tip

## Cold paper re-runs

See `lead-cold-x86.md` and `lead-cold-arm.md`. Both: **No guesses** on the changed phase 4 path (pins, worker-owned omp, break-glass port 22). Prior team-4 cold passes on `358ce75` still cover the unchanged phases.

## Checks

- `bash -n` on `github-setup.sh` and both phase 4 shell blocks: OK
- Docker pin installs x86_64 + arm64: OK (above)
