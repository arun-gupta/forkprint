# Data Model: Repo Input (P1-F01)

**Date**: 2026-03-31

---

## Entities

### RepoSlug

A validated, normalized GitHub repository identifier.

```
RepoSlug = string  // format: "owner/repo"
```

**Constraints**:
- Owner: one or more characters from `[a-zA-Z0-9_.-]`
- Separator: exactly one `/`
- Repo name: one or more characters from `[a-zA-Z0-9_.-]`
- No leading/trailing whitespace (trimmed before validation)
- No full URLs (extracted to slug before validation)

---

## Parser Input / Output

### Input

```
rawInput: string   // contents of the textarea
```

### Output

```typescript
type ParseResult =
  | { valid: true;  repos: string[] }   // non-empty, deduplicated, validated slugs
  | { valid: false; error: string }     // human-readable error message
```

---

## Parsing Pipeline

```
rawInput
  → split on newlines and commas
  → trim each token
  → drop blank tokens
  → extract slug from GitHub URL (if applicable)
  → validate each token against slug pattern
  → deduplicate (case-sensitive, preserve first occurrence order)
  → if any invalid → return { valid: false, error }
  → return { valid: true, repos: string[] }
```

---

## State (RepoInputForm component)

| Field | Type | Description |
|-------|------|-------------|
| `inputValue` | `string` | Raw textarea content |
| `error` | `string \| null` | Inline validation error message; null when no error |
