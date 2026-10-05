---
opened: 2026-10-03
landed: 2026-10-03
---

# F753 · A reader can scan the README and jump to each part

## Outcome

A person who opens the README finds install, how work runs, the architecture map, models, and the command reference without reading long paragraphs. Today the text is one short sentence after another, packed into long paragraphs, and the command reference is one dense block. Adam locked this on 2026-10-03. The words stay plain technical English; only the page shape changes.

## Scope

- `README.md` only. Start at the long paragraphs under Install and "What the coordinator runs".
- Use headings, short lists, bold labels, and a table only where a table is clearer.
- Keep every fact, rule, command, environment variable, and link that the README has now.
- Split the command reference into short groups by purpose, with one line each on what the group does.

## Out of scope

- New claims, removed commands, or changed rules.
- Other docs, templates, `src/`, and the board.

## Acceptance

- The README has headings for install, how work runs, the architecture map, models, and the command reference.
- Every top-level command in `limen --help` still appears in the README.
- Every command line in the current command reference still appears in the new README.
- Every local link resolves.
- No paragraph is longer than about six sentences.
- A reviewer who compares old and new text finds no dropped fact and no new claim.
