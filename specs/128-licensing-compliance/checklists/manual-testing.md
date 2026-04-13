# Manual Testing Checklist: Licensing & Compliance Scoring

**Feature Branch**: `128-licensing-compliance`
**Tester**: ___
**Date**: ___

## Prerequisites

- [x] Application builds without errors
- [x] All automated tests pass *(312 tests, 54 files)*

## US1: License Presence and Quality Assessment

- [x] Analyze a repo with an OSI-approved license — Documentation score includes licensing sub-score, score is higher than without licensing *(Test with `arun-gupta/repo-pulse` — Apache-2.0)*
- [x] Analyze a repo with no license — Documentation score reflects zero licensing sub-score, recommendation to add a license is shown *(Test with `arun-gupta/docker-images` — no license)*
- [x] Analyze a repo with SPDX ID `NOASSERTION` — partial credit in licensing sub-score, recommendation to use a standard license *(Test with `donnemartin/system-design-primer` — NOASSERTION)*
- [x] Documentation bucket composite uses three-part model (file presence + README quality + licensing) *(Click "Show details" below Documentation score badge on any repo)*
- [x] File presence sub-score no longer includes license file weight (5 files scored, not 6)
- [x] Licensing sub-score falls back to two-part model gracefully when licensing data is unavailable *(Verified via unit test T017 — cannot be triggered via UI)*

## US2: License Permissiveness Classification

- [x] Analyze a repo with permissive license (MIT, Apache-2.0, BSD) — Licensing pane shows "Permissive" *(Tested with `arun-gupta/repo-pulse` — Apache-2.0)*
- [x] Analyze a repo with copyleft license (GPL-3.0, AGPL-3.0) — Licensing pane shows "Copyleft" *(Tested with `justjavac/free-programming-books-zh_CN` — GPL-3.0)*
- [x] Analyze a repo with weak copyleft license (MPL-2.0, LGPL-3.0) — Licensing pane shows "Weak Copyleft" *(Tested with `syncthing/syncthing` — MPL-2.0)*
- [x] Licensing pane displays license name and SPDX ID *(Verified across all repos above)*
- [x] Licensing pane displays OSI approval status *(Verified across all repos above)*
- [x] Licensing pane handles unavailable data gracefully (shows "unavailable" state) *(Verified via component test — cannot be triggered via UI)*

## US3: DCO/CLA Enforcement Detection

- [x] Analyze a repo with Signed-off-by commit trailers — Licensing pane shows DCO enforcement detected *(Tested with `buildroot/buildroot` — 20/20 Signed-off-by)*
- [x] Analyze a repo with DCO/CLA bot in GitHub Actions workflows — Licensing pane shows enforcement detected *(Tested with `langfuse/langfuse` — cla-assistant workflow)*
- [x] Analyze a repo with no enforcement signals — Licensing pane shows "Not detected" with recommendation *(Tested with `arun-gupta/repo-pulse`)*
- [x] Empty repo (zero commits) — DCO/CLA shows "not applicable", not penalized *(Verified via unit test — cannot be triggered via UI)*

## Score Integration

- [x] Health score tooltip still shows correct bucket weights (Activity 30%, Responsiveness 30%, Sustainability 25%, Documentation 15%)
- [x] Documentation score help component explains three-part model
- [x] Summary line in Documentation tab includes licensing signal count

## Edge Cases

- [x] Repo with dual licensing — uses primary license from GitHub's licenseInfo *(Tested with `rust-lang/rust` — shows Apache-2.0 only; dual-license detection deferred to #131)*
- [x] Repo where workflows are not accessible — falls back to commit trailer analysis only *(Tested with `buildroot/buildroot` — DCO detected via Signed-off-by trailers, no DCO/CLA bot in workflows)*
- [x] Multiple repos analyzed — each shows independent licensing data in Documentation tab

## Sign-off

- [x] All items above verified
- **Signed off by**: arun-gupta
- **Date**: 2026-04-12
