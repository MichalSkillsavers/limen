# Synthesis · F757 feature timeline

**Recommendation:** one dated `timeline` list on the map feature file, under one `decision` line and one `open` list, opened at the newest entry. Each entry carries its own places and evidence. One click on an entry opens its full detail and lights its places on the map.

Group `8e0de595-4780-4b66-829e-ea30b91f1032`, four teams, all eight members done. Nothing is merged.

## Where the evidence is

Screenshot paths below are relative to `shots/`. The shared copies are in `<limen root>/.limen/groups/8e0de595-4780-4b66-829e-ea30b91f1032/shots/`. Each team also committed its copies under `group/shots/team-N/` on its coordinator branch.

| Team | Approach | Coordinator branch | Tip | Sample |
|---|---|---|---|---|
| team-1 | Place order (`steps`) | `limen/2026-10-04-f757-feature-timeline-team-1-coo-75908797` | `c898577` | `sample-team-1.html` |
| team-2 | Decision history (`decisions`) | `limen/2026-10-04-f757-feature-timeline-team-2-coo-6d45ddef` | `f3236f6` | `sample-team-2.html` |
| team-3 | Was / Now / Next strip | `limen/2026-10-04-f757-feature-timeline-team-3-coo-2c3f13b7` | `9e5170a` | `sample-team-3.html` |
| team-4 | Dated marks with kinds (`marks`) | `limen/2026-10-04-f757-feature-timeline-team-4-coo-b08492b4` | `de2a8a0` | `sample-team-4.html` |

Each sample is at `spec/features/active/F757-feature-timeline/` on its branch. Read one with `git show <branch>:spec/features/active/F757-feature-timeline/sample-team-N.html > /tmp/sample.html`.

## How the four compare

| Question a reader asks | team-1 steps | team-2 decisions | team-3 strip | team-4 marks |
|---|---|---|---|---|
| Which rule stands now? | Yes, decision line (`team-1/12`) | Only by reading every entry; off screen at 30 entries (`team-2/19`) | Yes, Now column (`team-3/15`) | Yes, decision line (`team-4/02`) |
| What changed, and when? | No (`team-1/11`) | Yes, dated entries (`team-2/02`) | No dates (`team-3` risks) | Yes, dated marks (`team-4/04`) |
| Which places does each decision touch? | One place per step, no time | Several places per entry (`team-2/02`, `team-2/13`) | One shared row, not tied to a column (`team-3/09`) | One ref per mark (`team-4` risk d) |
| What is still open? | Open list (`team-1/05`) | Cut (`team-2/16`) | Lines in Next (`team-3/14`) | Open marks (`team-4/07`) |
| Does it hold for a long history? | Not tested past five | Opens at the newest entry (`team-2/19`) | Fixed size | Opens at the oldest; newest and open marks off screen (`team-4/18`) |
| Does it say board state? | No | No | Yes, until a column rule was added (`team-3/15`) | Yes with `shipped`, fixed by `changed` (`team-4/04`) |

**Verdict:** team-2's dated entries with their own places are the axis, because they are the only form that shows what changed, when, and where in one row. They need two pieces back from team-1 and team-4, because `team-2/19` and `team-4/18` show that a long history pushes the standing rule and the open questions off screen.

## Recommended file shape

The keys are in the front matter of the map feature file (`features/<id>.md`). The model writes every value. `limen picture build` splits each `timeline` item on ` · ` only and never reads the text.

| Key | Type | Required | What the build does |
|---|---|---|---|
| `decision` | One double-quoted string | No | Copies it. A missing key shows "Decision not written." |
| `open` | Block list of double-quoted strings | No | Copies it. `open: []` shows "None." A missing key shows "Not written." |
| `timeline` | Block list of double-quoted strings, oldest first: `"YYYY-MM-DD · text · place-id place-id · evidence-path evidence-path"`. The last part is optional. | No | Splits each item on ` · ` into 3 or 4 parts. Reports `feature.bad-field` for another part count, a bad date form, empty text, or a date older than the item before it. Reports `feature.unknown-touch` for an unknown place id and `source.missing` for a missing evidence path. |
| `touches` | Block list of place ids (unchanged) | Yes | Unchanged. It also reports a warning for a `timeline` place that is not in `touches`. |
| `sources`, body | Unchanged | — | Unchanged. |

Example, from team-2's checked values, with the two kept pieces added:

```yaml
decision: "Cloud is one switch on a Mac, off by default. A browser tab keeps only its own Local or Private choice."
open:
  - "What happens to a held Stop at switch-off is not decided (switch spec, open decision 3)."
timeline:
  - "2026-09-15 · Desktop Enable Cloud stores a remembered Cloud default in the Account. · alice.account.session alice.client.ipc alice.client.ui · spec/features/dropped/2026-09/F780-cloud-opt-in-default/ticket.md"
  - "2026-09-28 · The one switch replaces the remembered Cloud default. The Account Cloud preference goes away. · alice.account.session alice.client.ipc alice.client.ui · spec/features/dropped/2026-09/F780-cloud-opt-in-default/outcome.md"
```

**Writing rules for the picture job** (prose rules, not code):

- **Quote every item.** An unquoted ` #` cuts the line with no error (`team-2/15`).
- **Date from Git.** Use the date of the commit that set the decision text, not the date of a board move (team-2 "Where the entries come from").
- **No state words.** Never write shipped, landed, active, planned, or dropped. A reversal is a newer entry whose text says what it replaces (`team-2/06`, `team-4/04`, `team-3/15`).
- **Most specific place.** When no place holds the code, name the containing place, and put the file in the evidence part (`team-2/12`).

