# Synthesis · One ordered list of specs that brings Limen in line with its styleguide and vision

This list merges the four team results into 56 specs. The order is P0, then P1, then P2. Inside a priority, a spec comes after the specs it depends on. P0 blocks clarity or correctness. P1 is high value. P2 is polish.

Each spec names its source with a "From" line. The source result holds the full evidence and, for code specs, a code sketch. Read it with `git show <branch>:spec/features/active/F773-styleguide-quality-scan/group/teams/team-N-result.md`:

- Team 1, rules and vision (T1): `limen/2026-10-05-f773-styleguide-quality-scan-tea-ace10114`
- Team 2, operator messages (T2): `limen/2026-10-05-f773-styleguide-quality-scan-tea-8980fcf8`
- Team 3, module boundaries (T3): `limen/2026-10-05-f773-styleguide-quality-scan-tea-f3cc9f8d`
- Team 4, readability (T4): `limen/2026-10-05-f773-styleguide-quality-scan-tea-13ae7139`

Merges: team-1 spec 2 and team-4 R2 are one spec (10), because they change the same supervisor lines. Team-1 specs 5 and 16 are one spec (21), because they change the same examples. The `src/commands/sweep.ts:26-51` parts of team-4 R3, R8, and R9 go to spec 34, which rewrites that code. The `src/commands/jobs.ts:158` part of team-4 R8 goes to spec 5, which rewrites that line.

## P0

### 1 · An OMP coordinator can watch and steer its own jobs

- **Priority:** P0.
- **What and why:** `limen watch <id>` and `limen steer --running` require `PI_SESSION_ID`, which the default OMP coordinator does not have, so the board's takeover rule fails and the error tells the coordinator to ask itself.
- **Depends on:** none. Plan it with spec 4, because both decide how Limen identifies an OMP coordinator.
- **Scope:** both. Code: `src/commands/watch.ts`, `src/commands/steer.ts`, `hook/group-peer.ts:77`, `src/commands/spawn.ts:552-560`. Docs: `templates/agents.md:99,164`, `docs/groups.md:9`.
- **Evidence:**
  - `src/commands/watch.ts:37-40` (same check in `src/commands/steer.ts:38-40`) — "watching requires a Pi session; ask the coordinator to watch through its bash tool".
  - `templates/agents.md:164` — "run `limen watch <id|label>` for that named job yourself through the Bash tool."
  - `src/commands/spawn.ts:552-560` — spawn writes a wake subscriber only when `PI_SESSION_ID` is set; the last 25 OMP jobs have 0 subscribers.
- **Done when:** `limen watch <id>` from an OMP coordinator pane exits 0, and the wake for that job arrives.
- **From:** T1 spec 1.

### 2 · A blocked or errored job stands out from the running jobs around it

- **Priority:** P0.
- **What and why:** Every hosted OMP job and every hosted job on macOS carries a standing "ownership observation unavailable" note, and the human view shows any note as the same word `advisory`, so a real blocked or errored job looks like every other row.
- **Depends on:** none. Specs 42 and 55 wait for this one.
- **Scope:** both. Code: `src/runtime/hosted-binding.ts`, `src/runtime/hosted-uncertainty.ts`, `src/runtime/supervisor.ts:147,157`, `src/job/view.ts`, `src/commands/jobs.ts`, `src/commands/status.ts`, `hook/wake.ts:336-350`, `src/commands/sweep.ts:62`. Docs: `docs/jobs.md`.
- **Evidence:**
  - `src/runtime/hosted-binding.ts:66-69` — returns early `if (... engine !== "pi")`; `:37` accepts a binding only for `engine === "pi"` on `linux`.
  - `src/runtime/hosted-uncertainty.ts:14-17` — live `limen status` ends all 14 running rows with "advisory ownership observation unavailable since 2026-10-05T18:45:53.424Z (engine); this is not proof of a stalled tool".
  - `src/job/view.ts:74` — the human view ends every running row with `advisory`.
- **Done when:** a healthy running OMP job shows no note; a blocked or errored job shows its kind (`blocked`, `errored`, `idle`, `ownership`); `docs/jobs.md` states the engine and platform limit once.
- **From:** T2-01.

## P1

### 3 · The styleguide names only checks that exist

- **Priority:** P1.
- **What and why:** The styleguide points at a line budget and a file-name check that no test has enforced since 2026-09-24, while `src/` grew from 4,230 to 9,448 lines.
- **Depends on:** none. Do it before specs 4 and 34, which add files, so they are judged against a known rule.
- **Scope:** docs or code. `.agents/limen/styleguide.md:8,10`, or `test/structure.test.ts`.
- **Evidence:**
  - `.agents/limen/styleguide.md:10` — "`src/` stays near the structure-test line budget."
  - `test/structure.test.ts:21-26` — checks only empty `dependencies` and unique basenames.
  - `git show 1ffb7c4 -- test/structure.test.ts` — deletes `sourceLines <= 4280` and the `/(index|types|utils)\.ts$/` check.
- **Owner decision:** state the size limit as an advisory number that the quality pass reports (teams 1 and 3 lean this way, per "Inform, do not gate"), or restore one size test. The file-name rule needs the same choice.
- **Done when:** each check that the styleguide names exists, or the line says it is advisory.
- **From:** T3 spec 6, with T1's file-name check evidence.

### 4 · Every coordinator gets the same completion wake

- **Priority:** P1.
- **What and why:** A finished job wakes a Pi coordinator with commits, the final message, and the "produced nothing" fact, but wakes an OMP coordinator in Herdr with one line, because two files write the wake text.
- **Depends on:** spec 3, because this spec adds `src/job/wake-text.ts`. Plan it with spec 1, which may change the route an OMP coordinator uses; both routes still need one text.
- **Scope:** code. Move `hook/wake.ts:585-663` to a new `src/job/wake-text.ts`. `hook/wake.ts` and `src/integrations/coordinator-wake.ts` import it. Delete `src/integrations/coordinator-wake.ts:52-61` (`wakeText`).
- **Evidence:**
  - `hook/wake.ts:612-627` — `return joinWake(lead, handoffExcerpt(job), [facts, handoff]…` (commits, final message, "It produced nothing (0 tool calls, no commits).").
  - `src/integrations/coordinator-wake.ts:60` — `` `Limen job ${JSON.stringify(label || id)} is ${state} (${id}) on branch ${branch}${location}. ${meaning} Start with \`limen jobs ${id}\`.` `` (no commits, no final message).
  - `src/commands/spawn.ts:558-560` — the pane route applies when `PI_SESSION_ID` is empty, which is true for every recent OMP job.
- **Done when:** a Pi coordinator and an OMP coordinator get the same facts for the same finished job; only the route-specific instruction differs.
- **From:** T3 spec 1.

### 5 · `limen jobs`, the footer, and the reaper agree on whether a job is alive

- **Priority:** P1.
- **What and why:** Three surfaces judge liveness by three rules, so one hosted job can show `think` in `limen jobs`, `dead` with "needs attention" in the footer, and "lost owner" to the reaper at the same time.
- **Depends on:** none.
- **Scope:** code. `src/commands/jobs.ts:154-158` and `hook/wake.ts:763-772` take pulse liveness from `ownerAlive` in `src/runtime/reap.ts`. `limen jobs` keeps the hosted agent status as a separate displayed fact. Do not add a Herdr call to the 500 ms footer sweep (`hook/wake.ts:518`). Write `src/commands/jobs.ts:158` (three conditional spreads inside a ternary) as plain steps in this change.
- **Evidence:**
  - `src/runtime/reap.ts:20-27` — `ownerAlive`: `processAlive(pid)` then `outcome.process.born === born`.
  - `src/commands/jobs.ts:154-157` — `const alive = hosted ? hostedAlive || processAlive : processAlive;` (no `born` check).
  - `hook/wake.ts:767-768` — `derivePulse({ alive: recorded !== undefined && processGroupAlive(recorded), …` (no `born` check, no hosted agent).
