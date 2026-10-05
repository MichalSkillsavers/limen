# Cold paper · aarch64 · ken/notes · seat notes-seat

Guide-only read of `docs/seat/agent-setup.md` at lead tip (Adam pin+omp decisions). Fake user: ken, project notes, seat notes-seat, CPU aarch64.

## Filled values (paper)
- SEAT_NAME=notes-seat
- WORKER=ken
- PROJECT_REPO=example/notes
- CPU assumed for downloads: aarch64

## Changed-path Checks (Adam decisions)
- PASS: uname -m gate before download
- PASS: Node 24.21.0 both arches
- PASS: Herdr 0.9.3 both arches
- PASS: omp 18.6.1 worker ~/.local/bin
- PASS: no root omp install
- PASS: checksum before omp runs
- PASS: port 22 break-glass
- PASS: admin Tailscale-only
- PASS: disable --now referenced

## Guesses
- **No guesses.** Pins, checksums, worker-owned omp path, and break-glass port 22 are named in the guide.

## Notes
- Unchanged phases (1–3, 5–14, Upgrade) inherit team-4 cold passes on 358ce75; this re-run targets the decision delta.
- Guide lines: 214
