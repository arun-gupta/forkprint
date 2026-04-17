# Phase 0 Research: Governance tab on org-summary view

All open questions surfaced during planning are resolved here. No `[NEEDS CLARIFICATION]` markers remain in the spec.

---

## R1 — Stale Admins panel: registry entry or extra-panel injection?

**Decision**: Keep `StaleAdminsPanel` as an "extra panel" injection in `OrgBucketContent.tsx`, just under `bucketId === 'governance'` instead of `bucketId === 'documentation'`.

**Rationale**:
- The panel's prop signature (`org: string | null`, `ownerType: 'Organization' | 'User'`, optional `sectionOverride`) does not match the registry's `panel: AggregatePanel<T>` contract that flows from `view.panels[panelId]`.
- Promoting it would require either (a) widening the registry contract for one panel, or (b) adding an adapter that fakes an `AggregatePanel` wrapper. Both options expand scope beyond what issue #303 asks for.
- The spec's only requirement (FR-002, FR-005, FR-008, edge case #4) is that the panel renders **under Governance** and **only under Governance**. The injection-branch move satisfies this directly.

**Alternatives considered**:
- **Promote to registry entry**: rejected — wider blast radius, requires a new aggregator type or a wrapper, conflicts with §IX YAGNI/KISS.
- **Render Stale Admins from a different parent component**: rejected — splits the org-summary tab content across two render paths, harder to reason about.

---

## R2 — `governance` prop on `ResultsShell`: required or optional?

**Decision**: Optional (`governance?: React.ReactNode`). Render the corresponding `<div data-tab-content="governance">` only when (a) the `governance` tab is present in `tabs` AND (b) the prop is provided.

**Rationale**:
- The per-repo tab list (`lib/results-shell/tabs.ts`) does not include Governance, so per-repo callers will not pass governance content.
- Existing `ResultsShell.test.tsx` cases pass every required prop explicitly. Making `governance` required would force test churn unrelated to the actual feature.
- Optional + tab-presence guard mirrors how the existing optional `tabs` prop already behaves.

**Alternatives considered**:
- **Required prop**: rejected — adds churn across every per-repo render site (production code + tests) for a tab they never display.
- **Use `tabs` definition only, no separate prop**: rejected — `ResultsShell`'s pattern is named slot per tab id; departing from it for one slot is more confusing than following it.

---

## R3 — Does adding `'governance'` to `ResultTabId` ripple into per-repo search?

**Decision**: Yes. Add `governance: () => []` to the `EXTRACTORS` map in `lib/search/search-index.ts`.

**Rationale**:
- `EXTRACTORS` is typed `Record<ResultTabId, Extractor>` — exhaustive. Adding a tab id without an extractor is a TypeScript error.
- Per-repo search (`buildSearchIndex(results: AnalysisResult[])`) operates on per-repo `AnalysisResult`s, not on org-aggregation panels. There is no governance content to index at the per-repo level — the per-repo Governance lens is already covered by the existing Documentation/Security extractors (license, contributing, branch protection, etc.).
- Returning `[]` keeps the type exhaustive at zero behavior cost.

**Alternatives considered**:
- **Make `EXTRACTORS` non-exhaustive (`Partial<Record<...>>`)**: rejected — gives up a type-level guarantee that benefits all other tabs.
- **Add a real extractor that pulls per-repo governance signals**: rejected — out of scope; would create a per-repo "governance" surface the spec explicitly defers (Assumptions: per-repo asymmetry intentional).

---

## R4 — Does `docs/PRODUCT.md` need a per-bucket panel mapping update?

**Decision**: Add a brief note in the org-summary section that the org-summary view now exposes a Governance tab covering org-level hygiene/policy panels. Do not introduce a new per-bucket mapping table that wasn't there before.

**Rationale**:
- Verified via grep: `docs/PRODUCT.md` does not currently enumerate panel-to-bucket assignments anywhere.
- FR-014 is conditional: "If `docs/PRODUCT.md` does not currently enumerate per-bucket panel mappings, the update is limited to adding a brief note about the Governance tab in the appropriate org-summary section."
- A brief note prevents the doc from being silent on a new visible tab without forcing a documentation pattern (per-bucket mapping tables) that the doc has chosen not to use.

**Alternatives considered**:
- **Introduce a full per-bucket mapping table**: rejected — exceeds FR-014, adds maintenance burden the doc deliberately avoids.
- **Skip the doc edit**: rejected — FR-014 explicitly requires PRODUCT.md not be silent on the new tab.

