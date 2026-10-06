---
touches:
  - limen.plant
opened: 2026-10-05
---

# F773 · One ordered list of specs that brings Limen in line with its styleguide and vision

## Outcome

Adam gets one ordered, prioritized list of specs. Each spec fixes a real gap between this repository and its own rules: the styleguide, the vision, and the speech register. The list covers vision misalignment, cold operator-facing text, code organization, and code readability. Each spec cites file paths, line ranges, and a short quote. Johnny asked for this on 2026-10-05 for Adam. This feature produces specs only. No code lands.

## Scope

- Four teams scan this repository from distinct starting hypotheses. The brief and the team notes give the rules.
- Sources of truth: `.agents/limen/styleguide.md` (primary), `spec/vision.md`, and the voice and practice rules in `templates/agents.md` and `templates/communication.md`. `templates/styleguide.md` is the blank template for other projects.
- Scan areas: `src/`, `hook/`, `bin/`, `templates/`, `docs/`, `README.md`, CLI help, error and status output.
- Each team writes one result file of candidate specs with evidence.
- The lead deduplicates and writes one ordered list in `group/synthesis.md`.

## Out of scope

- Changes to product code, tests, templates, docs, the board, or `spec/vision.md`. Members only write notes on their own job branch.
- Landing or pushing any team branch. Implementing any spec.
- F771 (the OMP Claude bridge) and its jobs.
- A rewrite to match a model's default taste. The bar is subtraction, unification, and clarity.

## Acceptance

- `group/synthesis.md` holds one ordered list of specs.
- Each spec has a product-facing title and a one-line what and why.
- Each spec has a priority: P0 (blocks clarity or correctness), P1 (high value), or P2 (polish).
- Each spec has an order position and names its dependencies with a reason.
- Each spec has a scope hint (docs, code, or both) with paths.
- Each spec cites one to three file paths with line ranges from the team results.
- No two specs cover the same change.
- No product code, test, or template changes on `main`.
- Plain technical English (about 80% of ASD-STE100).
