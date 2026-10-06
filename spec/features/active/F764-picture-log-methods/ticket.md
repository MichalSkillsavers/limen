---
touches:
  - limen.picture.viewer
opened: 2026-10-05
---

# F764 · Proven methods make picture logs clearer and stay simple

## Outcome

A person reads the picture log in seconds and knows what changed, what matters, and what needs a decision. An agent reads only the lines it needs. The shape comes from a proven method (military reporting, incident practice, or a small mix). The shape stays simple: one line grammar, few keys, few controls.

The page can move away from the graph toward a mixed style (list first, small map, or map first) when a screenshot proves that the change helps. Adam still prefers Map-with-time (F759) and question pins with a keyed log (F759 / F763 team-4) over a timeline-only page.

## Start from

- F763 results and samples. They are on the F763 team branches (read with `git show`):
  - team-1 `limen/2026-10-05-f763-picture-log-clarity-team-1--4affa264`: day log column, `log/YYYY-MM-DD.md`, about 12 parents per day.
  - team-2 `limen/2026-10-05-f763-picture-log-clarity-team-2--b63fa1fb`: severity dots, "High only", day tally. Finding: severity inflation breaks the skim. A written severity rule is necessary.
  - team-3 `limen/2026-10-05-f763-picture-log-clarity-team-3--03db7204`: nested detail, about six parents per day, parent mark = highest child mark.
  - team-4 `limen/2026-10-05-f763-picture-log-clarity-team-4--f1f549de`: question pins and a keyed `log.md`. Explicit keys beat place links.
  - Each branch has `spec/features/active/F763-picture-log-clarity/group/teams/team-N-result.md` and `sample-team-N.html`.
- F759 synthesis: `spec/features/active/F759-graph-shows-what-to-decide/group/synthesis.md`.
- Adam's observational-memory example (F763 ticket): day header, severity mark, clock time, parent line, nested detail.
- Contract: `templates/picture/CONTRACT.md`. Viewer: `picture/viewer/`.

## Scope

- Each team tests one proven method (see `group/teams/`). Name the source of the method in one line and use only the parts that make the page clearer.
- Recommend one log/file shape (keys, where they live, types) and one first view.
- One self-contained HTML sample per team, opened from `file://`, on a `/tmp` copy of the Alice dataset.
- Playwright at 1440 × 900. Compare each first view against one F763 baseline shot.

## Simplicity bar (hard)

- One line grammar for an entry. At most 6 parts in an entry line.
- At most 2 page controls in the first view.
- A first-time reader knows what the first view says in 5 seconds, with no legend longer than one line.
- No new change-tracking system. No code that reads the meaning of prose. No per-feature app code.
- Each team writes a cut list: what the method offered and what the team cut, with a screenshot.

## Out of scope

- Edits to the live Alice map or any `.limen/picture/` dataset.
- Landing on `main`. Merging F757, F759, or F763 branches.

## Acceptance

- One recommended method (or a mix of at most two) with its source named.
- One log/file shape: each key, where it lives, its type, and what the page shows for it.
- One first view and one navigation path for a human and for an agent.
- One HTML sample per team that opens from `file://`.
- Each kept part and each cut names a screenshot path and what it showed.
- The lead synthesis compares the teams to the F763 baseline and picks one.
- Plain technical English (about 80% of ASD-STE100).
