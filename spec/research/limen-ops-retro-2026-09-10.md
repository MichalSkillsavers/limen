# Limen ops retrospective — September 8–10, 2026

## 1. Executive summary

- Durable job files and Git made interrupted work recoverable; `done` still did not mean delivered.
- Native notifications were **broken during quota exhaustion**: five coordinator sessions accumulated 10,480 wake messages.
- Automatic external finish delivery was **not configured** on any of the 207 inspected pre-retro jobs.
- Manual HTTP acceptance was observable; completed Tony/Johnny/Grok turns were not established.
- Handoffs worked best when they named a candidate, released writers, and assigned one landing owner.
- Vision reading was common; reading requirements did not prevent acceptance mistakes.
- The two independent reviewers found useful safety evidence; routine UI work generally respected review skips.
- Two API coordinators actually ran Grok despite Astra instructions; their workers correctly ran Astra.
- The recurring cost was machinery retries and coordination repair—not simply insufficient agent diligence.

### Evidence boundary

This uses the requested calendar window, September 8–10, rather than a strict rolling 48 hours. I inspected 34 recently modified global Pi sessions, inventoried 207 date-stamped job directories, and programmatically searched the available transcripts for 201 of those jobs. Detailed inspection concentrated on finish, steering, review, and handoff events.

Job roots:

- **Alice:** `/Users/overment/playground/alice-app/alice`
- **API:** `/Users/overment/playground/alice-app/api`
- **Limen:** `/Users/overment/.overment/limen`

The requested global session directories retain the older `alice-app-alice`/`alice-app-api` encoded paths. Counts describe the inspected local snapshot, not historical success rates. The two retrospective jobs were excluded.

I read the four named notes, README, vision, board, relevant specifications, and notification implementation. I also consulted the retained September 9 steering retrospective. No product tests, live webhook requests, receiver sessions, or fresh VPS checks ran. Project files remained unchanged.

### Scorecard

| Area | Score | Evidence |
|---|---|---|
| Spawn → work → finish → land | **Flaky** | 169 jobs recorded `done`, 28 `stopped`, 10 `failed`; startup failures, unfinished candidates, and landing intervention remained. These are run outcomes, not feature outcomes. |
| Native completion/advisory wakes | **Broken under persistent errors** | Thousands of repeated messages; 60 Alice jobs retained blocked completion claims. Other deliveries worked. |
| External finish webhooks | **Flaky end-to-end; automation inactive** | Zero automatic configuration snapshots, attempts, or receipts across 207 jobs; manual HTTP successes do not establish bot consumption. |
| Handoffs and ownership | **Flaky** | Successful explicit writer releases, but unwatched workers, shared-checkout collisions, missing tickets, and contradictory shepherd directions. |
| Vision/styleguide use | **Working in checked samples** | Actual vision bodies appeared in at least 166/192 available Alice job transcripts, all seven Limen jobs, and both API jobs. Understanding and before-edit compliance are not established by that count. |
| Independent review | **Working when targeted** | Two reviewer jobs: one concrete safety FAIL, one combined-proof PASS. Explicit API “Adam reviews” overrides were respected. |
| Repetition/model policy | **Flaky** | Quota storms, identical startup retries, recurring model instructions, and two verified coordinator model mismatches. |

## 2. What worked

**Recovery depended on files, not the pane.** The onboarding repair preserved commit `6a964e175` when Codex exhausted its quota. The MCP schema finish preserved substantial uncommitted work and its check reports. The shepherd could distinguish those cases instead of treating both as lost or completed work. Relevant Alice jobs: onboarding repair ending `c5f94583`, MCP finish ending `129d99ce`.

**Explicit handbacks enabled useful parallel work.** The chat-motion and linked-folder coordinators negotiated the native GUI slot and released it after the focused retry. The chat-motion closeout reported 86 stable-row samples without claiming unrelated Files acceptance. See coordinator session `01a0823c-d254-7428-8462-c88c6c256995`, and its peer messages in `01a0823c-8ad7-746d-9a69-7e3811e17d03`.

**Review bought real safety information.** The autonomy reviewer identified that retaining an exact-child Deny file would not necessarily constrain a broader Code declaration. Its verdict supplied the concrete counterexample and requested a documentation correction—not an unsolicited runtime rewrite:

`Alice/.limen/jobs/2026-09-08-f698-autonomy-policy-safety-revi-afc3b36b/result`

The Always-grant reviewer checked the exact combined candidate, ran 66 Grants tests and the crate check, and explicitly rejected earlier dirty/different-commit evidence as proof of that candidate:

