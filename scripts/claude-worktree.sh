#!/usr/bin/env bash
# Provision an isolated Claude worktree for an issue and launch Claude in it.
# Run `scripts/claude-worktree.sh --help` for usage.

set -euo pipefail

print_usage() {
  cat <<'EOF'
Provision an isolated Claude worktree for an issue and launch Claude in it.

Usage:
  scripts/claude-worktree.sh [--headless] [--no-speckit] <issue-number> [slug]
  scripts/claude-worktree.sh --approve-spec <issue-number>
  scripts/claude-worktree.sh --revise-spec <issue-number> <feedback>
  scripts/claude-worktree.sh --remove <issue-number>
  scripts/claude-worktree.sh --cleanup-merged <issue-number>

Options:
  --headless          Run claude -p in background (log -> claude.log)
  --no-speckit        Skip the SpecKit lifecycle; Claude works the issue
                      directly and opens a PR. No spec-review pause, so
                      --approve-spec / --revise-spec do not apply.
  --approve-spec      Release the spec-review pause for a paused headless
                      spawn; Stage 2 (plan/tasks/implement/PR) runs in the
                      background. Fire-and-forget; returns immediately.
  --revise-spec       Send revision feedback to a paused headless spawn;
                      the session edits the spec in place and re-enters
                      the pause. Fire-and-forget; feedback must be non-empty.
  --remove            Discard worktree (works on unmerged work)
  --cleanup-merged    Post-merge: pull main, remove worktree, delete branch
  -h, --help          Show this help and exit

Behavior:
  1. Creates ../forkprint-gh<issue>-<slug> as a git worktree on a new branch
     named gh<issue>-<slug> (slug auto-derived from the issue title via gh
     when omitted). The gh<issue>- prefix gives issue-driven work a namespace
     disjoint from manual sequential (<NNN>-) and timestamp specs, so the
     branch, spec directory, and worktree path always agree on the issue
     number. See docs/DEVELOPMENT.md for the full naming convention.
  2. Picks the next free port >= 3010 and writes it to .env.local as PORT.
  3. Runs npm install in the worktree.
  4. Starts `npm run dev` on that port in the background (log -> dev.log).
  5. Generates a UUID, records it in .claude.session-id inside the worktree,
     and launches `claude --session-id <uuid>` with a kickoff prompt
     (interactive by default; --headless runs `claude -p` -> claude.log).
     The recorded session ID lets --approve-spec and --revise-spec resume
     the same session non-interactively.

Permissions:
  Headless spawns inherit the allowlist in .claude/settings.json at the
  repo root. See docs/DEVELOPMENT.md for the permission model and how to
  extend the allowlist when the SpecKit lifecycle needs a new tool.

Batch example (headless, fully unattended through PR):
  for i in 210 211 212; do scripts/claude-worktree.sh --headless "$i"; done
  # review each generated spec
  for i in 210 211 212; do scripts/claude-worktree.sh --approve-spec "$i"; done
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  print_usage
  exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
PARENT_DIR="$(dirname "$REPO_ROOT")"
BASE_PORT=3010
MAX_PORT=3100

remove_worktree() {
  local issue="$1"
  local wt
  # Match both new gh<issue>- worktrees and legacy <issue>- worktrees (transition
  # compat — legacy fallback can be dropped once no pre-fix worktrees remain).
  wt="$(git -C "$REPO_ROOT" worktree list --porcelain \
    | awk -v i1="-gh${issue}-" -v i2="-${issue}-" '/^worktree/ && ($2 ~ i1 || $2 ~ i2) {print $2; exit}')"
  if [[ -z "${wt:-}" ]]; then
    echo "No worktree found for issue $issue" >&2
    exit 1
  fi
  if [[ -f "$wt/.dev.pid" ]]; then
    kill "$(cat "$wt/.dev.pid")" 2>/dev/null || true
  fi
  if [[ -f "$wt/.claude.pid" ]]; then
    kill "$(cat "$wt/.claude.pid")" 2>/dev/null || true
  fi
  git -C "$REPO_ROOT" worktree remove --force "$wt"
  echo "Removed $wt"
}

cleanup_merged() {
  local issue="$1"
  local wt branch current_branch pr_state
  # Match both new gh<issue>- worktrees and legacy <issue>- worktrees (transition
  # compat — legacy fallback can be dropped once no pre-fix worktrees remain).
  wt="$(git -C "$REPO_ROOT" worktree list --porcelain \
    | awk -v i1="-gh${issue}-" -v i2="-${issue}-" '/^worktree/ && ($2 ~ i1 || $2 ~ i2) {print $2; exit}')"
  if [[ -z "${wt:-}" ]]; then
    echo "No worktree found for issue $issue" >&2
    exit 1
  fi
  branch="$(git -C "$wt" rev-parse --abbrev-ref HEAD)"
  if [[ -z "$branch" || "$branch" == "HEAD" ]]; then
    echo "Could not determine branch for $wt" >&2
    exit 1
  fi

  current_branch="$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD)"
  if [[ "$current_branch" != "main" ]]; then
    echo "Primary worktree at $REPO_ROOT is on '$current_branch', not main." >&2
    echo "Switch it to main before running --cleanup-merged." >&2
    exit 1
  fi

  # Verify merge via GitHub PR state, not local ancestry — squash/rebase merges
  # produce a merge commit that is not an ancestor of the local feature branch.
  if ! pr_state="$(cd "$REPO_ROOT" && gh pr view "$branch" --json state -q .state 2>/dev/null)"; then
    echo "Could not determine PR state for $branch." >&2
    echo "Is gh installed and authenticated? If this branch has no PR, use:" >&2
    echo "  scripts/claude-worktree.sh --remove $issue" >&2
    exit 1
  fi
  if [[ "$pr_state" != "MERGED" ]]; then
    echo "PR for $branch is $pr_state, not MERGED." >&2
    echo "Use: scripts/claude-worktree.sh --remove $issue" >&2
    exit 1
  fi

  echo "Pulling main in $REPO_ROOT ..."
  git -C "$REPO_ROOT" pull --ff-only origin main

  if [[ -f "$wt/.dev.pid" ]]; then
    kill "$(cat "$wt/.dev.pid")" 2>/dev/null || true
  fi
  if [[ -f "$wt/.claude.pid" ]]; then
    kill "$(cat "$wt/.claude.pid")" 2>/dev/null || true
  fi
  git -C "$REPO_ROOT" worktree remove --force "$wt"
  echo "Removed $wt"

  git -C "$REPO_ROOT" branch -D "$branch"
}

release_paused_session() {
  local issue="$1"
  local prompt="$2"
  local wt session_id
  # Match both new gh<issue>- worktrees and legacy <issue>- worktrees (transition
  # compat — legacy fallback can be dropped once no pre-fix worktrees remain).
  wt="$(git -C "$REPO_ROOT" worktree list --porcelain \
    | awk -v i1="-gh${issue}-" -v i2="-${issue}-" '/^worktree/ && ($2 ~ i1 || $2 ~ i2) {print $2; exit}')"
  if [[ -z "${wt:-}" ]]; then
    echo "No worktree found for issue $issue" >&2
    exit 1
  fi
  if [[ ! -f "$wt/.claude.session-id" ]]; then
    echo "No session ID recorded for issue $issue; cannot resume non-interactively." >&2
    echo "Use 'cd $wt && claude --resume' instead." >&2
    exit 1
  fi
  session_id="$(cat "$wt/.claude.session-id")"
  if [[ -z "$session_id" ]]; then
    echo "Session ID file for issue $issue is empty; cannot resume." >&2
    exit 1
  fi
  # Paused state is reached once /speckit.specify has written a spec file.
  if ! compgen -G "$wt/specs/*/spec.md" > /dev/null; then
    echo "Spec not yet generated for issue $issue; paused state not reached." >&2
    echo "Tail $wt/claude.log to confirm and retry once the pause is reported." >&2
    exit 1
  fi
  ( cd "$wt" && nohup claude -p "$prompt" --resume "$session_id" >> claude.log 2>&1 & )
  echo "Released pause for issue $issue; Stage 2 running in background."
  echo "Tail: $wt/claude.log"
}

if [[ "${1:-}" == "--remove" ]]; then
  [[ -n "${2:-}" ]] || { echo "Usage: $0 --remove <issue>" >&2; exit 1; }
  remove_worktree "$2"
  exit 0
fi

if [[ "${1:-}" == "--cleanup-merged" ]]; then
  [[ -n "${2:-}" ]] || { echo "Usage: $0 --cleanup-merged <issue>" >&2; exit 1; }
  cleanup_merged "$2"
  exit 0
fi

if [[ "${1:-}" == "--approve-spec" ]]; then
  [[ -n "${2:-}" ]] || { echo "Usage: $0 --approve-spec <issue>" >&2; exit 1; }
  release_paused_session "$2" "proceed"
  exit 0
fi

if [[ "${1:-}" == "--revise-spec" ]]; then
  [[ -n "${2:-}" ]] || { echo "Usage: $0 --revise-spec <issue> <feedback>" >&2; exit 1; }
  if [[ -z "${3:-}" ]]; then
    echo "--revise-spec requires non-empty feedback" >&2
    exit 1
  fi
  release_paused_session "$2" "$3"
  exit 0
fi

HEADLESS=0
NO_SPECKIT=0
while [[ "${1:-}" == --* ]]; do
  case "$1" in
    --headless) HEADLESS=1; shift ;;
    --no-speckit) NO_SPECKIT=1; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

