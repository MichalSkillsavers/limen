# Build

## TRACK

- **Pi/OMP engines (Adam 2026-09-22):** one flag, one profile table, one wrapper, one unchanged parser; separate auth stores and same-engine continuation. This VPS plant coordinator owns the board and authorized main landings/pushes; Adam retains review ownership, with no independent reviewer. Live hosted OMP proof, doorbell, unusable-route, and restoring Claude were outside the engine slice.
- **Standing engine (Adam 2026-09-23):** new jobs default to OMP at runtime; `--engine` overrides `LIMEN_ENGINE`. Use `--engine pi` or `LIMEN_ENGINE=pi` only when Pi is required; continuation keeps the recorded engine, and old records without one remain Pi.
- **Standing models (Adam):** ordinary work, coordination, research, and quality use `openai-codex/gpt-6.1-sol` on OMP; simple / cheap tasks and UI-related work use `anthropic/claude-opus-5-5` on OMP. Pass engine/provider/model/reasoning explicitly; this supersedes the earlier GPT-6-Sol and Grok model choices.
- **Ops remediation lock 2026-09-10 (Adam):** two unsuccessful automatic wake attempts then deliberate recovery; park-and-preserve on quota — no silent model substitution. Named-job `limen watch <id>` for takeovers — not `watch --running`.
- **Finish proof (Adam):** HTTP ≠ bot turn. VPS-first, Johnny-only automatic finish proof is sufficient; an export hold is unobserved evidence, never absence of an actual turn; no Tony coordination.
- **Review and reasoning (Adam):** Adam reviews; no independent reviewer unless asked. Retain `xhigh` for coordination/research/quality and `high` for ordinary jobs. Research uses the research model above for both independent opinions; judge and picture use the ordinary model.
- **Collaborative groups (Adam 2026-09-29):** spec review by OMP `anthropic/claude-opus-5-5` at `xhigh` before implementation; ordinary model for implementation and one two-team live proof; commit and push only after native checks and observed collaboration pass, preserving work on quota failure.
- **Group boundary:** opt-in per feature, one owner-facing lead and landing owner, fixed team/total-worker allowances, separate candidate branches and informational peer messages; no recursive coordinators, cross-seat routing, automatic merge, or unrelated plant changes.
- **Group recovery:** bounded event waits and deadlines, no coordinator continuation or automatic roster repair, and stop preserves recovery work until explicit close.
- Reliable in-flight control on one seat; a laptop is a window; the GitHub App rings Alice's registered coordinator while two-seat routing remains unproved.
- Settled Herdr panes keep RUNNING jobs and stall warnings visible; external finish delivery remains per-project opt-in.
- Coordinator CPU is repaired without deleting history; job-history retention remains a separate operator decision.
- **Ops wave (Adam 2026-09-27, Johnny coordinating), in this order:** plate as inbox (F738) and doorbell dedupe on job + final state (F739) in parallel; then owner + land policy on the job with a non-blocking end-of-job spec nudge; then OMP finish wakes with `limen wait` refused under `LIMEN_COORDINATOR=1`; then quiet liveness. OMP only, never pi-claude; land each slice onto `main` when done, no extra review; never edit Alice `alice/` or `api/`.
- **Ergonomics wave (Adam 2026-10-02):** implement policy-accurate setup examples and naming, unique feature identities, root-aware Herdr role spaces, and subject-first status; finish existing reliability slices without rebuilding landed wakes or touching group branches.
- **Ergonomics boundary:** preserve the vision and owner review policy; no global Pi/OMP/Herdr configuration changes, external-service operations, or unrelated plant edits; context deduplication is explanation only.
- **Feature identity:** the parked application field-guide proposal is F743 (formerly misfiled as F050; see its former-address.md); F050 is the landed diff viewer.

## NOW

- `F014-github-doorbell` (🟠 ACTIVE): Alice's isolated App key, warm coordinator, live PR mention, hosted review, and one start/finish receipt are proven; second-seat ownership/routing remains to prove before closing.
- `F731-seat-bell-once` (🟠 ACTIVE): resume the preserved one-bell-per-event candidate on current main and finish native proof without re-enabling the paused seat sweep or sending external notifications.
- `F740-collaborative-groups` (🟠 ACTIVE): a live two-team hosted trial in Herdr (the sssnark game) produced two checked candidates, observed exchanges, and a landed synthesis. OMP lead identity is fixed on the branch. Still open: member `limen` path, advisory noise, and one duplicate lead delivery, plus the steering-test races and full native proof; not landed or pushed.
- `F741-omp-finish-wakes-herdr-coord` (🟠 ACTIVE, Adam priority): wake/wait implementation is on main at `39ec81b` and a live OMP job recorded a Herdr turn; finish retained-evidence and native checks with hosted OMP `anthropic/claude-opus-5-5` at `high`, Adam reviews, no independent reviewer, webhook remains opt-in.
- `F729-continuation-publication` (🟠 ACTIVE): publish continuation records safely against concurrent prune without adding workflow state.
- `F730-job-guidance-matches-engines` (🟠 ACTIVE): align engine evidence, setup-policy precedence, meaning-first naming, and existing command examples without changing the vision or global configuration.
- `F744-role-spaces-match-project-roots` (🟠 ACTIVE): select readable Herdr role spaces without confusing unrelated roots that share a basename; no new registry or human-space rearrangement.
- `F745-status-names-the-work` (🟠 ACTIVE): show coordinator subjects/handles and call cleanly ended unlanded work candidates to inspect, not proof of approval.

