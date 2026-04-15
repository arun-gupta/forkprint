# Feature Specification: Fix --cleanup-merged branch deletion after squash/rebase merge

**Feature Branch**: `243-cleanup-merged-fix`
**Created**: 2026-04-15
**Status**: Draft
**Input**: Issue #242 — `scripts/claude-worktree.sh --cleanup-merged` removes the worktree but leaves the local branch behind after a squash- or rebase-merged PR.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cleanup deletes branch after squash-merged PR (Priority: P1)

A developer using the one-Claude-per-issue ephemeral-worktree workflow finishes a feature, squash-merges the PR on GitHub, returns to the main repository on `main`, and runs `scripts/claude-worktree.sh --cleanup-merged <issue>`. The script removes the worktree AND deletes the local feature branch, leaving no stale branches to accumulate.

**Why this priority**: This is the stated bug. Without it, every merged issue leaves a stale branch, forcing the developer to either manually run `git branch -D` after every merge or manually clean up accumulated branches periodically. The script's advertised contract (per its usage text and `docs/DEVELOPMENT.md`) is broken.

**Independent Test**: Open a PR from a worktree-created branch, squash-merge on GitHub, run `--cleanup-merged <issue>`, then run `git branch` and confirm the feature branch is absent.

**Acceptance Scenarios**:

1. **Given** a local feature branch `<N>-<slug>` whose PR has been squash-merged on GitHub, **When** the developer runs `scripts/claude-worktree.sh --cleanup-merged <N>`, **Then** the worktree is removed, main is pulled, the branch is deleted locally, and the script exits 0 with a success message.
2. **Given** the same setup but the PR was rebase-merged on GitHub, **When** `--cleanup-merged` runs, **Then** the branch is still deleted.
3. **Given** the PR was merge-committed (no squash/rebase), **When** `--cleanup-merged` runs, **Then** the branch is still deleted (this already works and must continue to work).

---

### User Story 2 - Refuse cleanup when PR is not merged (Priority: P1)

A developer runs `--cleanup-merged <issue>` against a branch whose PR is still open, closed-without-merge, or nonexistent. The script refuses to delete and tells the developer to use `--remove` instead.

**Why this priority**: `--cleanup-merged` implies merge verification. Silently force-deleting an unmerged branch would destroy work. The refusal must be explicit and actionable.

**Independent Test**: Create a branch, open a PR but do not merge it, run `--cleanup-merged <issue>`, and confirm the script exits non-zero with a message pointing to `--remove`, and the branch still exists.

**Acceptance Scenarios**:

1. **Given** a branch whose PR is `OPEN`, **When** `--cleanup-merged` runs, **Then** the script exits non-zero, prints a message indicating the PR is not merged and to use `--remove` for unmerged cleanup, and leaves both the worktree and the branch intact.
2. **Given** a branch whose PR is `CLOSED` (not merged), **When** `--cleanup-merged` runs, **Then** the same refusal behavior applies.
3. **Given** a branch with no associated PR on GitHub, **When** `--cleanup-merged` runs, **Then** the same refusal behavior applies.

---

### User Story 3 - Behavior documented in DEVELOPMENT.md (Priority: P2)

A developer reading `docs/DEVELOPMENT.md` sees that `--cleanup-merged` correctly handles squash/rebase merges and that `--remove` is the escape hatch for unmerged branches.

**Why this priority**: Documentation prevents the issue from being re-reported and clarifies the division between `--cleanup-merged` (safe, verified) and `--remove` (force).

**Independent Test**: Grep `docs/DEVELOPMENT.md` for the updated description and confirm it states the PR-state check and force-delete behavior for merged branches.

**Acceptance Scenarios**:

1. **Given** the PR has merged, **When** a new contributor reads `docs/DEVELOPMENT.md`, **Then** the section describing `--cleanup-merged` explains that merge is verified via the PR state on GitHub, not via local ancestry, and that the branch is force-deleted when the PR is `MERGED`.

---

### Edge Cases

- **Branch checked out in another worktree**: If the feature branch is currently checked out in another worktree, `git branch -D` fails. The script must surface a clear error rather than silently succeeding.
- **GitHub CLI unavailable or unauthenticated**: If `gh` is missing or the user is not authenticated, the PR-state check cannot run. The script must fail with an actionable error rather than falling back to silent `-d` behavior.
- **Multiple PRs associated with the branch**: If more than one PR has existed for the branch, the script uses the most recent one's state.
- **User runs `--cleanup-merged` from inside the worktree being cleaned**: Script must refuse or switch context — it cannot remove a worktree it is currently inside.
- **Remote branch already deleted by GitHub's auto-delete**: The PR-state check still works because `gh pr view --json state` queries the PR object, not the branch. Local deletion proceeds normally.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `--cleanup-merged <issue>` command MUST determine merge status by querying the state of the Pull Request associated with the branch on GitHub, not by relying on local git ancestry.
- **FR-002**: When the associated PR's state is `MERGED`, the command MUST delete the local branch unconditionally (force-delete), after removing the worktree and pulling `main`.
- **FR-003**: When the associated PR's state is not `MERGED` (open, closed-without-merge, or no PR found), the command MUST refuse to delete the branch, MUST exit with a non-zero status, and MUST print a message directing the user to `--remove` for unmerged cleanup.
- **FR-004**: When the PR-state check cannot be performed (e.g., `gh` missing, unauthenticated, network failure), the command MUST exit non-zero with a clear error identifying the cause; it MUST NOT silently fall through to the old ancestry-based behavior.
- **FR-005**: When force-deletion fails because the branch is checked out in another worktree, the command MUST surface the underlying git error to the user.
- **FR-006**: `docs/DEVELOPMENT.md` MUST document the PR-state verification behavior of `--cleanup-merged` and explicitly contrast it with `--remove`.
- **FR-007**: The script's own `--help` / usage text MUST remain accurate for `--cleanup-merged`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a squash-merged PR, a single invocation of `--cleanup-merged <issue>` leaves zero stale local branches associated with that issue (verified by `git branch | grep <issue>` producing no output).
- **SC-002**: For an unmerged PR, `--cleanup-merged <issue>` exits non-zero and leaves the branch intact in 100% of invocations.
- **SC-003**: A developer who has never seen the script before can, by reading `docs/DEVELOPMENT.md` alone, correctly choose between `--cleanup-merged` and `--remove` for both the merged and unmerged cases.

## Assumptions

- The GitHub CLI (`gh`) is installed and authenticated in the developer's environment. This is already a prerequisite for the broader workflow and is documented in `docs/DEVELOPMENT.md`.
- The local branch name matches the PR's head branch name on GitHub (this is the contract established by `claude-worktree.sh` when it creates branches).
- `--cleanup-merged` is invoked from the main repository checkout on the `main` branch, consistent with the existing script contract.
- `--remove` already exists and handles unverified / force removal; this feature does not change `--remove`.