ISSUE="${1:?Usage: $0 [--headless] [--no-speckit] <issue-number> [slug]}"
SLUG="${2:-}"

if (( NO_SPECKIT )); then
  echo "WARNING: --no-speckit skips the SpecKit lifecycle and the spec-review pause." >&2
  echo "         This run is fully automated with NO human-in-the-loop checkpoint." >&2
  echo "         Claude will make changes and open a PR without spec approval." >&2
fi

if [[ -z "$SLUG" ]]; then
  if ! command -v gh >/dev/null 2>&1; then
    echo "gh CLI not found; pass a slug explicitly" >&2
    exit 1
  fi
  title="$(gh issue view "$ISSUE" --json title -q .title 2>/dev/null || true)"
  if [[ -z "$title" ]]; then
    echo "Could not fetch title for issue #$ISSUE; pass a slug explicitly" >&2
    exit 1
  fi
  # lowercase, non-alnum -> '-', collapse/trim dashes, cap length
  SLUG="$(printf '%s' "$title" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' \
    | cut -c1-40 \
    | sed -E 's/-+$//')"
  SLUG="${SLUG:-work}"
  echo "Derived slug from issue title: $SLUG"
fi

BRANCH="gh${ISSUE}-${SLUG}"
WT_PATH="${PARENT_DIR}/forkprint-gh${ISSUE}-${SLUG}"

