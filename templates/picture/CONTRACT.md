# Picture contract

The picture is a map a cold reader takes in at one sitting: the places a project is made of, how they connect, and later which features and journeys cross them. This file is the reusable contract between three parties: the picture worker that writes the dataset, `limen picture build` that renders it, and `limen picture tick` that decides when a refresh is worth a model call.

The dataset and the rendered map are local, gitignored artifacts. They are never committed, merged, or landed onto a tip, and nothing in this contract gates spawn or land.

Schema: `architecture-map/1`. It is the schema of the first dataset (Alice, 2026-10-02) plus the fields marked **new**.

## Dataset directory

One dataset is one directory. Default: `<project root>/.limen/picture/`, which `/.limen/` already ignores. A plant may choose another gitignored directory with `--dir`.

| Path | Role |
| --- | --- |
| `nodes/*.md` | Places: the plant root and its modules. Flat files only. |
| `edges/*.md` | Directed connections between places. Flat files only. |
| `features/*.md` | Overlay: product features. Read from the overlay slice on. |
| `journeys/*.md` | Overlay: ordered user journeys. Read from the overlay slice on. |
| `README.md` | Optional survey for humans and the worker. Not a graph file. |
| `map.html` | Rendered view. Disposable; rebuilt from the Markdown. |
| `map.json` | Optional model dump. Disposable. |
| `job` | One line: the id of the last job `tick` started. |

The generator reads only `*.md` directly inside the graph directories. It ignores subdirectories and every other file. The file name is the id plus `.md`; dots stay in the name (`nodes/alice.runtime.md`). A missing file is a gap. Nothing invents it.

## Front matter

Each graph file starts with YAML between two `---` lines; the first line of the file is `---`. Scalars, `null`, and block lists (`- item`) only. No block scalars (`|`, `>`).

Common required fields: `schema` (`architecture-map/1`), `kind`, `id`, `project`, `title`, `status`. Optional: `sources`, a list of paths relative to the project root. Unknown keys are kept as metadata.

| Kind | Directory | Required beyond common | Notes |
| --- | --- | --- | --- |
| `plant` | `nodes/` | `parent: null` | Exactly one per project. Optional **new** `revision`. |
| `module` | `nodes/` | `parent` | A code or host boundary. Parent is a place id in the same project. |
| `edge` | `edges/` | `from`, `to`, `relation` | Directed. Never a `contains` edge: `parent` stores containment. |
| `feature` | `features/` | **new** `touches` | Overlay. Not a place and not a block. |
| `journey` | `journeys/` | **new** `steps` | Overlay. Not a place and not a block. |

**`revision`** (plant, new): the full 40-hex commit the dataset describes. It is the watcher's cursor; there is no other cursor file. The worker writes it last, after the dataset is consistent at that commit. A plant without `revision` has never been refreshed.

**`touches`** (feature, new): a non-empty block list of module ids. It is the only way a feature lights places. An edge with a feature at either end is dropped with a diagnostic. Never derive `touches` from Git history, branch diffs, or commit messages; it is written from the feature's own sources and the code it names.

**`steps`** (journey, new): an ordered block list of at least two place ids, read as "the action crosses these places in this order". The body says what happens at each step. Steps do not create edges.

`status` is `ready` (matches the cited sources), `partial` (true but incomplete; the body names the gap), or `stub` (id reserved; the body claims no behavior). Do not mark `ready` when a cited source was not read.

A trailing body line `owner: <name>`, alone on its line, is metadata, not prose.

## Identifiers and relations

Ids are lowercase ASCII, start with a letter, and use `.` between segments of letters, digits, or `-` (no leading `-`). Unique inside one project. A rename is a new id plus removal of the old file; never keep two ids for one thing.

| Relation | Meaning |
| --- | --- |
| `depends-on` | Build or import dependency. |
| `hosts` | A host process starts or holds the target. |
| `calls` | A request, IPC call, or HTTP call. |
| `implements` | The source fulfills a target seam. |
| `generates` | A generator writes a consumer artifact. |
| `reads` | The source reads data it does not own. |
| `writes` | The source writes data the target owns. |
| `composes` | The source wires the target and does not own it. |

A negative fact stays in prose ("The runtime does not depend on the adapter crate"). A feature gate stays in the edge body. Dependency arrows and runtime-call arrows are different relations; do not merge them.

## Wording

Present tense, active voice, one idea per sentence, under 25 words. No contractions, no marketing words, one name for one thing. Name the owner of each authority and what a place does not own when the source says so. Never describe a wish as a fact: a landed design, a planned edge, or a rejected transport is prose with its status, not a solid edge. Cite `spec/` for intent and code for behavior. The body is the description; do not repeat the title or copy the edge list into a node.

## `limen picture build`

Deterministic and offline. Reads the dataset, writes one self-contained HTML file that works from `file://` with no network. Never calls a model. Diagnostics (dangling edge, unknown parent, bad id, unknown touch or step, and so on) are listed in the view and on stderr; `--strict` exits 1 on any error diagnostic, otherwise the map still renders. The header names the plant `revision` and, when the project's current `HEAD` differs, says the map is behind and names that commit.

The view opens on the whole plant (top-level places and edges lifted between them), drills into a place, deep-links by `#<id>`, searches by id and title, and shows each place's body, sources, and edges. Partial and stub places look incomplete. Overlay features and journeys light their listed places on hover or selection and never otherwise.

## `limen picture tick`

One pass, meant for an operator timer or a coordinator by hand. No loop, no intervals. The tip is the project root's `HEAD`; the cursor is the plant `revision`.

1. No plant file or no `revision`: print one line saying the first picture starts by hand. Never spawn. The initial map is a coordinator decision.
2. `revision` equals `HEAD`: silent.
3. Diff `revision..HEAD` by path and status. Drop the dataset directory, `spec/`, `docs/`, `.agents/`, and root-level `*.md` first; dropped paths never count, even when cited. A remaining path is relevant when it was added, deleted, or renamed, or when it was modified and some node or edge `sources` entry names it exactly or as a directory prefix.
4. Nothing relevant: silent. No model call. Spec-only, docs-only, and picture-only changes end here.
5. `job` names a live job, or a job whose recorded base is `HEAD`: one line, no spawn. One tip is attempted once.
6. Engine, provider, model, or reasoning flag missing: one line naming the relevant paths, no spawn. There is no package fallback model for the watcher.
7. Otherwise spawn one detached picture job with those flags and record its id in `job`. The handoff names this contract's absolute path, the dataset's absolute directory, both commits, and the relevant paths.

`--dry-run` prints the decision and never spawns. The watcher never commits, merges, lands, or blocks anything, and the map's own files can never trigger it.

## The picture job

The role prompt (`templates/picture.md`) holds the judgment. The contract holds these limits:

- Edit only the dataset directory named in the handoff, at its absolute path. Commit nothing to the repository.
- Read source at the named commit. Follow each relevant path to the place that owns it and one hop beyond. Update only the affected places, edges, features, and journeys; leave stable prose alone.
- Place every structural change or name it as a gap in the plant body. Never drop an unplaced path silently.
- Run `limen picture build --dir <dataset>` and fix error diagnostics. Write `revision` last.
- The final message says what moved on the map, or that the shape did not move, and names any gap.
