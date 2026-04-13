# Data Model: Licensing & Compliance Scoring

## New Types

### LicensePermissivenessTier

Classifies a detected license by its permissiveness level.

- Values: `Permissive`, `Weak Copyleft`, `Copyleft`
- Derived from: SPDX ID lookup against static tier mapping

### LicenseDetection

Captures the license identified for a repository.

| Field | Type | Description |
|-------|------|-------------|
| spdxId | string or null | SPDX short identifier from GitHub API |
| name | string or null | Human-readable license name from GitHub API |
| osiApproved | boolean | Whether the SPDX ID is in the OSI-approved set |
| permissivenessTier | LicensePermissivenessTier or null | Tier classification (null if SPDX ID unrecognized) |

- Source: `repository.licenseInfo` GraphQL field (already fetched)
- `osiApproved` and `permissivenessTier` derived from static config lookup

### ContributorAgreementSignal

Captures DCO/CLA enforcement status.

| Field | Type | Description |
|-------|------|-------------|
| signedOffByRatio | number or null | Ratio of recent commits with `Signed-off-by:` trailers (0.0–1.0) |
| dcoOrClaBot | boolean | Whether a DCO/CLA bot action was found in workflow files |
| enforced | boolean | Whether contributor agreement enforcement is detected (derived) |

- `signedOffByRatio`: Computed from `message` field on recent commit nodes
- `dcoOrClaBot`: Computed from workflow tree query, checking for known action references
- `enforced`: `true` if `signedOffByRatio >= threshold` OR `dcoOrClaBot === true`

### LicensingResult

Top-level licensing analysis result, added to the existing AnalysisResult.

| Field | Type | Description |
|-------|------|-------------|
| license | LicenseDetection | License detection data |
| contributorAgreement | ContributorAgreementSignal | DCO/CLA enforcement signals |

## Modified Types

### DocumentationFileCheck (existing)

**Change**: Remove `licenseType` field. License SPDX data moves to `LicensingResult.license.spdxId`.

The `license` entry remains in `fileChecks` for file presence scoring (found/not found), but the SPDX metadata is no longer carried on this type.

### DocumentationResult (existing)

**No structural change**. File checks and README sections remain as-is. The license file check stays in `fileChecks` for backward compatibility but its weight in the file presence sub-score is redistributed to other files.

### AnalysisResult (existing)

**Change**: Add `licensingResult` field.

| Field | Type | Description |
|-------|------|-------------|
| licensingResult | LicensingResult or Unavailable | Licensing & compliance analysis data |

### DocumentationScoreDefinition (existing)

**Change**: Add `licensingScore` field to expose the third sub-score.

| Field | Type | Description |
|-------|------|-------------|
| licensingScore | number | Licensing compliance sub-score (0.0–1.0) |

Existing fields `filePresenceScore` and `readmeQualityScore` remain unchanged.

## Scoring Model

### Documentation Bucket — Three-Part Composite

```
compositeScore = filePresenceScore * 0.40
               + readmeQualityScore * 0.30
               + licensingScore * 0.30
```

### File Presence Sub-Score — Updated Weights

License file check removed from scoring (still checked for presence display). Remaining files redistributed:

| File | Old Weight | New Weight |
|------|-----------|------------|
| readme | 0.25 | 0.30 |
| contributing | 0.15 | 0.20 |
| code_of_conduct | 0.10 | 0.10 |
| security | 0.15 | 0.20 |
| changelog | 0.15 | 0.20 |
| license | 0.20 | *(removed from scoring)* |

### Licensing Sub-Score — Weighted Signals

| Signal | Weight | Score Logic |
|--------|--------|-------------|
| License present (SPDX detected) | 0.40 | 1.0 if spdxId non-null and not NOASSERTION; 0.3 if NOASSERTION; 0.0 if null |
| OSI approved | 0.25 | 1.0 if osiApproved; 0.0 otherwise |
| Permissiveness classified | 0.10 | 1.0 if tier is non-null; 0.0 otherwise (informational, all tiers score equally) |
| DCO/CLA enforced | 0.25 | 1.0 if enforced; 0.0 otherwise |

## Static Configuration

### OSI-Approved License Set

A `Set<string>` of ~110 SPDX identifiers recognized as OSI-approved. Source: https://opensource.org/licenses (snapshot, updated manually as needed).

### Permissiveness Tier Map

A `Map<string, LicensePermissivenessTier>` mapping SPDX identifiers to their tier. Covers the ~30 most common licenses. Unlisted OSI-approved licenses default to `null` (tier unknown).

### DCO/CLA Bot Action Identifiers

A `Set<string>` of known GitHub Action references for DCO/CLA enforcement:
- `apps/dco`
- `probot/dco`
- `cla-assistant/cla-assistant`
- `contributor-assistant/github-action`

### Configurable Thresholds

| Threshold | Default | Description |
|-----------|---------|-------------|
| signedOffByRatioThreshold | 0.8 | Minimum ratio of commits with Signed-off-by to consider DCO enforced |
