# Phase 0 Research: Naming convention, branch detection, and compatibility

## Decision 1: Prefix form for issue-driven work — `gh<N>-<slug>`

**Decision**: Issue-driven spec directories, feature branches, and worktree directories all use the prefix `gh<N>` where `<N>` is the GitHub issue number without padding (e.g. `gh7-foo`, `gh249-bar`, `gh12345-baz`).

**Rationale**:
- Disjoint from both sequential (`<NNN>-`) and timestamp (`<YYYYMMDD>-<HHMMSS>-`) namespaces: no string starting with `gh[0-9]` can also match `^[0-9]`, so the grammars are mutually exclusive.
- Visually signals "this is a GitHub issue" — matches the `gh` CLI binary the project already uses and the `#<N>` form issues appear as in PR titles.
- Short — adds only 2 characters vs the old unprefixed form. `gh249-foo` vs `249-foo`.
- No padding — GitHub itself displays issues as `#7` and `#12345`, not `#007`. Keeping the form padding-free mirrors that.

**Alternatives considered**:
- `i<N>-` (e.g. `i249-foo`): shorter, but `i` alone is ambiguous (iteration? index?). Rejected.
- `issue-<N>-` (e.g. `issue-249-foo`): explicit, but verbose. Every branch name grows by 6 characters. Rejected.
- `#<N>-` (e.g. `#249-foo`): `#` is legal in git branch names, but treacherous in shell contexts (comments, globs, URLs) and unsupported by some tooling. Rejected.
- Raise the manual sequential floor to 9000+ so issue numbers can't overlap: keeps `<N>-` shape but picks arbitrary boundary that leaks into every unrelated spec's name. Rejected.
- Switch manual fallback to timestamp-only: changes the manual flow maintainers already use. Rejected.

## Decision 2: Branch-detection logic in `create-new-feature.sh`

**Decision**: The script derives the spec-directory prefix from the currently checked-out branch when the branch matches `^(gh)?[0-9]+-(.+)$`. It reuses the current branch verbatim (no `git checkout -b`) when the target matches. Only when the current branch is a non-matching name (e.g. `main`, `feature/foo`) does the sequential-increment path run.

