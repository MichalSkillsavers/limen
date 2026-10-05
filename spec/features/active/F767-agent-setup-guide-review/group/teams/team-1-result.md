# Team 1 result · guide editor

Candidate: `docs/seat/agent-setup.md` on branch `limen/2026-10-05-f767-agent-setup-guide-review-te-2c7df9c7`, frozen at `358ce75` (205 lines). Draft commits: `2b1f400` (cold-run input 1), `a7de5af`, `9199116` (cold-run input 2), `916db78`, `4890d3b`, `358ce75` (frozen). Team-1 changed only this file and this result file. The guide needs the script fix from team-2 (`5f1318c`, `docs/seat/github-setup.sh` runs `systemctl disable --now limen-github.timer`). Without that fix, the phase 12 Check (`is-enabled` prints `disabled`) fails on every run.

## Owner locks: the guide lines

Line numbers are for `358ce75`.

| Lock | Guide lines |
|---|---|
| 1 · Limen on the Mac and on the seat; a plant on both | 42 (Limen runs on the Mac and, from phase 4 on, on the seat); 113 (each `limen init` checkout is a plant; a plant can live on the Mac, the seat, or both) |
| 2 · Setup runs `systemctl disable --now`, not only stop | 183 (Check: `is-enabled` prints `disabled`; setup runs `disable --now`); 192 (enable only after the doctor Check at 191); 197, 199 (`disable --now` on a failed check); 203 (Upgrade reruns the installer, which disables the timer) |
| 3 · No junk projects from `limen init` | 38 (rule 6: `limen init` only in `PROJECT_DIR`, never in `~/.nvm`); 106 (why: init registers the Git top-level folder); 108 (guard: `test "$(git rev-parse --show-toplevel)" = $PROJECT_DIR && limen init`); 109 (Check: `cat ~/.limen/projects` prints only `PROJECT_DIR`); 110 (fix with HUMAN approval; keep the ACL) |
| 4 · arm64 and x86_64; `uname -m` before any download | 47 (Check before any download: `x86_64` or `aarch64`, else STOP); 73–99 (Node, Herdr, omp `case` with both checksums); 100 (checksum sources); 117–128 (moshi-hook `case`); 49 and 54 (apt and the Tailscale apt repository check signatures and pick the CPU type); 205 (new pins: both CPU types from the vendor source) |
| 5 · Admin SSH over Tailscale only; public SSH break-glass only | 37 (rule 5); 46 (break-glass key on the public IP); 57 (`ADMIN_KEY` with `from=` tailnet ranges); 59 (Check: tailnet source address; admin key refused on `PUBLIC_IP`); 60 (from now on admin SSH is over Tailscale only); 66 (`AllowUsers` keeps `WORKER` on the tailnet); 163 (end-state Check, break-glass still works) |
| 6 · Moshi ring is "prove later" | 162 (`Prove later, not a gate`; a silent phone does not stop setup) |
| 7 · No landing or push until Adam says "land" | 39 (rule 7); 111 (`limen init` files: the HUMAN decides; do not push) |

## Critique of the F766 draft (`53a195a`, 181 lines)

Published to the group in the first 15 minutes. Line numbers are draft lines.

- **Lock 4 failed.** Lines 41, 44, 71–75, and 98 fixed the box to x86_64 and downloaded only x64 files. The phase 1 Check stopped on arm64.
- **Lock 5 failed.** `ADMIN_SSH` pointed at the public IP for the whole run (lines 9–10, 41). Rule 6 (line 35) kept public SSH open for daily use. No step or Check moved admin SSH to the tailnet.
- **Lock 6 failed.** Line 133 made the phone ring a gate (`STOP if the phone did not ring`).
- **Lock 7 missing.** No rule about push or merge.
- **Lock 3 partial.** Lines 90–91 checked and fixed the list, but nothing stopped `limen init` in the wrong folder.
- **Lock 2 broken by the base script.** The guide (line 155) expected `disabled`, but `docs/seat/github-setup.sh:26` at `ba2ed7f` only ran `systemctl stop`.
- **Fill-in block.** Human inputs were mixed with constants. `SEAT_HOST` is not known before the node joins the tailnet, and line 50 derived the hostname from it. No CPU value.
- **HUMAN stops.** No rule told the agent to wait for the human to say "done". The laptop prerequisites (line 37) had no Check.
- **Missing STOP.** Phases 14 and 15 (trial), the Moshi install (line 98), `herdr integration install` (line 105), and Upgrade had no STOP.
- **Self-containment.** The ntfy path (line 101) sent the agent to README steps. Rule 5 (line 34) did not say which `$NAME` the agent replaces in a quoted heredoc.
- **omp.** `curl https://omp.sh/install | sh` takes the latest release, can take a Bun source path, and runs the binary before any checksum (team-2, team-3; `omp.sh/install` `install_binary`).

