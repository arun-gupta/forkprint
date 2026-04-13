# Contract: LicensingResult in AnalysisResult

## Context

The `AnalysisResult` interface is the shared data contract between the analyzer module and all consumers (web UI, future GitHub Action, future MCP server). Adding `licensingResult` must maintain backward compatibility.

## Contract

### New field on AnalysisResult

```typescript
licensingResult: LicensingResult | 'unavailable'
```

### LicensingResult shape

```typescript
{
  license: {
    spdxId: string | null
    name: string | null
    osiApproved: boolean
    permissivenessTier: 'Permissive' | 'Weak Copyleft' | 'Copyleft' | null
  }
  contributorAgreement: {
    signedOffByRatio: number | null
    dcoOrClaBot: boolean
    enforced: boolean
  }
}
```

### When unavailable

If the overview query fails or license data cannot be extracted, `licensingResult` is set to `'unavailable'`. Consumers must handle this case.

## Backward Compatibility

- `DocumentationFileCheck` for license continues to have `found: boolean` and `path: string | null` for file presence display.
- The `licenseType` field on `DocumentationFileCheck` is removed — consumers should read `licensingResult.license.spdxId` instead.
- The `DocumentationResult` type is unchanged structurally.

## Consumers

- **Documentation score-config**: Reads `licensingResult` to compute the licensing sub-score.
- **DocumentationView**: Reads `licensingResult` to render the Licensing pane.
- **Health score tooltip**: No change needed (bucket weights unchanged).