**Rationale**:
- Works identically whether the user passes an explicit flag or not — the source of truth is the branch name that the worktree or the user has already created.
- Makes the `gh` prefix rule enforceable without modifying the Claude command template's invocation (`/speckit.specify` passes no `--number`; the script handles detection).
- Covers legacy-unprefixed branches (like this feature's own `249-speckit-…`) as well: they get detected as `^[0-9]+-` and reused unchanged. No forced migration.

**Alternatives considered**:
- Add a new `--issue <N>` flag and require the Claude command template to pass it: couples the SpecKit helper to the Claude prompt format, and breaks if Claude forgets to pass the flag. Rejected.
- Always re-create a new branch (current behaviour): the bug. Rejected.
- Detect and fail if not on a `gh<N>-` branch (forcing migration): breaks in-flight legacy worktrees. Rejected.

## Decision 3: Collision handling

**Decision**: Two collision cases are treated differently.

| Case | Behaviour |
|---|---|
| Target branch == current HEAD (common in worktree spawn) | Silent reuse. No `git checkout -b`. Proceed to spec-dir creation. |
| Target branch exists but is NOT current HEAD | Exit non-zero with a clear error naming the conflicting branch. |
| `specs/<prefix>-<slug>/` directory does not exist yet | Create it normally. |
| `specs/<prefix>-<slug>/` exists, `spec.md` missing or empty | Reuse the directory; copy the template to `spec.md`. |
| `specs/<prefix>-<slug>/` exists, `spec.md` non-empty | Exit non-zero with a clear error naming the directory. Suggest renaming/removing the existing dir or picking a different issue. |

**Rationale**: The FR-006 / FR-007 contracts in the spec require loud failure over silent renumbering. Reuse is correct for the worktree-spawn case (the branch and sometimes the spec dir already exist from a prior partial run). A non-empty `spec.md` is authored content and must never be overwritten silently.

**Alternatives considered**:
- Always delete and regenerate the spec dir: destroys user work. Rejected.
- Always error on any existing dir: breaks the worktree-spawn reuse flow. Rejected.

## Decision 4: `common.sh` helpers for downstream commands

**Decision**: Three functions in `.specify/scripts/bash/common.sh` gain `gh<N>-` awareness:

1. `get_current_branch()` — the non-git fallback that scans `specs/` for the latest feature directory when git is unavailable. Adds a regex branch for `^gh([0-9]+)-` alongside the existing `^[0-9]{3}-` and timestamp branches. Ranks `gh<N>` numerically like the sequential form.
2. `check_feature_branch()` — validates a branch is a feature branch. Adds `^gh[0-9]+-` to the accept list alongside `^[0-9]{3}-` and `^[0-9]{8}-[0-9]{6}-`. Updates the error message to reference the new form.
3. `find_feature_dir_by_prefix()` — resolves `specs/<prefix>-*` from the current branch's prefix. Adds a regex branch for `^gh([0-9]+)-` that captures `gh<N>` as the prefix. Existing sequential (`^[0-9]{3}-`) and timestamp branches unchanged.

**Rationale**: Without these changes, `/speckit.plan`, `/speckit.tasks`, and `/speckit.implement` (all of which call `get_feature_paths()`, which calls `find_feature_dir_by_prefix()`) would fail to resolve the spec directory for a `gh<N>-` branch. The fix must be end-to-end or the prefix contract breaks after `/speckit.specify`.

**Alternatives considered**:
- Leave `common.sh` alone and rely on exact-branch-name match (the existing fallback in `find_feature_dir_by_prefix`): works only when spec dir name exactly equals branch name. That is the happy path, but any divergence (e.g. slug mismatch) would regress silently. Rejected — the helpers exist precisely for this prefix-based resolution.

## Decision 5: Backward compatibility for `--cleanup-merged`

**Decision**: `scripts/claude-worktree.sh --cleanup-merged <N>` and `--remove <N>` match worktrees whose directory name contains *either* `-gh<N>-` or the legacy `-<N>-`. New spawns only create `-gh<N>-`, but existing in-flight legacy worktrees (this feature included) must remain cleanable during a transition period.

**Rationale**: Forcing maintainers to manually rename their in-flight worktrees would bite immediately (this very feature would be un-cleanable after merge). A single awk pattern accepting both forms is ~5 additional characters and solves the transition cleanly.

**Alternatives considered**:
- Drop legacy matching immediately: breaks in-flight work. Rejected.
- Keep legacy matching forever: we'll never know when to drop it. Mitigation: add a comment in the script noting that the legacy branch can be removed once all legacy-named worktrees have been cleaned, tracked informally.

## Decision 6: No change to the Claude command template invocation

**Decision**: `.claude/commands/speckit.specify.md` continues to instruct Claude to invoke `create-new-feature.sh` without `--number`. The prefix detection is entirely in the bash script (Decision 2). The command template gets a short clarifying note about the new convention so Claude doesn't get confused by `gh<N>-` branches.

**Rationale**: The Claude prompt should not carry domain logic that belongs in the helper script. The helper script is the authoritative place for naming rules; the Claude prompt is a UX wrapper. Keeping the logic in one place avoids drift between "what Claude tells the script" and "what the script does."

**Alternatives considered**:
- Have Claude parse the kickoff prompt for an issue number and pass `--number <N>`: requires Claude to reason about the branch name, which is fragile. Rejected.
- Have `claude-worktree.sh` export `SPECIFY_FEATURE=gh<N>-<slug>` into the worktree's shell env: works, but adds an env-var contract that's hidden from users reading the scripts. Rejected in favour of branch-name detection.

## Decision 7: Validation of `--number` input

**Decision**: `--number` input must be a positive integer (no leading zeros preserved, no sign, no decimals, no whitespace). Validation happens before any filesystem or git mutation. Invalid input exits non-zero with a clear error.

**Rationale**: FR-008 in the spec explicitly requires this. Existing script has partial validation (forces base-10 via `$((10#$BRANCH_NUMBER))`) but does not reject negatives or non-numerics; `printf "%03d"` accepts garbage and produces surprising output.

**Alternatives considered**:
- Defer validation to `git checkout -b` failing: produces a cryptic git error, violates FR-008. Rejected.

## Open questions resolved

All [NEEDS CLARIFICATION] markers in the spec were resolved during Stage 1 review (user confirmed option 2: `gh<N>` prefix). No residual questions.

## Out of scope (confirmed)

- Renaming existing spec directories (`001-*` … `229-*`, `128-licensing-compliance`, this feature's `249-speckit-…`): historical, immutable.
- Automated tests for the bash scripts: no existing test harness, not a product-runtime concern. Manual regression via `quickstart.md`.
- Renaming existing legacy worktrees on disk: the compat-match fallback handles them.
- Changes to the analyzer, UI, API, or any product surface.
