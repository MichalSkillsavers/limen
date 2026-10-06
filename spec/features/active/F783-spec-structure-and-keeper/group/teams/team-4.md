# Team 4 · Proof and cold review

Route: Opus (`anthropic/claude-opus-5-5`). On a 429, continue on Sol (`openai-codex/gpt-6-sol`) and publish the switch.

Shape: proof. You change no product file. Fixes go to the owning team as a publish with the exact patch or repro.

Hypothesis: the keeper is only real when a live job on a real plant shows it. A deliberately broken ticket, a missing board line and a stale map source must be fixed by the keeper, and `limen land` must refuse before the fix and succeed after it.

Start here:

1. Build a throwaway plant now, before Team 3 is ready: a temp Git repo under `/tmp/f783-proof/` made with `limen init` from your worktree's `bin/limen`, a small map dataset copied and trimmed from the plant map, and one ticket. Never use the live plant for the proof. Run every throwaway-plant command with `env -u LIMEN_GROUP_ID -u LIMEN_JOB -u LIMEN_JOB_ID -u LIMEN_JOB_LABEL -u LIMEN_CONTEXT_ROOT`, so it does not inherit your group or job identity.
2. Write `group/qa/proof.sh` that sets up the plant, spawns one small real job (a one-line change on Sol, `--detached`, `--timeout 10m`), then breaks three links on purpose: the ticket front matter (an unknown `touches` id), the board line (missing), and a map source (a path to a moved ticket).
3. When Team 3 publishes that its branch can run, merge Team 2 and Team 3 branches into a local proof branch in your worktree (do not push it), run `limen land` to see the refusal, run `limen keeper` with the job id, wait for it, and run `limen land` again. Record every command and its real output in `group/qa/results.md`.
4. Cold review: read every new or changed text an agent or Adam will see (templates, help, diagnostics, wake line, docs). Write `group/teams/team-4-review.md`: each finding with the file, the line, the problem and a suggested replacement. Check plain technical English: short sentences, one idea each, active voice.

Done when `results.md` shows the refusal, the keeper fixes and the clean land, or names exactly which step failed and why, and the review file is committed.
