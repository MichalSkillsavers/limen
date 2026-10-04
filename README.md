<p align="center">
  <a href="https://mega.dev">
    <img src="docs/assets/mega-logo-badge.svg" alt="MEGA.dev" width="220" height="60">
  </a>
</p>

# Limen

Limen runs AI coding jobs in separate Git worktrees.
You talk to one coordinator in Herdr. It starts workers and reviewers.
Each job keeps its task, branch, log, state, and session.
You choose the work and approve merges.

Experimental software. Commands, prompts, and project files can change.

## Requirements

- macOS or Linux, with Node.js 24 or later and Git.
- OMP for the coordinator. Workers can use OMP or [Pi](https://pi.dev).
- Herdr for interactive job tabs.

Install and authenticate the engines before you start. Limen does not manage engine credentials.
See [setup and model configuration](docs/setup.md).

## Start

Install Limen and the Herdr integration once:

```bash
git clone https://github.com/overment/limen.git
cd limen
npm install
npm link
herdr integration install omp
```

Open a Herdr tab in your project’s Git repository. The repository must have at least one commit.
Start the coordinator:

```bash
cd /path/to/your-project
limen init
LIMEN_COORDINATOR=1 omp --provider <provider> --model <model> --thinking <level>
```

Replace the placeholders with your provider, model, and reasoning level.
Record the model choices for each role in `spec/build.md`.
The coordinator passes those choices to the CLI as command flags.
`limen init` preserves existing specs.

To update Limen, pull the package clone and use `/reload` in the coordinator session.
All projects on that computer use the same installed package.

## Work

1. Tell the coordinator the result you need.
2. The coordinator records a ticket, starts jobs, and requests review.
3. Inspect the result and approve the merge.

The specs describe the work. `spec/build.md` records its state.
A completed job does not prove that a feature is finished or that its branch is ready to merge.

Workers approve tools automatically and have the same access as your account.
A Git worktree is not a security sandbox. Read the [security notes](SECURITY.md).

## Picture

Run `limen init` in your project, then ask the coordinator:

> Create a Picture map from the code and specs, and open it in my browser.

See the [Picture guide](docs/picture.md) for navigation and updates.

## Documentation

| Topic | Guide |
| --- | --- |
| Setup, models, skills, and project files | [Setup](docs/setup.md) |
| Jobs, reviews, continuation, and recovery | [Jobs](docs/jobs.md) |
| CLI commands and options | [Command reference](docs/commands.md) |
| Code structure, features, and journeys | [Picture](docs/picture.md) |
| Several teams on one feature | [Team groups](docs/groups.md) |
| Remote jobs and GitHub requests | [Remote seats](docs/remote.md) |
| Job completion notifications | [Finish webhooks](docs/finish-webhooks.md) |
| Pane status and job status | [Herdr status](docs/herdr-status.md) |
| Optional Linear mirror | [Linear](templates/linear.md) |

See [Contributing](CONTRIBUTING.md) for development and checks.
Watch the [workflow walkthrough](https://mega.dev/autonomous-product-development) for a complete example.
