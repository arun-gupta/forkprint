# Quickstart: Security Scoring (P2-F07)

## What This Feature Does

Adds a Security dimension to the health score. Every analyzed repository gets security signals from two layers:

1. **Direct checks** (always run): Dependabot/Renovate config, SECURITY.md, CI/CD workflows, branch protection
2. **OpenSSF Scorecard** (when available): Industry-standard checks for ~1M popular repos

## Key Files to Modify

| File | Change |
|------|--------|
| `lib/analyzer/analysis-result.ts` | Add `securityResult` field to `AnalysisResult` |
| `lib/analyzer/queries.ts` | Add GraphQL aliases for dependabot.yml, renovate.json, .github/workflows |
| `lib/analyzer/analyze.ts` | Extract security data, call Scorecard API |
| `lib/scoring/health-score.ts` | Add security bucket, rebalance weights |
| `lib/scoring/calibration-data.json` | Add `securityScore` percentile sets |
| `lib/results-shell/tabs.ts` | Add security tab |

## Key Files to Create

| File | Purpose |
|------|---------|
| `lib/security/analysis-result.ts` | SecurityResult, ScorecardAssessment types |
| `lib/security/scorecard-client.ts` | Fetch from OpenSSF Scorecard API |
| `lib/security/direct-checks.ts` | Evaluate direct check signals |
| `lib/security/score-config.ts` | Compute security score + recommendations |
| `components/security/SecurityView.tsx` | Security tab UI |

## How to Test

```bash
npm test                    # Unit tests (Scorecard API mocked)
npm run test:e2e            # E2E tests (real API calls)
npm run lint
npm run build
```

## Architecture Pattern

Follow the Documentation scoring pattern:
1. **Types** in `lib/security/analysis-result.ts`
2. **Data extraction** in `lib/analyzer/analyze.ts` → populates `SecurityResult`
3. **Scoring** in `lib/security/score-config.ts` → `getSecurityScore()`
4. **Health score integration** in `lib/scoring/health-score.ts`
5. **UI** in `components/security/SecurityView.tsx`

## Scorecard API

```
GET https://api.securityscorecards.dev/projects/github.com/{owner}/{repo}
```

No auth. Returns 404 for repos not in dataset. 5-second timeout.
