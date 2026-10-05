# Team 1 · Data contract

Route: Sol (`openai-codex/gpt-6-sol`) for the coordinator and the worker.

Hypothesis: a small, strict ticket front matter is enough to feed the decide column. It names the places a feature touches with the same ids as the map, one Needs Adam ask, one Wrong problem, and dates. Strict checks make a wrong id fail the build, so no agent can mis-link without a red line.

Start here:

1. Publish the final front matter keys in the first 20 minutes (start from the brief defaults). Ask Team 2 to acknowledge.
2. Write `src/picture/tickets.ts`: find `ticket.md` files in the lanes, parse the front matter with the existing parser in `src/picture/frontmatter.ts`, and return records plus `Diagnostic`s. The id check needs the map place ids; agree the function shape with Team 2 (for example `readTickets(root)` and `checkTickets(tickets, placeIds)`).
3. Update the ticket template (both copies) and `templates/picture/CONTRACT.md` with a short "Ticket front matter" section, and `docs/picture.md` in product words.
4. Backfill every active ticket, F780 included. Use the touches of the matching map feature (`.limen/picture/features/limen.feature.fNNN.md`) when one exists; otherwise read the ticket and the code it names. Add `landed` and `touches` to the October done tickets where the evidence is clear, so the Changed pin and Days are not empty. Never guess a place: leave `touches` out and accept the warning.
5. Check that nothing else breaks when a ticket starts with `---` (search `src/` and `templates/` for ticket readers, the Linear mirror included).

Done when: a bad id in a ticket fails `--strict` with the path and line, the backfill builds clean on the plant map, and tests cover the error paths.
