# Research: P1-F04 Data Fetching

## Decision 1: Introduce a framework-agnostic analyzer module now

**Decision**: Create the first shared analyzer module under `lib/analyzer/` and keep all GitHub-fetching and result-shaping logic there. The Next.js API route will only validate the request shape, resolve token precedence, and call `analyze()`.

**Rationale**: The constitution requires the analyzer to be runtime-agnostic and shared across Phase 1, Phase 2, and Phase 3. Starting that boundary at the first data-fetching feature avoids future extraction churn.

**Alternatives considered**:
- Put all logic directly in `app/api/analyze/route.ts`: rejected because it would couple Phase 1 to Next.js and make later reuse harder.
- Delay the analyzer module until Phase 2: rejected because Phase 1 data-fetching would then shape the API around the wrong boundary.

---

## Decision 2: Use three query groups per repository

**Decision**: Organize GitHub GraphQL requests into at most three groups per repo:
1. repo metadata and ecosystem signals
2. evolution and contribution dynamics activity
3. responsiveness event timestamps

**Rationale**: This respects the constitution’s 1–3 request limit while keeping query scopes explicit and easier to reason about when fields are unavailable.

**Alternatives considered**:
- One large query: rejected because it becomes harder to isolate unavailable fields and may over-fetch nested data.
- More than three narrow queries: rejected because it violates the constitution’s request budget.

---

## Decision 3: Keep failures and rate-limit state alongside successful results

**Decision**: Return a response envelope that includes successful `results`, repository-specific `failures`, and top-level `rateLimit` metadata when GitHub provides it.

**Rationale**: The product contract requires per-repo error isolation and visible rate-limit state. A single response envelope allows the UI to show both successful analyses and isolated failures from one submission.

**Alternatives considered**:
- Fail the entire response on the first repo error: rejected because it violates per-repo isolation.
- Hide failure details and only show missing results: rejected because it obscures why specific repos failed.

---

## Decision 4: Keep loading state in the client, not in the analyzer

**Decision**: The analyzer returns final success/failure data only. Per-repo loading indicators are tracked in the client while the request is in flight.

**Rationale**: Loading is a UI concern; mixing it into the analyzer module would pollute the runtime-agnostic boundary.

**Alternatives considered**:
- Emit loading placeholders from the server: rejected because it complicates the API contract before streaming is needed.

---

## Decision 5: Treat invalid or rejected tokens as fetch-time failures

**Decision**: If GitHub rejects the provided token, the API route returns a clear analysis failure rather than trying to validate the token pre-emptively in the client.

**Rationale**: This matches the existing authentication feature assumptions and keeps token validity anchored to the actual GitHub API response.

**Alternatives considered**:
- Add a separate token validation request before analysis: rejected because it adds an extra round-trip and duplicates the real failure source.
