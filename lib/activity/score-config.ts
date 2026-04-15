import type { ActivityWindowDays, AnalysisResult, Unavailable } from '@/lib/analyzer/analysis-result'
import type { ScoreTone, ScoreValue } from '@/specs/008-metric-cards/contracts/metric-card-props'
import { type BracketCalibration, type CalibrationProfile, formatPercentileLabel, getBracketLabel, getCalibrationForStars, interpolatePercentile, percentileToTone } from '@/lib/scoring/config-loader'

export interface ActivityScoreDefinition {
  value: ScoreValue
  tone: ScoreTone
  description: string
  summary: string
  percentile: number
  bracketLabel: string
  weightedFactors: Array<{
    label: string
    weightLabel: string
    description: string
    percentile?: number
  }>
  missingInputs: string[]
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

const INSUFFICIENT_SCORE: ActivityScoreDefinition = {
  value: 'Insufficient verified public data',
  tone: 'neutral',
  description: 'RepoPulse cannot verify enough recent activity and delivery-flow data to score this repository yet.',
  summary: 'Verified recent-flow inputs are incomplete.',
  percentile: 0,
  bracketLabel: '',
  weightedFactors: ACTIVITY_FACTORS.map((factor) => ({
    label: factor.label,
    weightLabel: `${factor.weight}%`,
    description: factor.description,
  })),
  missingInputs: [],
}

export function getActivityScore(
  result: AnalysisResult,
  windowDays: ActivityWindowDays = 90,
  profile: CalibrationProfile = 'community',
): ActivityScoreDefinition {
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

  const cal = getCalibrationForStars(result.stars, profile)
  const bracketLabel = getBracketLabel(result.stars, profile)

  const subPercentiles = {
    prFlow: evaluatePrFlow(metrics.prsMerged, metrics.prsOpened, cal),
    issueFlow: evaluateIssueFlow(metrics.issuesClosed, metrics.issuesOpened, metrics.staleIssueRatio, cal),
    completionSpeed: evaluateCompletionSpeed(metrics.medianTimeToMergeHours, metrics.medianTimeToCloseHours, cal),
    sustainedActivity: evaluateSustainedActivity(metrics.commits, windowDays),
    releaseCadence: evaluateReleaseCadence(metrics.releases, windowDays),
  }

  const compositePercentile = Math.round(
    subPercentiles.prFlow * 0.25 +
    subPercentiles.issueFlow * 0.2 +
    subPercentiles.completionSpeed * 0.15 +
    subPercentiles.sustainedActivity * 0.25 +
    subPercentiles.releaseCadence * 0.15,
  )

  // Community signal (P2-F05 / #70): additive Discussions bonus. Bonus-only
  // semantics — absence (Discussions disabled) never lowers the percentile.
  // Magnitudes deliberately modest per research.md Q1 pending #152 calibration.
  //   Enabled + recent activity → up to +5
  //   Enabled + no recent activity → +1
  //   Not enabled or unavailable → 0
  const discussionsBonus = computeDiscussionsBonus(
    result.hasDiscussionsEnabled,
    countDiscussionsInWindow(result, windowDays),
  )

  const percentile = Math.min(99, Math.max(0, compositePercentile + discussionsBonus))

  return {
    value: percentile,
    tone: percentileToTone(percentile),
    description: `This repo's activity ranks at the ${formatPercentileLabel(percentile)} percentile among ${bracketLabel} repositories.`,
    summary: `Activity combines PR flow, issue flow, completion speed, sustained activity, and release cadence for the selected ${formatWindowLabel(windowDays)} window, scored relative to ${bracketLabel} repositories.`,
    percentile,
    bracketLabel,
    weightedFactors: ACTIVITY_FACTORS.map((factor) => ({
      label: factor.label,
      weightLabel: `${factor.weight}%`,
      description: factor.description,
      percentile: subPercentiles[factor.key],
    })),
    missingInputs: [],
  }
}

function computeDiscussionsBonus(
  enabled: AnalysisResult['hasDiscussionsEnabled'],
  count: AnalysisResult['discussionsCountWindow'],
): number {
  if (enabled !== true) return 0
  if (typeof count === 'number' && count > 0) {
    // Ramp up slowly: 1 discussion → +2, 5+ → +5.
    return Math.min(5, 1 + Math.floor(count / 2))
  }
  return 1 // enabled but no recent activity — a weak positive signal
}

/**
 * Count discussions created within the last `windowDays` from the preserved
 * raw `createdAt` timestamps. Returns 'unavailable' when the raw array was
 * not captured (e.g., Discussions not enabled, older fixture). Callers may
 * also fall back to the pre-computed `discussionsCountWindow` when it
 * happens to match `windowDays`. Introduced for issue #194 so the Activity
 * tab's window selector drives the Discussions card.
 */
export function countDiscussionsInWindow(
  result: AnalysisResult,
  windowDays: ActivityWindowDays,
): number | Unavailable {
  const raw = result.discussionsRecentCreatedAt
  if (Array.isArray(raw)) {
    const sinceMs = Date.now() - windowDays * 24 * 60 * 60 * 1000
    return raw.filter((iso) => {
      const created = Date.parse(iso)
      return Number.isFinite(created) && created >= sinceMs
    }).length
  }
  if (
    typeof result.discussionsCountWindow === 'number' &&
    result.discussionsWindowDays === windowDays
  ) {
    return result.discussionsCountWindow
  }
  return 'unavailable'
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

function evaluatePrFlow(merged: number | Unavailable, opened: number | Unavailable, cal: BracketCalibration): number {
  const rate = ratio(merged, opened)
  if (rate === 'unavailable') return 0
  return interpolatePercentile(rate, cal.prMergeRate)
}

function evaluateIssueFlow(closed: number | Unavailable, opened: number | Unavailable, staleIssueRatio: number | Unavailable, cal: BracketCalibration): number {
  const closureRate = ratio(closed, opened)
  if (closureRate === 'unavailable' || staleIssueRatio === 'unavailable') return 0
  const closurePercentile = interpolatePercentile(closureRate, cal.issueClosureRate)
  const stalePercentile = interpolatePercentile(staleIssueRatio, cal.staleIssueRatio, true)
  return Math.round((closurePercentile + stalePercentile) / 2)
}

function evaluateCompletionSpeed(medianMergeHours: number | Unavailable, medianCloseHours: number | Unavailable, cal: BracketCalibration): number {
  if (medianMergeHours === 'unavailable' || medianCloseHours === 'unavailable') return 0
  const mergePercentile = interpolatePercentile(medianMergeHours, cal.medianTimeToMergeHours, true)
  const closePercentile = interpolatePercentile(medianCloseHours, cal.medianTimeToCloseHours, true)
  return Math.round((mergePercentile + closePercentile) / 2)
}

function evaluateSustainedActivity(commits: number | Unavailable, windowDays: ActivityWindowDays): number {
  if (commits === 'unavailable') return 0
  const commitsPer30Days = commits / (windowDays / 30)
  // Linear approximation pending calibration data for commit rates
  if (commitsPer30Days >= 20) return 99
  if (commitsPer30Days <= 0) return 0
  if (commitsPer30Days >= 5) return Math.round(50 + ((commitsPer30Days - 5) / 15) * 49)
  return Math.round((commitsPer30Days / 5) * 50)
}

function evaluateReleaseCadence(releases: number | Unavailable, windowDays: ActivityWindowDays): number {
  if (releases === 'unavailable') return 0
  const annualizedReleases = releases * (365 / windowDays)
  // Linear approximation pending calibration data for release rates
  if (annualizedReleases >= 12) return 99
  if (annualizedReleases <= 0) return 0
  if (annualizedReleases >= 4) return Math.round(50 + ((annualizedReleases - 4) / 8) * 49)
  return Math.round((annualizedReleases / 4) * 50)
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
  if (value === 'unavailable') return '—'
  return `${(value * 100).toFixed(1)}%`
}

export function formatHours(value: number | Unavailable) {
  if (value === 'unavailable') return '—'
  if (value < 24) return `${value.toFixed(1)}h`
  return `${(value / 24).toFixed(1)}d`
}