## What the map shows first

1. **Feature bar.** The existing line "Cloud choice · 3 of 3 places visible" (`team-2/03`).
2. **Decision line** above the axis (`team-1/12`, `team-4/02`).
3. **Open list** under the decision line, only when it has items (`team-1/05`).
4. **Dated axis.** Oldest on the left, newest on the right. The view opens scrolled to the newest entry (`team-2/19`). Each entry shows its date, its full text with no clamp (`team-2/06`), and one mark for each of its places (`team-2/02`).
5. **Map** under the axis, lit by `touches` while no entry is open (`team-2/04`).

## What one click opens

| Click on | Opens |
|---|---|
| **An entry** | The side panel shows the date, the full text, its places, and its evidence paths. The map lights only that entry's places (`team-2/08`, `team-2/13`, `team-2/14`, `team-2/18`). |
| **A place mark** | The existing place detail. The axis stays, and Back returns (`team-2/09`, `team-3/10`, `team-1/02`, `team-4/08`). |
| **"Description, places and sources"** | The feature body, the `touches` list, and the sources. It is closed by default (`team-2/05`, `team-3/08`). |

## Kept pieces

| Piece | Screenshot | What it showed |
|---|---|---|
| Dated entries with their own places | `team-2/02` | Each entry has its own marks, so a reader sees which place belongs to which decision. |
| Full entry text, no clamp | `team-2/06` | The clamp hid "replaces the remembered Cloud default". Without that text, the 09-15 rule looked current. |
| Decision line | `team-4/02` | Without the line, the old F780 mark read as current (`team-4/01`). With it, the standing rule is clear. |
| Decision line for long histories | `team-2/19` | At 30 entries, the standing rules were off screen and nothing named them. |
| Open list | `team-1/05` | Without it, the axis read as a closed flow. The held Stop question changes the decision. |
| Open at the newest entry | `team-2/19`, `team-4/18` | team-2 opened at the newest entry and showed it fully. team-4 opened at the oldest, and the newest marks were off screen. |
| Feature bar | `team-2/03` | Without it, nothing on the axis named the feature (`team-2/02`). |
| Map lit by `touches` | `team-2/04` | A mark gives a place title, but not where the place sits. |
| Open entry lights its own places | `team-2/13` | In `team-2/08`, the map still lit `touches`, not the open entry's places. |
| Build reads `timeline` | `team-2/15` | The build reported a cut item, a typo id, and a wrong path. A viewer-only split would drop them with no sign. |
| "Not written" differs from "None" | `team-1/14` | A missing `open` key and `open: []` show different text. |

## Cut pieces

| Piece | Screenshot | What it showed |
|---|---|---|
| F756 four-field panel | `team-2/01`, `team-1/00` | The reader had to read the full panel to see one rule. Evidence ran below the fold. |
| Separate `evidence` key | `team-1/06` | Items repeated the effect lines with a path in front. Each entry now carries its own evidence. |
| Status badge | `team-1/07` | `partial` said less than the open list. |
| Place ids under marks | `team-1/09` | The title was enough. The id is in the place detail. |
| Feature `sources` on the first view | `team-1/10` | A path list with no claim did not help the decision. |
| Feature body on the first view | `team-1/11`, `team-2/11`, `team-3/08`, `team-4/10` | In all four teams, the body still said `set_cloud_enabled` checks revision. Alice deleted that function in `73b45e69b`. |
| Place-order axis (`steps`) | `team-1/11`, `team-1/15` | No history. For a feature with no single action, the numbers read as one run that the code does not have. |
| Was / Now / Next strip | `team-3/03`, `team-3/09` | The strip alone named no places. The added marks were not tied to a column, and the strip had no dates. |
| Kind words (`decided`, `replaced`, `changed`) | `team-4/04`, `team-4/02` | `shipped` restated board state. Once the decision line was there, the text of a newer entry was enough to show a reversal (`team-2/06`). |
| Mute older entries by position | `team-2/07` | It also muted 09-27 "Cloud is one switch", which still stands. |
| Open questions on the axis | `team-2/16`, `team-4/06` | An undated slot at the axis end clipped the oldest entry and had no places. Two homes for open questions confused the reader. |
| Touches row on the axis | `team-4/05` | Its places already showed as entry marks. |
| Legend | `team-4/01` | Each card already printed its meaning. |

## Open

- **No count of hidden entries.** At 30 entries, nothing says how many entries are off screen to the left (`team-2/19`). No screenshot shows that a reader needs the count to decide.
- **Refresh.** `limen picture tick` ignores `spec/` paths, so a new decision in a spec does not refresh `timeline` (`src/project/picture-tick.ts:136`). This needs an owner choice.
- **Drift.** The body, `timeline`, and `decision` can disagree on one screen. The build must not compare them, because that reads prose.
- **Coarse places.** The Alice map has no place for `crates/alice-sync` or `src-tauri/src/cloud_sync*`. A switch entry names the containing place, `alice.desktop`, and its body does not explain the switch (`team-2/12`).
- **No combined sample.** No team built this exact shape. `sample-team-2.html` (team-2 branch) is the closest base: it already has the real viewer path, the build reader, per-entry places, and open-at-newest. It does not have the decision line or the open list. team-1's sample shows those two pieces.
- **Not tested:** dark theme, narrow width, keyboard use, and a real history longer than six entries.
