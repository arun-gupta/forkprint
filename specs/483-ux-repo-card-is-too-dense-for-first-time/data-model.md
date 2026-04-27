# Data Model: Repo Card Progressive Disclosure

**Feature**: 483-ux-repo-card-is-too-dense-for-first-time  
**Date**: 2026-04-27

## Overview

This feature is a pure UI change. No new data entities, API endpoints, or analyzer fields are introduced. The only new state is the per-repo expand/collapse preference stored in browser localStorage.

## UI State

### `detailsExpanded: boolean` (React local state)

Belongs to: `MetricCard` component  
Default: `false` (secondary tier hidden on first render)  
Persisted: Yes — to browser localStorage on every toggle

**Initialization logic**:
```
key = "repopulse:card-expanded:" + card.repo
storedValue = localStorage.getItem(key)
initialState = storedValue === "true"   // false if null, "false", or storage unavailable
```

**Toggle logic**:
```
On toggle: next = !detailsExpanded
           localStorage.setItem(key, String(next))   // "true" or "false"
           setDetailsExpanded(next)
```

**Failure handling**: Any `localStorage` read or write is wrapped in try/catch. On failure, state defaults to `false` and no error is surfaced.

---

## localStorage Contract

| Key Pattern | Value | Semantics |
|-------------|-------|-----------|
| `repopulse:card-expanded:{repo-slug}` | `"true"` | Card's secondary tier is visible |
| `repopulse:card-expanded:{repo-slug}` | `"false"` or absent | Card's secondary tier is hidden |

**Examples**:
- `repopulse:card-expanded:facebook/react` → `"true"`
- `repopulse:card-expanded:kubernetes/kubernetes` → `"false"`

**Notes**:
- Key is per-repo, not global
- Value is a JSON-serialized boolean string (not a native boolean — localStorage only stores strings)
- Absent key is treated as `"false"` (default collapsed-details state)
- Namespace prefix `repopulse:` avoids collision with other localStorage consumers

---

## Existing State (unchanged)

| State | Type | Semantics |
|-------|------|-----------|
| `paneCollapsed` | boolean | Hides/shows the entire card body (existing feature) |
| `profileOverride` | `HealthScoreProfile \| null` | Solo/community scoring toggle (existing feature) |
| `copied` | boolean | Clipboard copy feedback (existing feature) |

---

## Data Flow: CNCF Badge

No new data is fetched. The `aspirantResult` field is already present on `AnalysisResult` and flows into `MetricCardViewModel.analysisResult`:

```
AnalysisResult.aspirantResult (AspirantReadinessResult | null | undefined)
  → MetricCardViewModel.analysisResult.aspirantResult
    → MetricCard reads card.analysisResult.aspirantResult
      → if non-null: render CNCFReadinessPill in header
```

`CNCFReadinessPill` reads only `aspirantResult.readinessScore` (0–100) to determine color and label. No additional computation is needed.

---

## Content Tier Partition

| Content | Tier | Visible when |
|---------|------|--------------|
| Repo header (name, date, CNCF badge) | Primary | Always (unless `paneCollapsed`) |
| Description | Primary | Always (unless `paneCollapsed`) |
| Solo-project banner | Primary (conditional) | Always when `paneCollapsed = false` and `showOverrideToggle = true` |
| OSS Health Score block | Primary | Always (unless `paneCollapsed`) |
| Ecosystem profile tiles (Reach, Attention, Engagement) | Primary | Always (unless `paneCollapsed` or no profile data) |
| "Show/Hide details" affordance | Primary | Always (unless `paneCollapsed` and no secondary content) |
| Health-dimension tiles (`scoreCells`) | Secondary | Only when `detailsExpanded = true` |
| Lenses row | Secondary | Only when `detailsExpanded = true` |
| Raw details section | Secondary | Only when `detailsExpanded = true` |
| Recommendations link | Secondary | Only when `detailsExpanded = true` |
