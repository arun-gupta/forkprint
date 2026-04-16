import type { OrgSummaryViewModel, PanelId, AggregatePanel } from '@/lib/org-aggregation/types'

export interface OrgSummaryJsonExportResult {
  blob: Blob
  filename: string
}

function buildTimestamp(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const HH = String(now.getHours()).padStart(2, '0')
  const MM = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}-${HH}${MM}${ss}`
}

function serializePanel(panelId: PanelId, panel: AggregatePanel<unknown>) {
  return {
    panelId,
    status: panel.status,
    contributingReposCount: panel.contributingReposCount,
    totalReposInRun: panel.totalReposInRun,
    value: panel.value,
  }
}

export function buildOrgSummaryJsonExport(org: string, view: OrgSummaryViewModel): OrgSummaryJsonExportResult {
  const exportData = {
    org,
    generatedAt: new Date().toISOString(),
    runStatus: {
      status: view.status.status,
      total: view.status.total,
      succeeded: view.status.succeeded,
      failed: view.status.failed,
      elapsedMs: view.status.elapsedMs,
      etaMs: view.status.etaMs,
      concurrency: view.status.concurrency,
    },
    flagshipRepos: view.flagshipRepos,
    panels: Object.fromEntries(
      Object.entries(view.panels)
        .filter(([, panel]) => panel != null)
        .map(([id, panel]) => [id, serializePanel(id as PanelId, panel!)]),
    ),
    missingData: view.missingData,
    perRepoStatusList: view.perRepoStatusList.map((entry) => ({
      repo: entry.repo,
      status: entry.status,
      badge: entry.badge,
      errorReason: entry.errorReason ?? null,
      isFlagship: entry.isFlagship,
      durationMs: entry.durationMs ?? null,
    })),
  }

  const json = JSON.stringify(exportData, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const filename = `repopulse-org-${org}-${buildTimestamp()}.json`
  return { blob, filename }
}
