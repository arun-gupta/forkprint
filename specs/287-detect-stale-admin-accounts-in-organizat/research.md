# Phase 0 Research — Stale Admin Detection (#287)

All `NEEDS CLARIFICATION` from the plan's Technical Context are resolved here. Every decision includes rationale and the alternatives considered.

---

## R1 — Admin list endpoint and the effect of OAuth scope

**Decision**: Use `GET /orgs/{org}/members?role=admin&per_page=100` (REST). Paginate via `Link: rel="next"` until exhausted.

**Rationale**: GitHub's GraphQL API does not expose the full `MembershipRole`-filtered member list for an arbitrary organization with the same guarantees as the REST endpoint. The REST endpoint is the documented primary path for org member enumeration.

**Scope effect** (core to FR-001 and FR-017):

| Scope held by session | Caller is org member? | Response includes concealed admins? |
|---|---|---|
| `public_repo` only | no | **No** — public members only |
| `public_repo` only | yes (rare for our analyzer flow but possible) | No — `read:org` is still required to read concealed members |
| `public_repo` + `read:org` | no | **No** — GitHub still gates concealed members behind membership |
| `public_repo` + `read:org` | yes | **Yes** — concealed members included |

This matches the spec's FR-017: holding the elevated grant does **not** guarantee concealed-admin visibility for every org the user analyzes — it only widens the view for orgs the user belongs to. The panel's mode indicator reflects which path produced the list, and the "elevated grant was not effective for this org" disclosure surfaces when `mode === 'elevated'` but the caller is not a member of the target org.

**Membership check**: `GET /user/memberships/orgs/{org}` returns `state === 'active'` when the authenticated user is a member of `{org}`. This is a cheap, pre-fetch probe to decide whether to show the "grant was not effective for this org" message. It requires `read:org` scope to return anything useful; on the baseline path we skip the probe entirely (the mode is already "baseline").

**Alternatives considered**:
- GraphQL `organization(login:"x").membersWithRole(role:ADMIN)` — requires the authenticated user to be a member AND requires `read:org`. Same underlying constraint, more awkward pagination.
- Fetch owners list from `/orgs/{org}` — returns only the owning-user for user-owned "orgs" (not applicable here; orgs have many admins).

---

## R2 — Admin activity: primary signal + fallback

**Decision**: Two-source resolution, first-non-null wins:

1. **Primary** — `GET /users/{username}/events/public?per_page=100` (REST). Take the first (most recent) event's `created_at` as the last-activity timestamp. Public and unauthenticated-safe, but we always pass the OAuth token to stay consistent with rate-limit accounting.
2. **Fallback** — GraphQL: the user's most recent commit authored to **any repo in the same organization** via `search(query: "author:{login} org:{org} sort:author-date-desc", type: ISSUE)` does not work for commits; use `user(login:"x").contributionsCollection(organizationID: "...").commitContributionsByRepository` which returns repositories and their most-recent commit contribution. The outermost `mostRecentPullRequestContribution.occurredAt` or equivalent yields a timestamp. In practice we run: `query { user(login: "x") { contributionsCollection(organizationID: $orgId) { commitContributionsByRepository(maxRepositories: 1) { repository { defaultBranchRef { target { ... on Commit { committedDate } } } } } } } }` — not exactly right.

   Settled fallback: `GET /search/commits?q=author:{login}+org:{org}&sort=author-date&order=desc&per_page=1` (REST Search API). Returns the single most recent commit authored by the admin to any repo in the org. The Search API preview header (`Accept: application/vnd.github.cloak-preview+json`) is no longer required on modern GitHub; we send a plain `Accept: application/vnd.github+json`.

**Rationale**:
- Public events cover commits, PRs, issues, reviews, releases — a broad signal. GitHub truncates the public-events feed at **90 days or 300 events** (documented). If the most recent event is older than 90 days, it falls off the feed and the API returns an empty or truncated list. This directly motivates the fallback.
- Commit Search (`/search/commits`) returns the most-recent-authored commit even older than 90 days. Scope: the commit must be in an indexed public repo of the org; private repos are invisible on the `public_repo` scope anyway, so no new visibility leakage.
- When both sources return nothing, the classifier emits `no public activity` (FR-003).

**Rate-limit exposure**:
- 1 call per analysis for the admin list (+ pagination).
- 1 events-feed call per admin (≤ tens of admins per typical org).
- Fallback commit-search call only when events-feed is empty — bounded by number of admins with no recent public events. The Search API has a lower rate limit (30 req/min authenticated) — we respect this by running these calls with a concurrency cap of 5 and a simple in-flight queue (pattern already present in `lib/analyzer/github-rest.ts`).

**Alternatives considered**:
- GraphQL-only (`user.contributionsCollection`) — scoped to the last year by default; constructible for older windows but produces aggregate counts, not a precise last-activity timestamp usable against 30/60/90/180/365 windows.
- `GET /users/{username}` `updated_at` — reflects profile edits, not activity. Rejected: would misclassify.

---

## R3 — Storage of the elevated-scope signal across sign-in

**Decision**: Use a short-lived `sessionStorage` key `repopulse:oauth-intent-elevated` written by the checkbox handler on the landing page immediately before it kicks off `/api/auth/login`. The login route reads the intent via a query string parameter (`/api/auth/login?elevated=1`) — the checkbox handler sets the query param when building the redirect URL. After the OAuth round-trip, the granted scope is inferable from the issued token itself (GitHub echoes scopes on token-fetch response).

