---
touches:
  - limen.picture.viewer
opened: 2026-10-05
---

# F763 · Picture logs that a person can skim and an agent can read cheaply

## Outcome

Picture change logs are easy for a human to skim and cheap for an agent to read. The shape mixes the infrastructure graph with time (Map-with-time from F759), not a timeline-only page. Entries look like observational memory: dated blocks, clear severity, nested detail, and short labels so one glance names what happened and what matters.

Adam locked the preference for Map-with-time (F759) over Feature-timeline (F757) and gave this observational-memory example:

```
Date: 2026-01-15
- 🔴 12:10 User is building a Next.js app with Supabase auth, due in 1 week (meaning January 22nd 2026)
  - 🔴 12:10 App uses server components with client-side hydration
  - 🟡 12:12 User asked about middleware configuration for protected routes
  - 🔴 12:15 User stated the app name is "Acme Dashboard"
```

## Scope

- Start from the F759 synthesis: `spec/features/active/F759-graph-shows-what-to-decide/group/synthesis.md`, and from Adam’s observational-memory example above.
- Keep the infrastructure graph. Mix it with time. A timeline-only page is not acceptable unless a screenshot proves the graph must leave the first view.
- Recommend one file/spec shape for log entries (keys, types, where they live) and one navigation pattern (how a human and an agent move from overview to detail).
- Clear indicators and labels. Nested detail under a parent observation when needed.
- One self-contained HTML sample per team, opened from `file://`, on a `/tmp` copy of the Alice dataset.
- Playwright at 1440 × 900. Screenshots published like prior picture groups.

## Out of scope

- Edits to the live Alice map or any `.limen/picture/` dataset.
- Landing code on `main`. Merging F757 or F759 branches.
- A second change-tracking system. Code that interprets prose. Per-feature app code.

## Acceptance

- One recommended log/file shape: each key, where it lives, its type, and what the graph and the log show for it.
- One recommended navigation pattern for humans and agents.
- One HTML sample per team that opens from `file://`.
- The first view is skimmable: dated blocks, severity, and labels are readable without opening every entry.
- Each kept control and each cut names a screenshot path and what it showed.
- Plain technical English (about 80% of ASD-STE100).
