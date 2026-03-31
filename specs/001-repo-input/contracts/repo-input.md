# Contract: Repo Input → Data Fetching Layer

**Feature**: P1-F01
**Date**: 2026-03-31

---

## parseRepos (lib/parse-repos.ts)

Pure function. No side effects. No React dependency.

```typescript
function parseRepos(input: string): ParseResult

type ParseResult =
  | { valid: true;  repos: string[] }
  | { valid: false; error: string }
```

**Guarantees**:
- `repos` is always non-empty when `valid: true`
- `repos` contains only strings matching `/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/`
- `repos` is deduplicated (case-sensitive, first-occurrence order preserved)
- `repos` contains no leading/trailing whitespace
- GitHub URLs (`https://github.com/owner/repo`) are extracted to `owner/repo` before validation
- `error` is a human-readable string suitable for display in the UI

---

## RepoInputForm component (components/repo-input/RepoInputForm.tsx)

```typescript
interface RepoInputFormProps {
  onSubmit: (repos: string[]) => void
}
```

**Guarantees**:
- `onSubmit` is called only when `parseRepos` returns `{ valid: true }`
- `onSubmit` receives the validated, deduplicated `repos` array
- `onSubmit` is never called with an empty array
- On validation failure, an inline error is rendered and `onSubmit` is not called
- No API calls are made by this component

---

## Boundary

This contract ends at `onSubmit`. What the parent does with `repos: string[]` is the responsibility of P1-F04 (Data Fetching).
