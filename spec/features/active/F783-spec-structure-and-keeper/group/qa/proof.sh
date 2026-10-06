#!/usr/bin/env bash
# F783 keeper proof on a throwaway plant. Never touches the live plant.
#
#   proof.sh setup                 make /tmp/f783-proof/plant: Git repo, limen init, map, board, tickets
#   proof.sh spawn                 start one small real job (Sol, detached, 10m) and print its id
#   proof.sh keeper-early JOB      while JOB runs: limen keeper must refuse
#   proof.sh wait JOB              limen wait JOB
#   proof.sh break JOB             on JOB's branch: unknown touches id, no board line, ticket moved (map cites old path)
#   proof.sh land JOB              limen land JOB --yes (expect a refusal before the keeper)
#   proof.sh keeper JOB            limen keeper for JOB's ticket; prints the keeper job id
#   proof.sh check                 show the three links and the strict check on the plant's main
#   proof.sh scaffold              limen ticket new on the plant; strict check with no edit
#
# LIMEN_PKG picks the limen checkout under test (default: the checkout that holds this script).
# Every step appends the command and its real output to $PROOF/transcript.md.
set -uo pipefail

PROOF=/tmp/f783-proof
PLANT=$PROOF/plant
MAP=$PLANT/.limen/picture
TICKET_OLD=spec/features/planned/F002-plant-greeting/ticket.md
TICKET_NEW=spec/features/active/F002-plant-greeting/ticket.md
LIMEN_PKG=${LIMEN_PKG:-$(git -C "$(dirname "$0")" rev-parse --show-toplevel)}
ROUTE=(--engine omp --provider openai-codex --model gpt-6-sol --thinking low)
LOG=$PROOF/transcript.md

# Jobs on the plant call `limen` from PATH; this shim makes that the checkout under test, not the live install.
mkdir -p "$PROOF/bin"
printf '#!/bin/sh\nexec node "$LIMEN_PACKAGE/bin/limen" "$@"\n' >"$PROOF/bin/limen"
chmod +x "$PROOF/bin/limen"

# The plant must not inherit this session's group or job identity, the owner's seat registry, or Herdr.
limen() {
	env -u LIMEN_GROUP_ID -u LIMEN_JOB -u LIMEN_JOB_ID -u LIMEN_JOB_LABEL -u LIMEN_CONTEXT_ROOT -u LIMEN_TEAM_ID \
		-u HERDR_ENV -u HERDR_PANE_ID -u HERDR_TAB_ID -u PI_SESSION_ID \
		LIMEN_HOME="$PROOF/home" LIMEN_HERDR=0 LIMEN_PACKAGE="$LIMEN_PKG" PATH="$PROOF/bin:$PATH" \
		node "$LIMEN_PKG/bin/limen" "$@"
}

# shown ARG...: the command as a reader can paste it, single-quoting words with spaces or shell characters.
shown() {
	local word line=
	for word in "$@"; do
		if [[ $word =~ ^[A-Za-z0-9_./:=@,+%-]+$ ]]; then line+="$word "
		elif [[ $word != *"'"* ]]; then line+="'$word' "
		else line+="$(printf '%q' "$word") "; fi
	done
	printf '%s' "${line% }"
}

# run DIR CMD...: print and record the command, its output and its exit code.
run() {
	local dir=$1
	shift
	local out code
	out=$(cd "$dir" && "$@" 2>&1)
	code=$?
	{
		printf '\n```console\n$ cd %s && %s\n' "$dir" "$(shown "$@")"
		[ -n "$out" ] && printf '%s\n' "$out"
		printf '[exit %s]\n```\n' "$code"
	} | tee -a "$LOG"
	return "$code"
}

note() { printf '\n%s\n' "$*" | tee -a "$LOG"; }

job_file() { cat "$PLANT/.limen/jobs/$1/$2" 2>/dev/null; }

