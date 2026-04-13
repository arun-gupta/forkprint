import type { InclusiveNamingRecommendation, InclusiveNamingResult } from '@/lib/analyzer/analysis-result'
import { TIER_PENALTIES, TIER_SEVERITY_LABELS } from './word-list'

const BRANCH_WEIGHT = 0.70
const METADATA_WEIGHT = 0.30

export interface InclusiveNamingScoreResult {
  branchScore: number
  metadataScore: number
  compositeScore: number
  recommendations: InclusiveNamingRecommendation[]
}

export function getInclusiveNamingScore(result: InclusiveNamingResult): InclusiveNamingScoreResult {
  const recommendations: InclusiveNamingRecommendation[] = []

  // Branch score: binary 0 or 1
  const branchScore = result.branchCheck.passed ? 1.0 : 0.0
  if (!result.branchCheck.passed && result.branchCheck.tier !== null) {
    recommendations.push({
      bucket: 'documentation',
      category: 'inclusive_naming',
      item: `branch:${result.branchCheck.term}`,
      weight: BRANCH_WEIGHT * 0.10, // 70% of 10% doc allocation
      text: `Consider renaming your default branch from '${result.defaultBranchName}' to 'main' for inclusive naming. See https://inclusivenaming.org/ for guidance.`,
      tier: result.branchCheck.tier,
      severity: TIER_SEVERITY_LABELS[result.branchCheck.tier],
    })
  }

  // Metadata score: starts at 1.0, reduced by tier-weighted penalties
  let metadataScore = 1.0
  for (const check of result.metadataChecks) {
    if (!check.passed && check.tier !== null) {
      const penalty = TIER_PENALTIES[check.tier]
      metadataScore = Math.max(0, metadataScore - penalty)

      const replacementText = check.replacements.length > 0
        ? ` Consider using: ${check.replacements.slice(0, 3).join(', ')}.`
        : ''
      recommendations.push({
        bucket: 'documentation',
        category: 'inclusive_naming',
        item: `${check.checkType}:${check.term}`,
        weight: METADATA_WEIGHT * penalty,
        text: `${check.context ?? 'Repository metadata'} contains '${check.term}' (${TIER_SEVERITY_LABELS[check.tier]}).${replacementText} See https://inclusivenaming.org/ for guidance.`,
        tier: check.tier,
        severity: TIER_SEVERITY_LABELS[check.tier],
      })
    }
  }

  const compositeScore = branchScore * BRANCH_WEIGHT + metadataScore * METADATA_WEIGHT

  // Sort recommendations by weight descending
  recommendations.sort((a, b) => b.weight - a.weight)

  return {
    branchScore,
    metadataScore,
    compositeScore,
    recommendations,
  }
}
