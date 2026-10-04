# Synthesis

**Verdict:** both teams recommend the map feature file (`features/<id>.md`), not the ticket.

| Field | Key | Form |
|---|---|---|
| Decision | `decision` | One double-quoted string. |
| Effect | `touches` | Unchanged block list of module ids. A list of maps gave 4 × `feature.bad-field`. |
| Evidence | `sources` (team-2) or `evidence` list of `path symbol claim` strings (team-1) | Open choice. The build never parses the string. |
| Open | `open` | Block list of quoted questions; `[]` means nothing open; a missing key means not written. |

**Why not the ticket** (team-2, Alice HEAD `031646581`): no safe key from map feature to ticket; one feature crosses several tickets (F894, F783, F876, dropped F780); planned paths match one map place only.

**Gap:** the viewer drops list values from metadata, so `evidence` and `open` do not show today.

Branches (not merged): team-1 `limen/2026-10-04-f756-feature-decision-spec-team--6b5828e8` (`1f15a61`), team-2 `limen/2026-10-04-f756-feature-decision-spec-team--e5bbf4d3` (`e44e9e7`). Samples: `sample-team-1.html` and `sample-team-2.html` in this folder on those branches.
