# Research: Repo Input (P1-F01)

**Date**: 2026-03-31
**Status**: Complete — no NEEDS CLARIFICATION items

---

## Decisions

### 1. Input parsing strategy

**Decision**: Extract a pure `parseRepos(input: string): string[]` function in `lib/parse-repos.ts` that handles all normalization — split on newlines and commas, trim whitespace, extract slugs from GitHub URLs, validate pattern, deduplicate.

**Rationale**: Keeps the React component thin and makes the parsing logic independently testable without mounting any component. All edge cases (URL extraction, deduplication, blank lines) live in one place.

**Alternatives considered**:
- Inline parsing inside the React component — rejected; harder to unit test and mixes concerns.
- Zod schema validation — considered but unnecessary for a simple regex pattern; adds a dependency for no gain.

---

### 2. GitHub URL extraction

**Decision**: Regex match against `https://github.com/owner/repo` pattern, extract the `owner/repo` portion. Any URL that does not match this exact pattern is treated as invalid.

**Rationale**: Simple, predictable, no external dependency. Covers the common paste case (browser address bar, GitHub UI links).

**Alternatives considered**:
- Full URL parsing with the `URL` API — overkill; we only need to handle `github.com` URLs.
- Supporting `git@github.com:owner/repo.git` SSH URLs — out of scope for P1-F01.

---

### 3. Slug validation pattern

**Decision**: `/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/` — matches GitHub's actual owner and repo name character set.

**Rationale**: Matches GitHub's constraints for owner and repo names. Rejects URLs, empty segments, and malformed input before it reaches the API.

**Alternatives considered**:
- Loose pattern `/^.+\/.+$/` — too permissive; would accept invalid slugs that fail at the API.

---

### 4. Deduplication

**Decision**: Case-sensitive deduplication using a `Set` after parsing and validation. `Facebook/React` and `facebook/react` are treated as distinct.

**Rationale**: GitHub repo paths are case-insensitive in practice but the API accepts either form. Case-sensitive dedup is the safe, simple default — it avoids guessing the canonical casing.

**Alternatives considered**:
- Case-insensitive dedup — rejected; would silently drop a slug the user explicitly entered with different casing.

---

### 5. Validation feedback

**Decision**: Inline error message rendered below the textarea on submit. Lists the first invalid slug found. No toast, no modal.

**Rationale**: Inline errors are standard form UX, keep the user in context, and require no additional library.

**Alternatives considered**:
- Per-slug inline highlighting — useful but beyond P1-F01 scope; the spec requires an inline error, not per-slug highlighting.
