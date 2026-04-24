import {
  type ActivityCadenceMetrics,
  type ActivityWindowDays,
  ACTIVITY_WINDOW_DAYS,
  type AnalysisResult,
  type TrendComparisonMetrics,
  type TrendComparisonMode,
  type Unavailable,
} from '@/lib/analyzer/analysis-result'
import { getMergeRateGuidance } from './merge-rate-guidance'
import { ACTIVITY_LONG_GAP_ALERT_DAYS, formatPercentileLabel, getCalibrationForStars, interpolatePercentile, percentileToTone } from '@/lib/scoring/config-loader'

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
  cadence: DevelopmentCadenceCardViewModel | null
}

export interface WeeklyCommitBar {
  weekLabel: string
  commitCount: number
  isActive: boolean
}

export interface DevelopmentCadenceCardViewModel {
  repo: string
  chartBars: WeeklyCommitBar[] | null
  regularityLabel: 'High consistency' | 'Moderate consistency' | 'Bursty' | 'Insufficient verified public data'
  regularityPercentileLabel: string | null
  activeWeeksValue: string
  activeWeeksPercentileLabel: string | null
  longestGapValue: string
  longestGapHighlighted: boolean
  weekendWeekdayValue: string
  defaultTrendMode: TrendComparisonMode
  trendModes: Record<TrendComparisonMode, TrendComparisonViewModel>
}

export interface TrendComparisonViewModel {
  label: string
  helperText: string
  trendLabel: 'Accelerating' | 'Decelerating' | 'Flat' | 'Insufficient verified public data'
  trendDeltaValue: string | null
  currentPeriodLabel: string
  currentPeriodValue: string
  previousPeriodLabel: string
  previousPeriodValue: string
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
      cards: buildCards(metrics, result.stars),
      metrics,
      cadence: buildDevelopmentCadenceCard(result, windowDays),
    }
  })
}

export function buildDevelopmentCadenceCard(
  result: AnalysisResult,
  windowDays: ActivityWindowDays,
): DevelopmentCadenceCardViewModel | null {
  const cadence = result.activityCadenceByWindow?.[windowDays]
  if (!cadence) return null

  const calibration = getCalibrationForStars(result.stars)
  const activeWeeksPercentile =
    typeof cadence.activeWeeksRatio === 'number' && calibration.activeWeeksRatio
      ? interpolatePercentile(cadence.activeWeeksRatio, calibration.activeWeeksRatio)
      : null
  const regularityPercentile =
    typeof cadence.commitRegularity === 'number' && calibration.commitRegularity
      ? interpolatePercentile(cadence.commitRegularity, calibration.commitRegularity, true)
      : null

  return {
    repo: result.repo,
    chartBars: Array.isArray(cadence.weeklyCommitCounts)
      ? cadence.weeklyCommitCounts.map((commitCount, index) => ({
          weekLabel: `W${index + 1}`,
          commitCount,
          isActive: commitCount > 0,
        }))
      : null,
    regularityLabel: formatRegularityLabel(regularityPercentile, cadence.commitRegularity),
    regularityPercentileLabel: regularityPercentile === null ? null : formatPercentileLabel(regularityPercentile),
    activeWeeksValue: formatPercent(cadence.activeWeeksRatio),
    activeWeeksPercentileLabel: activeWeeksPercentile === null ? null : formatPercentileLabel(activeWeeksPercentile),
    longestGapValue: formatDays(cadence.longestGapDays),
    longestGapHighlighted: typeof cadence.longestGapDays === 'number' && cadence.longestGapDays >= ACTIVITY_LONG_GAP_ALERT_DAYS,
    weekendWeekdayValue: formatWeekendWeekday(cadence.weekendCommitCount, cadence.weekdayCommitCount, cadence.weekendToWeekdayRatio),
    defaultTrendMode: 'month',
    trendModes: buildTrendModes(cadence.trendComparisons),
  }
}

