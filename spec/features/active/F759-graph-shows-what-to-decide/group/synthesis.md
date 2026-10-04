# Synthesis · F759 graph shows what to decide

**Recommendation:** the first view is the infrastructure graph with no side panels, one search box, and at most five numbered question pins. Under the graph are five lines, one per question: number, raised date, question text, and a count of changes at its places since that date. The model writes the questions in one `asks` list on the plant file. One click on a pin or a line opens that question's places and evidence.

Group `5b93adfb-d35d-4852-8902-4dc1a3f40f10`, four teams, all eight members done. Nothing is merged.

## Where the evidence is

Screenshot paths below are relative to `shots/`. The shared copies are in `<limen root>/.limen/groups/5b93adfb-d35d-4852-8902-4dc1a3f40f10/shots/`. Each team also committed its copies under `group/shots/team-N/` on its coordinator branch.

| Team | Approach | Coordinator branch | Tip | Sample |
|---|---|---|---|---|
| team-1 | Attention line on place cards | `limen/2026-10-04-f759-graph-shows-what-to-decide--d63d1af3` | `9f01321` | `sample-team-1.html` |
| team-2 | Search is the first view | `limen/2026-10-04-f759-graph-shows-what-to-decide--040b456c` | `6e04890` | `sample-team-2.html` |
| team-3 | Time window as a filter | `limen/2026-10-04-f759-graph-shows-what-to-decide--98845823` | `e2b3fbb` | `sample-team-3.html` |
| team-4 | Owner questions pinned on the graph | `limen/2026-10-04-f759-graph-shows-what-to-decide--718d8091` | `059236e` | `sample-team-4.html` |

Each sample is at `spec/features/active/F759-graph-shows-what-to-decide/` on its branch. Read one with `git show <branch>:<path> > /tmp/sample.html`.

## The finding all four teams share

**A number does not name a decision.** Counts, heat, recency glow, and a time window show where work happened, not what the owner must decide:

- team-1 `03-real-269-count-only.png`: three bright places with counts, and no question.
- team-3 `01-real-range-only.png`: the default week lights 10 of 11 top places.
- team-3 `03-real-range-count.png`: the counts rank churn, not decisions.
- team-2 `06-glow-on-empty-real.png`: every top place glows.
- team-4 `01-five-pins-first-view.png`: pins say where, not what.

**A model-written line that names the decision lets the owner pick with no click:**

- team-1 `04-label-on-first-view.png`.
- team-4 `03-question-lines-first-view.png`.

So time is the second signal on the first view, not the first.

## How the four compare

| Question the owner asks | team-1 attention | team-2 search | team-3 window | team-4 asks |
|---|---|---|---|---|
| What must I decide? | Yes, line on the card (`team-1/04`) | No cue with an empty box (`team-2/02`, `team-2/07`) | No (`team-3/03`) | Yes, line under the graph (`team-4/03`) |
| Where does it sit? | One place per line | Only after a typed word (`team-2/03`) | Every place lights (`team-3/06`) | Pins on 2 or 3 places per question (`team-4/03`) |
| Has work moved past it? | Count since raised date (`team-1/14`, `team-1/15`) | One date per file; no count (`team-3/09`) | Count in the window (`team-3/15`) | Mock only (`team-4/11`) |
| Does it hold at 200+ changes? | Yes up to 7 places (`team-1/coo-04`); not at 11 (`team-1/12`) | Broad words overflow (`team-2/11`) | Window still lights everything (`team-3/06`) | Yes; no change reaches the first view (`team-4/05`, `team-4/06`) |
| Does the build only read? | No, it runs Git | Yes | Yes | Yes |

**Verdict:** team-4's `asks` list is the base, because:

- **Volume:** it is the only first view that stays the same at any change volume (`team-4/05`, `team-4/06`).
- **One line per question:** a question that spans several places shows once, not once on each card (`team-4/03` compared with `team-1/14`).
- **Read-only build:** the build only reads the list.

One piece comes back from team-1 and team-3: the count of changes since the raised date, because `team-4/09` shows that a stale question gives no sign.

