# Team 2 · S2 hosted spawn and S1 detached spawn

Line budget: 530 lines for both files (S2 about 310 including its fake Herdr, S1 about 220).

## S2 hosted spawn (`test/s2-hosted.test.ts`)

Must catch: a hosted job that does not finish on session end; a task passed as shell text instead of `@task`; a job marked failed when Herdr loses its agent row while the engine lives (`88fd5ac`, F728); two competing sweeps adopting one killed hosted supervisor (`5754dad`); the coordinator pane getting one wake prompt, not two. Story: F925 team-2 design, section 3, S2. The fake Herdr (about 80 lines) lives in this file: `LIMEN_HERDR=<path>` selects it; it records calls, runs the pane command as a child process, and answers `agent get` from a state file the test edits. The fake engine's `finish <handoff>` calls the real finish tool of `hook/hosted.ts`.

Incident replay you own: `88fd5ac`. S2 must go red with that fix reverted and green on `main`.

Deletes when S2 lands: `test/hosted-hook.test.ts`. Shared, deleted with the second to land: `test/hosted-spawn.test.ts` (with team 5's U7), `test/recovery.test.ts` (with team 1's S9), `test/coordinator-wake.test.ts` (with team 3's S3).

## S1 detached spawn (`test/s1-spawn.test.ts`)

Must catch: a job without its own worktree and branch from the base commit; wrong task bytes; leaked `HERDR_*` or `PI_SESSION_*` in the engine environment; a status or jobs read that takes the worker's Git index lock (`43c01cf`); the refusals (uncommitted ticket, `--role coordinator`, unknown engine, engine missing from `PATH`); one workspace spawn into a child repo. Story: F925 team-2 design, section 3, S1.

Incident replay you own: `43c01cf`. S1 must go red with that fix reverted. If it cannot, keep the 20-line first test of `test/git-status.test.ts` as a unit and say so.

Deletes when S1 lands: `test/workspace-command.test.ts`, `test/git-status.test.ts` (after the replay). Shared: `test/spawn-command.test.ts` (with team 1's S9). Tell team 5 when S1's replay is on `main`; it then deletes `test/open-command.test.ts`.

## Order

S2 first: `hosted-spawn` is the second slowest old file. Hosted is the default spawn path whenever Herdr runs.
