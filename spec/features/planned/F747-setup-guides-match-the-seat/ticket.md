# F747 · The setup guides describe the seat as it runs today

## Outcome

An operator who sets up a seat reads current facts. The seat computer owns the project copy and the job files. The laptop is only a window. New jobs use OMP. Linux process identity already works. The old server walkthrough stays available as evidence of what was done once, not as the current checklist.

## Scope

- Seat guides (`docs/remote.md`, `docs/seat/README.md`): say that the seat owns the project copy and `.limen/jobs/`, and that the laptop only attaches.
- Name OMP as the engine for new jobs and hosted tabs. Remove instructions that tell the operator to install or start Pi for new jobs.
- Linux reads process identity from `/proc/<pid>/stat` (`src/runtime/contain.ts`). Remove text that calls Linux identity future or separate work, and the "Linux stop is best-effort" claim that depends on it.
- Mark `docs/vps.md` as an old record of one setup pass. Its "First repo (not done in this pass)" section must not read as an open step. Point readers to the current checklist.
- README links follow the same split: current checklist first, old walkthrough as evidence.

## Out of scope

- The GitHub doorbell setup steps and the second-seat proof.
- New seat conveniences such as `LIMEN_SPAWN` or `LIMEN_NOTIFY`.
- Any change in `src/`.

## Acceptance

- No setup guide tells a reader to start Pi for a new job or a hosted tab.
- No setup guide calls Linux process identity future, separate, or missing work.
- `docs/vps.md` opens with a line that says it is an old record and names the current checklist.
- The first-repository section in `docs/vps.md` does not say that setup is unfinished.
- `npm run check` passes.
