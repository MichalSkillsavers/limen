# Outcome

Limen now ships a reusable architecture picture. The rules are in `templates/picture/CONTRACT.md`. `limen picture build` renders a gitignored Markdown dataset of places and edges into one offline `map.html`. Features and journeys appear in a list beside the map and light only the places named in their `touches` or `steps`. `limen picture tick` is one quiet pass that starts a detached refresh only when files were added, deleted, or renamed, or a cited source changed. The base landed as `07a9c6b` and the overlay as `cf68cd4`, with no independent review per Adam's choice. The full check passed 531/531, and the browser and packed-tarball proofs passed. The retained evidence is in the gitignored `tmp/evidence/f743-overlay-smoke-4d003dc/`.

The live proof ran on Limen itself. Opus drew the first map by hand at `ac3edbe`. A real tick then started exactly one refresh job (`2026-10-03-architecture-picture-through-cf6-bad3beb1`), which stamped `cf68cd4` and committed nothing. A repeat tick while that job ran created no job. A tick after a README- and board-only commit (`5f11119`) printed nothing and called no model.

The next reader should know two gaps:
- **Limen dataset:** it has no features or journeys yet; overlay lighting is proven only on an explicit fixture.
- **Alice gold dataset:** it predates `touches`, so its 14 features now report `feature.missing-field` and its 38 feature edges are dropped with warnings. Adding `touches` lists, plus the places and journeys, is Alice plant work.
