import type { ActivityWindowDays, AnalysisResult, Unavailable } from '@/lib/analyzer/analysis-result'
import type { ScoreTone, ScoreValue } from '@/specs/008-metric-cards/contracts/metric-card-props'

export interface ActivityScoreDefinition {
  value: ScoreValue
  tone: ScoreTone
  description: string
  summary: string
  weightedFactors: Array<{
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

interface ActivityBandDefinition {
  minScore: number
  value: Extract<ScoreValue, 'High' | 'Medium' | 'Low'>
  tone: Exclude<ScoreTone, 'neutral'>
  description: string
}

interface ActivityFactorDefinition {
  key: 'prFlow' | 'issueFlow' | 'completionSpeed' | 'sustainedActivity' | 'releaseCadence'
  label: string
  weight: number
  description: string
}

const ACTIVITY_FACTORS: ActivityFactorDefinition[] = [
  {
    key: 'prFlow',
    label: 'PR flow',
    weight: 25,
    description: 'Based on merged pull requests versus opened pull requests in the recent verified window.',
  },
  {
    key: 'issueFlow',
    label: 'Issue flow',
    weight: 20,
    description: 'Based on closed issues versus opened issues and the share of stale open issues.',
  },
  {
    key: 'completionSpeed',
    label: 'Completion speed',
    weight: 15,
    description: 'Based on the median time to merge pull requests and median time to close issues.',
  },
  {
    key: 'sustainedActivity',
    label: 'Sustained activity',
    weight: 25,
    description: 'Based on commit volume across 30d, 90d, and 180d windows.',
  },
  {
    key: 'releaseCadence',
    label: 'Release cadence',
    weight: 15,
    description: 'Based on the number of releases published in the last 12 months.',
  },
]

const ACTIVITY_SCORE_BANDS: ActivityBandDefinition[] = [
  {
    minScore: 80,
    value: 'High',
    tone: 'success',
    description: 'Recent activity is strong, flow is healthy, and verified public delivery signals look consistently active.',
  },
  {
    minScore: 60,
    value: 'Medium',
    tone: 'warning',
    description: 'Meaningful activity is present, but flow, cadence, or completion speed is uneven.',
  },
  {
    minScore: 0,
    value: 'Low',
    tone: 'danger',
    description: 'Recent activity or delivery flow is weak compared with the configured thresholds.',
  },
]

const ACTIVITY_THRESHOLDS: ActivityScoreDefinition['thresholds'] = [
  {
    label: 'High',
    rule: 'Weighted score >= 80',
    description: 'Healthy recent commit volume, strong flow ratios, active releases, and faster merge/close times.',
  },
  {
    label: 'Medium',
    rule: 'Weighted score >= 60 and < 80',
    description: 'Moderate recent activity with uneven but still meaningful delivery flow.',
  },
  {
    label: 'Low',
    rule: 'Weighted score < 60',
    description: 'Recent verified activity or delivery flow is weak relative to the configured scoring bands.',
  },
]

const INSUFFICIENT_SCORE: ActivityScoreDefinition = {
  value: 'Insufficient verified public data',
  tone: 'neutral',
  description: 'RepoPulse cannot verify enough recent activity and delivery-flow data to score this repository yet.',
  summary: 'Verified recent-flow inputs are incomplete.',
  weightedFactors: ACTIVITY_FACTORS.map((factor) => ({
    label: factor.label,
    weightLabel: `${factor.weight}%`,
    description: factor.description,
  })),
  thresholds: ACTIVITY_THRESHOLDS,
  missingInputs: [],
}

export function getActivityScore(result: AnalysisResult, windowDays: ActivityWindowDays = 90): ActivityScoreDefinition {
  const missingInputs = getMissingActivityScoreInputs(result, windowDays)
  if (missingInputs.length > 0) {
    return {
      ...INSUFFICIENT_SCORE,
      missingInputs,
      summary: `Missing verified inputs: ${missingInputs.join(', ')}.`,
    }
  }

  const metrics = result.activityMetricsByWindow?.[windowDays]
  if (!metrics) {
    const label = formatWindowLabel(windowDays)
    return {
      ...INSUFFICIENT_SCORE,
      missingInputs: [`Recent activity window (${label})`],
      summary: `Missing verified inputs: Recent activity window (${label}).`,
    }
  }

  const weightedScore =
    evaluatePrFlow(metrics.prsMerged, metrics.prsOpened) * 0.25 +
    evaluateIssueFlow(metrics.issuesClosed, metrics.issuesOpened, metrics.staleIssueRatio) * 0.2 +
    evaluateCompletionSpeed(metrics.medianTimeToMergeHours, metrics.medianTimeToCloseHours) * 0.15 +
    evaluateSustainedActivity(metrics.commits, windowDays) * 0.25 +
    evaluateReleaseCadence(metrics.releases, windowDays) * 0.15

  const band = ACTIVITY_SCORE_BANDS.find((candidate) => weightedScore >= candidate.minScore) ?? ACTIVITY_SCORE_BANDS.at(-1)!

  return {
    value: band.value,
    tone: band.tone,
    description: band.description,
    summary: `Activity combines PR flow, issue flow, completion speed, sustained activity, and release cadence for the selected ${formatWindowLabel(windowDays)} window using shared thresholds.`,
    weightedFactors: ACTIVITY_FACTORS.map((factor) => ({
      label: factor.label,
      weightLabel: `${factor.weight}%`,
      description: factor.description,
    })),
    thresholds: ACTIVITY_THRESHOLDS,
    missingInputs: [],
  }
}

function getMissingActivityScoreInputs(result: AnalysisResult, windowDays: ActivityWindowDays) {
  const missing: string[] = []
  const metrics = result.activityMetricsByWindow?.[windowDays]
  const label = formatWindowLabel(windowDays)

  if (!isVerifiedNumber(metrics?.commits)) {
    missing.push(`Commits (${label})`)
  }
  if (!isVerifiedNumber(metrics?.prsOpened)) {
    missing.push(`PRs opened (${label})`)
  }
  if (!isVerifiedNumber(metrics?.prsMerged)) {
    missing.push(`PRs merged (${label})`)
  }
  if (!isVerifiedNumber(metrics?.issuesOpened)) {
    missing.push(`Issues opened (${label})`)
  }
  if (!isVerifiedNumber(metrics?.issuesClosed)) {
    missing.push(`Issues closed (${label})`)
  }
  if (!isVerifiedNumber(metrics?.releases)) {
    missing.push(`Releases (${label})`)
  }
  if (!isVerifiedNumber(metrics?.staleIssueRatio)) {
    missing.push('Stale issue ratio')
  }
  if (!isVerifiedNumber(metrics?.medianTimeToMergeHours)) {
    missing.push('Median time to merge')
  }
  if (!isVerifiedNumber(metrics?.medianTimeToCloseHours)) {
    missing.push('Median time to close')
  }

  return missing
}

function evaluatePrFlow(merged: number | Unavailable, opened: number | Unavailable) {
  const rate = ratio(merged, opened)
  if (rate === 'unavailable') return 0
  if (rate >= 0.6) return 100
  if (rate >= 0.35) return 70
  return 40
}

function evaluateIssueFlow(closed: number | Unavailable, opened: number | Unavailable, staleIssueRatio: number | Unavailable) {
  const closureRate = ratio(closed, opened)
  if (closureRate === 'unavailable' || staleIssueRatio === 'unavailable') return 0
  if (closureRate >= 0.8 && staleIssueRatio <= 0.25) return 100
  if (closureRate >= 0.5 && staleIssueRatio <= 0.5) return 70
  return 40
}

function evaluateCompletionSpeed(medianMergeHours: number | Unavailable, medianCloseHours: number | Unavailable) {
  if (medianMergeHours === 'unavailable' || medianCloseHours === 'unavailable') return 0
  if (medianMergeHours <= 168 && medianCloseHours <= 168) return 100
  if (medianMergeHours <= 720 && medianCloseHours <= 720) return 70
  return 40
}

function evaluateSustainedActivity(commits: number | Unavailable, windowDays: ActivityWindowDays) {
  if (commits === 'unavailable') return 0
  const commitsPer30Days = commits / (windowDays / 30)
  if (commitsPer30Days >= 20) return 100
  if (commitsPer30Days >= 5) return 70
  return 40
}

function evaluateReleaseCadence(releases: number | Unavailable, windowDays: ActivityWindowDays) {
  if (releases === 'unavailable') return 0
  const annualizedReleases = releases * (365 / windowDays)
  if (annualizedReleases >= 12) return 100
  if (annualizedReleases >= 4) return 70
  return 40
}

function formatWindowLabel(windowDays: ActivityWindowDays) {
  return windowDays === 365 ? '12 months' : `${windowDays}d`
}

function ratio(numerator: number | Unavailable, denominator: number | Unavailable): number | Unavailable {
  if (numerator === 'unavailable' || denominator === 'unavailable' || denominator <= 0) {
    return 'unavailable'
  }

  return numerator / denominator
}

function isVerifiedNumber(value: number | Unavailable | undefined): value is number {
  return typeof value === 'number' && !Number.isNaN(value)
}

export function formatPercentage(value: number | Unavailable) {
  if (value === 'unavailable') {
    return '—'
  }

  return `${(value * 100).toFixed(1)}%`
}

export function formatHours(value: number | Unavailable) {
  if (value === 'unavailable') {
    return '—'
  }

  if (value < 24) {
    return `${value.toFixed(1)}h`
  }

  return `${(value / 24).toFixed(1)}d`
}
