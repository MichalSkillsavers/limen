# Ticket data contract · Team 1

The live picture reads ticket front matter for exact map-place links, dated decisions, problems, and landing dates. `src/picture/tickets.ts` reads all four feature lanes, preserves tickets without front matter, and returns 1-based path/line diagnostics. An unknown place id is an error (`ticket.unknown-touch`), not an inferred or silently dropped link. Active tickets without verified touches warn. Both ticket templates, the picture contract, and the operator guide document the fields. The backfill adds dates and only evidenced place ids to active and October done tickets; the live map remains untouched.

A corrected pin set uses the observed hosted-pane defect (F777) for Wrong, and the unresolved graph change-count choice (F759) for Needs Adam. The graph synthesis states that the refresh-versus-build route is an owner choice (`spec/features/active/F759-graph-shows-what-to-decide/group/synthesis.md:132-134`); its file entered Git on 2026-10-04. The earlier merged-picture question (F775) was answered by the request for this live build (F780), so its stale flag was removed. Remove paired fields when a question is answered or a problem is fixed; pins then disappear. No place id was guessed for tickets whose map feature or source gives no link.

Commits: `b5c0b86` (reader/tests), `9bafb8f` (type correction), worker `be3dc1c` merged as `c547510` (metadata/templates/docs), `b2c965c` (stale pin cleanup and dated active defect), `c667ef7` (verified open question). Team 2 owns the model/3 builder and CLI integration; these peer files are not merged into this candidate.

Checks exercised in this worktree:

- `node --test test/picture-tickets.test.ts`: 4/4 passed.
- `npx biome check src/picture/tickets.ts test/picture-tickets.test.ts`: exit 0.
- `npm run typecheck`: exit 0 after `npm ci`; the first invocation could not find `tsc` before dependency install.
- `git diff --check HEAD~5..HEAD`: no output.
- Direct `readTickets`/`checkTickets` on the plant map: 158 tickets, no errors, 11 no-touch warnings.
- Team 2's `pictureCommand` imported from its candidate and run with this worktree as root under `--strict`: exit 0, `/tmp/f780-team-1/map.html` and `.json`, 23 places, 41 edges, 158 work, 26 Changed, 1 Wrong, 1 Needs Adam, zero errors. It reported four old map-source warnings and 11 no-touch warnings.
- A throwaway F999 ticket with `limen.misspelled` run through Team 2's corrected `pictureCommand` (`f1c114e`): strict exit 1; stderr included `spec/features/active/F999-invalid/ticket.md:3` and `limen.misspelled`. This was reproduced before the CLI fix with no line, then after with line.

No visual screenshots from this data-only slice; Teams 3–6 own the viewer and visual proof. The remaining integration risk is a future map dataset without the named plant/module ids: strict build will then fail with the ticket path and exact id, by design.
