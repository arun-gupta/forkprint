'use client'

import type { OrgSummaryViewModel } from '@/lib/org-aggregation/types'
import type { ContributorDiversityWindow } from '@/lib/org-aggregation/aggregators/types'
import { PANEL_BUCKETS, isRealPanel, renderPanel, type PanelBucketId } from './panels/registry'
import { StaleAdminsPanel } from './panels/StaleAdminsPanel'

interface Props {
  bucketId: PanelBucketId
  view: OrgSummaryViewModel
  selectedWindow?: ContributorDiversityWindow
  org?: string | null
}

export function OrgBucketContent({ bucketId, view, selectedWindow, org }: Props) {
  const bucket = PANEL_BUCKETS.find((b) => b.id === bucketId)
  if (!bucket) return null

  const bucketPanels = bucket.panels
    .map((panelId) => ({ panelId, panel: view.panels[panelId] }))
    .filter((x): x is { panelId: typeof x.panelId; panel: NonNullable<typeof x.panel> } =>
      Boolean(x.panel) && isRealPanel(x.panelId)
    )

  const extraPanels =
    bucketId === 'documentation' ? (
      <StaleAdminsPanel org={org ?? null} ownerType={org ? 'Organization' : 'User'} />
    ) : null

  if (bucketPanels.length === 0 && !extraPanels) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No data available for this section yet.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {bucketPanels.map(({ panelId, panel }) => (
        <div key={panelId}>{renderPanel(panelId, panel, selectedWindow)}</div>
      ))}
      {extraPanels}
    </div>
  )
}
