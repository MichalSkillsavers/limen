# Team 2 · Builder model

Route: Sol (`openai-codex/gpt-6-sol`) for the coordinator and the worker.

Hypothesis: one deterministic model (`architecture-map-model/3`) can carry everything the merged page needs: places, edges, map features, journeys, tickets as work, the board state, pins, and days. The viewer then holds no hand data. The same inputs give the same bytes.

Start here:

1. Publish the final model shape in the first 30 minutes (start from the brief defaults). Ask Team 3 and Team 4 to acknowledge. Publish a sample `map.json` path built from the plant as soon as it exists.
2. Read the board: `spec/build.md` sections and their `FNNN-slug` (emoji STATE) lines. Read tickets through Team 1's `src/picture/tickets.ts`; until it lands, code against the published shape and merge Team 1's commit when it is published.
3. Join tickets, board lines, and map features into `work`; derive `pins` and `days` from file dates only.
4. Wire `limen picture build` so it finds tickets and the board from the project root, also when `--dir` points outside the worktree. Keep `--json` and `--strict`.
5. Check that `limen picture tick` and the existing picture tests still pass.

Done when: `--json` on this plant shows the work, pins, and days the reference page shows, and a test proves two builds of the same inputs are byte-identical.