## NEXT

- `F728-hosted-engine-liveness` (🔴 PLANNED): Sequenced after root-aware role spaces (F744) because both touch the Herdr integration; reproduce the OMP fallback gap before changing recovery.

## PARKED

- `F081-spawn-refuses-an-unusable-route` (🔴 PLANNED): still waiting for a Pi-supported non-generating route probe. Rechecked installed Pi 0.84.2 on 2026-09-19: `auth check` still proves credentials only; model runtime has stream/complete, no exact-route validation. Failing candidate `b14b5fe` stays locked; no auth/catalog substitution. Hosted continuation file transport already landed.
- `F743-living-architecture-picture` (🔴 PLANNED): background field-guide proposal remains parked; the stale existing picture is recorded in the latest quality findings, not refreshed by this wave.

## DROPPED

- `F724-handoff-policy-has-one-home` (⚪ DROPPED): speech register already has no second handoff length or constraint rule; shop manual owns the full handoff. No code change.
- `F046-optional-speech-command` (⚪ DROPPED): optional `/speak` shipped, then removed at owner request. Removal `d45fed2`.

## PROVEN

- `F742-feature-identities-stay-unique` (🟢 PROVEN): feature numbers name one thing — parked field-guide proposal filed as F743; landed F050 diff viewer history untouched. Landed `7328a16`.
- `F739-doorbell-dedupe` (🟢 PROVEN): the finish ping claims once per job and final state, so jobs at the same commit each ring; a sender timeout gets one retry inside a 4 s budget. Landed `16939e1` with test-env fix `cf273fd`; focused 57/57 under `LIMEN_JOB=1`; live receiver turn unobserved.
- `F738-plate-inbox` (🟢 PROVEN): `limen status` is a one-screen inbox — Running, Ready to land, Needs a decision, older behind `--all`; ancestry or patch-id counts as landed, shared with `prune --retire`. Landed `39a22e1`; synthetic 2,000-record cabinet 1.7 s (was 64.9 s); live plate 4.7 s with Herdr.
- `F737-worker-skills-visible` (🟢 PROVEN): OMP workers discover portable and legacy plant skills without hand links; native skills win collisions. Landed `f40ac5b`; live hosted/detached/continue OMP and focused checks passed.
- `F736-plant-status-plate` (🟢 PROVEN): Job records, Git and Herdr show running work, unmerged branches and working coordinators across spaces; uncertain evidence stays explicit. Landed `e1a9d2f` / `fd267a5`; status 4/4 and live plate observed.
- `F735-finish-waits-for-owner` (🟢 PROVEN): Finished workers hand off to the landing owner; webhook `status: waiting` cannot be mistaken for Ready by a recipient ignoring new fields. Landed `83f8cd1` / `fd267a5`; intercepted sender and wake passed; external receiver turn unobserved.
- `F734-stalled-children-fail` (🟢 PROVEN): Verified idle or vanished tool children fail hosted/detached OMP/Pi jobs; uncertain identity raises an advisory. Landed `59cfb4e` / `fd267a5`; synthetic real-process liveness 7/7, live provider hang unproved.
- `F732-github-mention-front-door` (🟢 PROVEN): Authorized PR mentions reach one warm coordinator with bounded context; pending retry produced one hosted review start and terminal reply on Alice PR #10. Landed `a745289`, live repair `912f9e0`; focused 13/13.
- `F733-github-seat-doctor` (🟢 PROVEN): Root-managed Alice setup and `github doctor` passed with isolated App key, worker without sudo, root Node/Herdr, and active timer. Landed `f74a6b3`, live repair `912f9e0`; focused 13/13.
- `F727-pi-omp-interchangeable-engine` (🟢 PROVEN): Pi or OMP jobs use one profile table, wrapper, and unchanged parser; continuation preserves the engine. Landed `0f74748`; coordinator checks 72/72, typecheck and Biome clean. Live hosted OMP and live OMP continuation remain unproved.
- `F726-limen-runs-jobs-on-pi-only` (🟢 PROVEN): Limen starts jobs only with Pi. Landed `14c99d9`; native 453/453. `--engine claude` and `--role advisor` fail before any job exists.
- 2026-09: 70 folded landings. Stale intent prose was matched to landed reality (F725, `3723740`), tests stopped owning prompt prose (F723, `e030714`), wake sweep collection became private (F722, `482715d`), and coordinator status became static (F721, `ab70649`). Earlier work stopped counting running jobs' changed files, retained overlapping worktrees, added owner-routed finish wakes, explicit seat recovery, job retention, native checks, engine defaults, and evidence-backed role handoffs. Details and outcomes: spec/features/done/2026-09/
- 2026-08: 44 landed. Hosted jobs run in a named tab; wakes retry; the process tree is contained. spec/features/done/2026-08/
