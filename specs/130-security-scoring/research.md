# Research: Security Scoring (P2-F07)

## Decision 1: OpenSSF Scorecard API as Primary Enrichment Layer

**Decision**: Use the OpenSSF Scorecard API (`GET https://api.securityscorecards.dev/projects/github.com/{owner}/{repo}`) as the primary security data source, supplemented by direct GitHub checks.

**Rationale**: Scorecard covers ~1M repos with 18+ security checks computed weekly. Replicating even a subset of these checks independently would be significant effort for inferior results. The API is unauthenticated, free, and returns JSON — no SDK needed.

**Alternatives considered**:
- Build all checks independently via GitHub API: Too much work, less comprehensive, would duplicate Scorecard's value.
- Use Scorecard only (no direct checks): Leaves ~99% of GitHub repos with zero security assessment.
- Use GitHub's native security features API only: Limited to Dependabot alerts (requires extra OAuth scope) and code scanning (requires GitHub Advanced Security).

## Decision 2: Two-Layer Architecture (Direct + Scorecard)

**Decision**: Always collect direct checks for every repo. Layer Scorecard results on top when available. Two scoring modes with different weight distributions.

**Rationale**: Direct checks are cheap (piggyback on existing GraphQL pass) and ensure every repo gets a baseline assessment. Scorecard enriches when available but doesn't gate the feature.

**Alternatives considered**:
- Scorecard-first with direct checks as fallback only: Would mean direct checks are wasted when Scorecard is available, even though they cover different signals (Dependabot/Renovate detection).
- Merged single score regardless of data source: Would unfairly compare repos with full Scorecard data against repos with only binary file checks.

## Decision 3: Health Score Weight for Security

**Decision**: Security at 10%, existing buckets reduced proportionally.

**Rationale**: 10% is meaningful but conservative. Security data quality varies widely — repos without Scorecard data only have 4-5 binary signals, which shouldn't dominate the score. As Scorecard coverage grows and we add more signals, the weight can increase.

**Alternatives considered**:
- 15% (equal to Documentation): Would reduce Activity/Responsiveness too much given the current data quality gap.
- 5%: Too small to be meaningful — wouldn't noticeably affect health scores.
- Equal distribution (20% each): Doesn't reflect the maturity difference between well-calibrated buckets and the new Security bucket.

## Decision 4: Branch Protection Fallback Strategy

**Decision**: When Scorecard returns -1 for Branch-Protection, fall back to direct GraphQL query using `branchProtectionRules`. This is a signal-level fallback, not a mode switch.

**Rationale**: Scorecard returns -1 for Branch-Protection frequently because its scanner doesn't have admin access. Our OAuth token may have visibility into branch protection rules that Scorecard lacks. Per issue #68 comment, this was explicitly requested.

**Alternatives considered**:
- Skip Branch-Protection when Scorecard returns -1: Loses a valuable signal.
- Always use direct query, ignore Scorecard's Branch-Protection: Would waste Scorecard data when it's available and valid.

## Decision 5: Scorecard/Direct Check Overlap Handling

**Decision**: When Scorecard is available, Security-Policy overlaps with direct SECURITY.md detection. Scorecard Security-Policy takes precedence for the security policy signal. Direct SECURITY.md check's weight is redistributed to other direct signals in Mode A.

**Rationale**: Scorecard's Security-Policy check is more comprehensive (checks for SECURITY.md, security@ email, vulnerability disclosure program). Using both at full weight would double-count.

**Alternatives considered**:
- Average both signals: Adds complexity without clear benefit — Scorecard subsumes the direct check.
- Drop direct SECURITY.md check entirely when Scorecard available: Would lose the clear binary "file exists" signal that's useful for the UI display.

## Decision 6: Dependency Freshness & Vulnerability Signals (Dropped)

**Decision**: Drop P4 (dependency freshness and vulnerability alerts) entirely. These signals are covered by OpenSSF Scorecard's Vulnerabilities and Pinned-Dependencies checks when Scorecard data is available. No independent implementation needed.

**Rationale**: Scorecard's Vulnerabilities check uses the OSV database (which includes GitHub Advisory / Dependabot data). Building independent Dependabot alert fetching would require adding the `security_events` OAuth scope for all users, and dependency freshness would require parsing multiple lock file formats — all for signals Scorecard already covers more comprehensively.

**Alternatives considered**:
- Build independent Dependabot alert fetching: Requires OAuth scope change, only works for repos with Dependabot enabled.
- Parse lock files for dependency freshness: Too much complexity for marginal value over Scorecard's checks.

## Decision 7: Calibration Approach

**Decision**: Bootstrap security calibration data with placeholder percentiles initially. Refine with real data during implementation using the existing sampling infrastructure.

**Rationale**: Exact percentile boundaries require sampling repos across star brackets. The existing calibration script can be extended to collect security signals. Initial placeholders allow development to proceed without blocking on data collection.

**Alternatives considered**:
- Block on calibration data before implementation: Would delay the feature significantly.
- Skip calibration entirely: Would mean no percentile ranking, which is inconsistent with other buckets.