setup() {
	case $PLANT in /tmp/f783-proof/*) rm -rf "$PLANT" "$PROOF/home" "$PROOF/.plant-limen-worktrees" ;; *) exit 2 ;; esac
	mkdir -p "$PLANT" "$PROOF/home"
	: >"$LOG"
	note "## setup ($(date '+%Y-%m-%d %H:%M:%S %Z'), limen package $LIMEN_PKG at $(git -C "$LIMEN_PKG" rev-parse --short HEAD))"
	git -C "$PLANT" init -q -b main
	git -C "$PLANT" config user.name "F783 proof"
	git -C "$PLANT" config user.email "f783-proof@example.invalid"
	printf '#!/bin/sh\necho "Hello"\n' >"$PLANT/greet.sh"
	chmod +x "$PLANT/greet.sh"
	printf '# Greeter\n\nA throwaway plant for the F783 spec keeper proof. Run ./greet.sh.\n' >"$PLANT/README.md"
	run "$PLANT" limen init

	cat >"$PLANT/spec/build.md" <<'EOF'
# Build

## TRACK

- Throwaway plant for the F783 spec keeper proof.

## NOW

## NEXT

- `F002-plant-greeting` (🔴 PLANNED): the greeting names the plant.

## PROVEN

- `F004-greeting-script` (🟢 PROVEN): `greet.sh` prints a greeting.
EOF

	mkdir -p "$PLANT/spec/features/planned/F002-plant-greeting" "$PLANT/spec/features/done/2026-09/F004-greeting-script"
	cat >"$PLANT/$TICKET_OLD" <<'EOF'
---
touches:
  - limen.commands
opened: 2026-10-06
---

# F002 · The greeting names the plant

## Outcome

Running `./greet.sh` prints `Hello, plant.` instead of `Hello`. A reader of the proof sees which plant answered.

## Scope

- The one echo line in `greet.sh`.

## Out of scope

- The README.

## Acceptance

- `./greet.sh` prints `Hello, plant.`
EOF
	cat >"$PLANT/spec/features/done/2026-09/F004-greeting-script/ticket.md" <<'EOF'
---
touches:
  - limen.commands
opened: 2026-09-20
landed: 2026-09-21
---

# F004 · A script prints a greeting

## Outcome

Running `./greet.sh` prints a greeting.

## Scope

- `greet.sh`.

## Out of scope

- Arguments.

## Acceptance

- `./greet.sh` prints `Hello`.
EOF

	# Map: ids, kinds, parents and titles copied from the live plant map; sources and bodies trimmed to this plant.
	mkdir -p "$MAP/nodes" "$MAP/features"
	cat >"$MAP/nodes/limen.plant.md" <<'EOF'
---
schema: architecture-map/1
kind: plant
id: limen.plant
project: limen
title: Limen coding-job plant
status: partial
parent: null
sources:
  - README.md
  - spec/vision.md
  - spec/build.md
---

A throwaway copy of the plant root, trimmed for the F783 keeper proof.
EOF
	cat >"$MAP/nodes/limen.commands.md" <<'EOF'
---
schema: architecture-map/1
kind: module
id: limen.commands
project: limen
title: Operator commands
status: ready
parent: limen.plant
sources:
  - greet.sh
---

The greeting script stands in for the operator commands.
EOF
	cat >"$MAP/nodes/limen.sessions.md" <<'EOF'
---
schema: architecture-map/1
kind: module
id: limen.sessions
project: limen
title: Agent session hooks
status: ready
parent: limen.plant
sources:
  - .omp/extensions/limen.ts
---

The project extension stub loads package hooks.
EOF
	cat >"$MAP/nodes/limen.sessions.guidance.md" <<'EOF'
---
schema: architecture-map/1
kind: module
id: limen.sessions.guidance
project: limen
title: Project guidance and role prompts
status: ready
parent: limen.sessions
sources:
  - spec/vision.md
  - .agents/limen/styleguide.md
---

Project Markdown owns durable intent and coding practice.
EOF
	cat >"$MAP/features/limen.feature.f002.md" <<'EOF'
---
schema: architecture-map/1
kind: feature
id: limen.feature.f002
project: limen
title: The greeting names the plant (F002)
status: partial
touches:
  - limen.commands
sources:
  - spec/features/planned/F002-plant-greeting/ticket.md
  - greet.sh
---

The greeting script prints the plant name.
EOF
	cat >"$MAP/features/limen.feature.f004.md" <<'EOF'
---
schema: architecture-map/1
kind: feature
id: limen.feature.f004
project: limen
title: A script prints a greeting (F004)
status: ready
touches:
  - limen.commands
sources:
  - spec/features/done/2026-09/F004-greeting-script/ticket.md
  - greet.sh
---

The greeting script prints a fixed greeting.
EOF

	git -C "$PLANT" add -A
	git -C "$PLANT" commit -q -m "Throwaway plant for the F783 keeper proof"
	run "$PLANT" git log --oneline -1
	note "Baseline strict check on main: expect no error and no warning."
	run "$PLANT" limen picture build --dir "$MAP" --out "$PROOF/map.html" --strict
}

spawn() {
	note "## spawn: one small real job"
	run "$PLANT" limen spawn "${ROUTE[@]}" --detached --timeout 10m --label "F002 plant greeting" \
		"Implement F002: the greeting names the plant. Change the echo line in greet.sh so ./greet.sh prints 'Hello, plant.' and commit it. Change no other file. Ticket: $TICKET_OLD"
	run "$PLANT" limen jobs --all
}

keeper_early() {
	note "## keeper while the job runs: expect a refusal"
	run "$PLANT" job_state "$1"
	run "$PLANT" limen keeper "$TICKET_OLD" --job "$1" "${ROUTE[@]}" --timeout 10m
}

job_state() { printf 'state: %s\n' "$(job_file "$1" state)"; }

wait_job() {
	note "## wait for $1"
	run "$PLANT" limen wait "$1"
	run "$PLANT" job_state "$1"
}

break_links() {
	local worktree
	worktree=$(job_file "$1" worktree)
	note "## break three links on the branch of $1 (worktree $worktree)"
	run "$worktree" git log --oneline "$(job_file "$1" base)..HEAD"
	run "$worktree" git mv "spec/features/planned/F002-plant-greeting" "spec/features/active/F002-plant-greeting"
	# Link 1: an unknown touches id in the ticket front matter.
	perl -0pi -e 's/  - limen\.commands\n/  - limen.commandz\n/' "$worktree/$TICKET_NEW"
	# Link 2: the board loses the F002 line.
	perl -ni -e 'print unless /^- `F002-/' "$worktree/spec/build.md"
	# Link 3: the ticket moved, and the map feature still cites spec/features/planned/... (the map is not in Git).
	run "$worktree" git add -A
	run "$worktree" git commit -q -m "F002: start work (proof: three broken links)"
	run "$worktree" git show --stat --format='%h %s' HEAD
	run "$worktree" git diff HEAD~1 -- "$TICKET_NEW" spec/build.md
	run "$worktree" grep -n "F002" "$MAP/features/limen.feature.f002.md"
	note "Strict check on the job branch: expect ticket.unknown-touch (error) and source.missing (warning)."
	run "$worktree" limen picture build --dir "$MAP" --out "$PROOF/map.html" --strict
}

land() {
	note "## land $1 onto main"
	run "$PLANT" git status --short --branch
	run "$PLANT" limen land "$1" --yes
	run "$PLANT" git log --oneline -3
}

keeper() {
	note "## keeper for $1"
	run "$PLANT" limen keeper "$TICKET_NEW" --job "$1" "${ROUTE[@]}" --timeout 10m
	run "$PLANT" limen jobs --all
}

check() {
	note "## check the three links on main"
	run "$PLANT" git log --oneline -6
	run "$PLANT" ls spec/features/planned spec/features/active
	run "$PLANT" sed -n '1,8p' "$TICKET_NEW"
	run "$PLANT" grep -n 'F002' spec/build.md
	run "$PLANT" sed -n '1,20p' "$MAP/features/limen.feature.f002.md"
	run "$PLANT" limen picture build --dir "$MAP" --out "$PROOF/map.html" --strict
	run "$PLANT" ./greet.sh
}

scaffold() {
	note "## scaffold a new ticket on main"
	run "$PLANT" limen ticket new "The greeting takes a name" --touches limen.commands
	run "$PLANT" git status --short
	run "$PLANT" limen picture build --dir "$MAP" --out "$PROOF/map.html" --strict
}

case ${1:-} in
setup) setup ;;
spawn) spawn ;;
keeper-early) keeper_early "$2" ;;
wait) wait_job "$2" ;;
break) break_links "$2" ;;
land) land "$2" ;;
keeper) keeper "$2" ;;
check) check ;;
scaffold) scaffold ;;
*)
	sed -n '2,15p' "$0"
	exit 2
	;;
esac
