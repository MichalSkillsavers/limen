# Johnny: supply one genuine held/released finish export

The VPS harness is prepared; **no live send has been attempted**. Native verification is landed and no implementation worker is running; you can operate this proof now. The dedicated config and authorized receiver history/export are missing. You own the receiver; no Tony, paused ingress, guessed API or manual ping. Keep HTTP enabled. This is export hold: the real turn may complete before capture; only its inspected export is withheld.

1. Privately create mode-600 `/home/overment/limen/.limen/finish-webhook-johnny.env`, excluded from Git, selecting **only your authorized route as target 1**. Verify history access and preservation of `finishEvent` before sending. Record that verification and the private lookup convention in `mapping-owner.txt` below, without URLs/credentials. Then run from the VPS's hosted Herdr shell (if unavailable, ask this coordinator to launch; do not silently switch modes):

```bash
cd /home/overment/limen
PROOF=/home/overment/limen-evidence/johnny-finish-go-20260912
HELPER=spec/research/limen-1.0-ship/johnny-export-proof.sh
test -z "$(git status --porcelain --untracked-files=no)" || exit 1
test -r .limen/finish-webhook-johnny.env && test "$(stat -c %a .limen/finish-webhook-johnny.env)" = 600 && git check-ignore -q .limen/finish-webhook-johnny.env || exit 1
printf '%s\n' '{"version":1,"targets":[{"target":1,"receiver":"johnny"}]}' > "$PROOF/receiver-source/receivers.json"
git rev-parse HEAD > "$PROOF/source-revision.txt"
LIMEN_FINISH_WEBHOOK_ENV="$PWD/.limen/finish-webhook-johnny.env" bin/limen spawn --tab --engine pi \
  --label 'Johnny export hold proof · F091' \
  --provider openai-codex --model gpt-6-astra --thinking high \
  'Authorized automatic finish proof. No edits, private config reads or manual ping. Report this no-change job ended and call finish. Johnny alone operates receiver exports.'
read -r -p 'Returned job ID: ' id
bin/limen jobs "$id"
```

2. Follow that named job and your actual history until finalization settles. Stage your **genuine** v1 `<finishEvent>.1.json` in `$PROOF/receiver-held/`; format is in `docs/finish-webhooks.md`. Save `receiver-history.txt` with exact event, one ingress delivery, actual completion timestamp and durable session/turn lookup. Save `control-owner.txt` attesting export hold and no released export, not absence of a real turn. Capture, read both views, and append the captured timestamp and actual turn timing to that attestation:

```bash
bash "$HELPER" capture "$id"
```

3. Write `release-owner.txt` authorizing release of that same genuine export; the helper records the actual rename time. Then:

```bash
bash "$HELPER" release "$id"
```

Return the protected `$PROOF` path with your history/control attestations. The helper retains both before/after views and compares unchanged automatic receipts; it does not authenticate your history or send anything. Any rejected/unknown transport: stop and report the named job. **No retry is currently requested**; inspect ingress before authorizing one, since a timeout may already have delivered.
