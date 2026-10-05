# F776 · The test suite is smaller and still guards every real product seam

## Outcome

Today the test suite is larger than the code it tests: about 52 files and 17,500 lines, against about 9,600 lines in `src/`. Adam saw this in the complexity map and wants the dead weight gone. After this change, the suite has fewer tests and fewer lines. It still catches real regressions in spawn, land, watch and steer, wakes, groups, the GitHub poller, publication, and status kinds. It also runs faster and fails less often under load.

## Scope

- Judge each file in `test/` as keep, shrink, or delete.
- Cut duplicate coverage of one behavior. Keep the stronger, end-to-end test.
- Cut implementation trivia: constant pins, error-string shapes with no product meaning, argument-count checks.
- Cut wording freezes, or shrink them to the fact the contract needs.
- Cut timing and sleep tests that fail under load and protect no contract that another test does not already protect.

## Out of scope

- Changes to `src/`, `hook/`, `bin/`, or `templates/`.
- New tests, new test helpers, or a new test framework.
- Weaker assertions in the protected seams listed below.

## Acceptance

- `test/` holds fewer files and fewer lines than before. The final note names both counts.
- Each protected seam keeps at least one test: publication, wake text, watch and steer over the OMP route, blocked-job and other status kinds, group start safety, GitHub poller trust, and land with a dirty target.
- `npm run check` passes: typecheck, Biome, and the full test suite.
- No timing test that fails only under load remains, or the final note names it and says why it stays.

## Notes

- Prefer whole-file deletion over small edits inside a test.
