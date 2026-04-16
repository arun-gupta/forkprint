'use client'

import type { ComponentType } from 'react'
import type { AggregatePanel, PanelId } from '@/lib/org-aggregation/types'
import { ContributorDiversityPanel } from './ContributorDiversityPanel'
import { MaintainersPanel } from './MaintainersPanel'
import { PlaceholderPanel } from './PlaceholderPanel'

// Bucket groupings mirror the per-repo ResultsShell tabs (overview /
// contributors / activity / responsiveness / documentation / security).
// The per-repo 'recommendations' and 'comparison' tabs don't apply at
// the org level — no recommendations engine and no repo-vs-repo matrix.
export type PanelBucketId =
  | 'overview'
  | 'contributors'
  | 'activity'
  | 'responsiveness'
  | 'documentation'
  | 'security'
  | 'recommendations'
  | 'repos'

export interface PanelBucket {
  id: PanelBucketId
  label: string
  description: string
  panels: PanelId[]
}

export const PANEL_BUCKETS: PanelBucket[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Footprint, languages, age, and activity status of the repo set.',
    panels: ['project-footprint', 'languages', 'repo-age', 'inactive-repos'],
  },
  {
    id: 'contributors',
    label: 'Contributors',
    description: 'Who contributes, maintains, and concentrates risk across the org.',
    panels: ['contributor-diversity', 'maintainers', 'org-affiliations', 'bus-factor'],
  },
  {
    id: 'activity',
    label: 'Activity',
    description: 'How much the org ships — commits, releases, and stale work.',
    panels: ['activity-rollup', 'release-cadence', 'stale-work'],
  },
  {
    id: 'responsiveness',
    label: 'Responsiveness',
    description: 'How quickly the org responds to issues and merges PRs.',
    panels: ['responsiveness-rollup'],
  },
  {
    id: 'documentation',
    label: 'Documentation',
    description:
      'Docs coverage, licensing, inclusive naming, governance, and adopters — mirrors the per-repo Documentation tab.',
    panels: [
      'documentation-coverage',
      'license-consistency',
      'inclusive-naming-rollup',
      'governance',
      'adopters',
    ],
  },
  {
    id: 'security',
    label: 'Security',
    description: 'OpenSSF Scorecard rollup across the repo set.',
    panels: ['security-rollup'],
  },
  {
    id: 'recommendations',
    label: 'Recommendations',
    description: 'Suggested actions synthesized from the org-wide signals above.',
    panels: [],
  },
  {
    id: 'repos',
    label: 'Repos',
    description: 'Per-repo run status and missing-data report.',
    panels: [],
  },
]

// Flat render order — derived from buckets so any re-ordering stays in sync.
export const PANEL_ORDER: PanelId[] = PANEL_BUCKETS.flatMap((b) => b.panels)

export const PANEL_LABELS: Record<PanelId, string> = {
  'contributor-diversity': 'Contributor diversity',
  maintainers: 'Maintainers',
  'org-affiliations': 'Org affiliations (Experimental)',
  'bus-factor': 'Bus factor',
  'release-cadence': 'Release cadence',
  'activity-rollup': 'Activity rollup',
  'responsiveness-rollup': 'Responsiveness',
  'stale-work': 'Stale work',
  'security-rollup': 'Security (OpenSSF Scorecard)',
  governance: 'Governance',
  'license-consistency': 'License consistency',
  'inclusive-naming-rollup': 'Inclusive naming',
  'documentation-coverage': 'Documentation coverage',
  adopters: 'Adopters',
  'project-footprint': 'Project footprint',
  languages: 'Languages',
  'repo-age': 'Repo age',
  'inactive-repos': 'Inactive repos',
}

// Real panel components. Any PanelId missing from this map renders via
// PlaceholderPanel. As each US2 aggregator + panel lands, add its entry.
const REAL_PANELS: Partial<Record<PanelId, ComponentType<{ panel: AggregatePanel<never> }>>> = {
  'contributor-diversity': ContributorDiversityPanel as ComponentType<{ panel: AggregatePanel<never> }>,
  maintainers: MaintainersPanel as ComponentType<{ panel: AggregatePanel<never> }>,
}

export function renderPanel(panelId: PanelId, panel: AggregatePanel<unknown>) {
  const Real = REAL_PANELS[panelId]
  if (Real) {
    return <Real panel={panel as AggregatePanel<never>} />
  }
  return <PlaceholderPanel panelId={panelId} label={PANEL_LABELS[panelId]} panel={panel} />
}
