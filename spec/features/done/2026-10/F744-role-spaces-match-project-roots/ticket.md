# F744 · Role spaces belong to the right project

## Outcome

Two projects whose directories share a basename no longer send workers into the same Herdr role space. Spaces remain readable to the operator, and existing job places continue to reopen correctly.

## Scope

- Start at ensureWorkspace in src/integrations/herdr.ts, where an exact display-label match currently selects a workspace.
- Distinguish the requested canonical project root from a merely matching label, using existing cwd/Git evidence or a qualified label rather than a new registry.
- Treat absent or ambiguous identity evidence honestly; never reuse a known foreign project space.
- Keep one shared path for hosted workers, detached log views, and diff views.

## Out of scope

- Hosted process liveness, coordinator wake delivery, or the separate recovery regression awaiting this slice.
- Moving, renaming, or closing existing human spaces to repair their organization.
- Global Herdr configuration, new dependencies, or an immutable repository-root field that Herdr does not document.

## Acceptance

- A fake-Herdr regression with different roots sharing a basename creates or selects distinct role spaces.
- Repeated launches for the same root reuse its appropriate role space without repeated extra spaces.
- Missing or ambiguous evidence cannot silently select a foreign space.
- Existing recorded job places still reopen, and adjacent-repository workspace behavior remains correct.
- Focused Herdr launch/open/diff checks and typecheck pass; retain the observed command/output evidence.