## Recommended primitives

| Key | Where | Type | What the build does | What the graph shows |
|---|---|---|---|---|
| `asks` | Plant file front matter, `nodes/<plant>.md` | Block list of double-quoted strings, most important first: `"YYYY-MM-DD · question · module-id module-id · evidence-path"` | Splits on ` · ` only. Reports `plant.bad-ask` for a wrong part count, a bad date, an empty question, no place, a bad id, or more than one evidence path. Reports `plant.unknown-ask-place` for an unknown id and `source.missing` for a missing path (team-4 test in `test/picture-overlay.test.ts`). | A numbered pin on each named place, or on its nearest visible container. One line per ask under the graph. Only the first five. |
| `changed` | Place and edge front matter, `nodes/*.md` and `edges/*.md` | Block list of `"YYYY-MM-DD"` strings, one per change day, last 90 days (team-3 writing rule) | Reads and checks the dates. Never reads Git. | Nothing by itself. It feeds the count on each question line: dates at the ask's places on or after the raised date. |
| `sources`, `revision` | Unchanged | Unchanged | Unchanged | Evidence in the detail. The "Behind HEAD" text in the header. |

**Writing rules for the picture job** (prose, not code):

- **One question per item.** Name the options in the question.
- **Few places.** Name the fewest places, at most five per ask (`team-4/10`).
- **Raised date from Git.** Use the date of the commit that raised the question.
- **Remove answered asks.** Remove an ask when a later change answers it.
- **Keep the list short.** Put the most important ask first, because list order sets the pin number.

## What the first view shows

1. **Header:** one search box and the map revision text, "Snapshot … HEAD … Behind HEAD" (`team-4/15`, `team-1/14`).
2. **Graph:** the top level with its connections, no left panel, no right panel, fit to 1440 × 900 with no scroll (`team-4/coo-01`, `team-1/coo-01`, `team-3/coo-01`, `team-2/coo-01`).
3. **Pins:** at most five numbers, on the places each question names (`team-4/03`).
4. **Question lines:** under the graph, one per pin: number, raised date, question, and "N changes since" (`team-4/03`, plus the count from `team-4/11`).
5. **Overflow line:** "N more questions not pinned", only when the list has more than five (`team-4/06`).
6. **Unread line:** "N questions could not be read", only when the build dropped an item (`team-4/13`).

## What one click opens

| Click on | Opens |
|---|---|
| **A pin or a question line** | A detail panel with the question, raised date, places, evidence path, and the changes at those places since the raised date. The question's places are revealed across collapsed containers and lit. The level fits the screen (`team-4/04`, `team-4/coo-03`, `team-1/16`). |
| **A place** | The existing place detail (`team-2/04`, `team-3/13`). |
| **The unread line** | The map notes, with the reason and the file line (`team-4/14`). |

## Kept pieces

| Piece | Screenshot | What it showed |
|---|---|---|
| Graph with no side panels | `team-4/00` vs `team-4/03`; `team-2/01` vs `team-2/02` | The panels took 632 px and held lists, not a question. Without them, the graph gets the full width. |
| Question text on the first view | `team-4/01` vs `team-4/03`; `team-1/03` vs `team-1/04` | With pins or counts only, the owner could not pick. With the text, the owner picked with no click. |
| Numbered pins on the graph | `team-4/03` | Each question sits on 2 or 3 places. Several pins on one place show where questions meet. |
| Raised date on each line | `team-4/03` | It is the date anchor for the count. A refresh keeps it. |
| Count of changes since the raised date | `team-4/09` vs `team-4/11`; `team-1/15` | Without it, a question raised before 10 later changes gave no sign. With it, the stale question stood out. Anchored at the raised date, the count survives a refresh. |
| Cap of five, with an overflow line | `team-4/06`, `team-4/08`, `team-1/12` | At 42 asks, the first view stayed readable. At 11 attention places, team-1 hit the scale floor and cut a row. |
| Line for an unread question | `team-4/12` vs `team-4/13` | Without it, a dropped question vanished, and the remaining lines renumbered with no sign. |
| Height fit after a click | `team-4/02` vs `team-4/04`; `team-3/05` vs `team-3/13` | Without it, the revealed level ran past 900 px. |
| Search | `team-2/03` | One narrow word lit 5 places across containers. No screenshot shows that the owner needs search to pick a question (`team-1/08`), but it reaches places and asks past the fifth. |
| "Behind HEAD" header text | `team-1/14`, `team-4/13` | It is the only sign that the questions predate the newest changes. Not cut-tested. |

