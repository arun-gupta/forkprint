# Data Model: GitHub OAuth Authentication (P1-F14)

## OAuth Session (in-memory React context)

```ts
interface AuthSession {
  token: string       // GitHub OAuth access token — held in-memory only
  username: string    // GitHub login (e.g. "arun-gupta")
}

// Context shape
interface AuthContextValue {
  session: AuthSession | null
  signOut: () => void
}
```

- `session` is `null` when the user is not signed in
- `signOut()` sets `session` to `null`
- No persistence — cleared on page refresh

## CSRF State (sessionStorage — transient only)

```ts
const OAUTH_STATE_KEY = 'repo_pulse_oauth_state'

// Written before redirect to GitHub, deleted after callback validates it
sessionStorage.setItem(OAUTH_STATE_KEY, crypto.randomUUID())
```

- Stored in `sessionStorage` for the duration of the OAuth round-trip only
- Deleted immediately after the callback validates it
- The OAuth access token is never stored here

## Removed Entities

- `TOKEN_STORAGE_KEY` / `LEGACY_TOKEN_STORAGE_KEY` in `lib/token-storage.ts` — deleted
- `hasServerToken` prop on `RepoInputClient` — removed (server token no longer exists)
