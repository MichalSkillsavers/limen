# Team 1 · Enforced by the harness

Hypothesis: a model with spare time will drift into building and verifying, whatever its template says. In both trials, Opus and GPT coordinators wrote code and test harnesses. So the manager role should be a boundary the harness enforces, and the prose should stay short.

- The group hook blocks file-writing tools for the coordinator role, the same way it already blocks built-in subagents. It also refuses check, test, and build commands from coordinators, with a message that says to launch a worker or reviewer instead.
- The terminal event delivers each member's report automatically, so the coordinator never needs to open job files.
- `group wait` blocks until an event, a stop, or the deadline, and the stall detector cannot kill it.
- The coordinator template shrinks to the loop: fan out, review, continue, integrate, Ready.

Publish this hypothesis before any other tool. Look for ways a guard could block legitimate manager actions, such as writing task files under `/tmp`, `git log`, reading results, or `limen continue`.
