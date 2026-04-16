# GitHub API Endpoints — Stale Admin Detection (#287)

Every endpoint below is called **on behalf of the authenticated user** using the OAuth token held in the React `AuthContext`. No server-side token is used (Constitution III.5).

## 1. List org admins

```
GET https://api.github.com/orgs/{org}/members?role=admin&per_page=100
Accept: application/vnd.github+json
Authorization: Bearer {oauth_token}
```

Pagination: follow `Link: rel="next"` until absent. No silent truncation.

**Scope effect** (see `research.md § R1`): baseline `public_repo` returns publicly-listed admins only. `public_repo + read:org` returns **all** admins only when the caller is a member of `{org}`.

Failure modes mapped to `StaleAdminsSection.adminListUnavailableReason`:

| HTTP / network | Reason |
|---|---|
| 403 with `X-RateLimit-Remaining: 0` | `rate-limited` |
| 401 | `auth-failed` |
| 404 | `unknown` (propagate as `admin-list-unavailable`; may mean org is private to the caller) |
| network error | `network` |
| elevated mode promised but response is missing `read:org`-gated members | `scope-insufficient` (only detectable indirectly; default to `unknown` if we cannot distinguish) |

## 2. Membership probe (elevated path only)

```
GET https://api.github.com/user/memberships/orgs/{org}
Accept: application/vnd.github+json
Authorization: Bearer {oauth_token}
```

- `200` with `{ state: 'active' }` ⇒ user is a member ⇒ mode = `elevated-effective`.
- `404` ⇒ user is not a member ⇒ mode = `elevated-ineffective`.
- Other failures ⇒ fall back to `elevated-ineffective` (honest conservative default).

Skipped entirely when `mode === 'baseline'`.

## 3. Public events (primary activity source)

```
GET https://api.github.com/users/{username}/events/public?per_page=100
Accept: application/vnd.github+json
Authorization: Bearer {oauth_token}
```

Response is an array of event objects. We take `response[0].created_at` when the array is non-empty. We do **not** paginate — the most recent event is all we need. Feed is truncated at 90 days / 300 events (GitHub-documented).

Failure modes mapped to `StaleAdminRecord.unavailableReason`:

| HTTP / network | Reason |
|---|---|
| 404 | `admin-account-404` (user account deleted/suspended) |
| 403 + rate-limit headers | `rate-limited` |
| network / 5xx / other 4xx | `events-fetch-failed` (we fall through to commit search) |

## 4. Commit search (fallback activity source)

```
GET https://api.github.com/search/commits?q=author:{username}+org:{org}&sort=author-date&order=desc&per_page=1
Accept: application/vnd.github+json
Authorization: Bearer {oauth_token}
```

We take `response.items[0].commit.author.date` when `total_count > 0`. Rate limit is 30 req/min authenticated — concurrency-capped per R2.

Failure modes:

| HTTP / network | Reason |
|---|---|
| 422 (bad query) | `commit-search-failed` (shouldn't happen; defensive) |
| 403 + rate-limit headers | `rate-limited` |
| network / 5xx / other | `commit-search-failed` |

## OAuth authorization (landing-page checkbox)

```
GET /api/auth/login?elevated=1       → builds scope = "public_repo read:org"
GET /api/auth/login                   → builds scope = "public_repo" (unchanged)
```

Handled inside our Next.js API route; redirects to `https://github.com/login/oauth/authorize?client_id=...&scope=<built>&redirect_uri=...&state=...`.

Granted scopes are extracted from the token-grant response and stored on the in-memory session as `session.scopes: readonly string[]`. The UI reads `session.scopes.includes('read:org')` to decide mode, **not** the `?elevated=1` flag — the flag declares intent; the scopes list declares reality.
