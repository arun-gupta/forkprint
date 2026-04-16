# Feature Specification: SpecKit branch/spec numbering aligned with GitHub issue number

**Feature Branch**: `249-speckit-branch-spec-numbering-should-ali`
**Created**: 2026-04-16
**Status**: Draft
**Input**: GitHub issue #249 — "SpecKit branch/spec numbering should align with GitHub issue number"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Worktree-driven spec uses the issue number with a `gh` prefix (Priority: P1)

A maintainer runs `scripts/claude-worktree.sh 238` to spawn a worktree for GitHub issue #238. The worktree script creates the directory `../forkprint-gh238-<slug>/` and the branch `gh238-<slug>`. Claude launches inside the worktree and runs `/speckit.specify`. The generated spec directory is `specs/gh238-<slug>/` and Claude stays on the pre-created branch `gh238-<slug>`. No `243-*` (or any other) spec directory or branch appears, no renumbering takes place. The worktree path prefix (`forkprint-gh238-`), the checked-out branch prefix (`gh238-`), the spec directory prefix (`gh238-`), and the GitHub issue number (238) all agree.

**Why this priority**: This is the core alignment bug. Every downstream artifact (PR branch name, commit prefixes, PR cross-references, `--cleanup-merged` lookup) inherits its identity from the prefix generated in this step. The `gh` prefix also establishes a disjoint namespace between issue-driven work (`gh<N>-`) and manual/legacy sequential work (`<NNN>-`) so the two can never collide, regardless of future growth in either namespace. One issue = one prefixed identifier, propagated from the worktree spawn through the spec, branch, and PR.

**Independent Test**: Spawn a fresh worktree for any issue number N (e.g. `scripts/claude-worktree.sh 999 demo-slug`), wait for `/speckit.specify` to complete, and verify four things in the worktree: (a) `git branch --show-current` returns `gh999-demo-slug`, (b) `specs/gh999-*/spec.md` exists, (c) the worktree directory is named `forkprint-gh999-demo-slug`, and (d) no `specs/<any-other-prefix>-*` directory was created by this run. Delivers value standalone because even without the manual-fallback or collision-handling stories, the worktree-driven path — the dominant path for new feature work — is correct and namespace-isolated.

**Acceptance Scenarios**:

1. **Given** a worktree spawned by `scripts/claude-worktree.sh 238 some-slug` (so the branch `gh238-some-slug` is already checked out and no `specs/gh238-*` directory exists), **When** Claude runs `/speckit.specify` inside that worktree, **Then** the resulting spec directory is `specs/gh238-some-slug/`, the checked-out branch remains `gh238-some-slug`, and no other prefixed spec directory or branch is created by this invocation.
2. **Given** the same worktree as above, **When** `/speckit.specify` completes, **Then** `git branch --show-current` inside the worktree equals `gh238-some-slug` (it was not switched to a freshly created branch).
3. **Given** a worktree spawned for issue #238, **When** the downstream commands `/speckit.plan`, `/speckit.tasks`, and `/speckit.implement` run, **Then** they all operate against `specs/gh238-some-slug/` and the branch `gh238-some-slug` without ambiguity about which spec directory to use.
4. **Given** the worktree has been merged, **When** the maintainer runs `scripts/claude-worktree.sh --cleanup-merged 238`, **Then** the script locates the worktree at `forkprint-gh238-*` and the branch `gh238-*`, verifies the PR is `MERGED`, and cleans both up — no manual prefix translation required.

---

### User Story 2 - Manual `/speckit.specify` outside the worktree flow keeps the existing sequential convention (Priority: P2)

A maintainer runs `/speckit.specify` directly from the main checkout on a branch they created themselves (no worktree, no issue number in play). The sequential-numbering fallback still picks the next free number by scanning `specs/` and creates the spec directory and feature branch with the unprefixed `<NNN>-<slug>` form exactly as before.

**Why this priority**: The worktree flow is the dominant path, but the manual path must keep working so contributors doing exploratory specs, pre-issue design work, or non-issue-driven refactors are not blocked. The `gh` prefix is added *only* to the issue-driven path — the manual path's `<NNN>-<slug>` shape is unchanged. This is a regression-prevention story.

