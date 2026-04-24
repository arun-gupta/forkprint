import type { AnalysisResult, ContributorWindowDays, Unavailable } from '@/lib/analyzer/analysis-result'
import type { ScoreTone, ScoreValue } from '@/specs/008-metric-cards/contracts/metric-card-props'
import { MATURITY_CONFIG, type CalibrationProfile, formatPercentileLabel, getBracketLabel, getCalibrationForStars, interpolatePercentile, percentileToTone } from '@/lib/scoring/config-loader'
import { formatPercentage } from '@/lib/scoring/formatters'

export { formatPercentage }

export interface ContributorsScoreDefinition {
  value: ScoreValue
  tone: ScoreTone
  description: string
  summary: string
  percentile: number
  bracketLabel: string
  concentration: number | Unavailable
  topContributorCount: number | Unavailable
  contributorCount: number | Unavailable
  weightedFactors: Array<{
    label: string
    weightLabel: string
    description: string
    percentile?: number
  }>
  missingInputs: string[]
}

type FactorKey =
  | 'concentration'
  | 'maintainerDepth'
  | 'repeatRatio'
  | 'newInflow'
  | 'contributionBreadth'

interface ContributorsFactorDefinition {
  key: FactorKey
  label: string
  weight: number
  description: string
}

const CONTRIBUTORS_FACTORS: ContributorsFactorDefinition[] = [
  {
    key: 'concentration',
    label: 'Contributor concentration',
    weight: 40,
    description: 'Top-20% contributor commit share, scored relative to the repo\'s star bracket. Lower concentration is healthier.',
  },
  {
    key: 'maintainerDepth',
    label: 'Maintainer depth',
    weight: 15,
    description: 'Count of maintainers or owners parsed from public CODEOWNERS, MAINTAINERS, OWNERS, or GOVERNANCE files.',
  },
  {
    key: 'repeatRatio',
    label: 'Repeat-contributor ratio',
    weight: 20,
    description: 'Share of recent active contributors with more than one commit in the window.',
  },
  {
    key: 'newInflow',
    label: 'New-contributor inflow',
    weight: 10,
    description: 'Share of recent active contributors who are new to the repo. Presence is healthy; dominance is project-lifecycle sensitive.',
  },
  {
    key: 'contributionBreadth',
    label: 'Contribution breadth',
    weight: 15,
    description: 'Presence of recent commits, pull requests, and issues — a repo with all three surfaces is more broadly engaged.',
  },
]

const INSUFFICIENT_SCORE: ContributorsScoreDefinition = {
  value: 'Insufficient verified public data',
  tone: 'neutral',
  description: 'RepoPulse cannot verify enough contributor-distribution data to score contributors yet.',
  summary: 'Verified contributor-distribution inputs are incomplete.',
  percentile: 0,
  bracketLabel: '',
  concentration: 'unavailable',
  topContributorCount: 'unavailable',
  contributorCount: 'unavailable',
  weightedFactors: CONTRIBUTORS_FACTORS.map((factor) => ({
    label: factor.label,
    weightLabel: `${factor.weight}%`,
    description: factor.description,
  })),
  missingInputs: [],
}

export interface ContributorsScoreExtras {
  maintainerCount?: number | Unavailable
  newContributors?: number | Unavailable
  repeatContributors?: number | Unavailable
  activeContributors?: number | Unavailable
  commitsPresent?: boolean
  prsPresent?: boolean
  issuesPresent?: boolean
  hasFundingConfig?: AnalysisResult['hasFundingConfig']
}

function deriveExtras(result: AnalysisResult, windowDays: ContributorWindowDays = 90): ContributorsScoreExtras {
  const windowMetrics = result.contributorMetricsByWindow?.[windowDays]
  return {
    maintainerCount: result.maintainerCount,
    newContributors: windowMetrics?.newContributors ?? 'unavailable',
    repeatContributors: windowMetrics?.repeatContributors ?? 'unavailable',
    activeContributors: windowMetrics?.uniqueCommitAuthors ?? result.uniqueCommitAuthors90d,
    commitsPresent: isPositive(result.commits90d),
    prsPresent: isPositive(result.prsOpened90d) || isPositive(result.prsMerged90d),
    issuesPresent: isPositive(result.issuesOpen) || isPositive(result.issuesClosed90d),
    hasFundingConfig: result.hasFundingConfig,
  }
}

