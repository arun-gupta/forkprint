# Contract — `scripts/claude-worktree.sh` CLI surface

## Existing subcommands (unchanged)

```
scripts/claude-worktree.sh [--headless] <issue> [slug]
scripts/claude-worktree.sh --remove <issue>
scripts/claude-worktree.sh --cleanup-merged <issue>
scripts/claude-worktree.sh --help | -h
```

## New subcommands

### `--approve-spec <issue>`

```
scripts/claude-worktree.sh --approve-spec <issue>
```

**Preconditions**:
- A worktree for `<issue>` exists (same lookup logic as `--remove` / `--cleanup-merged`).
- `<worktree>/.claude.session-id` exists and contains a valid UUID.
- At least one `<worktree>/specs/*/spec.md` exists.

**Behavior**:
1. Resolve the worktree path for `<issue>`.
2. Read the session UUID from `<worktree>/.claude.session-id`.
3. `cd <worktree> && nohup claude -p "proceed" --resume <uuid> >> claude.log 2>&1 &` — detached background process.
4. Print `"Released pause for issue <issue>; Stage 2 running in background. Tail: <worktree>/claude.log"` to stdout.
5. Return 0 in under 5 seconds (SC-006).

**Error paths**:
- No worktree for issue → exit 1, `"No worktree found for issue <issue>"` to stderr.
- No `.claude.session-id` → exit 1, `"No session ID recorded for issue <issue>; cannot resume non-interactively. Use 'claude --resume' from the worktree instead."` to stderr.
- No `spec.md` in the worktree → exit 1, `"Spec not yet generated for issue <issue>; paused state not reached. Tail <worktree>/claude.log to confirm."` to stderr.

### `--revise-spec <issue> <feedback>`

```
scripts/claude-worktree.sh --revise-spec <issue> "<feedback text>"
```

**Preconditions**: Same as `--approve-spec`, plus `<feedback>` MUST be non-empty.

**Behavior**: Same shape as `--approve-spec`, except the prompt sent is the feedback text verbatim (not the literal string `"proceed"`). The paused Claude session interprets the feedback as revision instructions, edits the existing `spec.md` in place (per FR-013, FR-013a), re-enters the pause, and appends the updated spec path to `claude.log`.

**Error paths**:
- All of `--approve-spec`'s error paths.
- Empty feedback → exit 1, `"--revise-spec requires non-empty feedback"` to stderr.

### `--help` / `-h`

Updated to document the two new subcommands at the same level of detail as the existing ones.

## Modified behavior of the main spawn path

On the `[--headless] <issue> [slug]` path, the script additionally:
1. Generates a UUID (`uuidgen`).
2. Writes it to `<worktree>/.claude.session-id` before invoking Claude.
3. Passes it to the Claude invocation as `--session-id <uuid>`. This applies to both interactive and headless invocations so that `--approve-spec` / `--revise-spec` work identically regardless of how the worktree was spawned.

## Invariants

- The script MUST NOT overwrite an existing `.claude.session-id` on the main spawn path. (A worktree already has a session; we don't clobber it.) If the file already exists when the spawn path is entered, that's a collision with an existing worktree and the script already exits 1 on the "worktree exists" check at `scripts/claude-worktree.sh:168`.
- The script MUST NOT overwrite `.claude.pid` from the release commands. `.claude.pid` identifies the original spawn process; the release commands spawn a second process and do not record its PID (the session UUID is the durable identifier).
- `--remove` and `--cleanup-merged` MUST continue to succeed even if a release-command background process is still running — they already `kill $(cat .claude.pid)` which covers the original spawn; for the release-command process we rely on `git worktree remove --force` tearing down the worktree directory the Claude process is running inside, same pattern as today.
