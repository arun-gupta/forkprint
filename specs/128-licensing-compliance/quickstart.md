# Quickstart: Licensing & Compliance Scoring

## What this feature does

Adds licensing and compliance signals to the Documentation health score bucket. Users see a new Licensing pane in the Documentation tab showing:
- License name, SPDX ID, and OSI approval status
- Permissiveness tier (Permissive / Weak Copyleft / Copyleft)
- DCO/CLA enforcement detection
- Actionable recommendations for missing signals

## Key files to understand

| File | Purpose |
|------|---------|
| `lib/analyzer/queries.ts` | GraphQL queries — add `message` to commit nodes, add workflow tree query |
| `lib/analyzer/analyze.ts` | Data extraction — build `LicensingResult` from API response |
| `lib/analyzer/analysis-result.ts` | Types — add `LicensingResult`, update `AnalysisResult` |
| `lib/licensing/license-data.ts` | **New** — OSI license set, permissiveness tier map |
| `lib/documentation/score-config.ts` | Scoring — three-part composite, licensing sub-score logic |
| `components/documentation/DocumentationView.tsx` | UI — add Licensing pane |
| `components/documentation/DocumentationScoreHelp.tsx` | **New** — score explanation component |

## Implementation order

1. **Static data** (`lib/licensing/license-data.ts`): OSI set + tier map. Fully testable in isolation.
2. **Types** (`analysis-result.ts`): Add `LicensingResult` interface and field on `AnalysisResult`.
3. **Data collection** (`queries.ts` + `analyze.ts`): Add commit `message` field, workflow tree query, extract licensing data.
4. **Scoring** (`score-config.ts`): Three-part model, licensing sub-score, updated file weights.
5. **UI** (`DocumentationView.tsx`, `DocumentationScoreHelp.tsx`): Licensing pane, updated help section.
6. **Calibration** (`calibration-data.json`): Re-sample percentile anchors with updated formula.

## Testing approach

- **Unit tests first** (TDD per constitution): license classification, tier lookup, score calculation, DCO ratio detection.
- **Component tests**: Licensing pane rendering with various data states (OSI license, no license, NOASSERTION, DCO detected, etc.).
- **Integration**: Full analyzer flow with mocked GraphQL responses including licensing data.

## What NOT to change

- Overall health score bucket weights (Activity 30%, Responsiveness 30%, Sustainability 25%, Documentation 15%) — unchanged.
- Other scoring buckets — no modifications needed.
- Tab structure — no new tab; licensing lives inside the Documentation tab.
