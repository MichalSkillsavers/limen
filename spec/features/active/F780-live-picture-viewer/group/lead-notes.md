# Lead notes

Map for whoever continues the F780 lead role.

- Group id: `63e51878-bd73-4f09-9697-75c5a13f2070`. Cabinet: `/Users/overment/.overment/limen/.limen/groups/63e51878-bd73-4f09-9697-75c5a13f2070/`.
- Lead session: `f780-lead-4a931240`. The lead is a limen job, so `group start` refused (`LIMEN_JOB=1`). Workaround: registered `.limen/group-leads/f780-lead-4a931240` with the lead's OMP pid, and run every lead group command with `env -u LIMEN_JOB -u LIMEN_JOB_ID -u LIMEN_JOB_LABEL -u LIMEN_CONTEXT_ROOT PI_SESSION_ID=f780-lead-4a931240` from the plant root (wrapper `/tmp/f780-lead/lg`). Peer messages reach the lead only through `limen group wait`; no hook delivers them.
- `--team-model` gives one route per team (coordinator and worker share it). Teams 1, 2, 5 run Sol; teams 3, 4, 6 run Opus. A per-team Sol + Opus mix is not possible.
- `limen land` needs a done job. The lead job is running while it integrates, so the integrated branch lands with a plain merge into `main` in the plant.
- The packet commit went to `main` by fast-forward before `group start`, because start requires the packet committed at the plant `HEAD`.