## How the guide differs from the F766 draft

- Fill-in has three parts: ask the human, set by the agent (`SEAT_HOST`, `APP_ID`), and fixed. `SEAT_NAME`, `ADMIN_KEY`, `BREAK_GLASS_KEY` are new inputs. The aliases `ADMIN_SSH` and `BREAK_GLASS_SSH` are fixed.
- Rules: wait at each HUMAN step (2); replace only fill-in `$NAME`s, leave lower-case block variables (4); public port 22 for break-glass only, no `tailscale up --ssh` (5); `limen init` only in `PROJECT_DIR` (6); no push, no merge into `main` (7).
- Pre-phase Check: Herdr and Limen on the laptop, three distinct key pairs by fingerprint.
- Phase 1: `uname -m` Check first; break-glass key and alias; `ufw status verbose` Check.
- Phase 2: `SEAT_HOST` from `tailscale status --json`; `ADMIN_KEY` limited to tailnet source addresses with `from=`; Checks for the tailnet source address and for refusal on the public IP.
- Phase 3: `AllowUsers root WORKER@100.64.0.0/10 WORKER@fd7a:115c:a1e0::/48`; Check that the worker key is refused on the public IP.
- Phase 4: one root block for Node 24.19.0, Herdr 0.9.1, and omp 18.4.4, with a `case` on `uname -m` and the vendor checksum for each CPU type. omp is root-owned at `/usr/local/bin/omp`. Check adds `test -f /opt/limen/docs/seat/agent-setup.md` (the chosen `LIMEN_REV` contains this guide, so it also contains the script fix).
- Phase 5: guarded `limen init`; the list must hold only `PROJECT_DIR`.
- Phase 6: moshi-hook for both CPU types with `checksums.txt`; the ntfy path is inline.
- Phase 10: ring is "prove later"; lock-down end-state Check; HUMAN decides on the doorbell.
- Phases 13 and 14 (old 13–15): doctor runs as a Check, so its expected exit 1 does not trip `set -e`. Every failure path disables the timer and stops.
- Upgrade: one numbered order (installer, restart coordinator, phase 4 Check, phases 13–14), and new pins come from vendor lists only.
- Cut: the Alice example paragraph, the Moshi background paragraph, the `remote.md` "same block" note. Background is a link to `docs/remote.md`.

## Checks run by team-1

- **Download blocks, both CPU types.** The phase 4 and phase 6 blocks, extracted from the guide file, ran in Docker `ubuntu:24.04` on this Mac, native `linux/arm64` and `--platform linux/amd64`. `uname -m` printed `aarch64` and `x86_64`. Both runs: every `sha256sum -c` line `OK`, block exit 0, `node -v` `v24.19.0`, `herdr --version` `herdr 0.9.1`, `moshi-hook version 0.3.19`. As a non-root user: `command -v omp` `/usr/local/bin/omp`, `omp --version` `omp/18.4.4`.
- **sshd.** Same containers, OpenSSH from 24.04: `sshd -t` exit 0; `sshd -T` prints `permitrootlogin without-password` and the three `allowusers` entries. Real key logins with source addresses bound on `lo`: worker from `100.101.102.103` and `fd7a:115c:a1e0::1` accepted; worker from `203.0.113.9` `Permission denied (publickey)`; root accepted from all three.
- **Lint.** `bash -n` and `shellcheck` are clean on the phase 4 and phase 6 blocks. The phase 8 block gets SC2086 notes only before the agent puts the fill-in values in.
- **Vendor checksums.** Read today from Node `SHASUMS256.txt` (v24.19.0), the GitHub API asset `digest` for Herdr v0.9.1 and omp v18.4.4, and `cdn.getmoshi.app/hook/v0.3.19/checksums.txt`. omp's installer source was read from `https://omp.sh/install`.
- **Code facts.** `src/commands/init.ts:25-26,64` (init registers the Git top-level folder), `src/project/seat.ts:15-20` (a new entry replaces the file), `src/commands/github-doctor.ts:98,229-233,312` (timer FIX text and the error line), `src/runtime/engine.ts:136` (`--no-extensions`).
- **Not run:** a real VPS, a real tailnet join, the `from=` key restriction (team-3 ran it in a container), the Mac-side SSH Checks, systemd units, `tailscale serve`, the GitHub App, and the doorbell.