**Rationale**:
- Constitution III.4 forbids persistent storage of the token, not of a user *intent* to request a broader scope at sign-in. `sessionStorage` is scoped to the tab and cleared on tab close — it is not user-token persistence.
- The simpler path — a URL query parameter on `/api/auth/login?elevated=1` — means no client-side storage is needed for the happy path. We use `sessionStorage` only to remember the checkbox state across an accidental page refresh between "check the box" and "click sign-in"; even dropping this nicety is acceptable.
- The actual scope held by the session after sign-in is read from the token-grant response body's `scope` field (GitHub returns a space-separated list) and stored alongside the token in React context. Downstream code calls `session.hasScope('read:org')` rather than inferring from whether the checkbox was checked.

**Alternatives considered**:
- Cookie storage for intent — needlessly persistent; violates the spirit of Section III.
- Server-side session — contradicts Phase 1 stateless architecture (Constitution I).
- Passing intent through the OAuth `state` parameter — possible but obscures the flow; query-string on `/api/auth/login` is clearer and equally safe.

---

## R4 — Re-consent behavior when scope changes

**Decision**: Rely on GitHub's built-in behavior. When the session holds `public_repo` and the user signs out, checks the box, and signs back in, GitHub's authorization page re-prompts because the requested scope set differs from the last granted scope set. We do not implement a "please re-sign-in" prompt — the existing sign-out → sign-in flow is sufficient.

**Rationale**: GitHub OAuth compares requested scopes against the user's existing authorization for the app. Adding a scope triggers consent. Removing a scope silently downgrades. Because elevation is session-only in our architecture, every fresh sign-in with the box checked emits the same scope request; GitHub will consent once and remember. Nothing RepoPulse does needs to track this.

**Alternatives considered**:
- Forcing `prompt=consent` — not supported as a first-class parameter by GitHub OAuth apps; not needed.
- Re-authorizing mid-session via a popup — adds complexity with no user benefit; sign-out → re-sign-in is a clean mental model.

---

## R5 — Threshold configuration shape

**Decision**: Create `lib/config/governance.ts` exporting:

```ts
export const STALE_ADMIN_ALLOWED_THRESHOLDS_DAYS = [30, 60, 90, 180, 365] as const;
export type StaleAdminThresholdDays = typeof STALE_ADMIN_ALLOWED_THRESHOLDS_DAYS[number];
export const STALE_ADMIN_THRESHOLD_DAYS: StaleAdminThresholdDays = 90;
export function isValidStaleAdminThreshold(n: unknown): n is StaleAdminThresholdDays { ... }
```

The classifier imports the constant; the tooltip imports the constant; neither uses a literal.

**Rationale**: Matches spec FR-006. Static `as const` array gives TypeScript the union type for free, so any attempt to assign `STALE_ADMIN_THRESHOLD_DAYS = 77` fails at compile time — the allowed-values gate is structural, not runtime-only.

**Alternatives considered**:
- Environment variable — overkill for a Phase 1 feature with no per-deployment variation.
- JSON file in `public/` — needlessly runtime-loadable; compile-time constant is simpler.

---

## R6 — Per-admin error isolation pattern

**Decision**: Reuse the existing `Promise.allSettled` pattern that `lib/analyzer/analyze.ts` already uses for per-repo isolation. Each admin's activity resolution runs in its own `Promise` inside a bounded concurrency pool; failures are caught locally and produce an `unavailable` classification for that admin rather than throwing up the stack.

**Rationale**: Constitution X.5 is already satisfied elsewhere by the same pattern; consistency reduces cognitive load and ensures the same rate-limit-aware concurrency cap applies.

---

## R7 — Panel placement in the org-summary registry

**Decision**: Register `StaleAdminsPanel` in the **Governance** bucket alongside the existing `GovernancePanel`. The panel title is "Org admin activity" to avoid collision with the existing governance-completeness panel's title.

**Rationale**: Parent issue #285 explicitly frames this feature as part of an "Org-level governance audit." Placing it in the same bucket groups the governance signals visually. The existing `GovernancePanel` covers governance *artifact presence* (LICENSE, CONTRIBUTING, etc.); this panel covers governance *account hygiene*. They complement rather than duplicate.

**Alternatives considered**:
- New "Security" bucket — security bucket exists for repo-level security posture; stale admins are governance, not security posture.
- New top-level "Governance" bucket — the bucket already exists; no need to split further.

---

## R8 — Membership probe cost

**Decision**: On the elevated path only, call `GET /user/memberships/orgs/{org}` once per analysis before rendering the mode disclosure in the panel. Skip on the baseline path.

**Rationale**: Needed for FR-017's accuracy — the panel must disclose when the elevated grant "did not widen the view for this org." The probe is a single cheap call per analysis; it does not multiply per-admin.

---

## R9 — Non-org target detection

**Decision**: Reuse the existing logic RepoPulse uses to distinguish an organization owner from a user owner (the `ownerType: 'User' | 'Organization'` field on the repo GraphQL response, already consumed by org-aggregation code). When `ownerType === 'User'`, the panel renders the N/A state and skips all admin fetches.

**Rationale**: No new ownership detection; just a new consumer of an existing signal.

---

## R10 — Bot / machine account handling

**Decision**: No special-casing in v1. A bot account is a GitHub user like any other. Its public events feed yields a classification the same way as a human admin's does. Classification is stable and deterministic.

**Rationale**: Spec edge case already documents this. Adding detection for bot suffixes (`[bot]`) is out of scope — YAGNI (Constitution IX.6).

---

All unknowns resolved. Proceeding to Phase 1.
