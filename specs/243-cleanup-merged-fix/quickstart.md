# Quickstart — Manual Validation

## Scenario A: Squash-merged PR (bug repro → fix verification)

1. Create a worktree and trivial commit:
   ```sh
   scripts/claude-worktree.sh 999 quickstart-a   # creates branch 999-quickstart-a
   cd ../forkprint-999-quickstart-a
   echo "// trivial" >> README.md && git commit -am "trivial"
   git push -u origin 999-quickstart-a
   gh pr create --fill
   ```
2. Squash-merge the PR on GitHub (or via `gh pr merge --squash`).
3. Return to the primary worktree on `main`:
   ```sh
   cd /Users/arungupta/workspaces/forkprint   # or your main checkout
   git checkout main
   ```
4. Run `scripts/claude-worktree.sh --cleanup-merged 999`.
5. **Expect**: exit 0; "Removed ..." and "Deleted branch 999-quickstart-a" messages.
6. Verify: `git branch | grep 999-quickstart-a` returns nothing.

## Scenario B: Unmerged PR (refusal)

1. Same setup as A, but do NOT merge the PR (leave it OPEN).
2. Run `scripts/claude-worktree.sh --cleanup-merged 999`.
3. **Expect**: non-zero exit; message indicates PR is `OPEN`, not `MERGED`; points to `--remove`.
4. Verify: `git branch | grep 999-quickstart-a` still shows the branch; worktree still exists.
5. Clean up: `scripts/claude-worktree.sh --remove 999`, then `git branch -D 999-quickstart-a` manually.

## Scenario C: No PR exists

1. Create a worktree without opening a PR.
2. Run `--cleanup-merged`.
3. **Expect**: non-zero exit with an actionable error, pointing to `--remove`.

## Scenario D: Merge-commit merge (regression check)

1. Set up as A, but merge with `gh pr merge --merge` (not squash).
2. Run `--cleanup-merged`.
3. **Expect**: exit 0; branch deleted. (The new code path handles this uniformly via PR-state.)
