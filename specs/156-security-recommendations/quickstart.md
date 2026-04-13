# Quickstart: Richer Security Recommendations

## What this feature does

Replaces the generic one-line security recommendations with structured, OpenSSF-sourced guidance. Each recommendation now includes a descriptive title, risk level, repo-specific evidence, an explanation of why the finding matters, a concrete remediation action, and a link to the relevant OpenSSF Scorecard documentation. Recommendations are grouped into categories (Quick Wins, Workflow Hardening, Release Integrity, Security Process).

## Key files to modify

| File | Change |
|------|--------|
| `lib/security/recommendation-catalog.ts` | **NEW** — Static catalog of recommendation entries keyed by check name |
| `lib/security/analysis-result.ts` | Extend `SecurityRecommendation` with optional enriched fields |
| `lib/security/score-config.ts` | Replace inline recommendation generation with catalog lookups; add deduplication |
| `components/security/SecurityView.tsx` | Add categorized recommendations rendering section |
| `components/recommendations/RecommendationsView.tsx` | Add 'Security' to BUCKET_COLORS |
| `specs/130-security-scoring/contracts/security-view-props.ts` | Update `SecurityRecommendationDisplay` with enriched fields |

## Key files NOT to modify

| File | Reason |
|------|--------|
| `lib/scoring/health-score.ts` | Reads `rec.text` — backward compatible, no changes needed |
| `lib/security/scorecard-client.ts` | Scorecard fetching is unchanged |
| `lib/security/direct-checks.ts` | Direct check detection is unchanged |
| `lib/analyzer/analyze.ts` | Security analysis pipeline is unchanged |

## How to verify

```bash
npm test                    # Unit tests for catalog, score-config, SecurityView
npm run lint                # Type checking and linting
npm run build               # Build verification
```

Then manually analyze a repo with known security findings (e.g., a repo without SECURITY.md, with low Scorecard scores) and verify:
1. Recommendations show structured fields (title, risk, evidence, explanation, action)
2. Recommendations are grouped by category
3. Each recommendation shows its source (OpenSSF Scorecard or Direct check)
4. Scorecard-sourced recommendations include docs links
5. Overlapping checks (e.g., Security-Policy) are deduplicated
6. The Recommendations tab still works with security items alongside other dimensions
