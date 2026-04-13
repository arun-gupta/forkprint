import type { SecurityResult, SecurityScoreDefinition, SecurityRecommendation, DirectSecurityCheck } from './analysis-result'
import type { Unavailable } from '@/lib/analyzer/analysis-result'
import { getBracketLabel, getCalibrationForStars, interpolatePercentile, percentileToTone, type PercentileSet } from '@/lib/scoring/config-loader'

const SCORECARD_WEIGHT = 0.60
const DIRECT_WEIGHT = 0.40

// Direct check weights when Scorecard IS available (Mode A)
const MODE_A_WEIGHTS: Record<string, number> = {
  security_policy: 0.10,
  dependabot: 0.35,
  ci_cd: 0.25,
  branch_protection: 0.30,
}

// Direct check weights when Scorecard is NOT available (Mode B)
const MODE_B_WEIGHTS: Record<string, number> = {
  security_policy: 0.30,
  dependabot: 0.30,
  ci_cd: 0.20,
  branch_protection: 0.20,
}

const RECOMMENDATION_TEXT: Record<string, string> = {
  security_policy: 'Add a SECURITY.md file with vulnerability reporting instructions to help users report security issues responsibly.',
  dependabot: 'Enable automated dependency updates (Dependabot or Renovate) to keep dependencies current and reduce vulnerability exposure.',
  ci_cd: 'Add GitHub Actions workflows for automated testing and CI/CD to catch issues before they reach production.',
  branch_protection: 'Enable branch protection rules on the default branch to enforce code review before merging.',
}

function computeDirectCheckScore(
  directChecks: DirectSecurityCheck[],
  weights: Record<string, number>,
): number {
  let score = 0
  let totalWeight = 0

  for (const check of directChecks) {
    const weight = weights[check.name] ?? 0
    if (check.detected === 'unavailable') {
      // Skip unavailable signals — don't penalize
      continue
    }
    totalWeight += weight
    if (check.detected) {
      score += weight
    }
  }

  return totalWeight > 0 ? score / totalWeight : 0
}

function generateDirectCheckRecommendations(
  directChecks: DirectSecurityCheck[],
  weights: Record<string, number>,
): SecurityRecommendation[] {
  const recs: SecurityRecommendation[] = []

  for (const check of directChecks) {
    if (check.detected === false) {
      const weight = weights[check.name] ?? 0
      const text = RECOMMENDATION_TEXT[check.name]
      if (text) {
        recs.push({
          bucket: 'security',
          category: 'direct_check',
          item: check.name,
          weight,
          text,
        })
      }
    }
  }

  return recs
}

export function getSecurityScore(
  securityResult: SecurityResult,
  stars: number | Unavailable,
): SecurityScoreDefinition {
  const hasScorecardData = securityResult.scorecard !== 'unavailable'
  const mode = hasScorecardData ? 'scorecard' as const : 'direct-only' as const
  const weights = hasScorecardData ? MODE_A_WEIGHTS : MODE_B_WEIGHTS

  // Compute direct check score
  const directCheckScore = computeDirectCheckScore(securityResult.directChecks, weights)

  // Compute scorecard score (normalized 0-1)
  let scorecardScore: number | null = null
  let compositeScore: number

  if (hasScorecardData) {
    const scorecard = securityResult.scorecard as Exclude<typeof securityResult.scorecard, 'unavailable'>
    scorecardScore = scorecard.overallScore / 10
    compositeScore = scorecardScore * SCORECARD_WEIGHT + directCheckScore * DIRECT_WEIGHT
  } else {
    compositeScore = directCheckScore
  }

  // Handle Branch-Protection fallback: if Scorecard returns -1 for Branch-Protection
  // and we have a direct query result, update the direct check accordingly
  if (hasScorecardData) {
    const scorecard = securityResult.scorecard as Exclude<typeof securityResult.scorecard, 'unavailable'>
    const bpCheck = scorecard.checks.find((c) => c.name === 'Branch-Protection')
    if (bpCheck && bpCheck.score === -1 && securityResult.branchProtectionEnabled !== 'unavailable') {
      // Scorecard couldn't determine branch protection, but our direct query did
      const bpDirectCheck = securityResult.directChecks.find((c) => c.name === 'branch_protection')
      if (bpDirectCheck && bpDirectCheck.detected !== 'unavailable') {
        // Direct check result is already populated — it will contribute to the direct score
      }
    }
  }

  // Generate recommendations
  const recommendations = generateDirectCheckRecommendations(securityResult.directChecks, weights)

  // Generate scorecard-based recommendations for low scores
  if (hasScorecardData) {
    const scorecard = securityResult.scorecard as Exclude<typeof securityResult.scorecard, 'unavailable'>
    for (const check of scorecard.checks) {
      if (check.score >= 0 && check.score <= 4) {
        recommendations.push({
          bucket: 'security',
          category: 'scorecard',
          item: check.name,
          weight: SCORECARD_WEIGHT * 0.1,
          text: `Improve ${check.name} practices: ${check.reason}`,
        })
      }
    }
  }

  // Sort recommendations by weight descending
  recommendations.sort((a, b) => b.weight - a.weight)

  // Compute percentile from calibration
  let percentile: number | null = null
  let bracketLabel: string | null = null

  if (stars !== 'unavailable') {
    const cal = getCalibrationForStars(stars)
    bracketLabel = getBracketLabel(stars)
    const secCal = (cal as unknown as Record<string, unknown>).securityScore as PercentileSet | undefined
    if (secCal) {
      percentile = interpolatePercentile(compositeScore, secCal)
    }
  }

  const tone = percentile !== null ? percentileToTone(percentile) : 'neutral'
  const value: number | 'Insufficient verified public data' = compositeScore > 0 || hasScorecardData
    ? Math.round(compositeScore * 100)
    : (securityResult.directChecks.every((c) => c.detected === 'unavailable')
        ? 'Insufficient verified public data'
        : Math.round(compositeScore * 100))

  return {
    value,
    tone,
    percentile,
    bracketLabel,
    compositeScore,
    scorecardScore,
    directCheckScore,
    mode,
    recommendations,
  }
}
