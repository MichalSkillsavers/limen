# Team 3 · Module boundaries and logic splitting

Hypothesis: the largest files break "one file, one job", and some decisions have two owners. Start with the biggest: `hook/wake.ts` (about 1,060 lines), `src/integrations/herdr.ts`, `src/commands/spawn.ts`, `src/picture/picture-model.ts`, and `src/integrations/github-poller.ts`. For each file, name each job it does and the line ranges. Then look for one decision that two files decide (for example liveness, finish state, or engine selection). Propose the smallest cut that gives each job one home. Check each cut against the structure test (`test/structure.test.ts`) and the styleguide: no barrels, no helper bags, no new abstraction for a second example.

Same brief: read the sources of truth fully first, cite path, lines, and a short quote for each finding, publish findings, read peers before each new finding, commit only `group/teams/team-3-result.md` on your job branch, no land, no product edits.
