# Research: Richer Security Recommendations

## R1: OpenSSF Scorecard Check Catalog

**Decision**: Build a static recommendation catalog keyed by Scorecard check name, derived from the published OpenSSF Scorecard checks documentation at `https://github.com/ossf/scorecard/blob/main/docs/checks.md`.

**Rationale**: The Scorecard documentation provides structured risk levels, descriptions, and remediation guidance for every check. Using this as the canonical source ensures recommendations are industry-standard rather than generic or invented. A static catalog shipped with the app avoids runtime dependencies on external documentation.

**Alternatives considered**:
- Fetch checks.md at runtime: Rejected — adds latency, fragility, and a new external dependency.
- Generate recommendations from Scorecard `reason` strings only: Rejected — reason strings are terse and vary per repo; they work as evidence but not as remediation guidance.
- Hardcode recommendation text inline in scoring logic: Rejected — current approach, and issue #140 specifically calls for a separate structured catalog.

### Scorecard Checks to Catalog (Initial Set)

| Check Name | Risk Level | Default Category | Docs Anchor | Notes |
|------------|-----------|-----------------|-------------|-------|
| Dangerous-Workflow | Critical | Critical Issues | #dangerous-workflow | Always critical regardless of score |
| Webhooks | Critical | Critical Issues | #webhooks | Always critical regardless of score |
| Branch-Protection | High | Workflow Hardening | #branch-protection | → Critical Issues if score 0–4 |
| Binary-Artifacts | High | Best Practices | #binary-artifacts | → Critical Issues if score 0–4 |
| Code-Review | High | Workflow Hardening | #code-review | → Critical Issues if score 0–4 |
| Dependency-Update-Tool | High | Quick Wins | #dependency-update-tool | → Critical Issues if score 0–4 |
| Signed-Releases | High | Best Practices | #signed-releases | → Critical Issues if score 0–4 |
| Token-Permissions | High | Workflow Hardening | #token-permissions | → Critical Issues if score 0–4 |
| Vulnerabilities | High | Best Practices | #vulnerabilities | → Critical Issues if score 0–4 |
| Maintained | High | Best Practices | #maintained | → Critical Issues if score 0–4 |
| Fuzzing | Medium | Best Practices | #fuzzing | |
| Pinned-Dependencies | Medium | Workflow Hardening | #pinned-dependencies | |
| SAST | Medium | Best Practices | #sast | |
| Security-Policy | Medium | Quick Wins | #security-policy | |
| Packaging | Medium | Best Practices | #packaging | |
| CI-Tests | Low | Quick Wins | #ci-tests | |
| License | Low | Quick Wins | #license | |

**Category override logic**: A check's default category (from the catalog) may be promoted to "Critical Issues" at recommendation generation time if the check has Critical or High risk AND scores 0–4. This means the same check can land in different categories for different repos depending on their actual score.

## R2: Category Grouping Strategy

**Decision**: Group recommendations into 4 priority-driven categories: Critical Issues, Quick Wins, Workflow Hardening, and Best Practices. Category assignment is determined by a combination of risk level and score, not just by domain.

**Rationale**: Maintainers want to know what to fix first. Priority-driven grouping answers "what's urgent?" (Critical Issues), "what's easy?" (Quick Wins), "what hardens my pipeline?" (Workflow Hardening), and "what's the next level?" (Best Practices). This is more actionable than domain-based grouping.

**Category assignment logic**:
- **Critical Issues**: Critical or High risk AND score 0–4 — urgent problems needing immediate attention
- **Quick Wins**: Low or Medium risk, OR score 5–9 with a clear simple fix — easy improvements with good payoff
- **Workflow Hardening**: CI/CD, branch protection, token permissions at medium scores — pipeline and process improvements
- **Best Practices**: Everything else — mature security practices like fuzzing, SAST, SBOM, signed releases

**Alternatives considered**:
- Group by domain (Release Integrity, Security Process, etc.): Rejected — answers "what area?" but not "what first?".
- Group by risk level only (Critical/High/Medium/Low): Rejected — a High-risk check at 8/10 doesn't need the same urgency as one at 1/10.
- No grouping (flat list): Rejected — current approach, and #140 explicitly calls for grouping.

## R3: Deduplication Strategy for Overlapping Checks

**Decision**: When both a Scorecard check and a direct check cover the same security concern, emit a single recommendation that uses the Scorecard catalog entry (richer guidance) and annotates the evidence with both sources.

**Rationale**: Scorecard catalog entries have more structured guidance. Showing both would confuse users with near-identical recommendations. The mapping of overlaps is small and static.

**Known overlaps**:
- `Security-Policy` (Scorecard) ↔ `security_policy` (direct check)
- `Dependency-Update-Tool` (Scorecard) ↔ `dependabot` (direct check)
- `CI-Tests` (Scorecard) ↔ `ci_cd` (direct check)
- `Branch-Protection` (Scorecard) ↔ `branch_protection` (direct check)

**Alternatives considered**:
- Show both with different labels: Rejected — adds noise without value.
- Always prefer direct check: Rejected — Scorecard entries are richer.

## R4: Recommendation Threshold

**Decision**: Generate Scorecard-based recommendations for any check scoring below 10 (i.e., 0–9), as long as the catalog has an entry with remediation guidance from OpenSSF. Generate direct-check recommendations when `detected === false`. Do not generate recommendations for indeterminate (-1), unavailable checks, or perfect scores (10/10).

**Rationale**: If OpenSSF has clear remediation steps for a check, users should see them regardless of whether the score is 2 or 7. The structured fields (risk level, evidence with actual score) already convey severity — a recommendation for a 7/10 check naturally reads differently from a 1/10 check because the evidence says so. Withholding guidance for 5–9 scores leaves actionable improvements invisible.

**Change from existing behavior**: The current code (score-config.ts lines 122-132) only generates recommendations for scores 0–4. This feature widens the threshold to 0–9 because the enriched catalog provides meaningful, OpenSSF-sourced guidance at every sub-perfect score level.

**Alternatives considered**:
- Keep threshold at 0–4 (existing behavior): Rejected — misses actionable findings where OpenSSF has clear remediation guidance.
- Use different language tiers (0–4 strong, 5–9 soft): Rejected — unnecessary complexity; the score evidence and risk level already communicate severity naturally.

## R5: Backward Compatibility with Health Score Integration

**Decision**: Extend the existing `SecurityRecommendation` interface with new optional fields rather than replacing it. The `text` field continues to serve as the `message` source in `HealthScoreRecommendation`. New fields (`title`, `riskLevel`, `evidence`, `explanation`, `remediationHint`, `docsUrl`, `groupCategory`) are additive.

**Rationale**: The health-score.ts integration (lines 106-114) reads `rec.text` to populate `HealthScoreRecommendation.message`. Breaking this contract would cascade changes across the entire recommendation pipeline. Adding optional fields is non-breaking.

**Alternatives considered**:
- New interface replacing SecurityRecommendation: Rejected — unnecessary breaking change.
- Separate enriched recommendation type only for UI: Rejected — would require dual generation paths.
