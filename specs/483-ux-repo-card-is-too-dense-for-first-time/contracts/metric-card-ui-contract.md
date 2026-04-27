# UI Contract: MetricCard Progressive Disclosure

**Feature**: 483-ux-repo-card-is-too-dense-for-first-time  
**Date**: 2026-04-27

## Component: MetricCard

### Props (unchanged)

```typescript
interface MetricCardProps {
  card: MetricCardViewModel       // unchanged
  activeTag?: string | null       // unchanged
  onTagChange?: (tag: string | null) => void  // unchanged
}
```

No new props are introduced. The progressive disclosure state is internal to the component.

### New DOM structure

The card body (`!paneCollapsed`) gains a secondary tier gate:

```
<article data-testid="metric-card-{repo}">
  <button [collapse toggle]>        ← existing
    <CollapseChevron />             ← existing
    <h3>{repo name}</h3>            ← existing
    {CNCF badge when aspirantResult non-null}  ← NEW
    <p>Created: {date}</p>          ← existing
  </button>

  {!paneCollapsed && (
    <p>{description}</p>            ← existing (primary tier)
    {showOverrideToggle && <div [solo banner]>} ← existing (primary tier)
    <div [health score block]>      ← existing (primary tier)
    {profileCells.length > 0 && (
      <div [ecosystem profile tiles]>  ← existing (primary tier)
    )}

    <!-- NEW: secondary tier gate -->
    <button
      data-testid="details-toggle-{repo}"
      aria-expanded={detailsExpanded}
      onClick={toggleDetails}
    >
      {detailsExpanded ? 'Hide details' : 'Show details'}
      <ChevronIcon direction={detailsExpanded ? 'up' : 'down'} />
    </button>

    {detailsExpanded && (
      {scoreCells.length > 0 && <div [health-dimension tiles]>}  ← moved to secondary
      {card.lenses.length > 0 && <div [lenses row]>}             ← moved to secondary
      {card.details.length > 0 && <section [raw details]>}       ← moved to secondary
      {hs.recommendations.length > 0 && <div [recommendations]>} ← moved to secondary
    )}
  )}
</article>
```

### Test IDs

| `data-testid` | Description |
|---------------|-------------|
| `metric-card-{repo}` | Root article element (existing) |
| `details-toggle-{repo}` | The secondary-tier expand/collapse button (NEW) |
| `cncf-badge-{repo}` | The CNCF score badge in header (NEW, only when aspirantResult non-null) |
| `solo-profile-banner-{repo}` | Solo-project banner (existing) |
| `solo-profile-toggle-{repo}` | Solo/community toggle button (existing) |
| `copy-score-{repo}` | Clipboard copy button (existing) |
| `ecosystem-dimmed-{repo}` | Ecosystem grid when dimmed for solo (existing) |

### localStorage Contract

```
key:   "repopulse:card-expanded:{repo}"
value: "true" | "false"
```

Written on every toggle. Read on mount to initialize `detailsExpanded`. Failures silently default to `false`.

### Accessibility

- `details-toggle` button carries `aria-expanded={detailsExpanded}` and `aria-controls` pointing to the secondary tier wrapper ID
- The secondary tier wrapper has an `id` matching the `aria-controls` value
- The CNCF badge in the header has `aria-label="CNCF Sandbox Readiness: {score} / 100"`
