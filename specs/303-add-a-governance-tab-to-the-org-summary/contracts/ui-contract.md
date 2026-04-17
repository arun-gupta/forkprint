# UI Contract: Governance tab on org-summary view

This is the externally visible UI contract — what the user sees, in the order they see it.

## Tab strip (org-summary view)

When org analysis completes, the org-summary tab strip is, in left-to-right order:

```
Overview · Contributors · Activity · Responsiveness · Documentation · Governance · Security
```

The new entry is **Governance**, positioned between **Documentation** and **Security**.

The per-repo tab strip is unchanged (no Governance tab there).

## Tab definition (`orgInventoryTabs` in `RepoInputClient.tsx`)

New entry:

```ts
{
  id: 'governance',
  label: 'Governance',
  status: 'implemented',
  description: 'Org-level hygiene and policy — account activity, maintainers, governance files, license consistency.',
}
```

Inserted between the existing `documentation` and `security` entries.

## Tab body (Governance tab)

When the user selects the Governance tab, the body renders the result of `<OrgBucketContent bucketId="governance" view={...} selectedWindow={...} org={...} />`.

For an Organization owner with all four panels' data:

```
┌──────────────────────────────────────────┐
│ Org admin activity (Stale admins panel)  │  ← extra-panel injection
├──────────────────────────────────────────┤
│ Maintainers                              │  ← registry: maintainers
├──────────────────────────────────────────┤
│ Governance file presence                 │  ← registry: governance
├──────────────────────────────────────────┤
│ License consistency                      │  ← registry: license-consistency
└──────────────────────────────────────────┘
```

For a User owner: the Stale admins panel renders its existing N/A state (unchanged behavior); the other three panels render normally if their data is present.

When no panel has data: the same generic empty-state copy that other empty buckets use today (`"No data available for this section yet."`).

## Tabs the migrated panels MUST NOT appear in (after this change)

| Tab | Panels removed |
|---|---|
| Documentation | Governance file presence, License consistency, Stale admins (extra panel) |
| Contributors | Maintainers |
| Security | (none — Security never contained any of the four; this is a guarantee, not a removal) |

## ResultsShell prop additions

```ts
interface ResultsShellProps {
  // ...existing props...
  governance?: React.ReactNode  // NEW — optional; rendered iff `tabs` includes a 'governance' entry
}
```

A new tab-content slot is added inside the `<div className="mt-6">` block:

```tsx
<div data-tab-content="governance" style={{ display: currentActiveTab === 'governance' ? 'contents' : 'none' }}>
  {governance}
</div>
```

## Wiring in `RepoInputClient.tsx`

```tsx
governance={
  inputMode === 'org' && orgAnalysisComplete && orgAggregation.view ? (
    <OrgBucketContent
      bucketId="governance"
      view={orgAggregation.view}
      selectedWindow={orgWindow}
      org={orgInventoryResponse?.org ?? null}
    />
  ) : null
}
```

The `org` prop is required so `StaleAdminsPanel` can decide its `Organization` vs `User` branch. Mirrors how `bucketId="documentation"` already wires it.

## Negative contract (regression guards)

- After this change, opening the **Documentation** tab MUST NOT render any of: Governance file presence, License consistency, Stale admins. Those tabs/panels are exclusively under Governance.
- After this change, opening the **Contributors** tab MUST NOT render the Maintainers panel.
- After this change, no panel listed under "Tab body (Governance tab)" appears in any other tab.
- The composite OSS Health Score for any org is unchanged before vs after this change.
