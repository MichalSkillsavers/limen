#!/usr/bin/env bash
# Operator evidence helper only. Never sends, retries, creates exports or claims GO.
set -euo pipefail
umask 077
PROJECT=${PROJECT:-/home/overment/limen}
LIMEN_ROOT=${LIMEN_ROOT:-/home/overment/limen}
PROOF=${PROOF:-/home/overment/limen-evidence/johnny-finish-go-20260912}
mode=${1:-}
id=${2:-}
[[ "$mode" == capture || "$mode" == release ]] && [[ "$id" =~ ^[A-Za-z0-9][A-Za-z0-9_-]+$ ]] || {
  echo 'Usage: bash johnny-export-proof.sh capture|release JOB_ID' >&2; exit 1;
}
[[ "$PROJECT" == /* && "$LIMEN_ROOT" == /* && "$PROOF" == /* ]]
cd "$PROJECT"
job="$PROJECT/.limen/jobs/$id"
export LIMEN_FINISH_EVIDENCE_DIR="$PROOF/receiver-source"
export PROJECT LIMEN_ROOT PROOF job mode
# Read only public job/evidence files. Selected credential contents are never opened.
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { job, PROOF: proof, LIMEN_ROOT: root, mode } = process.env;
const { inspectFinishWebhook, finishEvent } = await import(pathToFileURL(`${root}/src/finish-receipt.ts`));
assert.equal(readFileSync(`${job}/state`, 'utf8').trim(), 'done', 'Proof job must finish cleanly');
assert.ok(readFileSync(`${job}/finished-at`, 'utf8').trim());
assert.equal(readFileSync(`${job}/finish-webhook-env`, 'utf8').trim(), `${process.env.PROJECT || '/home/overment/limen'}/.limen/finish-webhook-johnny.env`, 'Dedicated config selection required');
assert.match(readFileSync(`${job}/finish-webhook`, 'utf8'), /accepted: sender exited 0/);
assert.ok(readFileSync(`${job}/finish-webhook-attempt`, 'utf8').trim());
assert.deepEqual(JSON.parse(readFileSync(`${proof}/receiver-source/receivers.json`, 'utf8')), { version: 1, targets: [{ target: 1, receiver: 'johnny' }] });
const view = await inspectFinishWebhook(job);
const targets = view.split('\n').filter(line => /^target \d+:/.test(line));
assert.equal(targets.length, 1, 'Exactly Johnny target 1 required');
assert.match(targets[0], /^target 1: transport accepted .* bot-turn unobserved$/);
assert.equal(existsSync(`${proof}/receiver-source/${finishEvent(job)}.1.json`), false, 'Export must still be held');
for (const name of ['mapping-owner.txt', 'control-owner.txt', 'receiver-history.txt', ...(mode === 'release' ? ['release-owner.txt'] : [])]) {
  assert.ok(readFileSync(`${proof}/${name}`, 'utf8').trim(), `Johnny must supply ${name}; file presence is not provenance`);
}
NODE
event=$(node --input-type=module -e 'import {pathToFileURL} from "node:url"; const {finishEvent}=await import(pathToFileURL(`${process.env.LIMEN_ROOT}/src/finish-receipt.ts`)); console.log(finishEvent(process.env.job));')
if [[ "$mode" == capture ]]; then
  test -f "$PROOF/receiver-held/$event.1.json" # Johnny's actual export, not a template.
  test ! -e "$PROOF/job-id.txt" # A prior capture is retained, never overwritten.
  for name in state finished-at finish-webhook-attempt finish-webhook finish-webhook-targets; do
    cp "$job/$name" "$PROOF/$name"
  done
  printf '%s\n' "$id" > "$PROOF/job-id.txt"
  printf '%s\n' "$event" > "$PROOF/event.txt"
  date -u +%Y-%m-%dT%H:%M:%SZ > "$PROOF/control-captured-at.txt"
  LIMEN_VIEW=compact "$LIMEN_ROOT/bin/limen" jobs "$id" > "$PROOF/control-compact.txt"
  NO_COLOR=1 LIMEN_VIEW=human "$LIMEN_ROOT/bin/limen" jobs "$id" > "$PROOF/control-human.txt"
  for view in compact human; do grep -q 'target 1: transport accepted .*bot-turn unobserved' "$PROOF/control-$view.txt"; done
  echo "Captured accepted/unobserved inspection at $PROOF. Read both views; Johnny must attest capture time and actual completion separately."
  exit 0
fi
test "$(< "$PROOF/job-id.txt")" = "$id"
test "$(< "$PROOF/event.txt")" = "$event"
for name in finish-webhook-attempt finish-webhook finish-webhook-targets; do cmp "$PROOF/$name" "$job/$name"; done
# Validate with Limen's existing v1 reader before atomic rename; never manufacture a turn.
cp "$PROOF/receiver-source/receivers.json" "$PROOF/receiver-held/receivers.json"
LIMEN_FINISH_EVIDENCE_DIR="$PROOF/receiver-held" node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { renameSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { LIMEN_ROOT: root, PROOF: proof, job } = process.env;
const { finishEvent } = await import(pathToFileURL(`${root}/src/finish-receipt.ts`));
const { inspectFinishTurns } = await import(pathToFileURL(`${root}/src/finish-turn.ts`));
const event = finishEvent(job), turns = await inspectFinishTurns(event);
assert.equal(turns.size, 1, 'Genuine completed export must validate before release');
assert.match(turns.get(1), /receiver johnny /);
renameSync(`${proof}/receiver-held/${event}.1.json`, `${proof}/receiver-source/${event}.1.json`);
writeFileSync(`${proof}/export-released-at.txt`, `${new Date().toISOString()}\n`);
NODE
LIMEN_VIEW=compact "$LIMEN_ROOT/bin/limen" jobs "$id" > "$PROOF/observed-compact.txt"
NO_COLOR=1 LIMEN_VIEW=human "$LIMEN_ROOT/bin/limen" jobs "$id" > "$PROOF/observed-human.txt"
result=0
diff -u "$PROOF/control-compact.txt" "$PROOF/observed-compact.txt" > "$PROOF/inspection.diff" || result=$?
test "$result" -eq 1
for name in finish-webhook-attempt finish-webhook finish-webhook-targets; do cmp "$PROOF/$name" "$job/$name"; done
for view in compact human; do grep -q 'target 1: transport accepted .*bot-turn observed (operator-trusted export).*receiver johnny' "$PROOF/observed-$view.txt"; done
echo "Released without sending. Read both observed views and $PROOF/inspection.diff; verify Johnny's actual history before any proof claim."