- **Done when:** for any job, the `limen jobs` pulse, the footer pulse, and the reaper give the same live or dead answer.
- **From:** T3 spec 2, with the `jobs.ts:158` part of T4 R8.

### 6 · Job names keep the words that tell jobs apart

- **Priority:** P1.
- **What and why:** The footer and the Herdr title cut each job to its first feature number, group labels put the feature first, and the dead-job warning counts every running job, so a group shows as one number repeated.
- **Depends on:** spec 5. Both edit the footer code (`hook/wake.ts:687-772,1036-1048`), and the warning must count the dead jobs that spec 5 defines.
- **Scope:** both. Code: `hook/wake.ts:1036-1048`, `hook/wake.ts:694-715`, `src/commands/group.ts:147`. Docs: `docs/herdr-status.md:51-56`.
- **Evidence:**
  - `hook/wake.ts:1046-1048` — `shortLabel` returns `/\bF\d{3,}\b/i.exec(label)?.[0]?.toUpperCase() ?? …`; 14 live labels give the title `Limen · 14 jobs · F773 F773 F773`.
  - `src/commands/group.ts:147` — the label is `${feature slug} ${team} coordinator`; `limen jobs` shows four rows that read `F773-styleguide-quality-scan te…`.
  - `hook/wake.ts:1038` — `` if (pulses.includes("dead")) return `⚠ Limen · ${pulses.length} needs attention` `` (1 dead job of 14 reads "14 needs attention").
- **Done when:** the footer and the title show label words with the feature number last; group labels read `team-2 coordinator · F773`; the warning reads `1 of 14 needs attention`; the dead `?? "job"` tail at `hook/wake.ts:1047` is gone.
- **From:** T2-05, with T4's dead-tail check.

### 7 · One parser reads the task's `Ticket:` pointer

- **Priority:** P1.
- **What and why:** Six places parse `Ticket:` with four rules, so the per-turn cue can show a path that does not exist, private continue can append a broken pointer, and committed spawn skips its base-commit check when two spaces follow `Ticket:`.
- **Depends on:** none.
- **Scope:** code. Export one `ticketPointers(task)` from `src/project/planning.ts`. Use it in `src/commands/spawn.ts:180,520`, `src/integrations/finish-webhook.ts:22`, `src/project/planning.ts:50`, `src/commands/continue.ts:109`, `hook/communication.ts:222`.
- **Evidence:**
  - `src/commands/spawn.ts:180` — `` /\bTicket: (spec\/\S*[^\s.,;:!?)\]'"`])/g `` (one space only).
  - `hook/communication.ts:222-223` — `task.match(/Ticket:\s+(\S+)/)` then `.replace(/[.,;]+$/, "")`.
  - `src/commands/continue.ts:109` — `.match(/\bTicket:\s+(\S+)/)?.[1]` (no strip); for `(Ticket: spec/…/ticket.md).` it returns `…/ticket.md).`.
- **Done when:** every caller gets the same path for the same task text, including trailing punctuation and two spaces after `Ticket:`.
- **From:** T3 spec 3. Teams 1, 3, and 4 each found it.

### 8 · One function writes a new job record

- **Priority:** P1.
- **What and why:** Spawn and continue each write about twenty identical record files, and the copies already drifted: spawn publishes through a hidden directory and continue does not, which is the open continuation-publication bug.
- **Depends on:** the active fix that makes continue publish its job record through a hidden directory, as spawn does (F729). Do this spec as that fix's shape, or right after it.
- **Scope:** code. `src/commands/spawn.ts:183-250`, `src/commands/continue.ts:121-179`. One exported publisher that both commands call, with per-command extras (`parent`, `continue`, `candidate`).
- **Evidence:**
  - `src/commands/spawn.ts:185-200` — `` const publishing = `${dirname(jobsRoot)}/.publishing-${id}`; … await rename(publishing, jobDir); ``
  - `src/commands/continue.ts:132` — `await mkdir(jobDir, { recursive: false });`, then `:137-168` writes the same file list.
  - `spec/features/active/F729-continuation-publication/ticket.md:10` — "Apply the hidden-directory publication approach already used by spawn".
- **Done when:** one function writes every new job record, and a continued job appears only when its record is complete.
- **From:** T3 spec 4.

### 9 · Every land outcome names the job and the next step

- **Priority:** P1.
- **What and why:** A conflict leaves the target mid-merge with only Git's text, land refuses a stopped job that status lists under "Needs a decision" and gives no way forward, and the success and dirty-target lines use a bare ID.
- **Depends on:** none. Spec 10 depends on this one for the `stopped` row in the state table.
- **Scope:** both. Code: `src/commands/land.ts`. Docs: `docs/jobs.md` (state table, one conflict sentence), `docs/commands.md`.
- **Evidence:**
  - `src/commands/land.ts:29-31` — on a conflict, output is Git's `CONFLICT (content): Merge conflict in f` and exit 1; `git status --short` then shows `UU f`.
  - `src/commands/land.ts:17` — `job ${id} is ${state}; land requires a done job`.
  - `docs/jobs.md:34-41` — the state table lists `done` and `failed`, not `stopped`.
- **Owner decision:** leave the merge open and print a hint (the "inform, do not gate" choice), or abort the merge.
- **Done when:** each land outcome names `<label> (<id>)` and one next command; `docs/jobs.md` has a `stopped` row.
- **From:** T2-06, with the team-1 worker's state-table finding.

### 10 · Closing a hosted tab before `finish` records the job stopped, not done

- **Priority:** P1.
- **What and why:** A hosted job ends cleanly only through `finish`, but when its tab closes first the supervisor records `done` and every wake says "land it", and the compressed end decision hides that fact.
- **Depends on:** spec 9, which adds the `stopped` row that this spec makes common.
- **Scope:** both. Code: `src/runtime/supervisor.ts:134-165` (plain branches, early returns, a named missing-sample count), `src/integrations/herdr.ts:148-151`, `test/recovery.test.ts:160-162`, `test/hosted-spawn.test.ts:860`. Docs: `templates/agents.md:74`; propose the same clause for `spec/vision.md:15` to the owner.
- **Evidence:**
  - `src/runtime/supervisor.ts:165` — `finalizeJob(jobDir, requested ? requestedTerminal(requested) : failedReason ? "failed" : "done", requested || failedReason || reason)` (a missing pane gives `done`).
  - `hook/hosted.ts:98-102` — only the `finish` tool writes `session-ended`.
  - `src/integrations/coordinator-wake.ts:57-58` — "Job done. Next step: land it after you check its diff…".
- **Owner decision:** whether a missing pane with a Herdr status of `unknown` may end a job. At `src/runtime/supervisor.ts:134-142` the comment says the missing window decides, but the code never ends that job.
- **Done when:** after a tab close, `limen jobs <id>` shows `stopped` with "job tab closed before finish"; no wake says "land it" for that job; the `finish` path still records `done`.
- **From:** T1 spec 2 merged with T4 R2. R2 holds the code sketch.

### 11 · A failed job's row says why it failed

- **Priority:** P1.
- **What and why:** The human row for a failed job shows the last Limen log line, which after the end is a wake-delivery or tab-close line, not the failure.
- **Depends on:** none.
- **Scope:** code. `src/commands/jobs.ts:133,192,200,276`.
- **Evidence:**
  - `src/commands/jobs.ts:276` — `detail: lines.findLast((line) => line.startsWith("[limen "))`.
  - `src/commands/jobs.ts:133` — `stopReason` is read only for the detailed view. The live row for job `065ca240` shows "wake turn errored, aborted or remained unconfir…", while its `stop-reason` holds a 429 `rate_limit_error`.
- **Done when:** that row shows `rate limit (429); retry after 71m`; post-finish delivery lines never become the row reason.
- **From:** T2-04.

### 12 · The status inbox lists only work the operator might land

