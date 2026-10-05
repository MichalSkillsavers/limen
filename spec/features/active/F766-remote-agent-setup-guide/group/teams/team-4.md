# Team 4 · Cold-agent test and script judge

Two jobs.

1. **Cold test.** When team-3 publishes a draft, spawn one worker that gets only that document plus a fake user (for example: user "maria", repository "maria/shop", seat "shop-seat", no App yet). The worker writes the filled-in plan and every place where it had to guess. Publish the stuck points to team-3. Repeat once on the next draft.
2. **Script judge.** Decide if a small read-only preflight removes real steps for a remote agent, for example `docs/seat/seat-check.sh`: the worker has no sudo, ufw is tailnet-only plus one SSH port, no automatic reboot, linger on, `limen` and `/opt/limen` at the same revision, Herdr server live. Build it only if yes. Keep it under about 60 lines, clean under `bash -n` and `shellcheck`, with no writes. Otherwise write why not. You may run it read-only against Alice as `overment`, under the Alice rules in the brief.

Same brief rules: sources for every fact, read-only Alice checks only, commits only on your job branch, no landing, no push, plain technical English.
