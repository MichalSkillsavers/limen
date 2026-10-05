# Team 2 · VPS seat docs

Own every section of `docs/remote.md` except "GitHub doorbell", plus `docs/seat/README.md` and the banner of `docs/vps.md`. Add:

- Alice SSH: alias, MagicDNS host, break-glass public SSH, separate root identity.
- Tailscale: tailnet-only, ufw allow on `tailscale0`, `tailscale serve` for previews, no funnel.
- Seat and window.
- Moshi: host setup and pair are different, `--store file`, linger.
- `/opt/limen`: the root-owned release for the poller, the worker `limen` link, the same-version rule.
- Herdr remote: `herdr --remote`, saved machines with `herdr machine`, `--machine`. Check `herdr --help` on the Mac for the real syntax.
- No unattended reboot under live jobs.
- The Docker `-p` trap.

Fix the 4 GB / 80 GB and 8 GB / 150 GB contradiction with one number and a reason. Publish each fact that team-3 needs as you confirm it.

Same brief rules: sources for every fact, read-only Alice checks only, commits only on your job branch, no landing, no push, plain technical English.
