# Research: P1-F02 GitHub PAT Authentication

## Decision 1: Detecting server-side token presence on the client

**Decision**: Check `process.env.GITHUB_TOKEN` in `app/page.tsx` (a React Server Component) and pass a `hasServerToken: boolean` prop down to the client component. No API call required.

**Rationale**: `app/page.tsx` is already a server component — it runs on the server and has access to `process.env`. Passing a boolean (not the token value) keeps the token value entirely server-side. This is the idiomatic Next.js App Router pattern.

**Alternatives considered**:
- A `/api/has-token` endpoint: adds a network round-trip and a new API surface for a boolean flag — unnecessary.
- Reading from a cookie set at deploy time: over-engineered; env var check is simpler and sufficient.

---

## Decision 2: localStorage key for the token

**Decision**: `forkprint_github_token`

**Rationale**: Namespaced to the app, human-readable, avoids collision with other tools. Defined as a single constant in `lib/token-storage.ts` — not inlined anywhere.

**Alternatives considered**:
- `github_token`: Too generic, risks collision with other browser extensions or apps on the same origin.
- `token`: Too short and ambiguous.

---

## Decision 3: Token flow to the data-fetching layer

**Decision**: `RepoInputClient` reads the token from `localStorage` at submit time and passes it to `onSubmit(repos, token)`. `onSubmit` will forward it to `POST /api/analyze` in P1-F04. For P1-F02, `onSubmit` signature is extended but the body remains a stub.

**Rationale**: Keeps `TokenInput` purely a display/storage component — it does not own submission logic. The token is read at submit time (not stored in React state that re-renders the form) to minimize token exposure in the React tree.

**Alternatives considered**:
- Store token in React context: heavier than needed; P1-F02 is a single-page flow with no deeply nested consumers yet.
- Pass token via a separate prop to the API layer: same result but requires an extra prop thread through `RepoInputClient`.

---

## Decision 4: Token validation at entry time

**Decision**: Trim whitespace and treat empty string as "no token". No format regex (e.g., `ghp_` prefix). No API round-trip to verify authenticity.

**Rationale**: Per spec FR-008 and the product definition acceptance criteria. Format validation would cause false rejections on future GitHub token format changes (GitHub has changed PAT formats before — `github_pat_` prefix was introduced in 2022). Invalid tokens will fail at the API call in P1-F04 with a clear error.

---

## Decision 5: Component placement

**Decision**: New `components/token-input/TokenInput.tsx` client component, rendered from `RepoInputClient.tsx` (which is already a client boundary). The `hasServerToken` boolean is threaded from `app/page.tsx` → `RepoInputClient` → `TokenInput`.

**Rationale**: Keeps the token UI isolated and independently testable. Follows the existing pattern of a thin client wrapper (`RepoInputClient`) around a stateful UI component.
