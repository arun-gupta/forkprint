import { type ActivityWindowDays, ACTIVITY_WINDOW_DAYS, type AnalysisResult, type Unavailable } from '@/lib/analyzer/analysis-result'

export interface ActivityMetricRow {
  label: string
  value: string
}

export interface ActivitySectionViewModel {
  repo: string
  metrics: ActivityMetricRow[]
}

export function getActivityWindowOptions() {
  return ACTIVITY_WINDOW_DAYS.map((days) => ({
    days,
    label: days === 365 ? '12 months' : `${days}d`,
  }))
}

export function buildActivitySections(results: AnalysisResult[], windowDays: ActivityWindowDays): ActivitySectionViewModel[] {
  return results.map((result) => ({
    repo: result.repo,
    metrics: [
      { label: `Commits (${formatWindowLabel(windowDays)})`, value: formatMetric(getWindowMetrics(result, windowDays).commits) },
      { label: `PRs opened (${formatWindowLabel(windowDays)})`, value: formatMetric(getWindowMetrics(result, windowDays).prsOpened) },
      { label: `PRs merged (${formatWindowLabel(windowDays)})`, value: formatMetric(getWindowMetrics(result, windowDays).prsMerged) },
      { label: `Issues opened (${formatWindowLabel(windowDays)})`, value: formatMetric(getWindowMetrics(result, windowDays).issuesOpened) },
      { label: `Issues closed (${formatWindowLabel(windowDays)})`, value: formatMetric(getWindowMetrics(result, windowDays).issuesClosed) },
      { label: `Releases (${formatWindowLabel(windowDays)})`, value: formatMetric(getWindowMetrics(result, windowDays).releases) },
    ],
  }))
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
    }
  )
}

function formatWindowLabel(windowDays: ActivityWindowDays) {
  return windowDays === 365 ? '12mo' : `${windowDays}d`
}

function formatMetric(value: number | Unavailable) {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US').format(value)
  }

  return value
}
