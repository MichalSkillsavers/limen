# Team 3 · Spec keeper

Route: Opus (`anthropic/claude-opus-5-5`). On a 429, continue on Sol (`openai-codex/gpt-6-sol`) and publish the switch. The keeper job itself runs on Sol with a short timeout.

Shape: slice. Deliverable: commits on your branch.

Hypothesis: the coordinator starts the keeper, not a hook. A hook would spend a model run without the coordinator's choice, and the coordinator already holds the job ids and the ticket path. `limen land` only checks; it never spawns. The keeper works on its own branch made at the candidate tip, so it never fights a worker, and landing the keeper lands the work and the fixes together.

Start here:

1. Read the brief interfaces 3 to 6. Publish your final keeper usage, packet format and land gate rules in the first 30 minutes. Each one answers a ticket question: who triggers, what context, time budget, block or warn, no fights with running workers, single job and group.
2. New `src/commands/keeper.ts`: validate the ticket path and the jobs, refuse while a listed job runs, write the packet, create the keeper branch at the candidate tip, and spawn a `--role keeper` job through the existing spawn code. Find the session file path from the job record; publish where it lives for OMP and for Pi.
3. New `templates/keeper.md`: the keeper role. Short. It edits only `spec/features/**`, `spec/build.md` and map files that cite the ticket. It stops when the strict check has no error.
4. `src/commands/land.ts`: the ticket check for tickets the branch adds or changes, using Team 2's `readTickets` and `checkTickets`. On an error, refuse and print the `limen keeper` command. Warnings print only.
5. The coordinator path: one keeper step in `templates/agents.md`, one line in the completion wake text, and the group lead step in `docs/groups.md`. Keep each one short.
6. Tests with real Git and real files: the keeper refuses a running job; the keeper branch starts at the candidate tip; land refuses a bad ticket and passes a good one.

Done when the tests above pass, `limen keeper --help` text and the land refusal name the fix, and typecheck, Biome and the touched tests pass. Tell Team 4 when your branch can run end to end.
