# Picture

[README](../README.md) · [Command reference](commands.md)

Picture shows a project’s code structure and the places named by its specified features and journeys.

The architecture map is a local file. `limen picture build` makes it from a Markdown dataset that Git ignores (default `.limen/picture/`). The output is one offline `map.html` in the same directory. **Build never calls a model.**

- **Not in Git:** The dataset and the map are not in Git. Nobody commits or lands them. A new clone has no map.
- **Rules:** [templates/picture/CONTRACT.md](../templates/picture/CONTRACT.md) has the dataset rules.
- **Source check:** Build warns (`source.missing`) for each cited source path that does not exist in the project root. The map still renders.

## What the map shows

The picture shows the plant atlas beside a quiet column of work and dated decisions. Select a place to read its sources, connections, and the features and journeys that name it.

Select a feature or journey to reveal its `touches` or `steps`, including places inside different modules. Only named places light; nested places keep their parent captions.

Follow a journey through its ordered steps, including repeated visits and stops at the whole project. The URL preserves a selected place, work item, or day on reload. The map never uses Git history to guess places.

Pins, places, modules, work, journeys, and days open larger as layers over the page. An item opened inside a layer stacks one more layer. The trail above the layers names each one and jumps to any of them. Esc and browser Back close the top layer; the Left and Right arrow keys move the top layer to the previous or next item of the same kind. The URL holds the whole stack, so a reload or a shared link opens the same layers.

**Map features are not the live work list.** They show where specified features cross the code, not their state. The board (`spec/build.md`) owns feature state. The live picture also reads tickets and the board to show current work.

Ticket dates show when work opened or landed; a dated **Needs Adam** request or **Wrong** problem appears as a pin. Ticket `touches` link the work to exact map places; a place with no evidence stays unlinked.

Put `---` front matter before a ticket's title. Use `opened: YYYY-MM-DD`; use a `touches:` block list of known plant or module ids when evidence supports it. A one-line `needs-adam` request needs `needs-adam-on: YYYY-MM-DD`; a one-line `wrong` problem needs `wrong-on: YYYY-MM-DD`. Set `landed: YYYY-MM-DD` on done work when its landing date is known. The [picture contract](../templates/picture/CONTRACT.md#ticket-front-matter) lists the fields. Build reports bad ids, dates, or unpaired requests with a ticket path and line. `--strict` fails on those errors; an active ticket without known touches gets a warning, not an invented link.

Remove a Needs Adam request and its date after Adam answers. Remove a Wrong problem and its date after the fix. The pin then leaves the page.

## Refresh the map

The coordinator starts the first map by hand, as an interactive `--role picture` job (`--tab`). It uses `--detached` only when the interactive start fails.

Start it from the project repository, with the engine and model flags chosen for the job:

```sh
limen spawn --role picture --tab --engine E --provider P --model M --thinking T \
  'Create the first local architecture map in .limen/picture. Read templates/picture/CONTRACT.md; commit nothing.'
```

With no dataset, both `limen picture build` and `limen picture tick` point to this command and `docs/picture.md`. Build exits with an error; tick skips the refresh without starting a job. A dataset with no recorded revision gets the same first-map hint from tick. Existing dataset validation errors still appear.

After that, `limen picture tick --engine E --provider P --model M --thinking T` does one quiet pass. It compares the commit recorded in the map with `HEAD`. It starts a detached refresh job only in two cases:

- files were added, deleted, or renamed, or
- a source that the map cites changed. A source that only a feature or a journey cites counts too.

Changes to specs, docs, or the map only print nothing and cost nothing. So a change to the board only (`spec/build.md`) never refreshes the map. The tick tries each tip one time. `--dry-run` prints the decision in one line, also when the map is current or nothing relevant changed.

## Map watch

**Off by default.** The tick runs by itself only in a project that turns on its watch. Each time the top branch moves (a land, a merge, or a pull), the watch hook starts one tick in the background. Worker branches and other refs start nothing. The hook never makes a merge or a spawn wait. The refresh job wakes no conversation.

| Command | Effect |
|---|---|
| `limen picture watch on --engine E --provider P --model M --thinking T` | In the primary checkout, installs one Git `reference-transaction` hook. |
| `limen picture watch` | Prints the state. |
| `limen picture watch off` | Removes the hook. |

`--branch` names the top branch when it is not the branch that is checked out. `.limen/picture-watch.log` records each move.
