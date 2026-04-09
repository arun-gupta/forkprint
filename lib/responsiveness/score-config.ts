import { ACTIVITY_WINDOW_DAYS, type ActivityWindowDays, type AnalysisResult, type ResponsivenessMetrics, type Unavailable } from '@/lib/analyzer/analysis-result'
import type { ScoreTone, ScoreValue } from '@/specs/008-metric-cards/contracts/metric-card-props'
import { type BracketCalibration, formatPercentileLabel, getBracketLabel, getCalibrationForStars, interpolatePercentile, percentileToTone } from '@/lib/scoring/config-loader'

export interface ResponsivenessScoreDefinition {
  value: ScoreValue
  tone: ScoreTone
  description: string
  summary: string
  percentile: number
  bracketLabel: string
  weightedCategories: Array<{
    label: string
    weightLabel: string
    description: string
    percentile?: number
  }>
  missingInputs: string[]
}

interface WeightedCategoryDefinition {
  key: 'responseTime' | 'resolution' | 'maintainerSignals' | 'backlogHealth' | 'engagementQuality'
  label: string
  weight: number
  description: string
}

const RESPONSIVENESS_CATEGORIES: WeightedCategoryDefinition[] = [
  {
    key: 'responseTime',
    label: 'Issue & PR response time',
    weight: 30,
    description: 'Based on issue first-response and PR first-review medians plus p90 outlier behavior.',
  },
  {
    key: 'resolution',
    label: 'Resolution metrics',
    weight: 25,
    description: 'Based on issue resolution duration, PR merge duration, and issue resolution rate.',
  },
  {
    key: 'maintainerSignals',
    label: 'Maintainer activity signals',
    weight: 15,
    description: 'Based on human responder coverage and the balance between bot and human first responses.',
  },
  {
    key: 'backlogHealth',
    label: 'Volume & backlog health',
    weight: 15,
    description: 'Based on stale issue and stale pull-request ratios in the verified recent window.',
  },
  {
    key: 'engagementQuality',
    label: 'Engagement quality signals',
    weight: 15,
    description: 'Based on PR review depth and the share of issues closed without comment.',
  },
]

const INSUFFICIENT_SCORE: ResponsivenessScoreDefinition = {
  value: 'Insufficient verified public data',
  tone: 'neutral',
  description: 'RepoPulse cannot verify enough public issue and pull-request event history to score this repository yet.',
  summary: 'Verified responsiveness inputs are incomplete.',
  percentile: 0,
  bracketLabel: '',
  weightedCategories: RESPONSIVENESS_CATEGORIES.map((category) => ({
    label: category.label,
    weightLabel: `${category.weight}%`,
    description: category.description,
  })),
  missingInputs: [],
}

export function getResponsivenessScore(result: AnalysisResult, windowDays: ActivityWindowDays = 90): ResponsivenessScoreDefinition {
  const metrics = result.responsivenessMetricsByWindow?.[windowDays] ?? result.responsivenessMetrics
  const missingInputs = getMissingResponsivenessInputs(metrics)

  if (missingInputs.length > 0 || !metrics) {
    return {
      ...INSUFFICIENT_SCORE,
      missingInputs,
      summary:
        missingInputs.length > 0
          ? `Missing verified inputs: ${missingInputs.join(', ')}.`
          : INSUFFICIENT_SCORE.summary,
    }
  }

  const cal = getCalibrationForStars(result.stars)
  const bracketLabel = getBracketLabel(result.stars)

  const subPercentiles = {
    responseTime: evaluateResponseTime(metrics, cal),
    resolution: evaluateResolution(metrics, cal),
    maintainerSignals: evaluateMaintainerSignals(metrics, cal),
    backlogHealth: evaluateBacklogHealth(metrics, cal),
    engagementQuality: evaluateEngagementQuality(metrics, cal),
  }

  const compositePercentile = Math.round(
    subPercentiles.responseTime * 0.3 +
    subPercentiles.resolution * 0.25 +
    subPercentiles.maintainerSignals * 0.15 +
    subPercentiles.backlogHealth * 0.15 +
    subPercentiles.engagementQuality * 0.15,
  )

  const percentile = Math.min(99, Math.max(0, compositePercentile))

  return {
    value: percentile,
    tone: percentileToTone(percentile),
    description: `This repo's responsiveness ranks at the ${formatPercentileLabel(percentile)} percentile among ${bracketLabel} repositories.`,
    summary: `Responsiveness combines response-time, resolution, maintainer activity, backlog health, and engagement quality signals for the selected ${formatWindowLabel(windowDays)} window, scored relative to ${bracketLabel} repositories.`,
    percentile,
    bracketLabel,
    weightedCategories: RESPONSIVENESS_CATEGORIES.map((category) => ({
      label: category.label,
      weightLabel: `${category.weight}%`,
      description: category.description,
      percentile: subPercentiles[category.key],
    })),
    missingInputs: [],
  }
}

export function getResponsivenessWindowOptions() {
  return ACTIVITY_WINDOW_DAYS.map((days) => ({
    days,
    label: formatWindowLabel(days),
  }))
}

