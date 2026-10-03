# Session review of both group trials

Thirteen sessions from 2026-09-30 were measured from their raw OMP transcripts: two leads, five coordinators and six workers, over the sssnark rounds 1 and 2. Four read-only reviewers read condensed transcripts, and this summary rechecked their load-bearing claims. The evidence and scripts are in `/tmp/review/` (stats, condensed transcripts, OMP docs).

## What the numbers say

| | Round 1 (2 teams, all GPT-6.1) | Round 2 (3 teams, Opus 5.5 + GPT-6.1, all xhigh) |
| --- | --- | --- |
| List-price cost | $7.0 | $37.5 |
| Model thinking vs tool time | 186 vs 15 min | 269 vs 33 min |
| Teams done → group closed | ~35 min | ~76 min |

- Model latency set the pace. The median turn took 19 s on GPT-6.1 xhigh (p90 69 s) and 5 s on Opus 5.5 xhigh (p90 16 s), with similar output per turn. Opus used more turns and more cache reads, so it cost 4–9× more per role.
- In round 2, coordinators cost more than their workers in every team ($18.7 against $14.7). About 40–47% of that went on browser harnesses and frame measurement. Three coordinators each wrote their own harness, and the lead derived a fourth.
- Checks ran at three levels. Round-2 team 1 ran check and build 29 times between its worker and coordinator. The lead then ran `npm ci`, check and build again for every candidate. The runs produced 1,113 screenshots and 124 MB of evidence.
- Polling was overhead:
  - Round-1 team-1's coordinator had 34 turns that only waited, re-reading 2.7M tokens. After OMP's loop detector fired, it cycled `--timeout` through 15–19 s so no two consecutive calls matched.
  - Round-2 team-3's coordinator had 34 such turns and re-read 6.3M tokens.
- The lead was the wall-clock bottleneck. After the teams finished, 72 of round 2's 76 minutes were model generation: re-verification, notes, a 360 s synthesis turn, and the close. Its notes contain about 157 run-together tokens such as `check28tests/preexisting20corewarnings`. They start at about 72k context and do not appear in the syntheses.
- Every coordinator in both rounds hit "spawn accepts a positional task or --task-file, not both". Round-2 coordinators also hit "unknown spawn option".

## What worked

- Independence: in round 2, 7 of 7 members published their hypothesis before seeing a peer's.
- The critique ring on screenshots changed all three round-2 builds:
  - team 1's round-over dim;
  - team 2's missing wall;
  - team 3's start screen.
- Coordinator review caught real defects: round 1's rival that never eats, and round 2's wrong highlight quote.
- Round 1's free-form findings produced three test fixtures and no game logic. Most other traffic was "confirmed independently" echo.

## The round-2 pick rests on one noisy sample

The lead ran one side-by-side pair per candidate. Teams 2 and 3 measured 100.0 and 99.9 ms against main's 83.4 ms, which is 6 frames against 5 at 60 Hz, while the machine's load was 46–68. Team 3's own matched pair was a tie at 133.4 against 133.4 ms. The owner-side tolerance of 2 ms (set by the operating coordinator) is smaller than one frame. In practice it meant "same frame count as main", so a single sample moved the rubric winner (25/30) below the landed candidate (22/30).

## Recommendations, ranked

1. **[architecture] Remove the worker layer.** Make each team one agent, and have the lead verify once. Two of three round-2 teams and both round-1 teams used a single worker. Coordinators mostly waited, re-checked and then edited anyway. A team that needs parallel slices can use OMP's native isolated subagents inside its own Limen job, rather than Limen workers with an allowance.
2. **[mechanism] Verify once, by script.** One shared, deterministic harness should ship with the ticket: its own Chrome and port per job, and a virtual clock where timing matters. A single command should run `npm ci`, check, build, size and core-diff checks for every candidate in parallel. The lead then scores and spot-checks the build it lands.
3. **[prompt] Gate rules for noisy measurements.**
   - Compare in whole frames.
   - Use at least three interleaved pairs.
   - Set the tolerance to at least one frame.
   - Escalate to the owner when no candidate can meet a criterion, or when the rubric winner loses a gate by one frame or less.
4. **[mechanism] Blocking wait.** `group wait` should block until an event or the deadline and be exempt from the idle-tool kill, or members should use OMP's native `wait`. Coordinators finish immediately after they publish Ready.
5. **[mechanism] Thinner messaging.**
   - Keep the structured critique ring.
   - Send lifecycle events to the lead only.
   - Workers receive their own team's traffic plus critiques addressed to their team.
   - A peer finding carries a fixture or a commit.
   - Replace the four delivery states with a per-recipient cursor.
6. **[model-choice] Put the strongest model on building, not on waiting.** Use Opus for visual iteration. GPT-6.1 is cheaper for bounded slices but slow per turn. The lead needs xhigh for scoring, and lower effort for landing, synthesis and close.
7. **[prompt] Lead notes record decisions only**, because the cabinet already keeps every event. Cap the synthesis at about 800 words.
8. **[mechanism] Launch ergonomics:**
   - accept a positional title alongside `--task-file`;
   - strip trailing punctuation from `Ticket:` paths;
   - support `--help`;
   - resolve `local://` paths;
   - print compact `group status`.

## Native OMP versus Limen

OMP 18.4.4 already provides:
- async subagents with isolated APFS-cloned workspaces and branch or patch merge;
- per-agent model and thinking levels;
- `agent://` peer messaging and `agent://all` broadcast;
- a blocking `wait`;
- request, runtime, concurrency and recursion limits;
- Agent Hub.

Limen adds what OMP lacks:
- members that survive a lead crash;
- Herdr tabs;
- the Pi engine;
- Git-backed job records;
- lead-owned landing;
- supervisor-enforced deadlines.

Group mode should keep only the cross-process layer: team launch, the cabinet for cross-team messages, verification, landing and close. It should stop rebuilding what the engine provides. Blocking native `task` inside groups, together with Limen's three-minute idle kill, is what produced the polling loops.
