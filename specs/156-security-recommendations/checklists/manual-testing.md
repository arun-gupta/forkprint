# Manual Testing Checklist: Richer Security Recommendations

**Purpose**: Verify all acceptance criteria through manual testing before opening the PR
**Created**: 2026-04-13
**Feature**: [spec.md](../spec.md)
**Signed off by**: arun-gupta (2026-04-13)

## US1: Structured Security Recommendations

- [x] (pallets/flask) Analyze a repo with OpenSSF Scorecard data containing low-scoring checks (0-4) — verify each recommendation shows: title, source label, risk level, evidence with actual score, explanation, remediation action, and docs link. Code-Review 0/10, Branch-Protection 3/10 — all structured fields present.
- [x] (expressjs/express) Analyze a repo missing SECURITY.md — verify direct-check recommendation shows: title, source "Direct check", risk level, evidence "not detected", explanation, remediation action. "security_policy not detected" with "Direct check" label, Medium risk, hint.
- [x] (unit tests) Analyze a repo where all Scorecard checks score 10/10 and all direct checks pass — verify no security recommendations appear. Covered by unit test "returns zero recommendations when all Scorecard checks score 10/10 and direct checks pass" in score-config.test.ts; no real repo found with perfect scores across all checks.
- [x] (pallets/flask) Analyze a repo with a Scorecard check scoring 7/10 — verify a recommendation is still shown with the score as evidence. Security-Policy 9/10, Pinned-Dependencies 8/10 both show recommendations.

## US2: Grouped Recommendations by Category

- [x] (pallets/flask) Analyze a repo with findings spanning multiple risk/score levels — verify recommendations are grouped under labeled category headings (Critical Issues, Quick Wins, Workflow Hardening, Best Practices). Critical Issues, Quick Wins, Workflow Hardening all present.
- [x] (pallets/flask) Verify Critical Issues category appears first when present. Critical Issues is the first section.
- [x] (expressjs/express) Verify empty categories are not displayed. No Critical Issues section shown (no High/Critical + 0-4 checks).
- [x] (pallets/flask) Verify a High-risk check scoring 2/10 appears under "Critical Issues" (promoted). Code-Review 0/10 (High) and Branch-Protection 3/10 (High) both in Critical Issues.
- [x] (pallets/flask) Verify a High-risk check scoring 7/10 does NOT appear under "Critical Issues". Signed-Releases 6/10 (High) stays in Best Practices, not promoted.

## US3: Source Attribution and Deduplication

- [x] (expressjs/express, pallets/flask) Analyze a repo with both Scorecard and direct-check findings — verify each recommendation shows a visible source label. expressjs/express: "OpenSSF Scorecard" on Pinned-Dependencies and Fuzzing, "Direct check" on security_policy. pallets/flask: "OpenSSF Scorecard" on Code-Review, Branch-Protection, etc.; "Direct check" on dependabot.
- [x] (arun-gupta/docker-images) Analyze a repo where Scorecard is unavailable — verify all recommendations show "Direct check" label. All 3 recommendations show "Direct check" label, no "OpenSSF Scorecard" labels present.
- [x] (pallets/flask) Verify overlapping checks (e.g., Security-Policy/security_policy) produce only one recommendation, not two. Security-Policy shows "Also confirmed by direct repository check" — single entry, deduplicated.

## US4: Remediation Snippets and Documentation Links

- [x] (expressjs/express, pallets/flask) Verify recommendations with remediation hints display the hint text. expressjs/express: blue hint box on security_policy, Pinned-Dependencies, Fuzzing. pallets/flask: blue hint boxes on Code-Review, Branch-Protection, dependabot, Security-Policy, Pinned-Dependencies, Signed-Releases, SAST.
- [x] (expressjs/express, pallets/flask) Verify Scorecard-sourced recommendations include a clickable link to OpenSSF docs. expressjs/express: links on Pinned-Dependencies and Fuzzing. pallets/flask: links on all Scorecard-sourced recs.
- [x] (expressjs/express) Verify recommendations without hints/links don't show empty hint/link sections. Direct-check rec shows no docs link (correct — direct checks have null docsUrl).

## Backward Compatibility

- [x] (expressjs/express, pallets/flask) Verify the Recommendations tab still shows security recommendations alongside other dimensions. Security bucket renders alongside Activity, Responsiveness, Sustainability, Documentation.
- [x] (expressjs/express, pallets/flask) Verify security recommendations in the Recommendations tab have proper color styling (not fallback gray). expressjs/express: red "Security" badge with "3 recommendations". pallets/flask: red "Security" badge with "7 recommendations".

## Notes

- Repos tested: expressjs/express, pallets/flask, arun-gupta/docker-images
- One item unchecked: "all checks 10/10" — covered by unit tests, no real repo found with perfect scores
