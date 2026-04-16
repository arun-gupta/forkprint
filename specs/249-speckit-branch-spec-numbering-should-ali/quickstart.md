# Quickstart: Regression test for `gh<N>-` naming

This file describes how to exercise the feature end-to-end after implementation. Run it against a real throwaway GitHub issue to verify the acceptance criteria.

## Prerequisites

- Repo checked out at `main`.
- `gh` CLI authenticated.
- A disposable test GitHub issue (or an existing open issue whose worktree will be cleaned up afterwards).

## T1. Worktree-driven happy path (User Story 1)

```bash
# Create a test issue or pick one
TEST_ISSUE=<N>

# Spawn a worktree
scripts/claude-worktree.sh --no-speckit "$TEST_ISSUE"
# Or, to exercise the /speckit.specify path:
# scripts/claude-worktree.sh "$TEST_ISSUE"

# Expected output: worktree at `../forkprint-gh<N>-<slug>/`, branch `gh<N>-<slug>`.
cd "../forkprint-gh${TEST_ISSUE}-"*
git branch --show-current    # expect: gh<N>-<slug>
basename "$(pwd)"            # expect: forkprint-gh<N>-<slug>
```

Run `/speckit.specify` inside Claude. Then:

```bash
ls specs/                    # expect: only gh<N>-<slug>/ was created
cat specs/gh*/spec.md | head # expect: populated spec
git branch --show-current    # expect: still gh<N>-<slug>, not a new number
```

**Pass criterion**: all three prefixes agree (`gh<N>-`), no `<other-number>-` spec/branch was produced.

## T2. Manual sequential fallback (User Story 2)

```bash
# From main, no worktree, no issue context:
cd <repo-root>
git checkout main
# Invoke /speckit.specify in Claude with a non-issue description, e.g. "exploratory refactor"
```

**Pass criterion**: Spec directory uses the next free `<NNN>-<slug>` form (no `gh` prefix). Branch `<NNN>-<slug>` created and checked out.

## T3. Explicit `--number` override (User Story 2, scenario 2)

```bash
.specify/scripts/bash/create-new-feature.sh --number 9999 --short-name test-override "Test override" --json
```

**Pass criterion**: Produces branch `9999-test-override` (unprefixed), spec dir `specs/9999-test-override/`. Confirms `--number` remains a manual override and does NOT add the `gh` prefix.

## T4. Reuse when branch already matches (User Story 3, scenario 1)

Already covered by T1 — the worktree spawn pre-creates the branch, and `/speckit.specify` reuses it silently.

Verify explicitly:

```bash
cd "../forkprint-gh${TEST_ISSUE}-"*
git log --oneline | wc -l    # record N
# Re-run /speckit.specify in Claude (idempotent reuse scenario)
git log --oneline | wc -l    # expect: still N (no branch-switch noise)
```

## T5. Loud error on spec-dir collision (User Story 3, scenario 2)

```bash
# Create an orphan spec dir with a populated spec
mkdir -p specs/gh${TEST_ISSUE}-existing-slug
echo "stub" > specs/gh${TEST_ISSUE}-existing-slug/spec.md

# Attempt to run create-new-feature.sh with a different slug on a gh<N>- branch
# (Simulate by being on a branch `gh<N>-different-slug` and running the script)

.specify/scripts/bash/create-new-feature.sh --short-name different-slug "Different" --json
# Expected: exit 1, error message naming the existing dir
echo "exit=$?"               # expect: 1
```

## T6. Loud error on branch collision (User Story 3, scenario 3)

```bash
git checkout main
git branch gh12345-phantom   # create a conflicting branch on main
.specify/scripts/bash/create-new-feature.sh --short-name phantom "Phantom" --json
# Running from a checkout that isn't on gh12345-phantom. Expected: exit 1 with branch-exists error.
git branch -D gh12345-phantom
```

## T7. `--cleanup-merged` with new and legacy worktrees

```bash
# Merge the PR for T1's worktree via GitHub UI, then:
cd <repo-root>
git checkout main && git pull
scripts/claude-worktree.sh --cleanup-merged "$TEST_ISSUE"
# Expected: finds forkprint-gh<N>-*, cleans it, deletes branch.

# Legacy fallback: if any `forkprint-<N>-<slug>/` (no gh prefix) exists for a merged branch,
# the same command also finds and cleans it.
```

## T8. Invalid `--number` input

```bash
.specify/scripts/bash/create-new-feature.sh --number abc "bad" --json    # expect: exit 1, "must be positive integer"
.specify/scripts/bash/create-new-feature.sh --number 0 "bad" --json      # expect: exit 1
.specify/scripts/bash/create-new-feature.sh --number -5 "bad" --json     # expect: exit 1
```

## T9. Downstream commands resolve the `gh<N>-` spec dir

On a `gh<N>-<slug>` branch with a populated `specs/gh<N>-<slug>/spec.md`:

```bash
.specify/scripts/bash/setup-plan.sh --json | jq -r .FEATURE_SPEC
# expect: /path/to/specs/gh<N>-<slug>/spec.md
```

**Pass criterion**: `/speckit.plan`, `/speckit.tasks`, and `/speckit.implement` all resolve the same `specs/gh<N>-<slug>/` directory without ambiguity.

## Cleanup after testing

```bash
# Remove any stray test worktrees/branches:
scripts/claude-worktree.sh --remove "$TEST_ISSUE"
git branch -D "gh${TEST_ISSUE}-"*
rm -rf specs/gh${TEST_ISSUE}-*
# Close the test GitHub issue if one was created.
```