- **Priority:** P1.
- **What and why:** `limen status` counts every group member branch as a landing candidate (85 of 94 rows today, including closed groups), though only the group lead lands.
- **Depends on:** none.
- **Scope:** both. Code: `src/commands/status.ts`. Docs: `docs/commands.md:38`, `docs/herdr-status.md:9-12`.
- **Evidence:**
  - `src/commands/status.ts:86` — `if (branch) finished.set(...)`; nothing reads the job's `group` file.
  - `docs/groups.md:3` — "The lead remains the sole landing owner."
  - `docs/commands.md:38` — the section holds "finished jobs with commits that are not landed".
- **Done when:** each open group shows one line, `group <feature>: N member branches; the lead decides (limen group status <id>)`; closed groups leave the inbox; jobs outside groups keep their rows.
- **From:** T2-03.

### 13 · `limen group status` answers where the group stands in a few lines

- **Priority:** P1.
- **What and why:** `group status` prints the whole group record as JSON (2,645 lines, about 100 KB in this group), so the roster and the deadline are lost.
- **Depends on:** none.
- **Scope:** both. Code: `src/commands/group.ts:225-232`. Docs: `docs/groups.md:59`.
- **Evidence:**
  - `src/commands/group.ts:225-232` — `console.log(JSON.stringify({ ...run, members, events, receipts }, null, 2))`; live output shows `"deadline": 1791231339485` (epoch milliseconds) and 208 `"state"` keys.
- **Done when:** the default output shows the feature, the deadline as local time with minutes left, the stopped and closed flags, and one line per member; `--json` keeps the full record.
- **From:** T2-07.

### 14 · Group errors and refusals say what is wrong and what to run

- **Priority:** P1.
- **What and why:** An unknown group ID or subcommand prints a raw Node `ENOENT` with an internal path, bare `limen group` talks about "recorded member environment", and the stop and close refusals use bare IDs and the words "launch uncertain" and "recovery required".
- **Depends on:** spec 13, because the member-state word at `src/commands/group.ts:229` appears in the new status view.
- **Scope:** code. `src/commands/group.ts`, `src/job/group-cabinet.ts:38-41`.
- **Evidence:**
  - `src/commands/group.ts:198-206` — the ID lookup runs before the subcommand check at `:287`; `limen group frobnicate x` prints `ENOENT: no such file or directory, open '…/.limen/groups/x/run.json'`.
  - `src/commands/group.ts:274` — `close refused: ${member.id} is live or launch is uncertain`.
  - `src/commands/group.ts:258-264` — `group stopped launches; recovery required`.
- **Done when:** each group error names the problem in Limen's words and one command to run; "launch uncertain" reads "no job record yet".
- **From:** T2-08.

### 15 · A command run in the wrong place says so in Limen's words

- **Priority:** P1.
- **What and why:** Outside a project every job command prints Git's raw "fatal: not a git repository", and in a repository with no commit `spawn` prints a raw Git usage message, while `init` already explains itself.
- **Depends on:** none. Spec 29 reuses its no-commit sentence.
- **Scope:** code. `src/project/git.ts:13-24,180-183`, `src/commands/spawn.ts:178`.
- **Evidence:**
  - `src/project/git.ts:13-24` — `limenRoot` falls through to `requireGit` (`:180-183`), which throws Git's stderr unchanged.
  - `src/commands/init.ts:25` — "init requires a Git repository; run 'git init' first, or use 'limen workspace init' for a non-Git workspace".
  - `src/commands/spawn.ts:178` — the base-commit read; output "fatal: ambiguous argument 'HEAD': unknown revision…".
- **Done when:** outside a project, `status`, `jobs`, `wait`, `land`, and the other job commands print `not inside a Limen project: <cwd>…` with where to run; spawn with no commit says `this repository has no commit yet; commit once, then spawn.`
- **From:** T2-02.

### 16 · A project with no map says how to make the first one

- **Priority:** P1.
- **What and why:** With no map, `picture build` fails with a raw `ENOENT`, and `picture tick` says "start the first picture by hand" without saying how.
- **Depends on:** none.
- **Scope:** both. Code: `src/commands/picture.ts:46-54`, `src/project/picture-tick.ts:29-37`. Docs: `docs/picture.md`.
- **Evidence:**
  - `src/commands/picture.ts:46-54` — output "ENOENT: no such file or directory, stat '…/.limen/picture'", exit 1.
  - `src/project/picture-tick.ts:29-37` — output "no map revision; start the first picture by hand", exit 0.
  - `docs/picture.md:25` — "The coordinator starts the first map by hand, as an interactive `--role picture` job (`--tab`)."
- **Done when:** both commands print `no map yet in <dir>. The first map comes from a picture job: limen spawn --role picture --tab … (docs/picture.md).`
- **From:** T2-09.

### 17 · GitHub surfaces say first whether the doorbell exists, and call a job a job

- **Priority:** P1.
- **What and why:** On a laptop `github doctor` prints 16 Linux-seat FIX rows and 31 SKIP rows and never says "this is not a seat", `github status` says "disconnected" with no next step, and doorbell comments call one job both "task" and "job".
- **Depends on:** none.
- **Scope:** both. Code: `src/commands/github-doctor.ts`, `src/commands/github.ts:182-190`, `src/integrations/github-poller.ts:255,267`, `src/integrations/github-review.ts:123`. Docs: `docs/remote.md:127-134`.
- **Evidence:**
  - `src/commands/github-doctor.ts:95-99,254-256,302` — ends with "github doctor: 16 prerequisites need repair" on a machine that is not a seat.
  - `src/commands/github.ts:182-190` — "GitHub doorbell disconnected"; "local handoff copy (unverified): …".
  - `src/integrations/github-poller.ts:255,267` — `` `Limen started a hosted ${review ? "review" : "task"} … Job: …` ``.
- **Owner decision:** whether doctor stops after its first line on a machine that is not a seat.
- **Done when:** doctor's first line says whether this machine is a provisioned seat; SKIP rows cover only the current project; status names `limen github connect`; doorbell comments say "job".
- **From:** T2-10, with T4's task-or-job finding.

### 18 · The GitHub trust check and other dense conditions read in one pass

- **Priority:** P1.
- **What and why:** A 12-term `&&` chain guards the GitHub doorbell's trust check, and other conditions hide an `await` inside a negation, so a reviewer cannot confirm them in one pass.
- **Depends on:** none. If spec 41 lands first, use its `GITHUB_ANSWER_MAX` and `TERMINAL_STATES` names. `src/commands/sweep.ts` belongs to spec 34 and `src/commands/jobs.ts:158` to spec 5.
- **Scope:** code. `src/integrations/github-poller.ts:184-197` and its 10 repeated repository compares, `src/runtime/engine.ts:94`, `src/commands/spawn.ts:100-106`, `src/project/picture-tick.ts:135-139`, `src/integrations/herdr.ts:182,228,371`, `src/runtime/supervisor.ts:228`.
- **Evidence:**
  - `src/integrations/github-poller.ts:184-197` — `outcome.repo.toLowerCase() === claim.repo.toLowerCase() && binding.repo.toLowerCase() === claim.repo.toLowerCase() && originRepository(root, true).toLowerCase() === …` (12 terms).
  - `src/runtime/engine.ts:94` — `if (!name || (!flat && (!info.isDirectory() || !(await stat(join(source, "SKILL.md")).catch(() => undefined))?.isFile()))) continue;`
  - `src/commands/spawn.ts:100-106` — `parsed.review && !(await Promise.all(run.members.filter(…).map(…)).then(…))` inside an `if`.
- **Done when:** each cited condition is written as named parts or early returns, with the same behavior.
- **From:** T4 R8.

### 19 · A hosted spawn whose label contains the word "lead" starts

