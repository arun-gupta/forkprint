# Research: Corporate Contribution Lens (493)

## Decision 1 — Two signals are naturally disjoint; union needs no explicit de-duplication per commit

**Decision**: The email-domain signal and the org-membership signal operate on mutually exclusive actor-key populations per commit. `getCommitActorKey` (analyze.ts:2535) returns `login:<x>` if a GitHub login is linked, otherwise `email:<x>`. The org-membership pipeline only processes login-based actors; email-based actors go into `unattributedAuthors`. Therefore:
- **Org signal**: login-based actor keys only
- **Email signal**: email-based actor keys only
- A single commit is never counted by both signals; union commit counts = simple addition.

**Rationale**: Actor key is a single identifier per commit; the lookup priority (login > email) means the same commit cannot have both types of key.

**Alternatives considered**: Tracking both signals per commit node and de-duplicating — unnecessary overhead given the natural separation.

---

## Decision 2 — Three new fields added to `ContributorWindowMetrics`, not to top-level `AnalysisResult`

**Decision**: Extend `ContributorWindowMetrics` (already stored per window in `contributorMetricsByWindow`) with:
- `commitAuthorsByExperimentalOrg: Record<string, string[]> | Unavailable` — per org: unique actor keys (login-based).
- `commitCountsByEmailDomain: Record<string, number> | Unavailable` — per email domain: commit counts (email-based actors only).
- `commitAuthorsByEmailDomain: Record<string, string[]> | Unavailable` — per email domain: unique actor keys (email-based actors only).

**Rationale**: The feature requires per-window data (FR-012: corporate metrics must track the active time window). Storing at the window level avoids duplicating data at the top-level `AnalysisResult`. The existing fallback chain in `getContributorWindowMetrics` (view-model.ts:198) means the 90d window is the safe default when windowed data is absent.

**Alternatives considered**:
- Top-level fields only (like `commitCountsByExperimentalOrg`): would only support the 90d window, breaking FR-012.
- Compute from raw commit nodes at query time: commit nodes are not stored in `AnalysisResult`; they are processed and discarded.

---

## Decision 3 — Email signal: only email-based actors (no GitHub login linked)

**Decision**: The email-domain signal matches commits whose actor key is `email:<address>` AND the email domain matches. Commits from login-based actors are NOT additionally matched by email domain, even if their commit email matches.

**Rationale**: Login-based actors are already covered by the org-membership signal. Double-matching login-based actors via email would inflate corporate commit counts for employees who both have a GitHub account AND use a corporate email. The natural actor-key separation keeps the two signals clean.

---

## Decision 4 — Company name → org handle + email domain derivation

**Decision**: From a single input string:
- **Org handle**: lowercased input with common TLD suffixes (`.com`, `.io`, `.org`, `.net`, `.dev`) stripped if present.
- **Email domain**: if the input contains a dot, use lowercased as-is; if no dot, append `.com`.

Examples:
- `microsoft` → org `microsoft`, domain `microsoft.com`
- `microsoft.com` → org `microsoft`, domain `microsoft.com`
- `hashicorp.io` → org `hashicorp`, domain `hashicorp.io`
- `redhat` → org `redhat`, domain `redhat.com`

**Rationale**: Most large tech companies mirror their org handle and primary email domain. The `.com` fallback covers the vast majority of cases without requiring the user to know whether to type a domain or a handle.

**Alternatives considered**: Separate fields (previous spec versions) — rejected by user feedback in favour of single input.
**Known limitation**: Companies with regional domains (`microsoft.de`) or divergent handles/domains (`awslabs` vs `amazon.com`) require the user to type the correct primary identifier. Multi-domain coverage is explicitly out of scope per spec.

---

## Decision 5 — New pure utility module `lib/corporate/`

**Decision**: Create `lib/corporate/compute-corporate-metrics.ts` as a pure, framework-agnostic function. Inputs: `AnalysisResult[]`, `companyName: string`, `windowDays: ContributorWindowDays`. Output: `CorporateLensResult` (per-repo metrics + summary).

**Rationale**: Keeps the computation testable in isolation (constitution §XI: TDD mandatory, §IV: analyzer module remains framework-agnostic). The UI component simply calls this function with the current state.

---

## Decision 6 — UI placement: new section at top of `ContributorsView`

**Decision**: The `CorporateContributionPanel` is rendered at the top of `ContributorsView`, sharing the existing `windowDays` state. It is collapsed/hidden when the company input is empty (FR-011).

**Rationale**: The Contributors tab already owns the window selector and per-repo contributor data. Adding the corporate panel here reuses the window selector without duplicating state. The panel is visually distinct (bordered section) from the per-repo contributor articles below it.

**Alternatives considered**:
- New dedicated tab: adds a tab with no content when filter is empty; poor UX.
- Comparison tab: already serves a different purpose (side-by-side metric comparison).
- Overview tab: not contributor-focused.

---

## Decision 7 — Actor key arrays capped at 500 per org/domain per window

**Decision**: When building per-org or per-domain author arrays, cap at 500 unique actor keys. This prevents extreme data inflation for heavily-contributed repos (e.g., a top-20 OSS project with 1000+ contributors from one company in the 365d window).

**Rationale**: 500 actor keys × 30 chars average × 5 windows = ~75KB per top company per repo — manageable. Counts are still accurate even when the array is truncated, because `commitCountsByExperimentalOrg` (commit counts) is a separate integer counter not affected by the cap.

**Alternatives considered**: Unlimited arrays — risk of bloating the analysis result JSON on popular repos.
