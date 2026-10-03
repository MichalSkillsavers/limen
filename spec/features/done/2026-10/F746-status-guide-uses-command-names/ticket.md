# F746 · The guides use the names the status command prints

## Outcome

A reader who runs `limen status` finds the same words in the guides. The command is `status`. Its section for finished, unlanded work is `Candidates to inspect`. The command reference lists every command the CLI accepts, and it shows which commands the coordinator runs and which commands the operator runs.

## Scope

- Rename `Ready to land` to `Candidates to inspect` in the status guide (`docs/herdr-status.md`). Call the command `status`, not "plate".
- Add `limen sweep`, `limen linear`, and the `limen github` commands to the README command reference.
- Split the README command reference into coordinator actions and operator actions. Operator actions are setup and seat work: init, workspace init, sweep, linear, github connect, disconnect, status, doctor, and picture watch.
- Keep the CLI help text in `src/main.ts` as the source of the command list.

## Out of scope

- Any change to the output of `limen status`.
- Edits to landed feature history under `spec/features/done/`.
- The setup, map, and finish guides (separate tickets).

## Acceptance

- `grep -rn "Ready to land" README.md docs templates` prints nothing.
- `docs/herdr-status.md` names the `Candidates to inspect` section.
- Every top-level command in `limen --help` appears in the README command reference.
- The README command reference has one block for coordinator actions and one block for operator actions.
- `npm run check` passes.