- **Priority:** P1.
- **What and why:** Hosted spawn refuses any label that contains "lead", and the label defaults to the first task line, so ordinary work such as "Fix the lead-in paragraph" is blocked in Herdr but runs detached.
- **Depends on:** none.
- **Scope:** code. `src/commands/spawn.ts:412-413`, `test/hosted-spawn.test.ts:506-516`.
- **Evidence:**
  - `src/commands/spawn.ts:412-413` — `if (hosted && /\b(?:group[\s_-]+)?lead\b/i.test(label)) return "refusing hosted spawn labeled as lead: …"`.
  - `src/commands/spawn.ts:114` — the label defaults to the first task line.
  - `src/commands/group.ts:18-22` — `group start` already refuses `LIMEN_JOB=1`, which is the real protection.
- **Done when:** in Herdr, `limen spawn --label "Fix the lead-in paragraph · F900" '…'` starts a hosted job; `limen group start` from a job still refuses; the `--role coordinator/lead` refusal stays.
- **From:** T1 spec 3.

### 20 · The per-turn speech cue comes from the register file

- **Priority:** P1.
- **What and why:** Five speech rules are code constants that the hook injects on every turn and that no template holds, so a project that replaces the register still gets them, and the owner must edit code to change a speech rule.
- **Depends on:** none.
- **Scope:** both. `hook/communication.ts:10-20,139-143`, `templates/communication.md`.
- **Evidence:**
  - `hook/communication.ts:10-15` — `REPLY_RULES` ("First line is the answer. Not `F048 is active now.`…"), `OVERVIEW_CUE`, `SPECS_REMINDER`.
  - `hook/communication.ts:139-143` — `lines.push(REPLY_RULES)` and "Write in plain technical English (about 80% of ASD-STE100)…"; no template, doc, or `.agents/` file holds this text.
  - `templates/agents.md:48` — "A project file at `.agents/limen/communication.md` replaces that default for this repository only."
- **Done when:** editing `.agents/limen/communication.md` changes the per-turn cue; no speech rule text remains in `hook/`; the hook keeps only the selection logic (audience, wake, failure, `jg` presence).
- **From:** T1 spec 4.

### 21 · Every shipped spawn example matches the shop manual