**Independent Test**: From a clean checkout on `main`, invoke `/speckit.specify <description>` without any issue-number context and without the worktree wrapper. Verify that a spec directory with the next sequential prefix (e.g. `specs/230-<slug>/`) is created with no `gh` prefix, and a matching branch is checked out. Delivers value standalone because it protects an existing workflow from the Story 1 change.

**Acceptance Scenarios**:

1. **Given** a checkout on `main` with no issue-number argument and no issue-number context, **When** `/speckit.specify` runs, **Then** the spec directory and branch use the next free sequential number computed from existing `specs/` and branches, in the unprefixed `<NNN>-<slug>` form, matching the pre-change behaviour.
2. **Given** a manual invocation where the maintainer explicitly supplies a raw number override (e.g. `--number 350`), **When** `/speckit.specify` runs and no `specs/350-*` exists, **Then** the spec directory and branch both use the unprefixed `350-<slug>` form — the `gh` prefix is reserved for the issue-driven flow and is not added when the number comes from a raw override.

---

### User Story 3 - Explicit, non-silent handling of spec/branch collisions (Priority: P2)

When `/speckit.specify` is asked to use an issue-driven prefix whose spec directory already exists, or whose target branch already exists on a different HEAD, the tool either reuses the existing work or fails with a clear, actionable message. It never silently renumbers away from the requested issue number.

**Why this priority**: The previous bug was a silent renumbering — the user asked for 238, got 243, with no warning. Any replacement must make the failure mode loud. "Silent success with the wrong prefix" is worse than "loud failure with instructions." Reuse is the expected case inside a `claude-worktree.sh` spawn (the branch is already checked out), so the tool must tolerate that without error. With the `gh` prefix in place, collisions between issue-driven and sequential namespaces are architecturally impossible — but collisions *within* the issue-driven namespace (e.g. two runs for the same issue, or leftover spec dir from a prior abandoned spawn) are still possible and must be handled clearly.

**Independent Test**: Force both collision paths: (a) run the issue-driven flow for issue 238 when `specs/gh238-<other-slug>/` already exists, and (b) run it when the target branch `gh238-<slug>` is already checked out (the worktree case). Verify each path matches the contract: (a) the user sees a clear error pointing to the existing dir, (b) no error occurs and the existing branch is reused.

**Acceptance Scenarios**:

1. **Given** a worktree where the target branch (e.g. `gh238-some-slug`) is already the currently checked-out HEAD, **When** `/speckit.specify` runs for issue 238 with matching slug, **Then** the command proceeds without error: the existing branch is reused (no `git checkout -b` attempted), and the spec directory `specs/gh238-some-slug/` is created (or reused if already present and `spec.md` is empty).
2. **Given** a repo where `specs/gh238-existing-slug/` already exists with a populated `spec.md`, **When** `/speckit.specify` runs for issue 238 with a different slug, **Then** the command exits non-zero with an error that names the existing directory and instructs the user how to resolve the conflict (remove/rename the existing dir, or re-run the worktree flow with a matching slug). No silent fallback to a different prefix occurs.
3. **Given** a repo where the target branch (e.g. `gh238-new-slug`) exists but is **not** the currently checked-out HEAD, **When** `/speckit.specify` runs for issue 238, **Then** the command exits non-zero with a clear error naming the conflicting branch. No silent fallback occurs.

---

### Edge Cases

