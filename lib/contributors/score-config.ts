import type { AnalysisResult, Unavailable } from '@/lib/analyzer/analysis-result'
import type { ScoreTone, ScoreValue } from '@/specs/008-metric-cards/contracts/metric-card-props'

export interface SustainabilityScoreDefinition {
  value: ScoreValue
  tone: ScoreTone
  description: string
  concentration: number | Unavailable
  topContributorCount: number | Unavailable
  contributorCount: number | Unavailable
}

export interface SustainabilityThreshold {
  maxTopContributorShare: number
  value: Extract<ScoreValue, 'High' | 'Medium' | 'Low'>
  tone: Exclude<ScoreTone, 'neutral'>
  description: string
}

export const SUSTAINABILITY_THRESHOLDS: SustainabilityThreshold[] = [
  {
    maxTopContributorShare: 0.5,
    value: 'High',
    tone: 'success',
    description: 'Contributor activity is broadly distributed across the most active authors.',
  },
  {
    maxTopContributorShare: 0.75,
    value: 'Medium',
    tone: 'warning',
    description: 'Contributor activity is somewhat concentrated and may indicate moderate resilience risk.',
  },
  {
    maxTopContributorShare: Number.POSITIVE_INFINITY,
    value: 'Low',
    tone: 'danger',
    description: 'Contributor activity is highly concentrated, suggesting low resilience if key authors step away.',
  },
]

const INSUFFICIENT_SCORE: SustainabilityScoreDefinition = {
  value: 'Insufficient verified public data',
  tone: 'neutral',
  description: 'RepoPulse cannot verify enough contributor-distribution data to score sustainability yet.',
  concentration: 'unavailable',
  topContributorCount: 'unavailable',
  contributorCount: 'unavailable',
}

export function getSustainabilityScore(result: AnalysisResult): SustainabilityScoreDefinition {
  return getSustainabilityScoreFromCommitCounts(result.commitCountsByAuthor)
}

export function getSustainabilityScoreFromCommitCounts(
  commitCountsByAuthor: Record<string, number> | Unavailable,
): SustainabilityScoreDefinition {
  const concentration = getContributionConcentrationDetails(commitCountsByAuthor)

  if (concentration === 'unavailable') {
    return INSUFFICIENT_SCORE
  }

  const threshold = SUSTAINABILITY_THRESHOLDS.find((candidate) => concentration.share <= candidate.maxTopContributorShare)
  if (!threshold) {
    return INSUFFICIENT_SCORE
  }

  return {
    value: threshold.value,
    tone: threshold.tone,
    description: threshold.description,
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
    return value
  }

  return `${(value * 100).toFixed(1)}%`
}
