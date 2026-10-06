---
touches:
  - limen.commands
  - limen.runtime.liveness
  - limen.cabinet.git
opened: 2026-10-06
---

# F926 · fleet leads start reviews, wait and land without workarounds

## Outcome

The lead of the Alice fleet run (F924 in the Alice plant) hit four Limen defects and worked around each by hand. After this change a review that takes minutes to start lists as starting, not ORPHAN, so leads stop killing it. A review pins `--head` and `--base` with a short SHA or a ref. A coordinator's `limen wait` names the exact command for the job. `limen land` merges while another session has unrelated uncommitted files in the plant checkout.

## Scope

- Spawn records its own pid in the job record before the slow setup steps, and `jobs` and `status` read it.
- `--base` and `--head` resolve through `git rev-parse`.
- `wait` keeps its refusal for a running job under `LIMEN_COORDINATOR=1`, an earlier owner decision, but names the commands for that job and reports an ended job.
- `land` compares the uncommitted paths of the checkout with the paths the merge changes.

## Out of scope

- A new lifecycle state value in `state`; the `starting` record sits beside it, so stop, steer and wait keep their behavior.
- Landing through a temporary worktree; the target branch is checked out in the plant, so its files must move with the merge.

## Acceptance

- While a detached `--review` spawn waits in `--prepare`, `.limen/jobs/<id>/starting` holds the spawn pid and `state` does not exist yet.
- In that window `limen jobs` shows the job with pulse `starting` and no `ORPHAN`, and `limen status` lists it under Running.
- A stateless job whose spawn process is dead still shows `ORPHAN`.
- `limen spawn --review --base main --head <9-char SHA>` records full SHAs in `base` and `candidate`; an unknown ref fails and names the ref.
- `limen wait <id>` under `LIMEN_COORDINATOR=1` prints `` `limen jobs <id>` `` with the real id for a running job, and prints `DONE …` for an ended one.
- `limen land` merges beside an unrelated modified file and an untracked file and leaves both byte-identical. It refuses a dirty file that the merge changes, and it refuses staged changes. A conflicting merge beside dirty files is aborted.