`Alice/.limen/jobs/2026-09-08-f706-always-combined-proof-revie-8b22ebe2/result`

**Review skips could also be disciplined.** The model-picker coordinator explained why a small layout diff could land without independent review. Both API coordinators left candidates for Adam, identified unchanged architecture failures, and did not spawn reviewers. This is a better pattern than either universal review or universal dismissal of checks.

**The existing delivery notes are unusually honest.** They separate project opt-in, transport acceptance, native Pi receipts, and observed bot turns. The September 10 investigation additionally distinguished a reproduced Node/PATH failure from an unconfirmed downstream authentication diagnosis. Preserve these distinctions.

## 3. What hurt

### Native retries amplified a provider outage

Five Alice coordinator sessions contain **10,480 wake messages with distinct event IDs**. Only 32 distinct message texts exist when counted separately within those sessions. They also contain 10,544 errored assistant records; these are not measured paid calls.

The affected sessions are:

- Message selection: `01a082c4-76a3-77ac-8fbb-9f97e9dc3961`
- Agent folders: `01a082f7-a585-71c4-aa34-034e26404933`
- Onboarding: `01a08317-e482-7602-99d5-41024c50bab3`
- MCP schemas: `01a08329-5080-77a1-9a09-28412d266afc`
- Account access: `01a0833e-9c2e-7096-b93a-9a368de4ca2b`

The quota/error period ran approximately 23:08 UTC September 8 to 04:28 UTC September 9. The account session eventually recorded context-window errors too.

The onboarding repair’s log contains **9,450** instances of:

> wake turn ended error or aborted; claim released without counting an attempt

Source: `Alice/.limen/jobs/2026-09-08-f639-invalid-catalog-keeps-repai-c5f94583/log`.

Current `hook/wake.ts` calls `releaseUncounted()` for an errored delivery, then sweeps again after settlement. This bypasses the two-unconfirmed-attempt bound. The logs support that explanation strongly; I did not reproduce it against the exact hook revision loaded by those sessions.

The earlier steering retrospective established 312 identical warnings in one session. This scan extends that finding across five sessions and the longer outage. These are **native Pi wakes, not duplicate Grok HTTP requests**.

### Installed finish support was mistaken for an operational delivery chain

All inspected job cabinets lacked `finish-webhook-env`, `finish-webhook-attempt`, and `finish-webhook`. All three project roots lacked `.limen/finish-webhook.env`.

Therefore automatic silence was expected. Installing the helper and finalizer did not enable delivery.

Manual sending had separate problems:

- Chat-motion job `2026-09-08-chat-motion-attach-polish-bc962f0e` reported ping exit **127**.
- Several later jobs reported HTTP **200**, but no matching completed external bot turn was available.
- The doubled-turn coordinator explicitly handed back an **unmerged** candidate with a remaining native failure, then sent `doubled-turn done`. The prose was honest; the three-field ping was ambiguous. Source: session `01a082e7-0b7b-74eb-8dd3-a0333095b62e`, line 172.

No same-bot duplicate webhook was established. Neither can the available aggregate records rule one out.

### Recovery sometimes recreated the original failure

Three agent-folder continuations failed with the same shell-encoding error and zero tools:

- `2026-09-09-agent-folder-linking-design-cont-4005f05a`
- `2026-09-09-agent-folder-linking-design-cont-68327265`
- `2026-09-09-agent-folder-linking-design-cont-46ca36a0`

Separately, two MCP retries started 111 ms apart on the same branch/worktree. One worker reported that the shared baseline log had been overwritten and stopped editing. The job records and report are retained in:

`Alice/tmp/evidence/limen-steering-retro-20260909/sources/mcp-collision.json`

This is not a problem another “please stay focused” sentence solves.

### Ownership needed repeated human or bot repair

Shepherd messages explicitly identified unwatched workers for onboarding, message expansion, MCP, labs research, and finish-webhook work.

The agent-folder coordinator received “implement,” then a “stay idle until Adam answers” shepherd note, then an explicit decision lifting the hold. These may represent legitimate changing decisions, but the replacement authority was initially unclear. Source: session `01a082f7-a585-71c4-aa34-034e26404933`, lines 104–110.

Concurrent coordinators also repeatedly reported accidentally committing another feature’s board hunks. Worktree isolation did not isolate their shared coordinator checkout.

### Green checks sometimes measured the wrong outcome

The model-picker change proved Refresh was on the right; Adam then clarified it needed to share the title’s row. The message-actions implementation passed focused checks but covered prose; Adam rejected it and required bottom expansion.