- **Priority:** P1.
- **What and why:** Three review examples omit `--detached`, so in Herdr they start a hosted review tab that the reviewer preamble says does not exist, and `docs/jobs.md` shows spawn without the engine and model flags that the manual requires on every launch.
- **Depends on:** none.
- **Scope:** docs and CLI help. `docs/jobs.md:53-54,63-64`, `docs/commands.md:19-20`, the `--review` example in the `src/main.ts` help.
- **Evidence:**
  - `docs/jobs.md:63-64` — `limen spawn --review --branch limen/<job-id> --label "session handler review 1 · F001" \` (no `--detached`); `src/commands/spawn.ts:109` does not make `--review` detached.
  - `templates/agents.md:83` — "Ordinary `--review` spawns use `--detached`".
  - `templates/agents.md:66` — "Pass the chosen engine, provider, model, and reasoning flags explicitly on each launch", but `docs/jobs.md:53-54` has no flags.
- **Done when:** every shipped review example has `--detached`; `docs/jobs.md`, `docs/commands.md`, and `docs/setup.md` show one spawn shape with the same placeholder flags.
- **From:** T1 spec 5 merged with T1 spec 16.

### 22 · Shipped docs name OMP as the default engine and say "Pi" only for Pi

- **Priority:** P1.
- **What and why:** OMP is the default engine, but `SECURITY.md` names Pi as the default binary, and the README, the vision, and three docs call every session a Pi session.
- **Depends on:** none.
- **Scope:** docs. `SECURITY.md:5`, `README.md:46`, `docs/setup.md:49`, `docs/herdr-status.md`, `docs/finish-webhooks.md`. Propose new wording for `spec/vision.md:5,28` to the owner.
- **Evidence:**
  - `SECURITY.md:5` — "`limen spawn` launches `pi --approve` as the calling user, or `omp --auto-approve` when `--engine omp` is selected."; `templates/agents.md:91` — "with neither set, new jobs use OMP."
  - `spec/vision.md:5` — "One human; many focused Pi sessions; one coordinator conversation."
  - `README.md:46` — "Open Pi (`pi`) in that directory".
- **Done when:** `grep -n '\bPi\b' README.md SECURITY.md docs/*.md` returns only Pi-specific lines.
- **From:** T1 spec 6.

### 23 · One seat guide owns seat setup, version pins, and the seat spawn mode

- **Priority:** P1.
- **What and why:** Several pages give seat setup and disagree: the vision links a page that calls itself an old record, a "current checklist" uses the forbidden `npm link`, three pages pin three version sets, and the seat doc gives a different default spawn mode than the manual.
- **Depends on:** none.
- **Scope:** docs. Owner page: `docs/seat/agent-setup.md`. Trim: `docs/remote.md`, `docs/seat/README.md`, `docs/setup.md:12`, `README.md`. Propose the new link for `spec/vision.md:23` to the owner.
- **Evidence:**
  - `spec/vision.md:23` links `docs/vps.md`, and `docs/vps.md:3` says "This is an old record of one setup pass … not the current checklist."
  - `docs/seat/README.md:19` — "Clone limen, `npm install && npm link`."; `docs/seat/agent-setup.md:108` — "Never `npm link` a worker clone."
  - `docs/setup.md:12` — "omp 18.4.4 and Herdr 0.9.1"; `docs/seat/agent-setup.md:109,133` — "Herdr 0.9.3", "omp 18.6.1".
- **Done when:** every seat link goes to one guide; `grep -rn '0\.9\.1\|18\.4\.4\|npm link' docs/` finds no seat instruction; `docs/remote.md` states the manual's spawn-mode rule.
- **From:** T1 spec 7.

## P2

### 24 · Job IDs never carry a run of dashes

- **Priority:** P2.
- **What and why:** `makeJobId` trims dashes before it cuts the slug and turns a mid-label feature number into extra dashes, so 22 of 363 local IDs read like `…-spec-team--b04fd5e1`.
- **Depends on:** none. Land it before or with spec 25, which moves `makeJobId`.
- **Scope:** code. `src/commands/spawn.ts:532-537`.
- **Evidence:**
  - `src/commands/spawn.ts:532-537` — `label.toLowerCase().replace(/\bf\d{3,}\b|[^a-z0-9]+/gi, "-")`, then `….replace(/-+$/, "").slice(0, 32)`; `"Fix F123 bug"` gives `2026-10-05-f123-fix---bug-aed1f2cd`.
- **Done when:** new IDs contain no `--`; existing IDs still resolve by their hex suffix.
- **From:** T4 R1.

### 25 · Job identity and the model fallback leave the spawn command

- **Priority:** P2.
- **What and why:** A runtime file imports from a command file, and two commands each choose the package fallback model.
- **Depends on:** spec 8, because both edit the spawn and continue imports; spec 24, so the ID fix lands before the move.
- **Scope:** code. Move `makeJobId` and `hostedAgentName` (`src/commands/spawn.ts:532-546`) to `src/job/job.ts`. Move the model fallback (`src/commands/spawn.ts:121`, `src/commands/continue.ts:61`) to `src/runtime/engine.ts`. Update `src/runtime/recovery.ts:4` and `test/hosted-spawn.test.ts:8`.
- **Evidence:**
  - `src/runtime/recovery.ts:4` — `import { hostedAgentName } from "../commands/spawn.ts";`
  - `src/commands/spawn.ts:121` and `src/commands/continue.ts:61` — both `process.env[… ? "LIMEN_REVIEWER_MODEL" : "LIMEN_WORKER_MODEL"]?.trim() || "openai-codex/gpt-6-astra:high"`.
- **Done when:** no file in `src/runtime/` imports from `src/commands/`; the fallback model string appears once.
- **From:** T3 spec 5.

### 26 · Spawn refusals name the fix and come before "starting another"

- **Priority:** P2.
- **What and why:** Spawn prints `note: … starting another` before its checks run, so a refused spawn first claims that it is starting, and several refusals name the problem but not the fix.
- **Depends on:** none.
- **Scope:** code. `src/commands/spawn.ts:57,161-181,399-400`, `src/runtime/engine.ts:72`.
- **Evidence:**
  - `src/commands/spawn.ts:161-163` — prints "note: 1 job already running; starting another"; the refusals come later, at `:168-181`.
  - `src/commands/spawn.ts:57` — "no preamble for role nope" (it names neither place that it searched).
  - `src/commands/spawn.ts:399` — "branch main is checked out in the primary worktree; isolation is impossible".
- **Done when:** a refused spawn prints only the refusal; each refusal at these lines ends with one fix, for example `omp is not on PATH; install it, or pass --engine pi`.
- **From:** T2-11.

### 27 · One statement per line: no comma operators, assignments inside expressions, or async IIFEs in timers

- **Priority:** P2.
- **What and why:** Several places put two actions where a reader expects one, so the second action is easy to miss.
- **Depends on:** spec 26, which moves the notes at `src/commands/spawn.ts:159-163`, the lines of one comma operator here. `src/commands/sweep.ts` belongs to spec 34.
- **Scope:** code. `src/commands/spawn.ts:159,584`, `src/runtime/wrapper.ts:161-214,258`, `hook/group-peer.ts:32-34,84-103`, `src/project/seat.ts:50-53`, `src/project/git.ts:15-16,75-76`.
- **Evidence:**
  - `src/commands/spawn.ts:584` — `if (!(await waitForProcessGroup(wrapperPid, 1_000))) signalProcessGroup(wrapperPid, "SIGKILL"), await waitForProcessGroup(wrapperPid, 1_000);` (the clear form is at `src/commands/stop.ts:46-50`).
  - `src/runtime/wrapper.ts:258` — `` await appendFile(`${jobDir}/log`, `${(seen.activity = event.name)}\n`) ``.
  - `src/runtime/wrapper.ts:161-214` — a 45-line `void (async () => { … })()` inside `setInterval`, with one three-line block repeated at 164-167, 199-202, and 205-208.
- **Done when:** no cited line uses a comma operator or an assignment inside an expression; each timer body is a named function.
- **From:** T4 R3.

### 28 · The hosted note says in plain words what a hosted job lacks, and is true for group members

- **Priority:** P2.
- **What and why:** Every hosted job record and the manual say "no F007 process containment" with a bare feature number, and group members read "No 90-minute timeout" though they have a recorded deadline.
- **Depends on:** spec 10, which edits the same hosted paragraph of `templates/agents.md`.
- **Scope:** both. `src/commands/spawn.ts:59-60` (`HOSTED_NOTE`, also written by `src/commands/continue.ts:155`), `templates/agents.md:95`, `docs/remote.md:84`.
- **Evidence:**
  - `src/commands/spawn.ts:59-60` — "Hosted job: weaker guarantees. No 90-minute timeout, no tool-call cap, no F007 process containment. …".
  - `docs/groups.md:55` — "hosted supervision enforce[s] the recorded deadline".
  - `docs/remote.md:84` — "(already true as of `c316fce`)".
- **Done when:** the note says "no process-group containment (stop cannot kill child processes the agent started)"; a group member's note gives its deadline; no shipped template, doc, or job file names a feature number or hash without its meaning.
- **From:** T1 spec 8.

### 29 · `limen init` ends with the next step

- **Priority:** P2.
- **What and why:** `init` ends with `ready .limen/jobs` and says nothing about the next step, and it succeeds silently in a repository with no commit, where no worker can start.
- **Depends on:** spec 15, so both commands use the same no-commit sentence.
- **Scope:** code. `src/commands/init.ts:66`.
- **Evidence:**
  - `src/commands/init.ts:66` — `console.log("ready .limen/jobs")`.
  - `README.md:46-56` and `docs/setup.md:44-53` — the next steps exist only in the docs.
- **Done when:** init ends with `next: write spec/vision.md and .agents/limen/styleguide.md, commit, then open a coordinator in this folder (docs/setup.md)`, and adds the no-commit line when `HEAD` has no commit.
- **From:** T2-16.

### 30 · `limen jobs` answers the question that was asked

- **Priority:** P2.
- **What and why:** An unknown ID gets `no jobs` and exit 0 in an empty plant but `no job matches` and exit 1 elsewhere, and the default snapshot lists every empty terminal job of any age, while `status` keeps a 7-day window.
- **Depends on:** none.
- **Scope:** code. `src/commands/jobs.ts:25-30,80-86`.
- **Evidence:**
  - `src/commands/jobs.ts:25-28` — prints `no jobs` before the lookup at `:29-30`.
  - `src/commands/jobs.ts:80-86` — renders every empty terminal job; 17 such rows follow the running jobs here, oldest first.
  - `src/commands/status.ts:18,78` — `RECENT_MS` is 7 days.
- **Done when:** `limen jobs nope` exits 1 with `no job matches "nope"` in any plant; the snapshot hides empty jobs older than 7 days and says `N older empty jobs hidden`.
- **From:** T2-12.

### 31 · A job's detail shows finish-delivery facts in plain words, and only when they mean something

- **Priority:** P2.
- **What and why:** `limen jobs <id>` shows a finish-webhook block of internal terms on a running job, and a hosted job's `log:` block is 20 lines of single activity words.
- **Depends on:** none.
- **Scope:** code. `src/commands/jobs.ts:136,184,271-275`, `src/integrations/finish-receipt.ts:46-84`.
- **Evidence:**
  - `src/integrations/finish-receipt.ts:53-55,72,83-84` — lines such as "transport: unknown (no per-target evidence)" and "bot-turn: unobserved (no matching completed-turn export from an operator-trusted source)", shown on a running job.
  - `src/commands/jobs.ts:271-275` — the log tail: `think`, `read`, `wait`, `think`, `bash`, … (20 lines).
- **Done when:** the finish-webhook block appears only for a terminal job; each term has a plain gloss; a hosted log reads `recent activity: think, read, bash (20 events)`.
- **From:** T2-13.

### 32 · A mode is a named union, not a positional boolean

- **Priority:** P2.
- **What and why:** Calls such as `renderJobDirectory(root, jobsRoot, id, false, true)` do not say what `false, true` means, though the repo already passes modes as string unions elsewhere.
- **Depends on:** spec 10, which removes the `hostedTerminalReason(status, true)` calls.
- **Scope:** code. `src/commands/jobs.ts:66-105`, `src/commands/status.ts:58`, `hook/wake.ts:243,295,381-387`, `src/runtime/supervisor.ts:120`, `src/runtime/recovery.ts:57,61`.
- **Evidence:**
  - `src/commands/jobs.ts:105` — `detailed: boolean, human = false` (three modes as two booleans).
  - `hook/wake.ts:381-387` — `sendCompletion(jobs, id, state, false)` and `(…, true)`, where the boolean means `fallback`.
  - `src/runtime/recovery.ts:57,61` — `hostedAgentStatus(target, true)`, `locateHostedAgent(target, engine, name, true)`.
- **Done when:** each cited call passes a named mode, for example `"row" | "human" | "detail"` or `"own" | "fallback"`.
- **From:** T4 R5.

### 33 · A group member can read any job record and is refused only for control

- **Priority:** P2.
- **What and why:** Inside a group, read-only `limen jobs <id>` and `limen diff <id>` are refused for another team's job with the words "take over", though members must read peer evidence.
- **Depends on:** none.
- **Scope:** code. `src/job/lookup.ts:14-17` and the commands that change a job: `stop`, `steer`, `continue`, `land`, `watch`.
- **Evidence:**
  - `src/job/lookup.ts:14-17` — the team check runs inside `resolveJob`, which every command calls; output "group members cannot take over jobs outside their own team".
  - `docs/groups.md:37` — "Group members cannot use `limen land`, owner steering, or job controls against another team's jobs."
- **Done when:** a member can run `limen jobs` and `limen diff` on any job; `stop`, `steer`, `continue`, and `land` refuse with `group members cannot stop, steer, continue, or land another team's job`.
- **From:** T2-14.

### 34 · The wake delivery record has one home

- **Priority:** P2.
- **What and why:** The hook owns the names and rules of the `notify/` files that record who heard a job, and `limen sweep` writes the same rule again with its own string prefixes.
- **Depends on:** spec 4, because both cut `hook/wake.ts` and the wake text moves first; spec 3, because this spec adds `src/job/wake-delivery.ts`.
- **Scope:** code. Move `hook/wake.ts:675-682,773-987` to a new `src/job/wake-delivery.ts`; `src/commands/sweep.ts` imports `receiptFamily`. In the same change, write `src/commands/sweep.ts:26-51` with one declaration per line, one branch per event kind, and the name `running` (not `advisory`) for the running check.
- **Evidence:**
  - `hook/wake.ts:982-987` — `receiptFamily(slot)`: `"_advisory" | "_uncertainty" | "_completion"`.
  - `src/commands/sweep.ts:43` — `!delivered.some((name) => !name.startsWith("_advisory.") && !name.startsWith("_uncertainty."))` (the same rule, written again).
  - `src/commands/sweep.ts:36` — `const advisory = state === "running"` (the name says advisory; the value says running).
- **Done when:** one file owns the `notify/` slot names and rules; sweep imports them; with spec 4, `hook/wake.ts` drops to about 760 lines.
- **From:** T3 spec 7, with the sweep parts of T4 R3, R8, and R9.

### 35 · A limit used more than once in a file has one name

- **Priority:** P2.
- **What and why:** The same limit appears as two to eight bare literals in one file, sometimes inside operator text, so a change to one copy leaves the others stale.
- **Depends on:** spec 34, because the eight wake-attempt literals move with it; spec 10, which names the supervisor's missing-sample count.
- **Scope:** code. `src/job/wake-delivery.ts` (after spec 34), `hook/wake.ts:95,101`, `hook/hosted.ts:53,68`, `src/commands/group.ts:92,128,169-219`, `src/integrations/github-poller.ts`, `src/commands/jobs.ts:61,67`, `src/job/group-events.ts:128-129`, `bin/tony-finish-ping.sh:133`.
- **Evidence:**
  - `hook/wake.ts:783,808,881-896` — the wake-attempt ceiling `2` appears 8 times; at `:808` the same `2` has a different meaning.
  - `src/commands/group.ts:169,170,190,219` — `20_000` four times, plus "after the 20-second CLI cap" in the text at `:188`.
  - `src/integrations/github-poller.ts:130-490` — the page size `100` appears eight times.
- **Done when:** each cited limit is one `const` at the top of its file and is used at every site. Values that two files share belong to spec 41.
- **From:** T4 R6.

### 36 · A nested ternary never chooses a mode, a message, or a state

- **Priority:** P2.
- **What and why:** About 33 nested ternaries pick behavior, so a reader must evaluate every branch where an `if` chain or a lookup list reads in one pass.
- **Depends on:** spec 4, which moves the wake paragraph at `hook/wake.ts:620-626` to `src/job/wake-text.ts`; spec 10, which owns the supervisor ternaries.
- **Scope:** code. `src/integrations/finish-webhook.ts:31-39,191-198`, `src/commands/github.ts:120-126,144`, the wake paragraph in `src/job/wake-text.ts`, `src/commands/picture.ts:23`, `src/runtime/stream.ts:66-73`, `src/picture/picture-model.ts:294,297,365`, `hook/wake.ts:575`, `src/commands/spawn.ts:136,213`, `src/runtime/contain.ts:67`.
- **Evidence:**
  - `src/integrations/finish-webhook.ts:31-39` — four levels: `message.includes("shallow") ? "shallow history" : message.includes("not a committed file") ? "uncommitted ticket" : …`.
  - `src/commands/github.ts:120-126` — flags checked by array position: `flags.length !== (mode === "work" ? 10 : 8) || [...].some((flag, index) => flags[index * 2] !== flag || …)`.
  - `hook/wake.ts:620-626` — three levels pick a wake paragraph; each branch is over 200 characters.
- **Done when:** no cited site nests a ternary; `src/commands/github.ts` reads flags by name, as `src/commands/group.ts:25-52` does.
- **From:** T4 R4.

### 37 · One rule decides whether a feature is closed and which feature a job belongs to

- **Priority:** P2.
- **What and why:** `limen close` and the wake footer each walk `spec/features/{done,dropped}` and match a job to a feature differently, so a job labelled `F100 follow-up for F099` loses its tabs on `limen close F099` but stays in the footer.
- **Depends on:** none.
- **Scope:** code. `src/integrations/herdr.ts:448-473,621-631`, `hook/wake.ts:717-741`. Home: `src/job/job.ts`.
- **Evidence:**
  - `src/integrations/herdr.ts:458` — `` new RegExp(`\\b${feature}\\b`, "i").test(…) `` (any match).
  - `hook/wake.ts:740` — `` /\bF\d+\b/i.exec(`${label}\n${id}`)?.[0] `` (first match only).
  - `src/integrations/herdr.ts:621-631` and `hook/wake.ts:721-732` — two walks of the same lanes.
- **Done when:** `limen close` and the footer call one function and agree for a label that names two features.
- **From:** T3 spec 8.

### 38 · The shop manual states which code reads the feature lanes

- **Priority:** P2.
- **What and why:** The manual says that nothing reads the lanes as workflow state, but `limen close` and the tab tail both read them, and two other lines of the same manual say so.
- **Depends on:** none. Spec 37 changes the code that this sentence describes; the new sentence stays true either way.
- **Scope:** docs. `templates/agents.md:57`.
- **Evidence:**
  - `templates/agents.md:57` — "These lanes and dates organize human history only. Nothing parses them as workflow state, validates moves, or blocks work."
  - `src/integrations/herdr.ts:449-451` — `limen close` refuses with "`${feature} is not in done/ or dropped/; leftover tabs stay`".
  - `hook/wake.ts:717-741` — the footer drops finished jobs whose feature is in `done/` or `dropped/`.
- **Done when:** line 57 says "Two displays read the lanes: `limen close` and the tab tail treat a feature in `done/` or `dropped/` as closed. Nothing validates moves or blocks work."
- **From:** T1 spec 9.

### 39 · One rule picks the Herdr binary and whether Herdr is off

- **Priority:** P2.
- **What and why:** Nine places choose the Herdr binary with three rules, and three of them have no off check, so `LIMEN_HERDR=0` would run a binary named `0`.
- **Depends on:** none.
- **Scope:** code. Export `herdrBinary()` from `src/integrations/herdr.ts:515-523`. Use it in `src/commands/github.ts:56,171`, `src/commands/github-doctor.ts:287`, `src/commands/spawn.ts:512-515`, `src/commands/status.ts:132`, `src/project/seat.ts:32`, `src/integrations/coordinator-wake.ts:16`, `hook/hosted.ts:126`, `hook/wake.ts:1031`.
- **Evidence:**
  - `src/integrations/herdr.ts:516-518` — `const override = process.env.LIMEN_HERDR?.trim(); if (override === "0") return;`
  - `src/commands/github.ts:56` — `spawnSync(process.env.LIMEN_HERDR || "herdr", ["agent", "get", …])` (no off check).
- **Note:** `src/commands/github-doctor.ts:287` checks a root-owned seat binary and may stay explicit.
- **Done when:** every Herdr call site treats `LIMEN_HERDR=0` the same way.
- **From:** T3 spec 9.

### 40 · GitHub record helpers leave the command file, and the poller stops loading spawn

- **Priority:** P2.
- **What and why:** Shared GitHub record helpers live in `src/commands/github.ts`, which makes two import cycles and makes the isolated poller process load `src/commands/spawn.ts` and its whole import graph without calling it.
- **Depends on:** none.
- **Scope:** code. Move `src/commands/github.ts:12-36` into `src/integrations/github-review.ts`. Move `startGithubJob` (`src/integrations/github-review.ts:59-131`) into `src/commands/github.ts`.
- **Evidence:**
  - `src/integrations/github-poller.ts:6` — `import { claimId, claimPath, type GithubBinding, githubDir, originRepository, readBinding } from "../commands/github.ts";`, while `src/commands/github.ts:7` imports `pollGithub` back.
  - `src/integrations/github-review.ts:4-5` — imports `githubDir` from `commands/github.ts` and `spawnCommand` from `commands/spawn.ts`.
- **Done when:** `github-poller.ts` and `github-review.ts` import nothing from `src/commands/`, and no import cycle remains between the GitHub files.
- **From:** T3 spec 10.

### 41 · A value that two files must agree on has one owner

- **Priority:** P2.
- **What and why:** Some literals are contracts between a writer and a reader in different files, and three of them guard a trust or file-system boundary, so one changed copy would fail silently.
- **Depends on:** spec 40, because the GitHub claim constants live in `src/integrations/github-review.ts` after it.
- **Scope:** code. Export each value from the file that writes the record, and import it where it is read: the GitHub answer cap and nonce size; the finish receipt limits and the GitHub login pattern (`src/integrations/finish-receipt.ts`, `finish-turn.ts`, `finish-webhook.ts`, `src/commands/ticket-author.ts`); `TERMINAL_STATES` from `src/job/job.ts` (11 sites); one session-ID pattern (9 sites). `bin/tony-finish-ping.sh` keeps its literal with a comment that names the TypeScript constant.
- **Evidence:**
  - `src/commands/github.ts:92-93` — `rest[3].length > 1600` and "up to 1600 characters"; the reader `src/integrations/github-poller.ts:196` checks `outcome.answer.length <= 1600`.
  - `src/commands/stop.ts:66` — `/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/` guards `mkdir(…/notify/delivered/${session})`; the same pattern appears in 9 places across 8 files.
  - `src/commands/wait.ts:59-61` — `["done", "failed", "stopped"]` written out again (also `src/job/record.ts:34,87`, `hook/wake.ts:1060`).
- **Done when:** each cited value has one named owner, and each pattern appears once in `src/` and `hook/`.
- **From:** T4 R7, with T3's suggestion to export the terminal check from `src/job/job.ts`.

### 42 · The hosted ownership check lives with the hosted binding

- **Priority:** P2.
- **What and why:** `src/integrations/herdr.ts` decides whether a pane is still owned by this job's engine session, though that check reads records that `src/runtime/hosted-binding.ts` and `hook/hosted.ts` own.
- **Depends on:** spec 2, which narrows when the ownership note exists, so this move carries settled code.
- **Scope:** code. Move `src/integrations/herdr.ts:266-300` into `src/runtime/hosted-binding.ts`. Update `src/runtime/supervisor.ts`, `src/runtime/recovery.ts`, and two tests.
- **Evidence:**
  - `src/integrations/herdr.ts:267-289` — `const binding = readHostedBinding(jobDir); … readFileSync(\`${jobDir}/engine-session\`, "utf8")`.
  - `hook/hosted.ts:120` — writes the same `engine-session` record.
- **Done when:** `herdr.ts` holds only Herdr calls, and the ownership check sits next to the binding reader.
- **From:** T3 spec 11.

### 43 · A name says what it holds

- **Priority:** P2.
- **What and why:** A few names point at the wrong thing, and one mode has two names: the vision says "A tab is not the job", but spawn calls hosted mode `tab`.
- **Depends on:** spec 42, so the `"pi" | "omp"` spellings change in their new home; spec 39, which edits `src/commands/spawn.ts:512-515`, where `extra` is.
- **Scope:** code. `src/commands/spawn.ts:109,227,260,515`, `src/commands/continue.ts:59`, `src/picture/picture-model.ts:274-276,519-563`, the hosted-binding code that spec 42 moves.
- **Evidence:**
  - `src/commands/spawn.ts:109` — `const tab = parsed.detached ? false : parsed.tab || herdr;`, while `src/commands/continue.ts:59` calls the same decision `hosted` and the record file is `hosted`.
  - `src/picture/picture-model.ts:274-276` — `d` is frontmatter data, read about 12 times over 120 lines; `e` is an error here and an edge in `buildEdges`.
- **Done when:** spawn uses `hosted` for the resolved mode (the `--tab` flag keeps its name); picture-model uses `data`, `error`, and `edge`; `extra` is `herdrVersion`; `engine` uses `EngineId`.
- **From:** T4 R9. The sweep rename moved to spec 34.

### 44 · The picture model exports only what other files use

- **Priority:** P2.
- **What and why:** Twelve exports of `src/picture/picture-model.ts` have no caller outside the file, which hides the real contract.
- **Depends on:** none.
- **Scope:** code. `src/picture/picture-model.ts`. Keep `buildModel`, `PictureFile`, `Diagnostic`, and `PictureModel`.
- **Evidence:**
  - `src/picture/picture-model.ts:119-124` — `export const INPUT_SCHEMA … export const ID_PATTERN`; `grep -rlw` over `src hook bin test` finds them only in this file.
  - `src/picture/picture-model.ts:37,398` — `export interface PictureNode` and `export function splitOwner` have no outside caller.
- **Done when:** only the four used names are exported.
- **From:** T3 spec 12.

### 45 · Code calls the function or constant that already exists

- **Priority:** P2.
- **What and why:** A few places inline a copy of a function or path that the same module already names, so the two copies can drift.
- **Depends on:** none.
- **Scope:** code. `src/picture/html.ts:35`, `src/integrations/github-poller.ts:170,207,355`, `hook/communication.ts:96,99`.
- **Evidence:**
  - `src/picture/html.ts:35` — a four-step `.replace` chain, while `src/picture/markdown.ts:268-270` exports `escapeHtml`.
  - `src/integrations/github-poller.ts:355` — `` excerpt.length > 12000 ? `${excerpt.slice(0, 12000)}\n[Discussion truncated; see ${link}]` : excerpt `` is `boundedContext(excerpt, 12000, "Discussion", link)` (`:50-52`).
  - `hook/communication.ts:96,99` — literal paths, while `:16-17` define `VISION_FILE` and `STYLE_FILE`.
- **Done when:** each cited place calls the existing name.
- **From:** T4 R10.

### 46 · Git output parsing says which prefix each offset skips

- **Priority:** P2.
- **What and why:** `src/project/git.ts` parses Git output with bare offsets, so a reader must count characters to check them.
- **Depends on:** none.
- **Scope:** code. `src/project/git.ts:47,63,66,114-115`.
- **Evidence:**
  - `src/project/git.ts:114-115` — `field.slice(9)` and `field.slice(18)` (`"worktree ".length`, `"branch refs/heads/".length`).
  - `src/project/git.ts:47` — `line.slice(line.indexOf(" ") + 12)`.
- **Done when:** each offset is written as `"<prefix>".length` or a split, and the one-day margin at `:63` has a name or a comment.
- **From:** T4 R11.

### 47 · Small subtractions found while reading

- **Priority:** P2.
- **What and why:** One predicate has two names, a file header names the wrong caller, and a retry and a third return value look like mistakes because nothing explains them.
- **Depends on:** none.
- **Scope:** code. `src/picture/frontmatter.ts:2,29-35,332-334`, `src/project/git.ts:189-190`, `src/integrations/herdr.ts:153-186`.
- **Evidence:**
  - `src/picture/frontmatter.ts:332-334` — `isBlankOrComment(line)` only returns `isCommentOrEmpty(line)`.
  - `src/project/git.ts:189-190` — `let result = run(gitBin || "git"); if (miss(result.error)) result = run(gitBin || "git");` (a deliberate ENOENT retry with no comment).
  - `src/integrations/herdr.ts:153-186` — `locateHostedAgent` can return `"unknown"`, and its doc comment does not say so.
- **Done when:** one predicate name remains; the header names `picture-model.ts`; the retry and the `"unknown"` result each have one comment line.
- **From:** T4 R12.

### 48 · The group lead's finish bell does not search ticket prose

- **Priority:** P2.
- **What and why:** When a group lead finishes a step, the bell runs a regex over the ticket and the brief to add "The feature says do not land", which is a parser for Markdown that the human owns, though the handoff already never suggests landing.
- **Depends on:** none.
- **Scope:** code. `src/integrations/finish-webhook.ts:120-123` and its test.
- **Evidence:**
  - `src/integrations/finish-webhook.ts:120-123` — `/\b(?:do not|don't|never|not to) land\b/i.test(packet.join("\n")) ? " The feature says do not land." : ""`.
  - `.agents/limen/styleguide.md:22` — avoid "parsers for Markdown the human already owns".
- **Done when:** the lead-step handoff is the same for every feature and never contains "land it".
- **From:** T1 spec 10.

### 49 · `limen <command> --help` shows that command's usage

- **Priority:** P2.
- **What and why:** `--help` after any command prints the whole 42-line global help, so picture's own help cannot be reached, and the github usage error omits three subcommands.
- **Depends on:** none. Spec 50 uses the same github subcommand list.
- **Scope:** code. `src/main.ts:108-138`, `src/commands/picture.ts`, `src/commands/github.ts:177`.
- **Evidence:**
  - `src/main.ts:134-138` — prints `HELP` for any `--help`; `limen picture --help | wc -l` gives 42.
  - `src/commands/github.ts:177` — "github takes connect, disconnect, status, doctor, ensure, or poll" (no `review`, `work`, or `resolve`).
- **Done when:** `limen picture --help` prints only the `limen picture` lines; the github help lines sit together; the github error lists every subcommand.
- **From:** T2-17.

### 50 · The command reference lists every command and flag, and the manual's group section points to the group guide

- **Priority:** P2.
- **What and why:** `docs/commands.md` omits `limen planning` and `group start --team-model`, and the manual's group section omits `--team-model` and restates member rules that `docs/groups.md` and the member preamble already own.
- **Depends on:** spec 49, because both use the same github subcommand list and help text.
- **Scope:** docs. `docs/commands.md`, `templates/agents.md:21-33`.
- **Evidence:**
  - `docs/commands.md:103-161` — no entry for `limen planning [committed|private]`, which `limen --help` prints.
  - `templates/agents.md:27` — `group start` without `--team-model`, which `docs/groups.md:27` documents.
  - `templates/agents.md:29,33` — restate `templates/group-member.md:3,7` and `docs/groups.md:67-70`.
- **Done when:** every flag that the argument parsers accept appears in `docs/commands.md`; no member rule appears in two templates.
- **From:** T1 spec 14.

### 51 · One sentence describes what `prune --retire` deletes

- **Priority:** P2.
- **What and why:** Four places describe the retire rule in three ways, and "merged or dropped" borrows a feature-lane name though the code never reads the lanes.
- **Depends on:** spec 49, which edits the same help text in `src/main.ts`.
- **Scope:** docs and help. `templates/agents.md:106`, `docs/jobs.md:102`, `docs/herdr-status.md:13-15`, `src/main.ts:100`.
- **Evidence:**
  - `templates/agents.md:106` — "whose branches are merged or dropped".
  - `src/main.ts:100` — "landed (ancestry or cherry-pick) or gone".
  - `src/commands/prune.ts:31,52-55` — reads no lane.
- **Done when:** all four places say "deletes finished, failed, or stopped job records whose branch is landed (ancestor or cherry-pick) or deleted."
- **From:** T1 spec 15.

### 52 · The Linear ritual uses the manual's label shape

- **Priority:** P2.
- **What and why:** The Linear ritual prints `--label "FNNN <short name>"`, the number-first shape that the manual calls bad. Only projects with the Linear mirror see it.
- **Depends on:** none.
- **Scope:** templates. `templates/linear.md:47`.
- **Evidence:**
  - `templates/linear.md:47` — `--label "FNNN <short name>"`.
  - `templates/agents.md:85` — "the feature number goes last, not first".
- **Done when:** every shipped label example ends with `· FNNN`.
- **From:** T1 spec 12.

### 53 · Package text names roles, not this owner's people

- **Priority:** P2.
- **What and why:** Package defaults that every project inherits name Adam, Tony, and Shepherd, and these names mean nothing in another project.
- **Depends on:** none.
- **Scope:** docs and templates. `templates/agents.md:13,17`, `templates/worker.md:29`, `docs/herdr-status.md:104`, and the personal names in `docs/finish-webhooks.md`.
- **Evidence:**
  - `templates/agents.md:13` — "Shepherd talks to the coordinator."
  - `templates/agents.md:17` — "| Tony spawns a coordinator |".
  - `docs/herdr-status.md:104` — "## Candidate awaiting Adam is not landed work".
- **Done when:** `grep -rn 'Adam\|Tony\|Shepherd' docs/*.md templates/` returns only the finish-ping script path, with what the script does beside it.
- **From:** T1 spec 13.

### 54 · Three small doc facts match the code

- **Priority:** P2.
- **What and why:** A guide links a scenario file that moved, the contributor guide's hook list omits a hook, and the README promises a checks section that the styleguide template does not have.
- **Depends on:** none.
- **Scope:** docs. `docs/groups.md:102`, `CONTRIBUTING.md:24`, `README.md:50` or `templates/styleguide.md`.
- **Evidence:**
  - `docs/groups.md:102` — "Follow `spec/features/active/F740-collaborative-groups/scenario.md`"; the folder is now in `done/2026-10/`.
  - `CONTRIBUTING.md:24` — lists four hooks; `templates/limen-extension.ts:8` also loads `group-peer`.
  - `README.md:50` — "code structure, conventions, and required checks"; `templates/styleguide.md` has no place for checks.
- **Owner decision:** drop "and required checks" from the README, or add one checks bullet to the template.
- **Done when:** each of the three lines is true.
- **From:** T1 spec 17.

### 55 · Operator guides describe current behavior first; the mechanics come last

- **Priority:** P2.
- **What and why:** Three guides put mechanics and slice history where an operator looks for steps: ownership in the register of a commit message, "when this lands" migration notes, and lock and lease detail inside the start, stop, and close steps.
- **Depends on:** spec 2 (shrinks the ownership paragraphs), spec 22 (Pi wording in the same guides), spec 50 (the group section split), spec 53 (personal names), and spec 54 (the `docs/groups.md` link). Each edits the same pages first.
- **Scope:** docs. `docs/jobs.md:131-133`, `docs/finish-webhooks.md`, `docs/groups.md:59-88`.
- **Evidence:**
  - `docs/jobs.md:131-133` — "the Pi hook binds the controlled launch, canonical job/session, initial pane, shell parent identity, engine PID/birth and boot ID in exclusive records …".
  - `docs/finish-webhooks.md:22,27` — "The retired `TONY_*` keys stop working when this lands", "remain unchanged in this slice".
  - `docs/groups.md:59-74` — "a delivery claim that has not yet proved transport acceptance".
- **Done when:** each guide opens with operator steps in plain words; slice-history sentences are gone; mechanics sit under one closing "How it works" heading with a one-line gloss for each term.
- **From:** T2-15.

### 56 · The board keeps ten entries under PROVEN

- **Priority:** P2.
- **What and why:** The manual says PROVEN keeps the last ten landed features and folds older ones into month lines, but the board has 31 PROVEN entries.
- **Depends on:** none. This is a coordinator board edit, not a worker job.
- **Scope:** docs. `spec/build.md:48-82`.
- **Evidence:**
  - `templates/agents.md:150` — "PROVEN keeps the last ten landed features; if that window is exceeded, fold the oldest entries into their month line in the same change".
  - `spec/build.md:50-80` — 31 `🟢 PROVEN` bullets (count checked again on 2026-10-05).
- **Done when:** PROVEN lists ten entries, followed by month lines.
- **From:** T1 spec 11.
