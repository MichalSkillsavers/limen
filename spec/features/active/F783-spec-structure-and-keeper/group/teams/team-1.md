# Team 1 · What agents see

Route: Opus (`anthropic/claude-opus-5-5`). On a 429, continue on Sol (`openai-codex/gpt-6-sol`) and publish the switch.

Shape: survey. You change no product file. Your deliverables are two notes files, committed on your branch.

Hypothesis: the ticket contract reaches the coordinator in long text (`templates/agents.md`, the speech register Specs section) but reaches a worker only as a `Ticket:` pointer. Nobody sees the strict check until a build fails. So agents copy an older ticket instead of the template, and links break.

Start here:

1. Trace each structure to each reader. Structures: the ticket template (both copies), `templates/picture/CONTRACT.md`, the board `spec/build.md`, the map dataset, `outcome.md`, group packets. Readers: coordinator pane, worker job, group team coordinator, group worker, picture job, reviewer. Paths: hook injections (`hook/*.ts`, `.omp/extensions/limen.ts`, `.pi/extensions/limen.ts`, `templates/limen-extension.ts`), role preambles (`templates/*.md` via `resolvePreamble` in `src/commands/spawn.ts`), the group task wrap (`templates/group-member.md`), `README.md`, `AGENTS.md`, `docs/`.
2. Publish a first draft of the reader × structure table in the first 30 minutes, so Team 2 and Team 3 can design against it.
3. Mine `/Users/overment/.overment/limen/.limen/jobs/*/` (`task.md`, `log`, `session/`) and Git history for real misses: the duplicate F778, the F781 ticket without front matter (`c0c0e29`), the stale F728/F740/F741 map sources, the F780 backfill. For each miss give the job id, the transcript line or commit, and the cause (agent never saw the rule, saw it and skipped it, or no check caught it).
4. Answer: what runs today at finish and at land that checks links, and what does not.

Deliverables:

- `group/teams/team-1-map.md`: one table, one row per structure, with columns for how it reaches each reader, plus a short "never reaches" list.
- `group/teams/team-1-failures.md`: the real failure list with evidence, then the three changes that would have stopped most of them.

Done when both files are committed, every claim cites a path, a commit or a job id, and you published a summary.
