# Team 3 · The agent-fillable document

Write `docs/seat/agent-setup.md`, or a better name (say why). Take the shape of the ma.ttias.be "hand this post to your agent" idea and make it strict:

- A top line that says "Paste this into your coding agent".
- One fill-in block: SEAT_HOST, ADMIN_SSH, WORKER, PROJECT_REPO, PROJECT_BRANCH, LIMEN_REPO, LIMEN_REV, APP_ID, PEM_SOURCE, NODE_SOURCE, HERDR_SOURCE, PHONE_BELL.
- Phases: box and break-glass SSH, Tailscale, worker without sudo, tools, project and `limen init`, Herdr session, bell, prune, preview, prove lid-closed, GitHub App, doorbell connect, doctor, timer, doctor.
- Each step is a command, a check, and a STOP condition. HUMAN steps are marked.
- Agent rules at the top: never ask for or print secrets, never stage the PEM in a worker home or a chat, never run `poll` before doctor is clean, stop and ask on any failed check.

At most about 180 lines. Link to longer docs instead of repeating them. Use the team-1 and team-2 facts, and read their publications before each draft.

Same brief rules: sources for every fact, read-only Alice checks only, commits only on your job branch, no landing, no push, plain technical English.
