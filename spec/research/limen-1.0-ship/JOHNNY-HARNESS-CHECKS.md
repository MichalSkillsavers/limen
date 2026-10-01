# Johnny export-hold harness: ready, not live proof

Protected proof directory: `/home/overment/limen-evidence/johnny-finish-go-20260912/`, with mode-700 `receiver-held/` and `receiver-source/`. `preflight.txt` records the real VPS prerequisites: the dedicated Johnny config is absent and no authorized history/export channel was supplied. No private config values were opened or changed; no live send or retry was attempted. The prepared source has no receiver map or completed-turn export; Johnny must establish its trust and mapping first.

`johnny-export-proof.sh` is an operator evidence helper, not product runtime. It only captures inspection or atomically moves a supplied export. It requires a settled accepted automatic receipt, the dedicated config-path snapshot, exactly Johnny target 1, and owner/history attestations. It retains both views, refuses to overwrite a capture, validates the export with Limen's existing v1 reader, and compares unchanged automatic receipts. File presence and valid JSON do not authenticate receiver history; Johnny/Adam must follow the real session/turn lookup.

Checks run by the coordinator:

- `bash -n spec/research/limen-1.0-ship/johnny-export-proof.sh`: passed; all three `ASK-JOHNNY.md` shell blocks also parsed without execution.
- `npm run typecheck`, targeted Biome for the helper's synthetic runner, and `git diff --check`: passed.
- `node spec/research/limen-1.0-ship/johnny-export-proof.test.mjs`: 11 synthetic checks passed. Missing exports, rejected ingress, extra recipients, repeated capture, wrong event, incomplete turn, symlink export, changed automatic claim and repeated release are refused; the valid fixture changes both views without reading config, changing receipts or changing export bytes.
- The first synthetic run failed because its fake job omitted required `task.md` and `log`; the fixture was corrected and capture now explicitly checks both CLI views. Both logs are retained, not represented as a first-pass success: `helper-synthetic.log` and `helper-synthetic-2.log` under the protected proof directory.

The synthetic runner uses temporary Git/job files outside the real proof source and removes only its own fixtures. It contains no send operation and supplies no real receiver evidence. `ASK-JOHNNY.md` names the remaining receiver-side actions; until those occur, F091 is not PROVEN and release readiness stays NO-GO.
