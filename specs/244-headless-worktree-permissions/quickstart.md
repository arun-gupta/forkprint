# Quickstart — Manual acceptance walkthrough

This walkthrough is the canonical manual acceptance test for `244-headless-worktree-permissions`. It gets copied into the PR's `## Test plan` section (constitution §XII) with each step as a checkbox.

## Pre-flight

From the main repo on `main`:

```bash
git checkout 244-headless-worktree-permissions
cat .claude/settings.json                            # confirm allowlist committed
scripts/claude-worktree.sh --help                    # confirm --approve-spec and --revise-spec appear
```

## Acceptance path 1 — Headless spawn reaches pause with no permission prompts (US1)

Pick a trivial, unblocked GitHub issue for this test (e.g., a docs-only issue). Substitute `<TEST_ISSUE>` below.

```bash
scripts/claude-worktree.sh --headless <TEST_ISSUE>
sleep 60                                             # typical /speckit.specify runtime
tail -n 100 ../forkprint-<TEST_ISSUE>-*/claude.log
```

Expected:
- `claude.log` contains the generated spec path under `specs/NNN-*/spec.md`.
- `claude.log` contains the "waiting for approval" notice.
- `claude.log` contains **zero** occurrences of `"I need your approval to run"`.
- The worktree contains `.claude.session-id` with a valid UUID.

## Acceptance path 2 — `--approve-spec` releases Stage 2 fire-and-forget (US3, SC-006)

```bash
time scripts/claude-worktree.sh --approve-spec <TEST_ISSUE>
```

Expected:
- The command returns in under 5 seconds.
- `claude.log` starts growing again within a minute.
- Eventually `/speckit.plan`, `/speckit.tasks`, and `/speckit.implement` complete; a PR is opened; no merge.

## Acceptance path 3 — `--revise-spec` edits the spec in place (US3, SC-007)

On a separate test issue that has just reached the pause:

```bash
scripts/claude-worktree.sh --revise-spec <TEST_ISSUE_2> "Add an acceptance scenario for empty input."
sleep 60
git -C ../forkprint-<TEST_ISSUE_2>-* diff specs/
```

Expected:
- The diff shows a new acceptance scenario added to the spec.
- The session has re-entered the pause (tail `claude.log`).
- Running `--revise-spec` a second time with different feedback produces a cumulative diff (against the first revision, not the original).

## Acceptance path 4 — Error paths (US3 scenarios 3 & 4, FR-015)

```bash
scripts/claude-worktree.sh --approve-spec 99999           # no worktree → exit 1
scripts/claude-worktree.sh --revise-spec <TEST_ISSUE_2> ""  # empty feedback → exit 1
```

Expected: both commands exit non-zero with clear stderr messages and do not spawn any background process.

## Acceptance path 5 — Interactive spawn unchanged (FR-006)

```bash
scripts/claude-worktree.sh <TEST_ISSUE_3>
```

Expected: interactive Claude session opens in the current terminal, same as before. The session inherits the `.claude/settings.json` allowlist — no prompts for covered tools — but still prompts for anything outside the allowlist.

## Acceptance path 6 — Batch headless (US3, SC-008)

```bash
for i in <A> <B> <C>; do scripts/claude-worktree.sh --headless "$i"; done
# review each spec
for i in <A> <B> <C>; do scripts/claude-worktree.sh --approve-spec "$i"; done
# walk away
```

Expected: three PRs appear, unmerged. Zero manual terminal attachments throughout.

## Post-conditions (always)

- No file in `.claude/settings.json` contains a secret (grep for `ghp_`, `token`, `SECRET`, `CLIENT_SECRET`).
- `docs/DEVELOPMENT.md` contains the "Permission model for headless spawns" section and the `--approve-spec` / `--revise-spec` vocabulary.
- `npm run lint` and `npm run build` remain clean (DoD).
