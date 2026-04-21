'use client'

import { useAuth } from '@/components/auth/AuthContext'
import type { OrgSummaryViewModel } from '@/lib/org-aggregation/types'
import type { ContributorDiversityWindow } from '@/lib/org-aggregation/aggregators/types'
import type { TwoFactorEnforcementSection } from '@/lib/governance/two-factor'
import type { StaleAdminsSection } from '@/lib/governance/stale-admins'
import type { MemberPermissionDistributionSection } from '@/lib/governance/member-permissions'
import { useStaleAdmins, type OwnerType } from '@/components/shared/hooks/useStaleAdmins'
import { PANEL_BUCKETS, isRealPanel, renderPanel, type PanelBucketId } from './panels/registry'
import { StaleAdminsPanel } from './panels/StaleAdminsPanel'
import { TwoFactorEnforcementPanel } from './panels/TwoFactorEnforcementPanel'
import { MemberPermissionDistributionPanel } from './panels/MemberPermissionDistributionPanel'

interface Props {
  bucketId: PanelBucketId
  view: OrgSummaryViewModel | null
  selectedWindow?: ContributorDiversityWindow
  org?: string | null
  /**
   * Pre-computed 2FA enforcement section. When provided, the inventory-level
   * 2FA panel renders against this value instead of firing a live fetch.
   * Used by /demo/* to display fixture data (issue #213).
   */
  twoFactorOverride?: TwoFactorEnforcementSection | null
  /**
   * Pre-computed stale admins section. When provided, the inventory-level
   * stale-admins panel renders against this value instead of firing a live
   * fetch. Used by /demo/* to display fixture data (issue #213).
   */
  staleAdminsOverride?: StaleAdminsSection | null
  /**
   * Pre-computed member permission distribution section for demo/test fixtures.
   */
  memberPermissionOverride?: MemberPermissionDistributionSection | null
}

export function OrgBucketContent({ bucketId, view, selectedWindow, org, twoFactorOverride, staleAdminsOverride, memberPermissionOverride }: Props) {
  const bucket = PANEL_BUCKETS.find((b) => b.id === bucketId)
  if (!bucket) return null

  const bucketPanels = view
    ? bucket.panels
        .map((panelId) => ({ panelId, panel: view.panels[panelId] }))
        .filter((x): x is { panelId: typeof x.panelId; panel: NonNullable<typeof x.panel> } =>
          Boolean(x.panel) && isRealPanel(x.panelId),
        )
    : []

  const extraPanels =
    bucketId === 'governance' ? (
      <GovernanceExtraPanels
        org={org ?? null}
        twoFactorOverride={twoFactorOverride}
        staleAdminsOverride={staleAdminsOverride}
        memberPermissionOverride={memberPermissionOverride}
      />
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
      {extraPanels}
      {bucketPanels.map(({ panelId, panel }) => (
        <div key={panelId}>{renderPanel(panelId, panel, selectedWindow)}</div>
      ))}
    </div>
  )
}

interface GovernanceExtraPanelsProps {
  org: string | null
  twoFactorOverride?: TwoFactorEnforcementSection | null
  staleAdminsOverride?: StaleAdminsSection | null
  memberPermissionOverride?: MemberPermissionDistributionSection | null
}

function GovernanceExtraPanels({
  org,
  twoFactorOverride,
  staleAdminsOverride,
  memberPermissionOverride,
}: GovernanceExtraPanelsProps) {
  const { session, hasScope } = useAuth()
  const elevated = hasScope('read:org') || hasScope('admin:org')
  const ownerType: OwnerType = org ? 'Organization' : 'User'
  const hasStaleAdminsOverride = staleAdminsOverride !== undefined

  const staleAdminsState = useStaleAdmins({
    org: hasStaleAdminsOverride ? null : org,
    ownerType,
    token: hasStaleAdminsOverride ? null : session?.token ?? null,
    elevated,
  })

  const staleAdminsSection = hasStaleAdminsOverride ? staleAdminsOverride : staleAdminsState.section

  return (
    <>
      <TwoFactorEnforcementPanel
        org={org}
        ownerType={ownerType}
        sectionOverride={twoFactorOverride}
      />
      <StaleAdminsPanel
        org={org}
        ownerType={ownerType}
        sectionOverride={staleAdminsSection}
        loadingOverride={hasStaleAdminsOverride ? false : staleAdminsState.loading}
        onRetryOverride={hasStaleAdminsOverride ? undefined : staleAdminsState.refetch}
        nextAutoRetryAtOverride={hasStaleAdminsOverride ? null : staleAdminsState.nextAutoRetryAt}
      />
      <MemberPermissionDistributionPanel
        org={org}
        ownerType={ownerType}
        elevated={elevated}
        sectionOverride={memberPermissionOverride}
      />
    </>
  )
}