# 1. Find a free port
port=$BASE_PORT
while (( port <= MAX_PORT )); do
  if ! lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    break
  fi
  ((port++))
done
if (( port > MAX_PORT )); then
  echo "No free port in ${BASE_PORT}-${MAX_PORT}" >&2
  exit 1
fi

# 2. Create worktree
if [[ -d "$WT_PATH" ]]; then
  echo "Worktree already exists: $WT_PATH" >&2
  exit 1
fi
git -C "$REPO_ROOT" worktree add "$WT_PATH" -b "$BRANCH"

# 3. Port + install
# Seed .env.local from the main repo's .env.local (OAuth creds, etc.), then set PORT.
if [[ -f "$REPO_ROOT/.env.local" ]]; then
  grep -v '^PORT=' "$REPO_ROOT/.env.local" > "$WT_PATH/.env.local"
  echo "Copied .env.local from $REPO_ROOT"
else
  : > "$WT_PATH/.env.local"
  echo "WARNING: $REPO_ROOT/.env.local not found — worktree will start without OAuth creds" >&2
fi
echo "PORT=$port" >> "$WT_PATH/.env.local"
( cd "$WT_PATH" && npm install --silent )

# 4. Start dev server
( cd "$WT_PATH" && nohup npm run dev -- -p "$port" > dev.log 2>&1 & echo $! > .dev.pid )
echo "Dev server: http://localhost:$port (log: $WT_PATH/dev.log)"

# 5. Launch Claude with a kickoff prompt
# Pre-generate a session UUID so --approve-spec / --revise-spec can resume
# this exact session non-interactively without probing the CLI's session store.
if ! command -v uuidgen >/dev/null 2>&1; then
  echo "uuidgen not found; required for session addressability" >&2
  exit 1
fi
SESSION_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
echo "$SESSION_ID" > "$WT_PATH/.claude.session-id"

if (( NO_SPECKIT )); then
  KICKOFF="Work on GitHub issue #${ISSUE}. Read CLAUDE.md for project conventions. Skip the SpecKit lifecycle — do NOT run /speckit.specify, /speckit.plan, /speckit.tasks, or /speckit.implement. Make the changes directly, then push the branch and open a PR; do not merge.

Dev server is already running on port ${port}."
else
  KICKOFF="Work on GitHub issue #${ISSUE}. Follow CLAUDE.md (read constitution, DEVELOPMENT.md, PRODUCT.md). Run the SpecKit lifecycle in two stages with a mandatory human-in-the-loop pause in between:

STAGE 1: Run /speckit.specify. When it completes, report the generated spec file path and STOP. Do NOT proceed to /speckit.plan. Wait for explicit user approval — one of the phrases \"proceed\", \"approved\", or \"go to plan\". If the user replies with spec revisions instead of an approval phrase, update the spec and re-enter the paused state (report the updated spec path and wait again). Only an explicit approval phrase releases the pause.

STAGE 2: After approval, run /speckit.plan, then /speckit.tasks, then /speckit.implement in sequence. When done, push the branch and open a PR; do not merge.

Dev server is already running on port ${port}."
fi

cd "$WT_PATH"
if (( HEADLESS )); then
  nohup claude -p "$KICKOFF" --session-id "$SESSION_ID" > claude.log 2>&1 &
  echo $! > .claude.pid
  echo "Claude (headless) PID $(cat .claude.pid) — log: $WT_PATH/claude.log"
  echo "Session ID: $SESSION_ID (recorded in $WT_PATH/.claude.session-id)"
  echo "Release the pause with: scripts/claude-worktree.sh --approve-spec $ISSUE"
else
  exec claude --session-id "$SESSION_ID" "$KICKOFF"
fi
