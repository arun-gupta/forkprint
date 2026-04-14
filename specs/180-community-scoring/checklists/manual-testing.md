# Manual Testing Checklist: Community Scoring (P2-F05, #70)

**Status**: In progress — sign off before PR merge.

This checklist covers what ships in this PR. Items under the **Deferred** section are tracked as polish work for a follow-up PR and are not gating this merge.

---

## Step 1 — Signal-rich repository (`facebook/react`)

- [x] Scorecard score row shows **four** tiles (Contributors / Activity / Responsiveness / Security) — Community is NOT in this row
- [x] A **Lenses** row appears directly below the four tiles, prefixed with a muted `LENSES` label
- [x] The **Community** pill in the Lenses row shows a percentile and `N of M signals` detail
- [x] Hovering the Community pill shows tooltip: "Community is a cross-cutting lens — count of community signals present. Does not feed the composite OSS Health Score."
- [x] Composite OSS Health Score value is unchanged vs. pre-feature (±1 from rounding)
- [x] **Documentation tab**: CODE_OF_CONDUCT row shows an amber `community` pill
- [x] **Documentation tab**: new `Issue templates` row appears with detected/not-detected state and a `community` pill
- [x] **Documentation tab**: new `PR template` row appears with detected/not-detected state and a `community` pill
- [x] **Contributors tab**: `Maintainer count` row shows both `governance` and `community` pills
- [x] **Contributors tab**: new `Funding disclosure` row appears with a `community` pill (value: `Present (.github/FUNDING.yml)` or `Not detected`)
- [x] **Activity tab**: new `Discussions` card renders with a `community` pill and shows one of: `Enabled · N in last Wd`, `Enabled · no activity yet`, or `Not enabled`

## Step 2 — Signal-poor repository (`arun-gupta/repo-pulse`)

- [x] Community lens pill shows a lower percentile than the signal-rich repo above
- [x] Documentation community-tagged rows mostly show as not found
- [x] Contributors Funding disclosure row shows `Not detected`
- [x] Activity Discussions card shows `Not enabled`

## Step 3 — Window switching (Activity tab)

- [ ] ⚠️ **FAILING** — filed as [#194](https://github.com/arun-gupta/repo-pulse/issues/194). Switching the window does NOT update the Discussions card count; it stays at "last 90d". Root cause: `discussionsCountWindow` is pre-computed at analyze time and stored on AnalysisResult. Fix is to preserve raw `createdAt` nodes and recompute locally per window. Not gating this PR merge — tracked as a follow-up.
- [ ] No extra network requests fire on window switch (window is a local recompute)

## Step 4 — Private / limited-access repository

Public repos rarely produce the `'unavailable'` state for community signals (they typically resolve cleanly to `true`/`false`), which makes manual reproduction of this step impractical in a signed-off-before-PR timeframe. Ratifying on the strength of unit-test coverage:

- [x] FR-016 unknown-exclusion behavior is verified by `lib/community/completeness.test.ts` test **"excludes unknowns from both numerator and denominator (FR-016)"**. The test constructs a `AnalysisResult` fixture where signals are forced into unknown state, then asserts the denominator is `present + missing` (unknowns excluded) and the ratio is computed over known signals only. The implementation in `lib/community/completeness.ts` enforces the invariant by construction: `const denominator = present.length + missing.length; const ratio = present.length / denominator` — unknowns never enter either number.
- [x] `DiscussionsCard` returns `null` (hidden) when `hasDiscussionsEnabled === 'unavailable'`, verified by `components/activity/DiscussionsCard.test.tsx` test **"returns null when hasDiscussionsEnabled is unavailable"**.
- [x] Per Constitution §II, every community signal resolves either from GraphQL or to `'unavailable'` — never estimated. No surface in this PR renders an estimated / best-effort label for community signals.

## Step 5 — Tag filter interaction

- [x] Clicking the `community` pill anywhere (Documentation / Contributors / Activity / Lenses row) activates community filtering
- [x] Activating community filter hides non-community rows on the tabs
- [x] Clicking the pill again clears the filter

## Step 6 — Composite stability regression

- [x] Pick a repo you've analyzed before. Confirm its OSS Health Score percentile value is the same as pre-feature (within ±1 from rounding). Any larger shift suggests a bug in the FUNDING or Discussions additive bonus.

## Step 7 — Automated verification

- [x] `npm test` passes — 590 tests in 75 test files
- [x] `npm run build` passes — no new TypeScript errors
- [x] `npm run lint` — 5 errors / 13 warnings, all pre-existing baseline (same set flagged in PR #185's test plan); no new errors introduced

---

## Polish items — in-session progress

Items landed during this session are marked done below. Items still deferred will ship in a follow-up PR.

- [x] JSON export `community` field extension (data-model.md §4) — commit `7c042f8`
- [x] Markdown export `### Community` section between Contributors and Activity (data-model.md §4)
- [ ] Explicit recommendation emission paths for CTR-3 (funding) and ACT-5 (discussions) — catalog entries ship now; emission wiring is the follow-up

### Deferred to a follow-up PR

- Dedicated `e2e/community-scoring.spec.ts` Playwright coverage
- `/baseline` methodology page copy describing the Community lens
- Governance lens pill in the Lenses row ([#191](https://github.com/arun-gupta/repo-pulse/issues/191))
- Comparison-tab Community section

---

## Signoff

- **Tested by**: _____________________
- **Date**: _____________________
- **Notes / follow-ups**:
