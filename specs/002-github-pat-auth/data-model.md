# Data Model: P1-F02 GitHub PAT Authentication

## Entities

### StoredToken

Represents the PAT persisted in the browser.

| Field       | Type     | Source         | Notes                                      |
|-------------|----------|----------------|--------------------------------------------|
| `value`     | `string` | User input     | Trimmed. Empty string treated as absent.   |
| `key`       | `string` | Constant       | Always `forkprint_github_token`            |

**Lifecycle**:
- Written to `localStorage` on form submit (if non-empty)
- Read from `localStorage` on page load to pre-populate the field
- Cleared from `localStorage` if user clears the field and submits (token removed from storage to stay in sync)
- Never placed in React state that is serialized or logged

**Validation rules**:
- Empty or whitespace-only → treated as absent (not stored)
- No format regex — accepted as-is

---

### TokenContext (passed to submission layer)

Carries the resolved token at form-submit time.

| Field            | Type              | Notes                                          |
|------------------|-------------------|------------------------------------------------|
| `token`          | `string \| null`  | Resolved client token; `null` if absent        |
| `hasServerToken` | `boolean`         | True when server-side `GITHUB_TOKEN` is set    |

**Resolution order** (mirrors constitution Section III rule 6):
1. If `hasServerToken === true` → no client token needed; pass `null`
2. If `hasServerToken === false` and `token` is non-empty → pass `token`
3. If `hasServerToken === false` and `token` is empty → block submission

---

## State Transitions

```
Page load
  └─ localStorage has token?
       ├─ Yes → pre-populate TokenInput field
       └─ No  → field empty

User edits token field
  └─ Controlled input updates display value only (not yet persisted)

User submits form
  ├─ hasServerToken = true  → skip token check, proceed
  ├─ hasServerToken = false, field non-empty → store in localStorage, proceed
  └─ hasServerToken = false, field empty     → show inline error, block submit
```
