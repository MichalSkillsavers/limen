---
touches:
  - limen.commands
  - limen.sessions.guidance
opened: 2026-10-04
landed: 2026-10-04
---

# F762 · The private planning code reads clearly and follows the Limen style

## Outcome

The private planning change from pull request 4 (merged as `343ee3b`) reads clearly. Its code follows the styleguide (`.agents/limen/styleguide.md`) and the vision (`spec/vision.md`). A future reader can find the planning choice, the packet checks, and the canonical pointers without tracing several files. Adam asked for this on 2026-10-04.

## Scope

- Code that pull request 4 added or changed: `src/project/planning.ts`, `src/commands/planning-source.ts`, and the planning parts of `src/commands/spawn.ts`, `src/commands/continue.ts`, `src/commands/group.ts`, `src/job/group-cabinet.ts`, `src/main.ts`, and `hook/communication.ts`. See `git diff 9adee8d 343ee3b`.
- Fix spacing and formatting. Use names that the repository already uses.
- Apply the styleguide: one file, one job; no helper bag; plain functions and early returns; no defensive try/catch around impossible cases.
- Apply the vision: inform, do not gate; no new workflow state beyond the recorded planning source.
- Plain technical English in the docs and template lines that pull request 4 changed (`README.md`, `docs/groups.md`, `templates/agents.md`, `templates/linear.md`).
- Adam allows removal of the seven test cases that pull request 4 added. They are in `test/communication-hook.test.ts`, `test/continue-command.test.ts`, `test/group-command.test.ts`, and `test/spawn-command.test.ts`. Keep or simplify them if they still pin behavior a user can see.

## Out of scope

- Any change in behavior: `limen planning`, packet validation, recorded sources, and canonical pointers keep working the same.
- Tests that existed before pull request 4.
- Code that pull request 4 did not touch.

## Acceptance

- `git diff 343ee3b` touches only the files listed above, plus regenerated `templates/.history/*.md`.
- No test case that existed at `9adee8d` is removed or weakened.
- `limen planning`, `limen planning private`, and `limen planning committed` print the same results as at `343ee3b` in a scratch repository.
- `npx tsc --noEmit` and `npx biome check .` pass.
- `npm run check` passes, or each failure also fails at `343ee3b`.