Sources: model-picker session `01a082d4-bf08-7779-9283-d1621f6a7d09`, lines 56–74; message-selection session `01a082c4-76a3-77ac-8fbb-9f97e9dc3961`, lines 108–117.

These examples support better observable acceptance before fan-out. They do not prove that another generic reviewer would have prevented the redesign.

### Model prose was not launch configuration

Both API briefs requested Astra xhigh. Actual assistant metadata shows:

- Snapshot coordinator `01a08069-2a24-7769-846e-cf362d8900e7`: 29 Grok assistant records.
- Blocklist coordinator `01a08069-3590-71cc-bf10-cf8e442099b5`: 26 Grok assistant records.

Their implementation workers ran Astra correctly.

This is a verified configuration mismatch, not evidence that Grok caused poor results. It also fills a gap in the earlier steering report, whose 32-model finding covered Alice/Limen rather than these API sessions.

I found stronger evidence for these failures than for costly tab-rename churn; renaming should not lead the recommendations.

## 4. Suggestions for the Limen product

**Bound unchanged native notifications across error outcomes.** Preserve the pending event, stop automatic reinjection after a finite allowance, and surface the blocked condition without buying another model turn. Include fallback recipients in the bound. Cost: recovery after a transient provider problem may require deliberate resumption.

**Make delivery inspection answer the operational question.** Show “not configured,” attempt outcome, and safe per-target transport results through existing job inspection. Preserve once-only automatic claims; do not add blind whole-list retries. Receiver correlation needs an agreed event identity and a completed-turn address—not an invented Grok API. Cost: a small receipt/receiver contract, without exactly-once promises.

**Expose the effective launch, not just requested policy.** Record safe engine/provider/model/thinking facts, startup phase, candidate/worktree identity, and notification destination selection without secrets. Diagnose the repeated shell-encoding failure before another continuation. Verify exclusive live ownership before reusing a worktree. Cost: modest preflight and receipt work, not a new workflow registry.

**Keep prompt policy in one place.** Existing explicit Pi flags, watched-job broadcast, retained evidence, and frame-inspection guidance already exist. Improve adoption and remove conflicting defaults rather than adding them again. The worker’s unconditional full-native-lane instruction still competes with explicit focused-only budgets.

**Preserve proportional review.** Adam’s “no independent review” instruction should survive repairs and resumes. When review is requested, buy one falsifier against one commit and retained evidence. Do not turn an unchanged baseline failure into an automatic repair loop.

## 5. Suggestions for how Adam works with Limen

- **Give Tony one launch contract:** target host/repo, committed ticket and base, deliverable shape, merge owner, proof allowance, and return route. Verify the effective model once; repeated model prose cannot change an already-running coordinator.
- **Assign one landing and board writer per shared checkout.** Let workers and peer coordinators exchange candidate SHAs and released seams. Do not have both Tony and the feature coordinator independently decide whether the same branch should land.
- **Use exact-job watching for takeovers.** A broad `watch --running` is convenient but can subscribe a finishing coordinator to unrelated work. Ask it to follow the named job and retain the original owner unless ownership explicitly transfers.
- **Set quota behavior before a wave.** Decide whether exhaustion means “park and preserve” or permits a named fallback. Do not revive the same exhausted session merely because work remains.
- **Replace “one green check” with one acceptance-oriented proof budget.** Name the behavior, eligible host, and retry allowance. For UI, specify relationships such as “same row” or “never covers prose” before parallel implementation.
- **Pair with Grok through evidence, not repeated pings.** Tony should consume job/candidate records and report separately: run ended, candidate ready, merged, acceptance complete. Configure each authorized receiver deliberately; routine workers should not also send a feature-complete ping.

## 6. Top five changes by leverage

| Rank | Change | Tradeoff |
|---|---|---|
| **1** | Bound native wake retries during provider failure, including fallback delivery. | Some recovery becomes deliberate rather than automatic. |
| **2** | Establish project opt-in and correlate one finish event through each intended bot’s completed turn. | Requires receiver-owner involvement; HTTP alone cannot close the work. |
| **3** | Verify effective launch settings and exclusive continuation ownership before repeating a failed start. | Small startup overhead and clearer refusals. |
| **4** | Use one landing owner with a committed acceptance contract and explicit writer handback. | Slightly less opportunistic parallelism; fewer merge and board collisions. |
| **5** | Carry one durable proof/review/quota policy through every resume. | Less ad hoc flexibility; exceptions must be stated explicitly. |

**Check next:** reproduce one unchanged advisory against installed Pi while the receiving turn repeatedly errors. Verify that both subscribed and fallback delivery stop within the intended allowance without falsely recording delivery. That is the smallest check that can confirm the highest-impact diagnosis.
