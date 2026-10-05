# Brief

## Shared outcome

Scan this Limen repository against its own rules. Turn each real gap into an actionable spec. The lead merges all team results into one ordered, prioritized list. This is a read-only scan. No code lands.

## Sources of truth (read fully before any finding)

- `.agents/limen/styleguide.md`: code practice (Shape, Prefer, Avoid). This is the primary source.
- `spec/vision.md`: product principles and current direction.
- `templates/communication.md`: the speech register (Human, Agent, Specs). The styleguide does not govern speech; this file and the vision do.
- `templates/agents.md`: the shop manual. It defines practice and voice for coordinators and workers.
- `templates/quality.md`: the existing quality role. Its bar is subtraction and unification.
- `templates/styleguide.md` is the blank template that `limen init` gives other projects. Judge it as a shipped surface, not as a rule source.
- Prior findings: `spec/quality/2026-09.md` and `spec/quality/2026-09-2.md`. Do not repeat a finding that already landed. Check with `git log`.

## Scan areas

1. Vision misalignment: code, docs, or text that contradicts the styleguide or the vision.
2. Cold quality: operator-facing text that is cold, abrupt, jargon-heavy, or leaves the operator without a next step. Docs, CLI help, errors, status output, finish and board language, templates.
3. Code organization: a file with more than one job, a wrong module boundary, tangled control flow, two files that own the same decision.
4. Readability: compressed code, clever expressions, messy expressions, code that needs a clearer shape.

Each team starts from one area (see its team note). A team may report a finding in another area. Publish it first, so the owning team can use it.

## Rules

- Read-only scan. Do not change product code, tests, templates, docs, the board, or `spec/vision.md`.
- You may run commands that only read: `--help`, `limen jobs`, `limen status`, `limen planning`, `node --test` on one test file, `git log`, `git show`. Do not run a command that starts, stops, lands, prunes, closes, or sweeps a job. Do not run `limen init` in the canonical root. A disposable repository under `/tmp` is acceptable for error paths.
- Do not touch F771 (the OMP Claude bridge) or its jobs.
- Each finding cites a file path, a line range, and a short quote or example.
- Each finding becomes an actionable spec, not "improve quality". Name the change and the observable result.
- Each proposed change obeys the styleguide. Do not propose `utils.ts`, `types.ts`, barrels, enums, helper bags, classes, new runtime dependencies, new workflow state, or a rewrite to match a model's taste.
- Publish key findings with `limen group publish` as you find them. Read peer findings before you write a new one. If a peer already owns a finding, add your evidence to it in your result and reference the peer. Do not file a duplicate.
- The team coordinator owns `group/teams/team-N-result.md` and commits it on its own job branch. A worker commits its notes on its own branch. The coordinator reads them with `git show` and merges them into the result.
- Do not land. Do not push. Use only `anthropic/claude-opus-5-5`. Never use Cursor cloud agents.
- Plain technical English (about 80% of ASD-STE100). Short sentences, one idea each, active voice.

## Deliverable per team

`group/teams/team-N-result.md` with these parts:

1. **Coverage.** The files and commands you read or ran.
2. **Candidate specs.** One block per spec:
   - Title: what becomes true, in product words.
   - What and why: one line.
   - Priority: P0 (blocks clarity or correctness), P1 (high value), or P2 (polish).
   - Scope: docs, code, or both. List the paths.
   - Evidence: one to three `path:start-end` citations, each with a short quote.
   - Depends on: other specs, with a reason. Write "none" if none.
   - Rule: the styleguide, vision, or register line that the gap breaks.
3. **Checked and fine.** Places you inspected that need no spec.
4. **Peer overlap.** Findings you merged with another team's finding.

## Lead synthesis

The lead compares the four results and writes `group/synthesis.md`: one ordered list of specs. Each spec has a title, a one-line what and why, a priority, an order position with dependencies, a scope hint with paths, and one to three evidence citations. The lead merges overlaps into one spec. Nothing lands.