function getMissingResponsivenessInputs(metrics?: ResponsivenessMetrics) {
  if (!metrics) {
    return ['Responsiveness metrics']
  }

  const missing: string[] = []

  if (!isVerifiedNumber(metrics.issueFirstResponseMedianHours)) missing.push('Issue first response time')
  if (!isVerifiedNumber(metrics.issueFirstResponseP90Hours)) missing.push('Issue first response p90')
  if (!isVerifiedNumber(metrics.prFirstReviewMedianHours)) missing.push('PR first review time')
  if (!isVerifiedNumber(metrics.prFirstReviewP90Hours)) missing.push('PR first review p90')
  if (!isVerifiedNumber(metrics.issueResolutionMedianHours)) missing.push('Issue resolution duration')
  if (!isVerifiedNumber(metrics.issueResolutionP90Hours)) missing.push('Issue resolution p90')
  if (!isVerifiedNumber(metrics.prMergeMedianHours)) missing.push('PR merge duration')
  if (!isVerifiedNumber(metrics.prMergeP90Hours)) missing.push('PR merge p90')
  if (!isVerifiedNumber(metrics.issueResolutionRate)) missing.push('Issue resolution rate')
  if (!isVerifiedNumber(metrics.contributorResponseRate)) missing.push('Contributor response rate')
  if (!isVerifiedNumber(metrics.botResponseRatio)) missing.push('Bot response ratio')
  if (!isVerifiedNumber(metrics.humanResponseRatio)) missing.push('Human response ratio')
  if (!isVerifiedNumber(metrics.staleIssueRatio)) missing.push('Stale issue ratio')
  if (!isVerifiedNumber(metrics.stalePrRatio)) missing.push('Stale PR ratio')
  if (!isVerifiedNumber(metrics.prReviewDepth)) missing.push('PR review depth')
  if (!isVerifiedNumber(metrics.issuesClosedWithoutCommentRatio)) missing.push('Issues closed without comment')

  return missing
}

function evaluateResponseTime(metrics: ResponsivenessMetrics, cal: BracketCalibration): number {
  const issueMedian = interpolateDuration(metrics.issueFirstResponseMedianHours, cal.issueFirstResponseMedianHours)
  const issueP90 = interpolateDuration(metrics.issueFirstResponseP90Hours, cal.issueFirstResponseP90Hours)
  const prMedian = interpolateDuration(metrics.prFirstReviewMedianHours, cal.prFirstReviewMedianHours)
  const prP90 = interpolateDuration(metrics.prFirstReviewP90Hours, cal.prFirstReviewP90Hours)
  return Math.round((issueMedian + issueP90 + prMedian + prP90) / 4)
}

function evaluateResolution(metrics: ResponsivenessMetrics, cal: BracketCalibration): number {
  const issueResolution = interpolateDuration(metrics.issueResolutionMedianHours, cal.issueResolutionMedianHours)
  const prMerge = interpolateDuration(metrics.prMergeMedianHours, cal.prMergeMedianHours)
  const flowScore = interpolateRatio(metrics.issueResolutionRate, cal.issueResolutionRate)
  return Math.round((issueResolution + prMerge + flowScore) / 3)
}

function evaluateMaintainerSignals(metrics: ResponsivenessMetrics, cal: BracketCalibration): number {
  const responseCoverage = interpolateRatio(metrics.contributorResponseRate, cal.contributorResponseRate)
  const humanBias = interpolateRatio(metrics.humanResponseRatio, cal.humanResponseRatio)
  const botPenalty = interpolateInverseRatio(metrics.botResponseRatio, cal.botResponseRatio)
  return Math.round((responseCoverage + humanBias + botPenalty) / 3)
}

function evaluateBacklogHealth(metrics: ResponsivenessMetrics, cal: BracketCalibration): number {
  const staleIssues = interpolateInverseRatio(metrics.staleIssueRatio, cal.staleIssueRatio)
  const stalePrs = interpolateInverseRatio(metrics.stalePrRatio, cal.stalePrRatio)
  return Math.round((staleIssues + stalePrs) / 2)
}

function evaluateEngagementQuality(metrics: ResponsivenessMetrics, cal: BracketCalibration): number {
  const reviewDepth = interpolateRatio(metrics.prReviewDepth, cal.prReviewDepth)
  const issuesClosedSilently = interpolateInverseRatio(metrics.issuesClosedWithoutCommentRatio, cal.issuesClosedWithoutCommentRatio)
  return Math.round((reviewDepth + issuesClosedSilently) / 2)
}

/** Duration metric: lower is better → inverted percentile. */
function interpolateDuration(value: number | Unavailable, ps: import('@/lib/scoring/config-loader').PercentileSet): number {
  if (!isVerifiedNumber(value)) return 0
  return interpolatePercentile(value, ps, true)
}

/** Ratio metric: higher is better → normal percentile. */
function interpolateRatio(value: number | Unavailable, ps: import('@/lib/scoring/config-loader').PercentileSet): number {
  if (!isVerifiedNumber(value)) return 0
  return interpolatePercentile(value, ps)
}

/** Inverse ratio metric: lower is better → inverted percentile. */
function interpolateInverseRatio(value: number | Unavailable, ps: import('@/lib/scoring/config-loader').PercentileSet): number {
  if (!isVerifiedNumber(value)) return 0
  return interpolatePercentile(value, ps, true)
}

export function formatPercentage(value: number | Unavailable, maximumFractionDigits = 1) {
  if (value === 'unavailable') return '—'
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value * 100)}%`
}

export function formatHours(value: number | Unavailable) {
  if (value === 'unavailable') return '—'
  if (value < 24) return `${value.toFixed(1)}h`
  return `${(value / 24).toFixed(1)}d`
}

export function formatCount(value: number | Unavailable, maximumFractionDigits = 0) {
  if (value === 'unavailable') return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value)
}

function formatWindowLabel(windowDays: ActivityWindowDays) {
  return windowDays === 365 ? '12 months' : `${windowDays}d`
}

function isVerifiedNumber(value: number | Unavailable | undefined): value is number {
  return typeof value === 'number' && !Number.isNaN(value)
}

