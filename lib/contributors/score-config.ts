import type { AnalysisResult, Unavailable } from '@/lib/analyzer/analysis-result'
import type { ScoreTone, ScoreValue } from '@/specs/008-metric-cards/contracts/metric-card-props'
import { formatPercentileLabel, getBracketLabel, getCalibrationForStars, interpolatePercentile, percentileToTone } from '@/lib/scoring/config-loader'

export interface ContributorsScoreDefinition {
  value: ScoreValue
  tone: ScoreTone
  description: string
  percentile: number
  bracketLabel: string
  concentration: number | Unavailable
  topContributorCount: number | Unavailable
  contributorCount: number | Unavailable
}

const INSUFFICIENT_SCORE: ContributorsScoreDefinition = {
  value: 'Insufficient verified public data',
  tone: 'neutral',
  description: 'RepoPulse cannot verify enough contributor-distribution data to score contributors yet.',
  percentile: 0,
  bracketLabel: '',
  concentration: 'unavailable',
  topContributorCount: 'unavailable',
  contributorCount: 'unavailable',
}

export function getContributorsScore(result: AnalysisResult): ContributorsScoreDefinition {
  const cal = getCalibrationForStars(result.stars)
  const bracketLabel = getBracketLabel(result.stars)
  const concentration = getContributionConcentrationDetails(result.commitCountsByAuthor)

  if (concentration === 'unavailable') {
    return INSUFFICIENT_SCORE
  }

  // Inverted: lower concentration = higher percentile (better contributor diversity)
  const percentile = interpolatePercentile(concentration.share, cal.topContributorShare, true)

  return {
    value: percentile,
    tone: percentileToTone(percentile),
    description: `Contributor concentration ranks at the ${formatPercentileLabel(percentile)} percentile among ${bracketLabel} repositories.`,
    percentile,
    bracketLabel,
    concentration: concentration.share,
    topContributorCount: concentration.topContributorCount,
    contributorCount: concentration.contributorCount,
  }
}

export function getContributorsScoreFromCommitCounts(
  commitCountsByAuthor: Record<string, number> | Unavailable,
  stars: number | Unavailable = 'unavailable',
): ContributorsScoreDefinition {
  const cal = getCalibrationForStars(stars)
  const bracketLabel = getBracketLabel(stars)
  const concentration = getContributionConcentrationDetails(commitCountsByAuthor)

  if (concentration === 'unavailable') {
    return INSUFFICIENT_SCORE
  }

  const percentile = interpolatePercentile(concentration.share, cal.topContributorShare, true)

  return {
    value: percentile,
    tone: percentileToTone(percentile),
    description: `Contributor concentration ranks at the ${formatPercentileLabel(percentile)} percentile among ${bracketLabel} repositories.`,
    percentile,
    bracketLabel,
    concentration: concentration.share,
    topContributorCount: concentration.topContributorCount,
    contributorCount: concentration.contributorCount,
  }
}

export function computeContributionConcentration(
  commitCountsByAuthor: Record<string, number> | Unavailable,
): number | Unavailable {
  const details = getContributionConcentrationDetails(commitCountsByAuthor)
  if (details === 'unavailable') {
    return 'unavailable'
  }

  return details.share
}

interface ContributionConcentrationDetails {
  share: number
  topContributorCount: number
  contributorCount: number
}

function getContributionConcentrationDetails(
  commitCountsByAuthor: Record<string, number> | Unavailable,
): ContributionConcentrationDetails | Unavailable {
  if (commitCountsByAuthor === 'unavailable') {
    return 'unavailable'
  }

  const counts = Object.values(commitCountsByAuthor).filter((value) => value > 0)
  if (counts.length === 0) {
    return 'unavailable'
  }

  const sortedCounts = [...counts].sort((left, right) => right - left)
  const topContributorCount = Math.max(1, Math.ceil(sortedCounts.length * 0.2))
  const topShare = sortedCounts.slice(0, topContributorCount).reduce((sum, value) => sum + value, 0)
  const total = sortedCounts.reduce((sum, value) => sum + value, 0)

  if (total === 0) {
    return 'unavailable'
  }

  return {
    share: topShare / total,
    topContributorCount,
    contributorCount: sortedCounts.length,
  }
}

export function formatPercentage(value: number | Unavailable) {
  if (value === 'unavailable') {
    return '—'
  }

  return `${(value * 100).toFixed(1)}%`
}

