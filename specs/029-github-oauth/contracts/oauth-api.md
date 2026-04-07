# API Contracts: GitHub OAuth Authentication (P1-F14)

## GET /api/auth/login

Initiates the GitHub OAuth flow. Generates a CSRF `state` value, stores it in a short-lived cookie, and redirects the browser to GitHub's authorization page.

**Response**: `302 Redirect` → `https://github.com/login/oauth/authorize?client_id=...&scope=public_repo&state=...`

---

## GET /api/auth/callback

Handles the GitHub OAuth callback. Validates the `state` parameter, exchanges the `code` for an access token, fetches the GitHub username, and redirects the client to the app root with the token in the URL fragment.

**Query params**:
| Param | Type | Description |
|-------|------|-------------|
| `code` | string | Authorization code from GitHub |
| `state` | string | CSRF state value to validate |
| `error` | string? | Present when the user denied authorization |

**Success response**: `302 Redirect` → `/#token=<access_token>&username=<github_login>`

**Error response**: `302 Redirect` → `/?auth_error=<reason>`

---

## Modified: POST /api/analyze

`GITHUB_TOKEN` env fallback removed. `token` in the request body is now required.

**Request body**:
```json
{ "repos": ["owner/repo"], "token": "gho_..." }
```

**Error (missing token)**: `401 { "error": "Authentication required." }`

---

## Modified: POST /api/analyze-org

Same change as `/api/analyze`.

**Request body**:
```json
{ "org": "my-org", "token": "gho_..." }
```

**Error (missing token)**: `401 { "error": "Authentication required." }`
