# Implementation Plan: Security Scoring (P2-F07)

**Branch**: `130-security-scoring` | **Date**: 2026-04-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/130-security-scoring/spec.md`

## Summary

Add Security as a new health score dimension using a two-layer approach: OpenSSF Scorecard API as the enrichment layer (when available) plus direct GitHub checks (always collected). The Security score integrates into the composite health score alongside the existing Activity, Responsiveness, Sustainability, and Documentation buckets.

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 16+)
**Primary Dependencies**: Next.js (App Router), Tailwind CSS, Vitest, React Testing Library
**Storage**: N/A (stateless, on-demand analysis)
**Testing**: Vitest + React Testing Library (unit/integration), Playwright (E2E)
**Target Platform**: Vercel (web)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Security data fetching must not significantly increase overall analysis time. Scorecard API call runs in parallel with existing GitHub API calls.
**Constraints**: No new dependencies. Scorecard API is a simple unauthenticated GET. Direct checks reuse existing GraphQL patterns.
**Scale/Scope**: Same as existing analysis — 1-10 repos per request.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Status | Notes |
|------|--------|-------|
| I. Technology Stack | PASS | No new dependencies. Scorecard API uses native `fetch`. Follows Next.js App Router + Tailwind. |
| II. Accuracy Policy | PASS | Scorecard scores originate from verified API response. Direct checks use GitHub GraphQL/REST. Unavailable signals marked `"unavailable"`, never fabricated. |
| III. Data Source Rules | PASS | Primary: GitHub GraphQL API. Supplemental: OpenSSF Scorecard REST API (justified — GraphQL cannot reach Scorecard data). No new auth required. |
| IV. Analyzer Module Boundary | PASS | Security scoring logic lives in framework-agnostic `lib/security/`. No Next.js imports. |
| V. CHAOSS Alignment | PASS | Security is a new dimension outside the 4 CHAOSS categories. CHAOSS mapping unchanged. No amendment needed — Section V governs CHAOSS categories specifically, not all health score buckets. |
| VI. Scoring Thresholds | PASS | Security thresholds defined in config, not hardcoded. |
| VII. Ecosystem Spectrum | N/A | Not affected. |
| VIII. Contribution Dynamics | N/A | Not affected. |
| IX. Feature Scope Rules | PASS | YAGNI applied — only signals defined in spec. No speculative extensibility. |
| X. Security & Hygiene | PASS | No secrets. Scorecard API is unauthenticated. OAuth token used only for GitHub API calls. |
| XI. Testing | PASS | TDD mandatory. Scorecard API mocked in unit tests. |
| XII. Definition of Done | Will verify at PR time. |
| XIII. Development Workflow | PASS | Feature branch, manual testing checklist, PR before merge. |

## Project Structure

### Documentation (this feature)

```text
specs/130-security-scoring/
├── spec.md
├── plan.md              # This file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── security-view-props.ts
├── checklists/
│   ├── requirements.md
│   └── manual-testing.md  # Created during implementation
└── tasks.md               # Created by /speckit.tasks
```

### Source Code (repository root)

```text
lib/
├── security/
│   ├── analysis-result.ts       # SecurityResult, ScorecardAssessment types
│   ├── scorecard-client.ts      # OpenSSF Scorecard API fetch
│   ├── direct-checks.ts         # File detection + branch protection checks
│   ├── score-config.ts          # Scoring weights, computation, recommendations
│   └── __tests__/
│       ├── scorecard-client.test.ts
│       ├── direct-checks.test.ts
│       └── score-config.test.ts
├── analyzer/
│   ├── analyze.ts               # Modified — add security data extraction
│   ├── queries.ts               # Modified — add dependabot/renovate file check aliases
│   └── analysis-result.ts       # Modified — add securityResult field
├── scoring/
│   ├── health-score.ts          # Modified — add security bucket + rebalance weights
│   └── calibration-data.json    # Modified — add securityScore percentile sets
└── results-shell/
    └── tabs.ts                  # Modified — add security tab

components/
└── security/
    └── SecurityView.tsx          # Security tab UI component

__tests__/
└── security/
    └── SecurityView.test.tsx
