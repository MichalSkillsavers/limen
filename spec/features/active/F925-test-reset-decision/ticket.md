---
touches:
  - limen.plant
opened: 2026-10-06
---

# F925 · Adam has a decision on how to reset Limen's tests to the few seams that matter

## Outcome

Adam gets one verdict on Limen's tests: full restart, staged replace, or deep cut. Today the tests are 17,094 lines in 58 files, against 11,434 lines of product code. A full run takes about 25 minutes, and some group timing tests fail at random under load. An earlier trim (F776) cut about 2,200 lines, and new features added them back. The verdict names the few seams that must never break, a target size, and a rule that stops the tests from growing back.

## Scope

- Score every test file: does it guard a real seam, or is it a mock, a copy of the code, a wording check, a timing check, or a duplicate?
- The real seams: spawn, the finish and wake path, steering and context injection, land, the spec keeper, and webhooks.
- Design the smallest test set from scratch: one scenario test per seam on a throwaway plant, plus a few unit tests for tricky logic.
- Argue the real risk of a full rip-out, and the fastest safe path.
- Start at `test/` and its Git history. The explainer pages in `~/Downloads` (roles and loop, spec structure, live picture) describe the seams.

## Out of scope

- Deleting, rewriting or adding tests in this run.
- Changes to `src/`, `hook/`, `bin/` or `templates/`.
- A new test framework or a CI service.

## Acceptance

- `group/synthesis.md` states one verdict with reasons and a numbered plan.
- The synthesis names the target line count, the target run time, the seam scenarios, and the anti-bloat rule.
- `group/findings/` holds a table that gives every file in `test/` one action: delete, rewrite into a scenario, or keep.
- `/Users/overment/Downloads/limen-test-reset.html` shows the verdict at the top, the seams, the size before and after, and the plan, in words a reader who does not read code can follow.
- `limen ticket check` passes on the landing branch, and the land leaves `test/` unchanged.

## Notes

- Adam, 2026-10-06 12:21: most tests are bloated and have no value; be strict, even if every test is ripped out and rebuilt. Agents rebuild fast, so "do not remove something you would have to rebuild" does not hold. "We are all about hacking away the unessential."
