import type { OrgSummaryViewModel, PanelId, AggregatePanel } from '@/lib/org-aggregation/types'

export interface OrgSummaryMarkdownExportResult {
  blob: Blob
  filename: string
}

function buildFileTimestamp(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const HH = String(now.getHours()).padStart(2, '0')
  const MM = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}-${HH}${MM}${ss}`
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

const PANEL_LABELS: Record<PanelId, string> = {
  'contributor-diversity': 'Contributor Diversity',
  maintainers: 'Maintainers',
  'org-affiliations': 'Org Affiliations',
  'release-cadence': 'Release Cadence',
  'security-rollup': 'Security Rollup',
  governance: 'Governance',
  adopters: 'Adopters',
  'project-footprint': 'Project Footprint',
  'activity-rollup': 'Activity Rollup',
  'responsiveness-rollup': 'Responsiveness Rollup',
  'license-consistency': 'License Consistency',
  'inclusive-naming-rollup': 'Inclusive Naming Rollup',
  'documentation-coverage': 'Documentation Coverage',
  languages: 'Languages',
  'stale-work': 'Stale Work',
  'bus-factor': 'Bus-Factor Risk',
  'repo-age': 'Repo Age',
  'inactive-repos': 'Inactive Repos',
}

function renderPanelSection(id: PanelId, panel: AggregatePanel<unknown>): string {
  const lines: string[] = []
  lines.push(`### ${PANEL_LABELS[id] ?? id}`)
  lines.push('')
  lines.push(`- **Status**: ${panel.status}`)
  lines.push(`- **Contributing repos**: ${panel.contributingReposCount} / ${panel.totalReposInRun}`)
  lines.push('')
  return lines.join('\n')
}

export function buildOrgSummaryMarkdownExport(org: string, view: OrgSummaryViewModel): OrgSummaryMarkdownExportResult {
  const lines: string[] = []

  lines.push(`# RepoPulse Org Summary — ${org}`)
  lines.push('')
  lines.push(`Generated: ${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}`)
  lines.push('')

  lines.push('## Run Status')
  lines.push('')
  lines.push('| Metric | Value |')
  lines.push('| --- | --- |')
  lines.push(`| Status | ${view.status.status} |`)
  lines.push(`| Total repos | ${view.status.total} |`)
  lines.push(`| Succeeded | ${view.status.succeeded} |`)
  lines.push(`| Failed | ${view.status.failed} |`)
  lines.push(`| Elapsed | ${formatDuration(view.status.elapsedMs)} |`)
  lines.push(`| Concurrency | ${view.status.concurrency.chosen} (effective: ${view.status.concurrency.effective}) |`)
  lines.push('')

  if (view.flagshipRepos.length > 0) {
    lines.push('## Flagship Repos')
    lines.push('')
    for (const f of view.flagshipRepos) lines.push(`- ${f.repo} *(${f.source})*`)
    lines.push('')
  }

  const panelEntries = Object.entries(view.panels).filter(([, p]) => p != null) as [PanelId, AggregatePanel<unknown>][]
  if (panelEntries.length > 0) {
    lines.push('## Panels')
    lines.push('')
    for (const [id, panel] of panelEntries) lines.push(renderPanelSection(id, panel))
  }

  if (view.missingData.length > 0) {
    lines.push('## Missing Data')
    lines.push('')
    lines.push('| Repo | Signal | Reason |')
    lines.push('| --- | --- | --- |')
    for (const m of view.missingData) lines.push(`| ${m.repo} | ${m.signalKey} | ${m.reason} |`)
    lines.push('')
  }

  lines.push('## Per-Repo Status')
  lines.push('')
  lines.push('| Repo | Status | Flagship | Error |')
  lines.push('| --- | --- | --- | --- |')
  for (const entry of view.perRepoStatusList) {
    lines.push(`| ${entry.repo} | ${entry.status} | ${entry.isFlagship ? 'Yes' : ''} | ${entry.errorReason ?? ''} |`)
  }
  lines.push('')

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
  const filename = `repopulse-org-${org}-${buildFileTimestamp()}.md`
  return { blob, filename }
}