function isPositive(value: number | Unavailable | undefined): boolean {
  return typeof value === 'number' && value > 0
}

/**
 * Small additive bonus for community-signal FUNDING.yml presence (P2-F05).
 * Per research.md Q1 and FR-008: bonus-only — absence never lowers the percentile.
 * Magnitude is deliberately modest (≤3 percentile points) pending #152 calibration.
 */
function fundingBonus(hasFundingConfig: AnalysisResult['hasFundingConfig']): number {
  return hasFundingConfig === true ? 3 : 0
}

export function getContributorsScore(
  result: AnalysisResult,
  profile: CalibrationProfile = 'community',
): ContributorsScoreDefinition {
  // Age-guard (P2-F11 / #74): repos younger than the Resilience minimum age
  // render "Insufficient verified public data" rather than a penalty that
  // reflects age more than health. `ageInDays === 'unavailable'` does NOT
  // trigger the guard — absence of evidence is not evidence of youth.
  if (typeof result.ageInDays === 'number' && result.ageInDays < MATURITY_CONFIG.minimumResilienceScoringAgeDays) {
    return {
      ...INSUFFICIENT_SCORE,
      summary: `Repo is younger than the minimum age for confident Resilience scoring (${MATURITY_CONFIG.minimumResilienceScoringAgeDays} d).`,
      description: 'Too new to produce a confident Resilience score — evaluated against the age-guard rather than the contributor distribution.',
    }
  }
  return computeContributorsScore(result.commitCountsByAuthor, result.stars, deriveExtras(result), profile)
}

export function getContributorsScoreFromCommitCounts(
  commitCountsByAuthor: Record<string, number> | Unavailable,
  stars: number | Unavailable = 'unavailable',
  extras: ContributorsScoreExtras = {},
  profile: CalibrationProfile = 'community',
): ContributorsScoreDefinition {
  return computeContributorsScore(commitCountsByAuthor, stars, extras, profile)
}

function computeContributorsScore(
  commitCountsByAuthor: Record<string, number> | Unavailable,
  stars: number | Unavailable,
  extras: ContributorsScoreExtras,
  profile: CalibrationProfile,
): ContributorsScoreDefinition {
  const cal = getCalibrationForStars(stars, profile)
  const bracketLabel = getBracketLabel(stars, profile)
  const concentration = getContributionConcentrationDetails(commitCountsByAuthor)

  if (concentration === 'unavailable') {
    return INSUFFICIENT_SCORE
  }

  // Inverted: lower concentration = higher percentile (better contributor diversity)
  const concentrationPercentile = interpolatePercentile(concentration.share, cal.topContributorShare, true)

  // Prefer provided activeContributors; fall back to the commit-author set size.
  const activeContributors =
    typeof extras.activeContributors === 'number'
      ? extras.activeContributors
      : concentration.contributorCount

  const subPercentiles: Partial<Record<FactorKey, number>> = {
    concentration: concentrationPercentile,
  }

  const maintainerPercentile = evaluateMaintainerDepth(extras.maintainerCount)
  if (maintainerPercentile !== undefined) subPercentiles.maintainerDepth = maintainerPercentile

  const repeatPercentile = evaluateRepeatRatio(extras.repeatContributors, activeContributors)
  if (repeatPercentile !== undefined) subPercentiles.repeatRatio = repeatPercentile

  const newInflowPercentile = evaluateNewInflow(extras.newContributors, activeContributors)
  if (newInflowPercentile !== undefined) subPercentiles.newInflow = newInflowPercentile

  const breadthPercentile = evaluateContributionBreadth(extras)
  if (breadthPercentile !== undefined) subPercentiles.contributionBreadth = breadthPercentile

  // Weighted composite — renormalize across available factors so 'unavailable'
  // is excluded (not counted as zero), per issue #184 acceptance criteria.
  let totalWeight = 0
  let weightedSum = 0
  for (const factor of CONTRIBUTORS_FACTORS) {
    const p = subPercentiles[factor.key]
    if (p === undefined) continue
    totalWeight += factor.weight
    weightedSum += p * factor.weight
  }
  const compositePercentile = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : concentrationPercentile

  const percentile = Math.min(99, Math.max(0, compositePercentile + fundingBonus(extras.hasFundingConfig)))

  const missingInputs = getMissingInputs(extras)

  return {
    value: percentile,
    tone: percentileToTone(percentile),
    description: `Contributors rank at the ${formatPercentileLabel(percentile)} among ${bracketLabel} repositories.`,
    summary: `Contributors combines contributor concentration, maintainer depth, repeat and new-contributor signals, and contribution breadth, scored relative to ${bracketLabel} repositories.`,
    percentile,
    bracketLabel,
    concentration: concentration.share,
    topContributorCount: concentration.topContributorCount,
    contributorCount: concentration.contributorCount,
    weightedFactors: CONTRIBUTORS_FACTORS.map((factor) => ({
      label: factor.label,
      weightLabel: `${factor.weight}%`,
      description: factor.description,
      percentile: subPercentiles[factor.key],
    })),
    missingInputs,
  }
}

