import type { SecurityResult, SecurityScoreDefinition, SecurityRecommendation, DirectSecurityCheck } from './analysis-result'
import type { Unavailable } from '@/lib/analyzer/analysis-result'
import { type CalibrationProfile, getBracketLabel, getCalibrationForStars, interpolatePercentile, percentileToTone, type PercentileSet } from '@/lib/scoring/config-loader'
import { getCatalogEntry, CATEGORY_DEFINITIONS } from './recommendation-catalog'

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

const RISK_LEVEL_ORDER: Record<string, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
}

function getCategoryOrder(key: string): number {
  const def = CATEGORY_DEFINITIONS.find((c) => c.key === key)
  return def ? def.order : 99
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
      const entry = getCatalogEntry(check.name)
      if (entry) {
        recs.push({
          bucket: 'security',
          category: 'direct_check',
          item: check.name,
          weight,
          text: `${entry.title}: ${entry.remediation}`,
          title: entry.title,
          riskLevel: entry.riskLevel,
          evidence: `${check.name} not detected`,
          explanation: entry.whyItMatters,
          remediationHint: entry.remediationHint,
          docsUrl: entry.docsUrl,
          groupCategory: entry.groupCategory,
        })
      }
    }
  }

  return recs
}

export function getSecurityScore(
  securityResult: SecurityResult,
  stars: number | Unavailable,
  profile: CalibrationProfile = 'community',
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

  // Generate scorecard-based recommendations for any check below 10
  if (hasScorecardData) {
    const scorecard = securityResult.scorecard as Exclude<typeof securityResult.scorecard, 'unavailable'>
    for (const check of scorecard.checks) {
      // Skip indeterminate (-1) and perfect scores (10)
      if (check.score < 0 || check.score >= 10) continue
      const entry = getCatalogEntry(check.name)
      if (!entry) continue
      // Category promotion: Critical/High risk + score 0-4 → critical_issues
      const effectiveCategory = (entry.riskLevel === 'Critical' || entry.riskLevel === 'High') && check.score <= 4
        ? 'critical_issues' as const
        : entry.groupCategory
      recommendations.push({
        bucket: 'security',
        category: 'scorecard',
        item: check.name,
        weight: SCORECARD_WEIGHT * 0.1,
        text: `${entry.title}: ${entry.remediation}`,
        title: entry.title,
        riskLevel: entry.riskLevel,
        evidence: `${check.name} scored ${check.score}/10`,
        explanation: entry.whyItMatters,
        remediationHint: entry.remediationHint,
        docsUrl: entry.docsUrl,
        groupCategory: effectiveCategory,
      })
    }
  }

  // Deduplication: suppress direct-check recs when a Scorecard rec covers the same concern
  const scorecardCoveredDirectChecks = new Set<string>()
  for (const rec of recommendations) {
    if (rec.category === 'scorecard') {
      const entry = getCatalogEntry(rec.item)
      if (entry?.directCheckMapping) {
        scorecardCoveredDirectChecks.add(entry.directCheckMapping)
      }
    }
  }
  const deduplicatedRecs = recommendations.filter((rec) => {
    if (rec.category === 'direct_check' && scorecardCoveredDirectChecks.has(rec.item)) {
      // Append "Also confirmed by direct repository check" to the Scorecard version's evidence
      const scorecardRec = recommendations.find(
        (r) => r.category === 'scorecard' && getCatalogEntry(r.item)?.directCheckMapping === rec.item,
      )
      if (scorecardRec && scorecardRec.evidence && !scorecardRec.evidence.includes('Also confirmed')) {
        scorecardRec.evidence += '. Also confirmed by direct repository check'
      }
      return false
    }
    return true
  })

  // Sort by category order, then risk level severity, then weight descending
  deduplicatedRecs.sort((a, b) => {
    const catOrderA = getCategoryOrder(a.groupCategory ?? '')
    const catOrderB = getCategoryOrder(b.groupCategory ?? '')
    if (catOrderA !== catOrderB) return catOrderA - catOrderB
    const riskA = RISK_LEVEL_ORDER[a.riskLevel ?? ''] ?? 99
    const riskB = RISK_LEVEL_ORDER[b.riskLevel ?? ''] ?? 99
    if (riskA !== riskB) return riskA - riskB
    return b.weight - a.weight
  })

  // Compute percentile from calibration
  let percentile: number | null = null
  let bracketLabel: string | null = null

  if (stars !== 'unavailable') {
    const cal = getCalibrationForStars(stars, profile)
    bracketLabel = getBracketLabel(stars, profile)
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
    recommendations: deduplicatedRecs,
  }
}