- **Invalid issue numbers** (zero, negative, non-numeric): Rejected with a clear error before any filesystem or git mutation. GitHub issue numbers are positive integers starting at 1.
- **Leading zeros on `--number` input**: Normalised — `--number 007` is treated as `7`, producing prefix `gh7`. No left-padding is applied to the `gh`-prefixed form (so issue #7 is `gh7-`, not `gh007-`). Rationale: issue numbers in `gh` CLI output and PR titles appear without padding (`#7`, not `#007`), and matching that visual form keeps searches and URLs intuitive.
- **Worktree spawn uses a slug that differs from the spec's derived short-name**: The branch name is the source of truth (because the worktree already created and checked out the branch). `/speckit.specify` must derive the spec directory name from the currently checked-out branch when it matches `^gh[0-9]+-`, not from a separately computed short-name, to guarantee spec dir and branch agree.
- **Maintainer runs `/speckit.specify` manually from inside a worktree** (not via the kickoff prompt): `/speckit.specify` detects the issue-driven context by matching the current branch against `^gh[0-9]+-` and uses that prefix automatically, even when no explicit issue argument is in the invocation.
- **Existing orphan `specs/gh<N>-*` directory with no matching branch**: Treated as a real conflict per User Story 3, scenario 2 — the spec directory is the shared on-disk artifact, and overwriting it would destroy prior work.
- **Legacy unprefixed branches/specs for issue-numbered work** (e.g. this feature's own branch, `249-speckit-…`): Out of scope for this feature. Legacy entries remain as-is; the new `gh`-prefix convention applies going forward. This feature itself completes on the legacy naming because its worktree was spawned before the fix shipped.
- **A legacy unprefixed spec dir `238-<slug>/` exists from past work, and a new worktree for issue #238 is spawned**: No collision — `gh238-<slug>` and `238-<slug>` are distinct paths. The `gh`-prefix rule makes the namespaces disjoint, so old sequential entries do not interfere with new issue-driven ones.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The spec-generation entry point MUST accept an explicit GitHub issue number from the caller (either via an explicit flag or by deriving it from the currently checked-out branch when the branch matches `^gh[0-9]+-`) and use `gh<N>` as the spec-directory and branch-name prefix.
- **FR-002**: When an issue number is supplied or derived, the spec-generation entry point MUST NOT scan `specs/` or `git branch -a` to pick a different number. Auto-increment logic applies only to the manual sequential fallback path.
- **FR-003**: When no issue-number context is available (no flag AND current branch does not match `^gh[0-9]+-`), the spec-generation entry point MUST fall back to the pre-existing sequential numbering behaviour using the unprefixed `<NNN>-<slug>` form — no change to that path.
- **FR-004**: The worktree spawn script (`scripts/claude-worktree.sh`) MUST create the worktree directory as `forkprint-gh<N>-<slug>` and the branch as `gh<N>-<slug>` for every issue-driven spawn, and MUST propagate the issue number into the `/speckit.specify` kickoff prompt so the downstream spec directory matches.
- **FR-005**: When the target branch already matches the currently checked-out branch, the spec-generation entry point MUST reuse that branch (no attempt to `git checkout -b` an existing branch) and proceed to create the spec directory.
- **FR-006**: When the target branch exists but is not the currently checked-out branch, the spec-generation entry point MUST exit non-zero with a clear error naming the conflicting branch. It MUST NOT silently fall back to a different prefix.
- **FR-007**: When a spec directory with the same `gh<N>-` prefix already exists and contains a populated `spec.md` with a different slug, the spec-generation entry point MUST exit non-zero with a clear error naming the existing directory and suggesting resolution options. It MUST NOT silently fall back to a different prefix.
- **FR-008**: Invalid issue-number inputs (non-numeric, zero, negative) MUST be rejected with a clear error before any filesystem or git mutation occurs.
- **FR-009**: `scripts/claude-worktree.sh --cleanup-merged <N>` MUST locate worktrees and branches using the `gh<N>-` pattern (not the old `<N>-` pattern). Legacy unprefixed worktrees that pre-date this feature MAY remain findable via the old pattern as a compatibility fallback, but new worktrees spawned by the fixed script MUST use only the `gh` prefix. *(See Assumption below on whether the compatibility fallback is retained.)*
- **FR-010**: `docs/DEVELOPMENT.md` MUST document the new naming convention: issue-driven spec/branch/worktree identifiers use `gh<N>-<slug>`; manual sequential fallback uses `<NNN>-<slug>`; the two namespaces are disjoint by construction.
- **FR-011**: The `/speckit.specify` command definition (under `.claude/commands/`) MUST either pass the issue number through to `create-new-feature.sh` when one can be derived from context, or instruct Claude to do so — so that the prefix contract is enforced regardless of how the command is invoked.
- **FR-012**: The prefix contract MUST be preserved end-to-end through `/speckit.plan`, `/speckit.tasks`, and `/speckit.implement` — none of these downstream commands may create or move the spec to a differently prefixed directory.

### Key Entities

- **Spec Directory**: The filesystem location under `specs/` that holds `spec.md`, `plan.md`, `tasks.md`, and checklists for a feature. Its name has the form `gh<N>-<slug>` (issue-driven) or `<NNN>-<slug>` (manual sequential).
- **Feature Branch**: The git branch on which the feature work lives. Its name has the same `gh<N>-<slug>` or `<NNN>-<slug>` shape as the spec directory, and the prefix must match the spec directory's prefix for the same feature.
- **Worktree Directory**: The sibling-of-repo directory where parallel feature work lives. Named `forkprint-gh<N>-<slug>` for issue-driven spawns (matches branch and spec directory prefixes).
- **Issue Number**: The GitHub issue number (a positive integer, no leading zeros) that motivates the feature. When present, it becomes the `<N>` in `gh<N>-` across all three entities above.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For 100% of worktrees spawned by `scripts/claude-worktree.sh <N>`, the resulting spec directory prefix, checked-out branch prefix, and worktree path prefix all equal `gh<N>` after `/speckit.specify` completes. Verifiable by scripted check across any sample of post-spawn worktrees.
- **SC-002**: 0 instances of silent renumbering or silent prefix change occur in the issue-driven flow. Every deviation from the caller-supplied issue number is either (a) explicitly raised as a non-zero-exit error with a named cause, or (b) a deliberate reuse of an existing branch whose prefix already matches `gh<N>`.
- **SC-003**: Manual `/speckit.specify` invocations with no issue-number context continue to produce spec directories and branches with the unprefixed `<NNN>-<slug>` form — verified by a no-regression invocation on a clean checkout.
- **SC-004**: Issue-driven (`gh<N>-`) and manual sequential (`<NNN>-`) namespaces are disjoint by structure: there exists no string that is simultaneously a valid issue-driven prefix and a valid sequential prefix. Verifiable by inspection of the grammars; no test scenario can construct a colliding name.
- **SC-005**: A maintainer reading `docs/DEVELOPMENT.md` can, in under 60 seconds, identify the rule that governs which prefix appears on a spec directory and why, without opening `create-new-feature.sh` or `claude-worktree.sh`.
- **SC-006**: `scripts/claude-worktree.sh --cleanup-merged <N>` successfully locates and cleans a worktree created by `scripts/claude-worktree.sh <N>` followed by `/speckit.specify`, with no manual prefix translation required.

## Assumptions

- GitHub issue numbers for this project are positive integers of any width. The `gh<N>` prefix works for any `N ≥ 1` with no padding (e.g. `gh7`, `gh249`, `gh12345`).
- The GitHub issue number is known at worktree-spawn time — `scripts/claude-worktree.sh` already takes it as its first positional argument, so propagating it through is a wiring change, not a lookup.
- `/speckit.specify` is the only code path that creates a new spec directory and feature branch. No other SpecKit command generates numbered directories.
- Legacy Phase 1 spec directories (`001-*` through `032-*`) and legacy unprefixed issue-driven entries (e.g. `128-licensing-compliance`, `249-speckit-…` — including this feature's own branch and spec dir) are historical and out of scope. The new `gh<N>-` convention applies to spec/branch/worktree entities created after this feature ships. No retroactive rename is required.
- **Compatibility fallback for `--cleanup-merged`**: since some in-flight worktrees (this feature, and possibly others spawned before the fix ships) use the old unprefixed form, the cleanup command's lookup pattern SHOULD accept both `gh<N>-` and the legacy `<N>-` pattern during a transition period. The plan phase may choose to drop the legacy-match path once all pre-fix worktrees are cleaned up.
- The fix is scoped to `scripts/claude-worktree.sh`, `.specify/scripts/bash/create-new-feature.sh`, `.claude/commands/speckit.specify.md`, and `docs/DEVELOPMENT.md`. No application-code (Next.js, analyzer, UI) changes are required, and no user-facing product behaviour changes. The constitution's accuracy, data-source, and scoring rules are not affected.
- The change to PR branch names (from `<N>-` to `gh<N>-`) does not break any existing automation in this repo — `gh pr view <branch>` accepts arbitrary branch names, and no CI workflow greps for a specific branch-name pattern. If any such automation is discovered during the plan phase, it becomes an in-scope update.