```

**Structure Decision**: Follows the established pattern from `lib/documentation/` and `lib/inclusive-naming/` — dedicated module directory under `lib/` with types, logic, config, and tests. UI component under `components/`.

## Health Score Weight Rebalancing

Adding Security as a 5th bucket requires redistributing weights. The approach: reduce each existing bucket proportionally to make room for Security at 10%.

| Bucket | Current Weight | New Weight | Change |
|--------|---------------|------------|--------|
| Activity | 30% | 27% | -3% |
| Responsiveness | 30% | 27% | -3% |
| Sustainability | 25% | 23% | -2% |
| Documentation | 15% | 13% | -2% |
| **Security** | — | **10%** | new |
| **Total** | 100% | 100% | — |

Rationale: Security at 10% reflects its importance while acknowledging that many repos (especially smaller ones) will have limited security data. The proportional reduction preserves the relative ranking of existing buckets.

## Two-Layer Signal Architecture

### Layer 1: Direct Checks (always collected)

| Signal | Detection Method | Score Contribution |
|--------|-----------------|-------------------|
| Security policy (SECURITY.md) | GraphQL `object(expression: "HEAD:SECURITY.md")` | Binary (0 or 1) |
| Dependency automation (Dependabot) | GraphQL `object(expression: "HEAD:.github/dependabot.yml")` | Binary (0 or 1) |
| Dependency automation (Renovate) | GraphQL `object(expression: "HEAD:renovate.json")` + `object(expression: "HEAD:.github/renovate.json")` | Binary (0 or 1) |
| CI/CD presence | GraphQL `object(expression: "HEAD:.github/workflows")` (tree check) | Binary (0 or 1) |
| Branch protection | GraphQL `branchProtectionRules` on default branch | Binary (0 or 1) |

### Layer 2: OpenSSF Scorecard (when available)

| Scorecard Check | Score Range | What It Measures |
|----------------|------------|-----------------|
| Security-Policy | 0-10 | SECURITY.md and vulnerability disclosure |
| Code-Review | 0-10 | Code review practices |
| Maintained | 0-10 | Active maintenance signals |
| Pinned-Dependencies | 0-10 | Supply chain hygiene |
| Signed-Releases | 0-10 | Release integrity |
| Fuzzing | 0-10 | Fuzz testing |
| SAST | 0-10 | Static analysis in CI |
| Dangerous-Workflow | 0-10 | CI security posture |
| Token-Permissions | 0-10 | CI token scoping |

### Scoring Modes

**Mode A — Scorecard + Direct Checks available**:
- Scorecard overall score normalized to 0-1 (divide by 10), weighted at 60%
- Direct checks composite (0-1), weighted at 40%
- Overlapping signals (Security-Policy vs. SECURITY.md): Scorecard takes precedence for security policy sub-signal in direct checks; the direct check still runs but its weight is redistributed to other direct signals
- Final: `securityScore = scorecardNormalized * 0.60 + directComposite * 0.40`

**Mode B — Direct Checks only** (no Scorecard data):
- Direct checks composite alone (0-1)
- Scorecard-only signals excluded, not penalized
- Final: `securityScore = directComposite`

**Branch Protection special case**: When Scorecard returns -1 for Branch-Protection, use direct GraphQL query result instead. This is a signal-level fallback, not a mode switch.

### Direct Checks Weights

| Signal | Weight (Mode A) | Weight (Mode B) |
|--------|----------------|----------------|
| Security policy | 0.10 (Scorecard covers this) | 0.30 |
| Dependency automation | 0.35 | 0.30 |
| CI/CD presence | 0.25 | 0.20 |
| Branch protection | 0.30 | 0.20 |

In Mode A, security policy weight is reduced because Scorecard's Security-Policy check is more comprehensive. In Mode B, weights are rebalanced to cover the full 0-1 range.

## Scorecard API Integration

**Endpoint**: `GET https://api.securityscorecards.dev/projects/github.com/{owner}/{repo}`

**Response shape** (relevant fields):
```json
{
  "score": 7.5,
  "checks": [
    { "name": "Security-Policy", "score": 10, "reason": "..." },
    { "name": "Code-Review", "score": 8, "reason": "..." },
    { "name": "Branch-Protection", "score": -1, "reason": "internal error" }
  ]
}
```

**Error handling**:
- 404 or network error → Scorecard unavailable, use Mode B
- Timeout (5s) → treat as unavailable
- Individual check score -1 → that check is indeterminate (Branch-Protection triggers fallback)

## Calibration

Security calibration data will be bootstrapped during implementation:
- For repos in the Scorecard dataset, use the Scorecard overall score
- For repos not in the dataset, use the direct checks composite
- Add `securityScore` percentile sets to `calibration-data.json` for each bracket

Initial placeholder percentiles (to be refined with real data):
```json
"securityScore": { "p25": 0.20, "p50": 0.40, "p75": 0.60, "p90": 0.80 }
```

## Complexity Tracking

No constitution violations to justify. The design follows established patterns.
