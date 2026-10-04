# Picture

[README](../README.md) · [Command reference](commands.md)

Picture shows a project’s code structure and the places named by its specified features and journeys.

The architecture map is a local file. `limen picture build` makes it from a Markdown dataset that Git ignores (default `.limen/picture/`). The output is one offline `map.html` in the same directory. **Build never calls a model.**

- **Not in Git:** The dataset and the map are not in Git. Nobody commits or lands them. A new clone has no map.
- **Rules:** [templates/picture/CONTRACT.md](../templates/picture/CONTRACT.md) has the dataset rules.
- **Source check:** Build warns (`source.missing`) for each cited source path that does not exist in the project root. The map still renders.

## What the map shows

The map shows places and the edges between them. **Explore** lists Features, Journeys, and Places beside the map. Search finds them by name, id, summary, or cited source path.

Select a feature or journey to reveal the places it names in `touches` or `steps`, including places inside different modules. Only those places light; nested places keep their parent captions. During a drill-down, collapsed containers show where listed places sit without lighting as touches. Open a place to read its sources, connections, and the features and journeys that name it.

Follow a journey with Previous step and Next step, including repeated visits and steps at the whole project. The URL preserves the selected feature or journey, place, and step, so reload and browser Back keep the context. The map never uses Git history to find places.

**The list is not a live feature list.** It shows where a feature touches the code. It does not show if a feature is planned, active, or done, because the board (`spec/build.md`) owns feature state.

## Refresh the map

The coordinator starts the first map by hand, as an interactive `--role picture` job (`--tab`). It uses `--detached` only when the interactive start fails.

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