## Peer findings used or rejected

- **Used, team-2:** `limen init` guard and code lines; `no jobs` on a fresh seat (`src/commands/jobs.ts:24-26`); new-entry precision (`seat.ts:15-20`); one Upgrade order; omp installer Bun path and run-before-checksum; script fix `5f1318c` keeps the `Setup installed` prefix.
- **Used, team-3:** separate break-glass key and `from=` on the admin key, with the refusal Check; pinned omp 18.4.4 and its digests; lock-down end-state Check; `herdr_arch` for SC2046; rule 5 text; `ufw status verbose` lines; key-pair fingerprint Check.
- **Used, team-4:** every guess from cold run 1 on `2b1f400` (arm64 G1–G4, x86_64 G1–G5) is fixed in `9199116`. Cold run 2 on `9199116` found one guess in both runs (arm64 G5, x86_64 G6: the doctor rerun after a junk-line fix named no folder). Fixed in `358ce75` (line 110 names the first phase 14 Check and its command). The x86_64 run 2 found no guess on the new-seat path.
- **Own review after run 2 input:** `tailscale up` waits for approval, so a non-interactive `root$` call could not pass the login URL to the human. The human now runs it in their own terminal (lines 54–56). HUMAN commands carry the fill-in values (rule 2).
- **Rejected, team-3:** keep omp worker-owned in `~/.local/bin`. Root-owned removes the login-shell PATH dependency that team-3 itself found (non-login shells and units do not see `~/.local/bin`; Herdr pane shells were not checked). It matches Node and Herdr. Cost: the worker cannot self-update omp; Upgrade step 3 covers new pins.
- **Not adopted, team-3:** `from=` on the worker key. `AllowUsers` in the root-owned sshd drop-in does the same job, and a job, which runs as `WORKER`, cannot weaken it by adding its own key.

## Open questions for Adam

- omp is now root-owned at `/usr/local/bin/omp`, pinned to 18.4.4. The worker cannot self-update it. Keep this, or go back to a worker-owned `~/.local/bin/omp`?
- The pins stay at Node 24.19.0, Herdr 0.9.1, and omp 18.4.4 (`docs/setup.md:12`, `docs/remote.md:97`). Newer releases exist (team-3: Node 24.21.0, Herdr 0.9.3; omp 18.6.1). Move all pins together later?
- Public port 22 stays open for the break-glass key, as in the ma.ttias.be post. A stricter end state closes it and uses the provider console. Keep the post's shape?
- `LIMEN_REV` must be a `main` commit that holds this guide and the script fix. No such commit exists until you say "land".

## Verdict

Frozen candidate: `358ce75` (`docs/seat/agent-setup.md`, 205 lines, SHA-256 `c5054f55c1c1f4f7034dc09b79112ad539b646a923fbd2a09a00d004922bd7ba`). Land it together with team-2's script fix `5f1318c`; the guide's phase 12 Check needs it. Drop the F766 draft `53a195a` and the F766 owner-decisions patch for this file. team-2 passed the source review of `358ce75` with the script fix. team-3 passed locks 4 and 5 on `358ce75` (blocks rerun on amd64 and arm64). team-4's final cold runs on `358ce75` both passed with no guesses: arm64 (ken/notes) at `e98ba34`, x86_64 (maria/shop) at `bbba034`. Verdict: ready for Adam to read. Nothing proves the runtime path on a real VPS, tailnet, phone, or GitHub App.