---

## R5 — Does `OrgSummaryView.tsx` (the secondary render path) need an edit?

**Decision**: No. The new `governance` bucket will appear automatically in `OrgSummaryView.tsx` once any of its registry-driven panels (`maintainers`, `governance`, `license-consistency`) has a view-model entry, because that component already filters `PANEL_BUCKETS` by `bucketPanels.length > 0`.

**Rationale**:
- `OrgSummaryView.tsx` derives `visibleBuckets` from `PANEL_BUCKETS` directly. Adding a new bucket entry is sufficient — no per-bucket switch statement to update.
- The Stale-admins panel is injected only by `OrgBucketContent.tsx`. It does not flow through `OrgSummaryView.tsx`. So the "where does Stale Admins render?" question only requires editing `OrgBucketContent.tsx`.
- Confirmed by reading `OrgSummaryView.tsx` lines 33–43 and 152–155.

**Alternatives considered**: None — the existing filter-by-data-presence pattern is already correct for this use case.

---

## R6 — Order of panels inside the Governance bucket

**Decision**: Panel array in `PANEL_BUCKETS` for `governance`:

```ts
panels: ['maintainers', 'governance', 'license-consistency']
```

…with `StaleAdminsPanel` injected first (top of the tab body) by `OrgBucketContent.tsx`. Final visual order top-to-bottom:

1. Org admin activity (Stale admins) — injected
2. Maintainers — registry
3. Governance file presence — registry (panel id `governance`)
4. License consistency — registry

**Rationale**:
- Spec FR-003 fixes this order. Account hygiene first (admin activity = highest leverage, likely actionable today), then authority delegation (maintainers), then structural hygiene (governance files, licensing).
- Putting the injection branch *first* in `OrgBucketContent`'s render order matches the spec; the existing implementation already renders `bucketPanels` then `extraPanels` (extras after registry panels). The rendering order needs to be flipped so extras render *before* `bucketPanels` for the governance case (or the injection branch can render the panel inside a wrapper that is positioned first). The simpler fix is to reorder the JSX so extras render before `bucketPanels` for the governance bucket.

**Alternatives considered**:
- **Promote Stale Admins into the registry array** so the order can be controlled by the array alone: rejected — see R1.
- **Always render extras after registry panels**: rejected — would put Org admin activity *fourth* in the Governance tab, violating FR-003 (account hygiene first).

---

## R7 — Tests

**Decision**: Three new test files + one extended test file:

1. **`components/org-summary/panels/registry.test.tsx`** (NEW): unit-test the registry shape — `governance` bucket exists, sits between `documentation` and `security`, contains `['maintainers', 'governance', 'license-consistency']` in that order; `documentation` no longer contains `governance` or `license-consistency`; `contributors` no longer contains `maintainers`; `security` is unchanged; no panel id appears in two buckets.
2. **`components/org-summary/OrgBucketContent.test.tsx`** (NEW): when `bucketId === 'governance'`, the `StaleAdminsPanel` is rendered before the registry-driven panels; when `bucketId === 'documentation'`, it is not rendered.
3. **`components/app-shell/ResultsShell.test.tsx`** (EXTEND): when the `tabs` prop includes a `governance` entry and the `governance` prop is provided, the governance content renders; when omitted, no governance slot is rendered (no orphan empty div).
4. **`e2e/governance-tab.spec.ts`** (NEW): boot the dev server, navigate to org-summary for a known org with data, click the Governance tab, assert the four migrated panels render in the documented order, and assert none of them appear in Documentation, Contributors, or Security.

**Rationale**:
- Coverage matches the spec's three user stories: US1 (tab presence + order) → registry test + e2e; US2 (no neighboring-tab regression) → registry test + e2e; US3 (risk-first order) → registry test + e2e.
- Unit tests are deterministic and fast; the e2e test is the only place that verifies the visual rendering glue (RepoInputClient → ResultsShell → OrgBucketContent → panel components).

**Alternatives considered**:
- **Skip the e2e test**: rejected — the wiring spans three component layers and the hardcoded extra-panel injection is exactly the kind of glue that unit tests don't exercise.
- **Add an integration test inside `OrgSummaryView.test.tsx`**: covered already by the existing OrgSummaryView tests filtering by data — not specific to governance, so left unchanged.
