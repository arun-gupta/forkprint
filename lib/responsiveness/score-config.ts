import { ACTIVITY_WINDOW_DAYS, type ActivityWindowDays, type AnalysisResult, type ResponsivenessMetrics, type Unavailable } from '@/lib/analyzer/analysis-result'
import type { ScoreTone, ScoreValue } from '@/specs/008-metric-cards/contracts/metric-card-props'

export interface ResponsivenessScoreDefinition {
  value: ScoreValue
  tone: ScoreTone
  description: string
  summary: string
  weightedCategories: Array<{
    label: string
    weightLabel: string
    description: string
  }>
  thresholds: Array<{
    label: Extract<ScoreValue, 'High' | 'Medium' | 'Low'>
    rule: string
    description: string
  }>
  missingInputs: string[]
}

interface ResponsivenessBandDefinition {
  minScore: number
  value: Extract<ScoreValue, 'High' | 'Medium' | 'Low'>
  tone: Exclude<ScoreTone, 'neutral'>
  description: string
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

const RESPONSIVENESS_SCORE_BANDS: ResponsivenessBandDefinition[] = [
  {
    minScore: 80,
    value: 'High',
    tone: 'success',
    description: 'Verified response and resolution signals are fast, engaged, and consistently healthy.',
  },
  {
    minScore: 60,
    value: 'Medium',
    tone: 'warning',
    description: 'Responsiveness is meaningful but uneven, with slower outliers or weaker engagement signals.',
  },
  {
    minScore: 0,
    value: 'Low',
    tone: 'danger',
    description: 'Verified responsiveness signals are slow, stale, or weak relative to the configured thresholds.',
  },
]

const RESPONSIVENESS_THRESHOLDS: ResponsivenessScoreDefinition['thresholds'] = [
  {
    label: 'High',
    rule: 'Weighted score >= 80',
    description: 'Fast response times, healthy resolution flow, low stale backlog, and engaged human participation.',
  },
  {
    label: 'Medium',
    rule: 'Weighted score >= 60 and < 80',
    description: 'Mixed but still meaningful responsiveness, with some slower or less engaged signals.',
  },
  {
    label: 'Low',
    rule: 'Weighted score < 60',
    description: 'Slow or weak responsiveness relative to the configured thresholds.',
  },
]

const INSUFFICIENT_SCORE: ResponsivenessScoreDefinition = {
  value: 'Insufficient verified public data',
  tone: 'neutral',
  description: 'ForkPrint cannot verify enough public issue and pull-request event history to score this repository yet.',
  summary: 'Verified responsiveness inputs are incomplete.',
  weightedCategories: RESPONSIVENESS_CATEGORIES.map((category) => ({
    label: category.label,
    weightLabel: `${category.weight}%`,
    description: category.description,
  })),
  thresholds: RESPONSIVENESS_THRESHOLDS,
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

  const weightedScore =
    evaluateResponseTime(metrics) * 0.3 +
    evaluateResolution(metrics) * 0.25 +
    evaluateMaintainerSignals(metrics) * 0.15 +
    evaluateBacklogHealth(metrics) * 0.15 +
    evaluateEngagementQuality(metrics) * 0.15

  const band = RESPONSIVENESS_SCORE_BANDS.find((candidate) => weightedScore >= candidate.minScore) ?? RESPONSIVENESS_SCORE_BANDS.at(-1)!

  return {
    value: band.value,
    tone: band.tone,
    description: band.description,
    summary: `Responsiveness combines response-time, resolution, maintainer activity, backlog health, and engagement quality signals for the selected ${formatWindowLabel(windowDays)} window using shared thresholds.`,
    weightedCategories: RESPONSIVENESS_CATEGORIES.map((category) => ({
      label: category.label,
      weightLabel: `${category.weight}%`,
      description: category.description,
    })),
    thresholds: RESPONSIVENESS_THRESHOLDS,
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

function evaluateResponseTime(metrics: ResponsivenessMetrics) {
  const issueScore = scoreDurationPair(metrics.issueFirstResponseMedianHours, metrics.issueFirstResponseP90Hours, 24, 168)
  const prScore = scoreDurationPair(metrics.prFirstReviewMedianHours, metrics.prFirstReviewP90Hours, 48, 240)
  return (issueScore + prScore) / 2
}

function evaluateResolution(metrics: ResponsivenessMetrics) {
  const issueResolutionScore = scoreDurationPair(metrics.issueResolutionMedianHours, metrics.issueResolutionP90Hours, 168, 720)
  const prMergeScore = scoreDurationPair(metrics.prMergeMedianHours, metrics.prMergeP90Hours, 168, 720)
  const flowScore = scoreRatio(metrics.issueResolutionRate, 0.9, 0.65)
  return (issueResolutionScore + prMergeScore + flowScore) / 3
}

function evaluateMaintainerSignals(metrics: ResponsivenessMetrics) {
  const responseCoverage = scoreRatio(metrics.contributorResponseRate, 0.8, 0.5)
  const humanBias = scoreRatio(metrics.humanResponseRatio, 0.7, 0.4)
  const botPenalty = inverseScoreRatio(metrics.botResponseRatio, 0.25, 0.5)
  return (responseCoverage + humanBias + botPenalty) / 3
}

function evaluateBacklogHealth(metrics: ResponsivenessMetrics) {
  const staleIssues = inverseScoreRatio(metrics.staleIssueRatio, 0.2, 0.4)
  const stalePrs = inverseScoreRatio(metrics.stalePrRatio, 0.15, 0.3)
  return (staleIssues + stalePrs) / 2
}

function evaluateEngagementQuality(metrics: ResponsivenessMetrics) {
  const reviewDepth = scoreRatio(metrics.prReviewDepth, 1.5, 0.75)
  const issuesClosedSilently = inverseScoreRatio(metrics.issuesClosedWithoutCommentRatio, 0.15, 0.35)
  return (reviewDepth + issuesClosedSilently) / 2
}

function scoreDurationPair(
  medianHours: number | Unavailable,
  p90Hours: number | Unavailable,
  strongMedianThreshold: number,
  mediumMedianThreshold: number,
) {
  if (!isVerifiedNumber(medianHours) || !isVerifiedNumber(p90Hours)) {
    return 0
  }

  if (medianHours <= strongMedianThreshold && p90Hours <= mediumMedianThreshold) {
    return 100
  }
  if (medianHours <= mediumMedianThreshold && p90Hours <= mediumMedianThreshold * 2) {
    return 70
  }
  return 40
}

function scoreRatio(value: number | Unavailable, strongThreshold: number, mediumThreshold: number) {
  if (!isVerifiedNumber(value)) {
    return 0
  }

  if (value >= strongThreshold) return 100
  if (value >= mediumThreshold) return 70
  return 40
}

function inverseScoreRatio(value: number | Unavailable, strongThreshold: number, mediumThreshold: number) {
  if (!isVerifiedNumber(value)) {
    return 0
  }

  if (value <= strongThreshold) return 100
  if (value <= mediumThreshold) return 70
  return 40
}

function isVerifiedNumber(value: number | Unavailable | undefined): value is number {
  return typeof value === 'number' && !Number.isNaN(value)
}

function formatWindowLabel(windowDays: ActivityWindowDays) {
  return windowDays === 365 ? '12 months' : `${windowDays}d`
}

export function formatPercentage(value: number | Unavailable, maximumFractionDigits = 1) {
  if (value === 'unavailable') {
    return value
  }

  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value * 100)}%`
}

export function formatHours(value: number | Unavailable) {
  if (value === 'unavailable') {
    return value
  }

  if (value < 24) {
    return `${value.toFixed(1)}h`
  }

  return `${(value / 24).toFixed(1)}d`
}

export function formatCount(value: number | Unavailable, maximumFractionDigits = 0) {
  if (value === 'unavailable') {
    return value
  }

  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value)
}