## Cut pieces

| Piece | Screenshot | What it showed |
|---|---|---|
| Left Explore panel and right Details panel on first load | `team-4/00`, `team-2/01` | Lists, not a question. |
| Level heading, map key, status badges | `team-4/00` vs `team-4/01`, `team-2/03` | They did not help pick a question. |
| Selection bar | `team-4/02` vs `team-4/04` | It repeated the question and pushed the graph down 40 px. |
| Map notes button | `team-4/12` | Its count mixed one lost question with 11 missing-source warnings. The unread line replaces it. |
| Attention text on place cards | `team-1/14` vs `team-4/03` | A question on 2 or 3 places would repeat on each card. The text clamp also hid an option (`team-1/04`). |
| Counts on places without a question | `team-1/05` | Dim places with counts 44 and 32 outranked the bright question place with 25. |
| Total line ("269 changes … 3 places need a decision") | `team-1/07` | The pick worked without it. |
| Time window filter and range slider | `team-3/01`, `team-3/06`, `team-3/15` | The window lit 10 or 11 of 11 top places. A static label was as good as the slider. |
| Heat tint by count | `team-3/02`, `team-3/07` | Client (56) and Runtime (54) looked the same, and the middle band could not be ranked. |
| Recency glow | `team-2/06` | Every top place glowed, so nothing stood out. |
| Search as the first view | `team-2/02`, `team-2/07`, `team-2/11` | An empty box gave no cue. A broad word lit 33 places and ran off the screen. |
| Search dropdown list | `team-2/05` | It covered the heading and lit nothing on the graph. |
| One `changed` date per file | `team-3/09` | The hottest place counted as 1, the same as a place with one change. |

## High-volume result

- **team-4 probe:** 240 synthetic changes (`team-4/05`). Same first view as the real sample.
- **team-4, 42 asks:** five pins, five lines, and "37 more questions not pinned" (`team-4/06`).
- **team-1 real range:** 269 commits at places. The first view showed three cards (`team-1/03`).
- **team-3 real week:** 915 commits (`team-3/coo` check).

The recommended first view does not grow with change volume. Only the per-question count grows.

## Open

- **No combined sample.** No team built pins, question lines, and a count in one page. `sample-team-4.html` is the base. The count is a page-script mock in `team-4/11`. team-1 built a count at build time in `sample-team-1.html`.
- **Where Git is read.** team-1 computes the count in the build with `git log`. That breaks "the build only reads". team-3's route keeps the build read-only, but the model writes about 3,402 dates on Alice on each refresh (`team-3/10`). Recommended: team-3's route, because it matches the ticket. This is an owner choice.
- **Manifest churn.** Both routes count changes to `Cargo.toml` and `package.json` (`team-1/02`). A count says that work moved, not that the question is answered.
- **Hidden asks.** Asks past five are counted but reachable only by search, and no team built search over ask text (`team-4/06`).
- **Wide asks.** An ask on 24 places overflows the detail view (`team-4/10`). The five-place limit is a writing rule. The build does not check it.
- **Stale hover tip.** After a pin click, a connection tip stays over the graph (`team-4/coo-02`). It is not fixed.
- **Small text.** The 0.7 scale floor gives small titles after a reveal (`team-4/04`, `team-1/coo-04`).
- **Contract text.** `templates/picture/CONTRACT.md` still describes the Explore list beside the map, and it has no `asks` or `changed`.
- **Not tested:** dark theme, narrow width, keyboard use, and a real picture job that writes `asks` and `changed`.
