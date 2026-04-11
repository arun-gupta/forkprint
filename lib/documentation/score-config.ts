import type { DocumentationResult } from '@/lib/analyzer/analysis-result'
import { getBracketLabel, getCalibrationForStars, interpolatePercentile, percentileToTone } from '@/lib/scoring/config-loader'
import type { ScoreTone } from '@/specs/008-metric-cards/contracts/metric-card-props'

export interface DocumentationRecommendation {
  bucket: 'documentation'
  category: 'file' | 'readme_section'
  item: string
  weight: number
  text: string
}

export interface DocumentationScoreDefinition {
  value: number | 'Insufficient verified public data'
  tone: ScoreTone
  percentile: number | null
  bracketLabel: string | null
  compositeScore: number
  filePresenceScore: number
  readmeQualityScore: number
  recommendations: DocumentationRecommendation[]
}

const FILE_WEIGHTS: Record<string, number> = {
  readme: 0.25,
  license: 0.20,
  contributing: 0.15,
  code_of_conduct: 0.10,
  security: 0.15,
  changelog: 0.15,
}

const FILE_RECOMMENDATIONS: Record<string, string> = {
  readme: 'Add a README to help users understand what this project does and how to use it',
  license: 'Add a license file to clarify how others can use, modify, and distribute this project',
  contributing: 'Add contributing guidelines to help new contributors understand how to participate',
  code_of_conduct: 'Add a code of conduct to set expectations for community interaction',
  security: 'Add a security policy with vulnerability reporting instructions so users know how to disclose issues responsibly',
  changelog: 'Add a changelog to help users understand what changed between releases',
}

const SECTION_WEIGHTS: Record<string, number> = {
  description: 0.25,
  installation: 0.25,
  usage: 0.25,
  contributing: 0.15,
  license: 0.10,
}

const SECTION_RECOMMENDATIONS: Record<string, string> = {
  description: 'Add a project description or overview section to your README',
  installation: 'Add installation or setup instructions to your README',
  usage: 'Add usage examples to your README so users can get started quickly',
  contributing: 'Add a contributing section to your README or link to CONTRIBUTING.md',
  license: 'Add a license section or badge to your README',
}

export function getDocumentationScore(
  docResult: DocumentationResult,
  stars: number | 'unavailable',
): DocumentationScoreDefinition {
  const recommendations: DocumentationRecommendation[] = []

  // File presence sub-score (60%)
  let filePresenceScore = 0
  for (const check of docResult.fileChecks) {
    const weight = FILE_WEIGHTS[check.name] ?? 0
    if (check.found) {
      filePresenceScore += weight
    } else {
      recommendations.push({
        bucket: 'documentation',
        category: 'file',
        item: check.name,
        weight: weight * 0.6, // effective weight in composite
        text: FILE_RECOMMENDATIONS[check.name] ?? `Add ${check.name}`,
      })
    }
  }

  // README quality sub-score (40%)
  let readmeQualityScore = 0
  for (const section of docResult.readmeSections) {
    const weight = SECTION_WEIGHTS[section.name] ?? 0
    if (section.detected) {
      readmeQualityScore += weight
    } else {
      recommendations.push({
        bucket: 'documentation',
        category: 'readme_section',
        item: section.name,
        weight: weight * 0.4, // effective weight in composite
        text: SECTION_RECOMMENDATIONS[section.name] ?? `Add ${section.name} section to your README`,
      })
    }
  }

  const compositeScore = filePresenceScore * 0.6 + readmeQualityScore * 0.4

  // Sort recommendations by weight descending
  recommendations.sort((a, b) => b.weight - a.weight)

  // Percentile ranking
  if (stars === 'unavailable') {
    return {
      value: 'Insufficient verified public data',
      tone: 'neutral',
      percentile: null,
      bracketLabel: null,
      compositeScore,
      filePresenceScore,
      readmeQualityScore,
      recommendations,
    }
  }

  const calibration = getCalibrationForStars(stars)
  const percentile = calibration?.documentationScore
    ? interpolatePercentile(compositeScore, calibration.documentationScore)
    : Math.round(compositeScore * 99)
  const tone = percentileToTone(percentile)
  const bracketLabel = getBracketLabel(stars)

  return {
    value: percentile,
    tone,
    percentile,
    bracketLabel,
    compositeScore,
    filePresenceScore,
    readmeQualityScore,
    recommendations,
  }
}