function getMissingInputs(extras: ContributorsScoreExtras): string[] {
  const missing: string[] = []
  if (extras.maintainerCount === 'unavailable' || extras.maintainerCount === undefined) {
    missing.push('Maintainer count')
  }
  if (extras.repeatContributors === 'unavailable' || extras.repeatContributors === undefined) {
    missing.push('Repeat contributors')
  }
  if (extras.newContributors === 'unavailable' || extras.newContributors === undefined) {
    missing.push('New contributors')
  }
  return missing
}

/**
 * Maintainer depth heuristic (pending #152 calibration).
 * Approximates a percentile from raw count: 0 → 0, 1 → 25, 2 → 45,
 * 3–4 → 60, 5–9 → 78, 10+ → 92. Monotonic-increasing and bounded at 99.
 */
function evaluateMaintainerDepth(maintainerCount: number | Unavailable | undefined): number | undefined {
  if (maintainerCount === 'unavailable' || maintainerCount === undefined) return undefined
  if (maintainerCount <= 0) return 0
  if (maintainerCount === 1) return 25
  if (maintainerCount === 2) return 45
  if (maintainerCount <= 4) return 60
  if (maintainerCount <= 9) return 78
  return 92
}

function evaluateRepeatRatio(
  repeatContributors: number | Unavailable | undefined,
  activeContributors: number | Unavailable | undefined,
): number | undefined {
  if (repeatContributors === 'unavailable' || repeatContributors === undefined) return undefined
  if (activeContributors === 'unavailable' || activeContributors === undefined) return undefined
  if (activeContributors <= 0) return 0
  const ratio = Math.min(1, repeatContributors / activeContributors)
  // Linear approximation pending calibration data. 0 → 0, 0.5 → 50, 1 → 99.
  return Math.round(ratio * 99)
}

/**
 * New-contributor inflow is project-lifecycle sensitive: both "no new contributors"
 * and "100% new contributors" are weaker signals than a healthy mix. Peak at ~40%
 * new (fresh inflow + returning base), drop off on either side.
 */
function evaluateNewInflow(
  newContributors: number | Unavailable | undefined,
  activeContributors: number | Unavailable | undefined,
): number | undefined {
  if (newContributors === 'unavailable' || newContributors === undefined) return undefined
  if (activeContributors === 'unavailable' || activeContributors === undefined) return undefined
  if (activeContributors <= 0) return 0
  const ratio = Math.min(1, newContributors / activeContributors)
  // Triangular curve: peak 80 at ratio 0.4, 40 at 0, 40 at 1.
  if (ratio <= 0.4) return Math.round(40 + (ratio / 0.4) * 40)
  return Math.round(80 - ((ratio - 0.4) / 0.6) * 40)
}

function evaluateContributionBreadth(extras: ContributorsScoreExtras): number | undefined {
  // Presence bonus — only emit when at least one signal is verifiably observed.
  const signals = [extras.commitsPresent, extras.prsPresent, extras.issuesPresent]
  if (signals.every((s) => s === undefined)) return undefined
  const presentCount = signals.filter(Boolean).length
  if (presentCount === 0) return 0
  if (presentCount === 1) return 33
  if (presentCount === 2) return 66
  return 99
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

