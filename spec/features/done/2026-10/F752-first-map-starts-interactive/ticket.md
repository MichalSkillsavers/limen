# F752 · The first map job starts as an interactive job

## Outcome

A coordinator starts the first architecture map as an interactive job (`--tab`), so the owner can see the job and type into it. The coordinator uses `--detached` only when the interactive start fails. Adam locked this on 2026-10-03.

## Scope

- Shop manual (`templates/agents.md`): the first-map command uses `--tab`, and says to use `--detached` only when the interactive start fails.
- Picture role prompt (`templates/picture.md`): the first map can run in a tab where the owner can type; a refresh from the tick runs detached.
- README picture section: the same rule.
- Regenerate the shipped template history.

## Out of scope

- Refresh jobs that `limen picture tick` starts. They stay detached.
- Any change to `src/`.
- Running picture jobs.

## Acceptance

- No guide or template tells the coordinator to start the first map with `--detached` as the first choice.
- The shop manual first-map command contains `--tab` and names `--detached` as the fallback when the interactive start fails.
- `test/inherit.test.ts` passes.
