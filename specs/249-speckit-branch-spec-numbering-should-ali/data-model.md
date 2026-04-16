# Phase 1 Data Model: Naming grammar

This feature introduces no runtime data structures. The "model" is the grammar of the three filesystem/git entities that must agree on their prefix.

## Entity grammars

### Issue-driven triple (NEW)

```
worktree-dir  := "forkprint-" issue-prefix "-" slug
branch        := issue-prefix "-" slug
spec-dir      := "specs/" issue-prefix "-" slug
issue-prefix  := "gh" positive-int
positive-int  := [1-9] [0-9]*
slug          := [a-z0-9] ([a-z0-9-]* [a-z0-9])?        ; kebab-case, 1-40 chars
```

All three entities for a single feature use the **same** `issue-prefix` and the **same** `slug`.

Examples:
- `forkprint-gh249-align-spec-numbering`, `gh249-align-spec-numbering`, `specs/gh249-align-spec-numbering/`
- `forkprint-gh7-fix-bug`, `gh7-fix-bug`, `specs/gh7-fix-bug/`

### Manual sequential triple (UNCHANGED)

```
branch       := seq-prefix "-" slug
spec-dir     := "specs/" seq-prefix "-" slug
seq-prefix   := [0-9]{3}                                ; zero-padded, legacy form
```

No worktree entity is produced for manual sequential work — those feature branches live in the main checkout.

Examples (existing, unchanged): `001-repo-input`, `032-doc-scoring`, `230-<next-manual-spec>`.

### Timestamp-based triple (UNCHANGED, opt-in)

```
branch       := ts-prefix "-" slug
spec-dir     := "specs/" ts-prefix "-" slug
ts-prefix    := [0-9]{8} "-" [0-9]{6}                   ; YYYYMMDD-HHMMSS
```

Used only when `.specify/init-options.json` has `"branch_numbering": "timestamp"`.

## Disjoint-namespace proof

Three prefix forms, each characterised by its first 1-2 characters:

| Form | First-char regex | Example |
|---|---|---|
| Issue-driven | `^gh` (letters) | `gh249-` |
| Sequential | `^[0-9]{3}-` (three digits then hyphen) | `001-`, `249-` |
| Timestamp | `^[0-9]{8}-` (eight digits then hyphen) | `20260416-` |

A string matching `^gh` cannot match `^[0-9]`, and vice versa. Sequential (3 digits) and timestamp (8 digits) are disambiguated by the position of the first hyphen (4th char for sequential, 9th for timestamp). All three forms are mutually exclusive grammars, so no string can be ambiguously classified.

## Legacy entities (in-flight)

During the transition, the filesystem will contain some legacy entities that predate this feature:

- Legacy unprefixed branches for issue-numbered work: e.g. `249-speckit-branch-spec-numbering-should-ali` (this feature's own branch). These match the `seq-prefix` grammar by structure and keep working unchanged.
- Legacy `forkprint-<N>-<slug>/` worktree directories: matched by the compat-fallback awk pattern in `--cleanup-merged` and `--remove`.

No retroactive rename is performed. These entities are cleaned up naturally as their features merge.

## State transitions

None. These entities are created once per feature and do not change state during a feature's lifetime (beyond normal git operations: commits, pushes, merges).

## Validation rules

1. **Issue number input**: positive integer, no leading zero. Validated in `create-new-feature.sh` before any filesystem mutation.
2. **Slug input**: `[a-z0-9-]+`, 1-40 characters, no leading or trailing hyphens. Validated in `claude-worktree.sh` (existing) and `create-new-feature.sh` (existing `clean_branch_name` logic).
3. **Branch prefix derivation from current HEAD**: if the current branch matches `^(gh[0-9]+|[0-9]{3}|[0-9]{8}-[0-9]{6})-`, the entire prefix is extracted verbatim and reused. Otherwise the sequential fallback applies.
4. **Prefix-to-spec-dir consistency**: the spec directory name must equal the branch name (same prefix, same slug) for `find_feature_dir_by_prefix()` to resolve correctly without ambiguity.
