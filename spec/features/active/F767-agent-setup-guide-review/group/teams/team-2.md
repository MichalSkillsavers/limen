# Team 2 · Code truth and setup script

Check every command, flag, path, environment key, and unit name in the draft against `src/`, `docs/seat/github-setup.sh`, and the units. Publish each mismatch with its source line for team-1. Check owner lock 2: `github-setup.sh` must run `systemctl disable --now limen-github.timer` before the upgrade, and the guide must enable the timer again only after `limen github doctor` is clean. Fix the script on your branch only if it does not do this, with `bash -n` and `shellcheck` clean. Check owner lock 3: name the `limen init` and project-list commands that keep junk entries out, from the code.

Same brief rules: a source for every fact, Alice read-only, commits only on your job branch, no landing, no push, plain technical English.
