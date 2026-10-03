# F755 notes

## Seams

- Tab close on finish: `settleJobTab` in `src/integrations/herdr.ts` starts a detached `node --eval` that imports `closeJobTab` from the same module. Finalize does not wait. The closer logs `herdr tab close <tab>: closed | closed on retry | already closed | refused (...); retrying once | failed after one retry (...)`. After a failed retry it renames the tab to `<label> · <state>`.
- Running label: `openWatchTab` and `openHostedTab` create the tab as `<label> · running`. `openJobPlace` reopens as `<label> · <state>`.
- Coordinator title and job line: `hook/wake.ts`. `finishedJobs` builds the finished set; `finishedNow` caches it; `updateTabTail` writes the title tail; `jobDisplay` builds the footer and the Herdr pane label.

## Decisions

- Finished set: terminal state, not a group member, spawned from this tab (`origin-tab`) or watched by this session, not landed, not closed.
- Landed: the job has a non-empty `commits` file and `unlandedBranches` no longer lists its branch. A job without commits cannot land.
- Closed: the feature number in the label (or job id) has a folder in `spec/features/done/` or `dropped/`, or the record is gone (`limen prune --retire`). No new marker file.
- Title count ` · N finished`: finished jobs from this tab with `finished-at` at or after the owner's last message. An owner message is a user message that does not start with `Limen job ` (every Limen wake starts that way). The job line has no owner-turn filter; it names each finished job until it lands or closes.
- Word: the tail says `finished`, not `done`, because failed and stopped jobs count too. The ticket's ` · 1 done` was an example.
- Refresh: when a job leaves the running set, after each coordinator turn (`agent_settled`), and every 30 s. A land done by hand outside a coordinator turn can take up to 30 s to show.
- The running part of the job line is unchanged: short label (feature number or first word) plus pulse.

## Open

- Live hosted check on the plant (tab closes within 10 s of finish) needs the merged code installed. A real-Herdr smoke of `finalizeJob` on a scratch tab closed it 1.5 s after the done line.
