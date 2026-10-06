# Team 2 · From scratch

Route: Opus (`anthropic/claude-opus-5-5`) for the coordinator and the worker.

Shape: design. Deliverable: `group/teams/team-2-design.md` committed on your branch.

Hypothesis to test: six to ten end-to-end scenarios on a throwaway plant, plus a handful of pure unit tests, guard what users feel. That set fits in about 2,500 lines and runs in under 3 minutes.

Start here:

1. Read the three explainer pages and the brief's seam list. Look at how today's tests build a plant (`test/scratch.ts`, `bin/limen-group-fixture.mjs`) and how they fake the engine. Decide the one fixture the scenarios share: a temp Git repo, a fake engine script, a local HTTP sink for webhooks, no Herdr.
2. Write each scenario as a short story a reader can follow: setup, the commands, the observable results it checks. One per seam. Name what each scenario must catch, and say which of today's files it replaces.
3. Name the few pure unit tests worth keeping: logic that is tricky and cheap to test alone (for example ticket parsing, the next free F number, the finish decision table, the webhook allowlist). Give each a reason.
4. Give a target size in lines, a target run time, and how you estimated both. Say how the set avoids sleeps and wall-clock windows.
5. Propose one anti-bloat rule a machine can check, for example a line budget for `test/` in `test/structure.test.ts`, or "a feature that adds test lines removes as many". Say where it runs and what the error says.
6. Publish the scenario list and the target size by minute 35. Ask Team 1 for the tests that caught real bugs, and show that your scenarios cover them.

Done when the note has the fixture, the scenario stories, the unit list, the size and run-time targets with the method, the anti-bloat rule, the file-to-scenario mapping, and the section "Points from other teams".