function buildCards(metrics: ReturnType<typeof getWindowMetrics>, stars: number | import('@/lib/analyzer/analysis-result').Unavailable = 'unavailable'): ActivityCardViewModel[] {
  const mergeRateGuidance = getMergeRateGuidance(metrics.prsMerged, metrics.prsOpened, stars)

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
        { label: 'Merge rate', value: mergeRateGuidance.percentage },
        { label: 'Ranking', value: mergeRateGuidance.percentileLabel },
      ],
      detail:
        mergeRateGuidance.ratio === 'unavailable'
          ? undefined
          : `${mergeRateGuidance.summary} ${mergeRateGuidance.recommendation}`,
    },
    {
      title: 'Issues',
      lines: [
        { label: 'Opened', value: formatMetric(metrics.issuesOpened) },
        { label: 'Closed', value: formatMetric(metrics.issuesClosed) },
        { label: 'Closure rate', value: formatClosureRateWithPercentile(metrics.issuesClosed, metrics.issuesOpened, stars) },
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

function formatMetric(value: number | Unavailable) {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US').format(value)
  }

  return '—'
}

function formatRatio(numerator: number | Unavailable, denominator: number | Unavailable) {
  if (typeof numerator !== 'number' || typeof denominator !== 'number' || denominator <= 0) {
    return '—'
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

function formatClosureRateWithPercentile(closed: number | Unavailable, opened: number | Unavailable, stars: number | Unavailable): string {
  const raw = formatRatio(closed, opened)
  if (raw === '—' || typeof closed !== 'number' || typeof opened !== 'number' || opened <= 0) return raw
  const rate = closed / opened
  const cal = getCalibrationForStars(stars)
  const p = interpolatePercentile(rate, cal.issueClosureRate)
  return `${raw} (${formatPercentileLabel(p)})`
}

function formatRegularityLabel(
  percentile: number | null,
  rawRegularity: number | Unavailable,
): DevelopmentCadenceCardViewModel['regularityLabel'] {
  if (percentile !== null) {
    const tone = percentileToTone(percentile)
    if (tone === 'success') return 'High consistency'
    if (tone === 'warning') return 'Moderate consistency'
    return 'Bursty'
  }
  if (typeof rawRegularity !== 'number') return 'Insufficient verified public data'
  if (rawRegularity <= 0.5) return 'High consistency'
  if (rawRegularity <= 1) return 'Moderate consistency'
  return 'Bursty'
}

function formatPercent(value: number | Unavailable): string {
  if (typeof value !== 'number') return '—'
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value * 100)}%`
}

function formatDays(value: number | Unavailable): string {
  if (typeof value !== 'number') return '—'
  return value === 1 ? '1 day' : `${value} days`
}

function formatWeekendWeekday(
  weekendCount: number | Unavailable,
  weekdayCount: number | Unavailable,
  ratio: number | Unavailable,
): string {
  if (typeof weekendCount !== 'number' || typeof weekdayCount !== 'number' || typeof ratio !== 'number') return '—'
  const totalCount = weekendCount + weekdayCount
  if (totalCount <= 0) return '—'
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format((weekendCount / totalCount) * 100)}% weekend`
}

function formatTrendLabel(value: TrendComparisonMetrics['direction']): TrendComparisonViewModel['trendLabel'] {
  if (value === 'accelerating') return 'Accelerating'
  if (value === 'decelerating') return 'Decelerating'
  if (value === 'flat') return 'Flat'
  return 'Insufficient verified public data'
}

function formatTrendDelta(value: number | Unavailable): string | null {
  if (typeof value !== 'number') return null
  if (value === 1) return '+100%'
  return `${value > 0 ? '+' : ''}${Math.round(value * 100)}%`
}

function buildTrendModes(
  trendComparisons: ActivityCadenceMetrics['trendComparisons'],
): Record<TrendComparisonMode, TrendComparisonViewModel> {
  const fallback: TrendComparisonMetrics = {
    currentPeriodCommitCount: 'unavailable',
    previousPeriodCommitCount: 'unavailable',
    delta: 'unavailable',
    direction: 'unavailable',
  }

  return {
    month: buildTrendModeViewModel(
      'Month over month',
      'Compares the latest 30 days with the 30 days immediately before them.',
      'Last 30 days',
      'Days 31-60 ago',
      trendComparisons === 'unavailable' ? fallback : trendComparisons.month,
    ),
    week: buildTrendModeViewModel(
      'Week over week',
      'Compares the latest 7 days with the 7 days immediately before them.',
      'Last 7 days',
      'Days 8-14 ago',
      trendComparisons === 'unavailable' ? fallback : trendComparisons.week,
    ),
    day: buildTrendModeViewModel(
      'Day over day',
      'Compares the most recent complete UTC day with the previous complete UTC day.',
      'Most recent full day',
      'Previous full day',
      trendComparisons === 'unavailable' ? fallback : trendComparisons.day,
    ),
  }
}

function buildTrendModeViewModel(
  label: string,
  helperText: string,
  currentPeriodLabel: string,
  previousPeriodLabel: string,
  metrics: TrendComparisonMetrics,
): TrendComparisonViewModel {
  return {
    label,
    helperText,
    trendLabel: formatTrendLabel(metrics.direction),
    trendDeltaValue: formatTrendDelta(metrics.delta),
    currentPeriodLabel,
    currentPeriodValue: formatMetric(metrics.currentPeriodCommitCount),
    previousPeriodLabel,
    previousPeriodValue: formatMetric(metrics.previousPeriodCommitCount),
  }
}
