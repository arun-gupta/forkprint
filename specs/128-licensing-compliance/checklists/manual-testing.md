# Manual Testing Checklist: Licensing & Compliance Scoring

**Feature Branch**: `128-licensing-compliance`
**Tester**: ___
**Date**: ___

## Prerequisites

- [ ] Application builds without errors
- [ ] All automated tests pass

## US1: License Presence and Quality Assessment

- [ ] Analyze a repo with an OSI-approved license (e.g., MIT) — Documentation score includes licensing sub-score, score is higher than without licensing
- [ ] Analyze a repo with no license — Documentation score reflects zero licensing sub-score, recommendation to add a license is shown
- [ ] Analyze a repo with SPDX ID `NOASSERTION` — partial credit in licensing sub-score, recommendation to use a standard license
- [ ] Documentation bucket composite uses three-part model (file presence + README quality + licensing)
- [ ] File presence sub-score no longer includes license file weight (5 files scored, not 6)
- [ ] Licensing sub-score falls back to two-part model gracefully when licensing data is unavailable

## US2: License Permissiveness Classification

- [ ] Analyze a repo with permissive license (MIT, Apache-2.0, BSD) — Licensing pane shows "Permissive"
- [ ] Analyze a repo with copyleft license (GPL-3.0, AGPL-3.0) — Licensing pane shows "Copyleft"
- [ ] Analyze a repo with weak copyleft license (MPL-2.0, LGPL-3.0) — Licensing pane shows "Weak Copyleft"
- [ ] Licensing pane displays license name and SPDX ID
- [ ] Licensing pane displays OSI approval status
- [ ] Licensing pane handles unavailable data gracefully (shows "unavailable" state)

## US3: DCO/CLA Enforcement Detection

- [ ] Analyze a repo with Signed-off-by commit trailers — Licensing pane shows DCO enforcement detected
- [ ] Analyze a repo with DCO/CLA bot in GitHub Actions workflows — Licensing pane shows enforcement detected
- [ ] Analyze a repo with no enforcement signals — Licensing pane shows "Not detected" with recommendation
- [ ] Empty repo (zero commits) — DCO/CLA shows "not applicable", not penalized

## Score Integration

- [ ] Health score tooltip still shows correct bucket weights (Activity 30%, Responsiveness 30%, Sustainability 25%, Documentation 15%)
- [ ] Documentation score help component explains three-part model
- [ ] Summary line in Documentation tab includes licensing signal count

## Edge Cases

- [ ] Repo with dual licensing — uses primary license from GitHub's licenseInfo
- [ ] Repo where workflows are not accessible — falls back to commit trailer analysis only
- [ ] Multiple repos analyzed — each shows independent licensing data in Documentation tab

## Sign-off

- [ ] All items above verified
- **Signed off by**: ___
- **Date**: ___
