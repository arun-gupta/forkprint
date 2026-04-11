# Manual Testing Checklist: Documentation Scoring

**Feature**: P2-F01 Documentation Scoring
**Branch**: `032-doc-scoring`
**Date**: 2026-04-10
**Tester**: 

## Scorecard Integration

- [x] Documentation score badge appears on the scorecard for each analyzed repo
- [x] Health score tooltip shows "Activity (30%), Responsiveness (30%), Sustainability (25%), and Documentation (15%)"
- [x] Recommendation count shown on scorecard with clickable link to Recommendations tab
- [x] Clicking "see Recommendations tab" switches to Recommendations tab

## Documentation Tab

- [x] Documentation tab visible in the results workspace tab bar
- [x] Score badge shows ordinal percentile (e.g., "72nd percentile")
- [x] File presence checklist shows all 6 files with check/cross icons
- [x] Present files show the detected path (e.g., "README.md")
- [x] License file shows SPDX type when detected (e.g., "MIT")
- [x] Missing files show amber recommendation text
- [x] README sections panel shows all 5 sections with check/cross icons
- [x] Missing README sections show amber recommendation text
- [x] Summary shows "N of 6 files present · N of 5 README sections detected"

## Recommendations Tab

- [x] Recommendations tab visible in the results workspace tab bar
- [x] Recommendations grouped by bucket with color-coded labels (Activity, Responsiveness, Sustainability, Documentation)
- [x] Documentation recommendations appear alongside other bucket recommendations
- [x] Each recommendation shows actionable text
- [x] Summary shows "N recommendations across N dimensions"
- [x] Repo with no recommendations shows "No recommendations" message

## Comparison View

- [x] Documentation section appears in comparison table
- [x] Documentation score shown as percentile
- [x] Files found shown as "N / 6"
- [x] README sections shown as "N / 5"
- [x] Repos with unavailable documentation show "—"

## Exports

- [x] JSON export includes documentation score, filesFound, readmeSections
- [x] Markdown export includes Documentation row in score table

## Scoring Methodology Page (/baseline)

- [x] OSS Health Score section shows 4 buckets: Activity 30%, Responsiveness 30%, Sustainability 25%, Documentation 15%
- [x] Documentation Scoring section shows file weights and README section weights
- [x] Documentation row in calibration metrics table shows real percentile anchors

## Edge Cases

- [x] Repo with all 6 files + all 5 README sections → high score, no recommendations
- [x] Repo with no documentation files → low score, 11 recommendations (6 files + 5 sections)
- [x] Repo with empty README → README file marked present, all sections marked missing
- [x] Repo with README.rst or README.txt → file detected correctly (sphinx-doc/sphinx)
- [x] Repo with COPYING instead of LICENSE → file detected correctly (golang/go)

## Signoff

- **Tested by**: arun-gupta
- **Date**: 2026-04-11
- **Result**: PASS — all items verified
