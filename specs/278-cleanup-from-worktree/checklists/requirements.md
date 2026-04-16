# Specification Quality Checklist: `claude-worktree.sh --cleanup-merged` / `--remove` run from inside a worktree

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-04-16
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
  - Note: this feature IS a bash script change. The spec names `scripts/claude-worktree.sh`, `git rev-parse`, and `gh pr view` because those are the behavioral surface under test, not implementation leakage. It does not prescribe bash vs. awk vs. sed internals, code structure, or helper-function names beyond a non-binding suggestion in Key Entities.
- [x] Focused on user value and business needs (maintainer-time savings, friction elimination on every merged worktree-scoped PR)
- [x] Written for the maintainer / workflow-author audience (the actual users of this tool), not hypothetical external stakeholders
- [x] All mandatory sections completed — User Scenarios, Requirements, Success Criteria, Assumptions

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — zero present
- [x] Requirements are testable and unambiguous — each FR names the invocation, the precondition, and the expected outcome
- [x] Success criteria are measurable — SC-001 counts commands, SC-003/SC-004/SC-005 are verifiable by direct observation
- [x] Success criteria are technology-agnostic where relevant — they reference shell commands because the feature is a shell command, but they do not lock implementation
- [x] All acceptance scenarios are defined — User Story 1 has 5 scenarios covering success, fallback, from-main-repo, merge-guard, and explicit-arg paths; User Story 2 has 3 scenarios covering the parallel `--remove` path
- [x] Edge cases are identified — dirty primary worktree, main-repo resolution failure, CWD-is-removed-worktree, branch-vs-path mismatch, `.git/worktrees` admin paths, non-issue numeric prefixes
- [x] Scope is clearly bounded — out of scope (auto-run cleanup on PR merge, post-merge hook, changes to merge-status check, changes to `--approve-spec` / `--revise-spec`) explicitly called out from issue #278 and reflected in FR-013
- [x] Dependencies and assumptions identified — Assumptions section names the clean-primary-worktree assumption, the git-plumbing availability assumption, and the branch-convention assumption

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria — the 5 scenarios in US1 and the 3 in US2 map onto specific FRs (FR-001/FR-002 on inference, FR-004 on no-match error, FR-005 on main-repo no-inference, FR-009 on merge guard, FR-015/FR-016 on explicit-arg preservation)
- [x] User scenarios cover primary flows — the P1 success path, the P1 failure paths, the P1 outside-worktree preservation path, the merge-guard path, and the P2 `--remove` parity
- [x] Feature meets measurable outcomes defined in Success Criteria — SC-001 (4→1 command reduction) is the headline, directly traceable to FR-001/FR-006/FR-010/FR-017
- [x] No implementation details leak into specification beyond naming the existing script, git plumbing commands, and `gh` commands under test — these are the behavioral contract, not implementation

## Notes

- The spec names specific bash commands (`git rev-parse --git-common-dir`, `git worktree remove`, `gh pr view`) because the feature IS an extension of an existing bash script and those commands are part of the observable behavior. Treating them as "implementation leakage" would make the spec untestable.
- No clarifications needed — issue #278 specified the feature crisply, including the detection rule, the inference rule, the stranded-shell warning requirement, and explicit out-of-scope boundaries.
- One informed default: FR-010 chose auto-checkout of `main` in the primary worktree (the feature's ergonomic core) over preserving today's "please switch primary to main first" refusal. Rationale stated in the FR. If a reviewer disagrees, flip it before `/speckit.plan`.
