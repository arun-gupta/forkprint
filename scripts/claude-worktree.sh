#!/usr/bin/env bash
# Provision an isolated Claude worktree for an issue and launch Claude in it.
# Run `scripts/claude-worktree.sh --help` for usage.

set -euo pipefail

print_usage() {
  cat <<'EOF'
Provision an isolated Claude worktree for an issue and launch Claude in it.

Usage:
  scripts/claude-worktree.sh [--headless] [--no-speckit] <issue-number> [slug]
  scripts/claude-worktree.sh --approve-spec   <issue-number>
  scripts/claude-worktree.sh --revise-spec    <issue-number> <feedback>
  scripts/claude-worktree.sh --remove         [<issue-number>]
  scripts/claude-worktree.sh --cleanup-merged [<issue-number>]

Options:
  --headless        Run claude -p in background (log -> claude.log)
  --no-speckit      Skip SpecKit lifecycle; Claude opens a PR directly (no spec pause)
  --approve-spec    Release the spec-review pause for a paused headless spawn
  --revise-spec     Send non-empty revision feedback to a paused spawn
  --remove          Discard worktree (works on unmerged work)
  --cleanup-merged  Post-merge: pull main, remove worktree, delete branch
  -h, --help        Show this help and exit

For --remove and --cleanup-merged, the issue number is inferred from the branch
when run from inside a linked worktree. See docs/DEVELOPMENT.md for full behavior,
the numbering rule, and the permission model.

Batch example:
  for i in 210 211 212; do scripts/claude-worktree.sh --headless "$i"; done
  for i in 210 211 212; do scripts/claude-worktree.sh --approve-spec "$i"; done
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  print_usage
  exit 0
fi

# REPO_ROOT is the primary worktree (main repo clone), regardless of whether
# the script is invoked from there or from a linked worktree. `git worktree list`
# emits the primary first by contract; fall back to show-toplevel for non-worktree
# checkouts or older git versions.
REPO_ROOT="$(git worktree list --porcelain 2>/dev/null | awk '/^worktree/ {print $2; exit}')"
if [[ -z "${REPO_ROOT:-}" ]]; then
  REPO_ROOT="$(git rev-parse --show-toplevel)"
fi
PARENT_DIR="$(dirname "$REPO_ROOT")"
BASE_PORT=3010
MAX_PORT=3100

# Populates globals describing the caller's worktree context:
#   CTX_IS_IN_LINKED_WT  0|1 — are we inside a linked (non-primary) worktree?
#   CTX_MAIN_REPO        absolute path to the primary worktree (== REPO_ROOT)
#   CTX_CURRENT_WT       absolute path to the caller's current worktree toplevel
#   CTX_INFERRED_ISSUE   digit string from ^[0-9]+- branch prefix, or empty
# Writes nothing to stdout on success; a helper, not UI.
resolve_worktree_context() {
  CTX_IS_IN_LINKED_WT=0
  CTX_MAIN_REPO=""
  CTX_CURRENT_WT=""
  CTX_INFERRED_ISSUE=""
  local git_common_dir git_dir branch
  git_common_dir="$(git rev-parse --git-common-dir 2>/dev/null || true)"
  git_dir="$(git rev-parse --git-dir 2>/dev/null || true)"
  [[ -z "$git_common_dir" || -z "$git_dir" ]] && return 0
  # Canonicalize — --git-dir can return a relative path
  [[ "$git_common_dir" = /* ]] || git_common_dir="$(cd "$git_common_dir" 2>/dev/null && pwd)"
  [[ "$git_dir" = /* ]]        || git_dir="$(cd "$git_dir" 2>/dev/null && pwd)"
  if [[ "$git_common_dir" != "$git_dir" ]]; then
    CTX_IS_IN_LINKED_WT=1
  fi
  CTX_MAIN_REPO="$REPO_ROOT"
  CTX_CURRENT_WT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
  branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
  if [[ "$branch" =~ ^([0-9]+)- ]]; then
    CTX_INFERRED_ISSUE="${BASH_REMATCH[1]}"
  fi
}

# Emit the stranded-shell warning as the final line of a successful cleanup,
# iff the worktree just removed was the caller's CWD (or a subdir of it).
print_stranded_shell_notice_if_needed() {
  local removed_wt="$1"
  local caller_cwd="$2"
  local main_repo="$3"
  if [[ "$caller_cwd" == "$removed_wt" || "$caller_cwd" == "$removed_wt"/* ]]; then
    echo "note: your shell's previous CWD ($removed_wt) no longer exists — run \`cd $main_repo\` to continue"
  fi
}

remove_worktree() {
  local issue="$1"
  local caller_cwd
  caller_cwd="$(pwd -P)"  # physical path so we match git's canonical worktree paths (macOS /tmp -> /private/tmp)
  local wt
  wt="$(git -C "$REPO_ROOT" worktree list --porcelain \
    | awk -v i="-${issue}-" '/^worktree/ && $2 ~ i {print $2; exit}')"
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
  print_stranded_shell_notice_if_needed "$wt" "$caller_cwd" "$REPO_ROOT"
}

cleanup_merged() {
  local issue="$1"
  local caller_cwd
  caller_cwd="$(pwd -P)"  # physical path so we match git's canonical worktree paths (macOS /tmp -> /private/tmp)
  local wt branch current_branch pr_state
  wt="$(git -C "$REPO_ROOT" worktree list --porcelain \
    | awk -v i="-${issue}-" '/^worktree/ && $2 ~ i {print $2; exit}')"
  if [[ -z "${wt:-}" ]]; then
    echo "No worktree found for issue $issue" >&2
    exit 1
  fi
  branch="$(git -C "$wt" rev-parse --abbrev-ref HEAD)"
  if [[ -z "$branch" || "$branch" == "HEAD" ]]; then
    echo "Could not determine branch for $wt" >&2
    exit 1
  fi

  # If the primary worktree isn't on main, attempt a clean checkout. Refuse on
  # dirty state — never force-discard the maintainer's in-flight work.
  current_branch="$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD)"
  if [[ "$current_branch" != "main" ]]; then
    echo "Primary worktree at $REPO_ROOT is on '$current_branch'; checking out main..."
    if ! git -C "$REPO_ROOT" checkout main; then
      echo "Cannot check out main in $REPO_ROOT — primary worktree has uncommitted changes or a conflict." >&2
      echo "Resolve it manually (commit/stash/revert) and re-run." >&2
      exit 1
    fi
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
  print_stranded_shell_notice_if_needed "$wt" "$caller_cwd" "$REPO_ROOT"
}

release_paused_session() {
  local issue="$1"
  local prompt="$2"
  local wt session_id
  wt="$(git -C "$REPO_ROOT" worktree list --porcelain \
    | awk -v i="-${issue}-" '/^worktree/ && $2 ~ i {print $2; exit}')"
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

# Populates RESOLVED_CLEANUP_ISSUE from an explicit CLI arg or, failing that,
# from branch-name inference when the caller is inside a linked worktree.
# Exits non-zero (no destructive action) when no arg is given and the caller
# is either outside a linked worktree, or on a branch without a numeric prefix.
# Uses a global rather than stdout because `exit` inside $() only exits the
# subshell, which would let the caller proceed with an empty issue value.
resolve_cleanup_issue() {
  local flag="$1"      # "--cleanup-merged" or "--remove"
  local explicit="$2"  # the positional arg from the CLI, possibly empty
  RESOLVED_CLEANUP_ISSUE=""
  if [[ -n "$explicit" ]]; then
    RESOLVED_CLEANUP_ISSUE="$explicit"
    return 0
  fi
  resolve_worktree_context
  if (( CTX_IS_IN_LINKED_WT == 0 )); then
    echo "Usage: $0 $flag <issue>" >&2
    exit 1
  fi
  if [[ -z "$CTX_INFERRED_ISSUE" ]]; then
    local current_branch
    current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '<unknown>')"
    echo "Cannot infer issue number from branch '$current_branch' (expected prefix matching ^[0-9]+-)." >&2
    echo "Re-run with an explicit issue number:" >&2
    echo "  $0 $flag <issue>" >&2
    exit 1
  fi
  RESOLVED_CLEANUP_ISSUE="$CTX_INFERRED_ISSUE"
}

if [[ "${1:-}" == "--remove" ]]; then
  resolve_cleanup_issue --remove "${2:-}"
  remove_worktree "$RESOLVED_CLEANUP_ISSUE"
  exit 0
fi

if [[ "${1:-}" == "--cleanup-merged" ]]; then
  resolve_cleanup_issue --cleanup-merged "${2:-}"
  cleanup_merged "$RESOLVED_CLEANUP_ISSUE"
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

BRANCH="${ISSUE}-${SLUG}"
WT_PATH="${PARENT_DIR}/forkprint-${ISSUE}-${SLUG}"

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
