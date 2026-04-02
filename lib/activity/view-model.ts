import { type ActivityWindowDays, ACTIVITY_WINDOW_DAYS, type AnalysisResult, type Unavailable } from '@/lib/analyzer/analysis-result'

export interface ActivityCardLine {
  label: string
  value: string
}

export interface ActivityCardViewModel {
  title: string
  value?: string
  detail?: string
  lines?: ActivityCardLine[]
}

export interface ActivitySectionViewModel {
  repo: string
  cards: ActivityCardViewModel[]
  metrics: ReturnType<typeof getWindowMetrics>
  missingDataCallout?: {
    title: string
    details: string[]
  }
}

export function getActivityWindowOptions() {
  return ACTIVITY_WINDOW_DAYS.map((days) => ({
    days,
    label: days === 365 ? '12 months' : `${days}d`,
  }))
}

export function buildActivitySections(results: AnalysisResult[], windowDays: ActivityWindowDays): ActivitySectionViewModel[] {
  return results.map((result) => {
    const metrics = getWindowMetrics(result, windowDays)

    return {
      repo: result.repo,
      cards: buildCards(metrics),
      metrics,
      missingDataCallout: buildMissingDataCallout(metrics, windowDays),
    }
  })
}

function buildCards(metrics: ReturnType<typeof getWindowMetrics>): ActivityCardViewModel[] {
  return [
    {
      title: 'Commits',
      value: formatMetric(metrics.commits),
    },
    {
      title: 'Pull requests',
      lines: [
        { label: 'Opened', value: formatMetric(metrics.prsOpened) },
        { label: 'Merged', value: formatMetric(metrics.prsMerged) },
        { label: 'Merge rate', value: formatRatio(metrics.prsMerged, metrics.prsOpened) },
      ],
      detail: formatRatioDetail(metrics.prsMerged, metrics.prsOpened, 'merged', 'opened'),
    },
    {
      title: 'Issues',
      lines: [
        { label: 'Opened', value: formatMetric(metrics.issuesOpened) },
        { label: 'Closed', value: formatMetric(metrics.issuesClosed) },
        { label: 'Closure rate', value: formatRatio(metrics.issuesClosed, metrics.issuesOpened) },
      ],
      detail: formatRatioDetail(metrics.issuesClosed, metrics.issuesOpened, 'closed', 'opened'),
    },
    {
      title: 'Releases',
      value: formatMetric(metrics.releases),
    },
  ]
}

function getWindowMetrics(result: AnalysisResult, windowDays: ActivityWindowDays) {
  return (
    result.activityMetricsByWindow?.[windowDays] ?? {
      commits: windowDays === 30 ? result.commits30d : windowDays === 90 ? result.commits90d : 'unavailable',
      prsOpened: windowDays === 90 ? result.prsOpened90d : 'unavailable',
      prsMerged: windowDays === 90 ? result.prsMerged90d : 'unavailable',
      issuesOpened: 'unavailable',
      issuesClosed: windowDays === 90 ? result.issuesClosed90d : 'unavailable',
      releases: windowDays === 365 ? result.releases12mo : 'unavailable',
      staleIssueRatio: result.staleIssueRatio ?? 'unavailable',
      medianTimeToMergeHours: result.medianTimeToMergeHours ?? 'unavailable',
      medianTimeToCloseHours: result.medianTimeToCloseHours ?? 'unavailable',
    }
  )
}

function buildMissingDataCallout(metrics: ReturnType<typeof getWindowMetrics>, windowDays: ActivityWindowDays) {
  const unavailableMetricLabels = [
    { label: 'Commits', value: metrics.commits },
    { label: 'PRs opened', value: metrics.prsOpened },
    { label: 'PRs merged', value: metrics.prsMerged },
    { label: 'Issues opened', value: metrics.issuesOpened },
    { label: 'Issues closed', value: metrics.issuesClosed },
    { label: 'Releases', value: metrics.releases },
    { label: 'Stale issue ratio', value: metrics.staleIssueRatio },
    { label: 'Median time to merge', value: metrics.medianTimeToMergeHours },
    { label: 'Median time to close', value: metrics.medianTimeToCloseHours },
  ]
    .filter((entry) => entry.value === 'unavailable')
    .map((entry) => entry.label)

  if (unavailableMetricLabels.length === 0) {
    return undefined
  }

  return {
    title: 'Missing data',
    details: [`Unavailable in selected ${formatWindowLabel(windowDays)} window: ${unavailableMetricLabels.join(', ')}.`],
  }
}

function formatMetric(value: number | Unavailable) {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US').format(value)
  }

  return value
}

function formatRatio(numerator: number | Unavailable, denominator: number | Unavailable) {
  if (typeof numerator !== 'number' || typeof denominator !== 'number' || denominator <= 0) {
    return 'unavailable'
  }

  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format((numerator / denominator) * 100)}%`
}

function formatRatioDetail(
  numerator: number | Unavailable,
  denominator: number | Unavailable,
  numeratorLabel: string,
  denominatorLabel: string,
) {
  if (typeof numerator !== 'number' || typeof denominator !== 'number' || denominator <= 0) {
    return undefined
  }

  return `${formatMetric(numerator)} ${numeratorLabel} / ${formatMetric(denominator)} ${denominatorLabel}`
}

function formatWindowLabel(windowDays: ActivityWindowDays) {
  return windowDays === 365 ? '12 months' : `${windowDays}d`
}
