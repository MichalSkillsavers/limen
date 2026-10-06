# Team 2 · Authoring support

Route: Sol (`openai-codex/gpt-6-sol`) for the coordinator and the worker.

Shape: slice. Deliverable: commits on your branch.

Hypothesis: three small things stop most bad tickets. A scaffold command picks the number and fills the front matter. Strict messages say the fix, not only the problem. A worker sees the contract in a few lines at the place it writes a ticket.

Start here:

1. Read the brief interfaces 1 and 2. Publish the final diagnostic message shape and the `limen ticket new` usage in the first 30 minutes. Team 3 consumes `readTickets` and `checkTickets` for the land gate; tell Team 3 if you change their signatures.
2. `src/picture/tickets.ts`: add `fix:` text to every ticket diagnostic. Decide whether a ticket with no front matter at all is its own code. Decide whether a duplicate id is an error for a new ticket; publish the decision.
3. New `src/commands/ticket.ts` with `limen ticket new`. The next free number scans every lane, `done/*` and `dropped/*` included. A ticket made by the command must pass `picture build --strict` with no edit. Add the line to `src/main.ts` usage and command table (shared with Team 3).
4. Both ticket templates and the ticket section of `templates/picture/CONTRACT.md`: shorter, with one filled example of the front matter.
5. A worker contract of at most ten lines in `templates/worker.md` and `templates/group-member.md`: where tickets live, the front matter keys, the scaffold command, the strict check. Name each source. No wall of text.
6. `docs/picture.md`: the scaffold and the new messages, in product words.

Done when a test proves the next free number skips a number used in `done/`, a test proves a scaffolded ticket has no strict diagnostic on a temp plant, every ticket diagnostic in the tests has a `fix:` part, and typecheck, Biome and the touched tests pass.
