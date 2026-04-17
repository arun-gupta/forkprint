import type { DocumentationResult, InclusiveNamingResult, LicensingResult } from '@/lib/analyzer/analysis-result'
import { getInclusiveNamingScore } from '@/lib/inclusive-naming/score-config'
import { type CalibrationProfile, getBracketLabel, getCalibrationForStars, interpolatePercentile, percentileToTone } from '@/lib/scoring/config-loader'
import type { ScoreTone } from '@/specs/008-metric-cards/contracts/metric-card-props'

export interface DocumentationRecommendation {
  bucket: 'documentation'
  category: 'file' | 'readme_section' | 'licensing' | 'inclusive_naming'
  item: string
  weight: number
  text: string
}

export type LicensingRecommendation = DocumentationRecommendation & { category: 'licensing' }

export interface DocumentationScoreDefinition {
  value: number | 'Insufficient verified public data'
  tone: ScoreTone
  percentile: number | null
  bracketLabel: string | null
  compositeScore: number
  filePresenceScore: number
  readmeQualityScore: number
  licensingScore: number
  inclusiveNamingScore: number
  recommendations: DocumentationRecommendation[]
}

const FILE_WEIGHTS: Record<string, number> = {
  readme: 0.30,
  contributing: 0.20,
  code_of_conduct: 0.10,
  security: 0.20,
  changelog: 0.20,
  // Community signals (P2-F05 / #70). Small weights per research.md Q1.
  // filePresenceScore is capped at 1.0 below, so templates act as a recovery
  // signal for repos missing existing files rather than destabilizing scores
  // for fully-documented repos.
  issue_templates: 0.05,
  pull_request_template: 0.05,
  governance: 0.05,
}

const FILE_RECOMMENDATIONS: Record<string, string> = {
  readme: 'Add a README (e.g. README.md) to help users understand what this project does and how to use it',
  license: 'Add a license file (e.g. LICENSE) to clarify how others can use, modify, and distribute this project',
  contributing: 'Add contributing guidelines (e.g. CONTRIBUTING.md) to help new contributors understand how to participate',
  code_of_conduct: 'Add a code of conduct (e.g. CODE_OF_CONDUCT.md) to set expectations for community interaction',
  security: 'Add a security policy (e.g. SECURITY.md) with vulnerability reporting instructions so users know how to disclose issues responsibly',
  changelog: 'Add a changelog (e.g. CHANGELOG.md) to help users understand what changed between releases',
  issue_templates: 'Add an issue template in .github/ISSUE_TEMPLATE/ to structure bug reports and feature requests',
  pull_request_template: 'Add a PULL_REQUEST_TEMPLATE.md to guide contributors through your PR checklist',
  governance: 'Add a governance document (e.g. GOVERNANCE.md) to describe project decision-making, maintainer roles, and escalation paths',
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

const LICENSING_WEIGHTS = {
  licensePresent: 0.40,
  osiApproved: 0.25,
  tierClassified: 0.10,
  dcoClaEnforced: 0.25,
} as const

const COMPOSITE_WEIGHTS = {
  filePresence: 0.35,
  readmeQuality: 0.30,
  licensing: 0.25,
  inclusiveNaming: 0.10,
} as const

const FALLBACK_NO_INI_WEIGHTS = {
  filePresence: 0.40,
  readmeQuality: 0.30,
  licensing: 0.30,
} as const

const FALLBACK_NO_LICENSING_WEIGHTS = {
  filePresence: 0.60,
  readmeQuality: 0.40,
} as const

export function getLicensingScore(licensingResult: LicensingResult): {
  score: number
  recommendations: LicensingRecommendation[]
} {
  const recommendations: LicensingRecommendation[] = []
  let score = 0

  const { license, additionalLicenses, contributorAgreement } = licensingResult

  // For scoring, consider all licenses (primary + additional)
  const allLicenses = [license, ...additionalLicenses]
  const anyOsiApproved = allLicenses.some((l) => l.osiApproved)
  const anyTierClassified = allLicenses.some((l) => l.permissivenessTier !== null)

  // License present
  if (license.spdxId && license.spdxId !== 'NOASSERTION') {
    score += LICENSING_WEIGHTS.licensePresent
  } else if (license.spdxId === 'NOASSERTION') {
    score += LICENSING_WEIGHTS.licensePresent * 0.3
    recommendations.push({
      bucket: 'documentation',
      category: 'licensing',
      item: 'osi_license',
      weight: LICENSING_WEIGHTS.osiApproved * COMPOSITE_WEIGHTS.licensing,
      text: 'Use a standard OSI-approved license with a recognized SPDX identifier for machine-readable license detection',
    })
  } else {
    recommendations.push({
      bucket: 'documentation',
      category: 'licensing',
      item: 'license',
      weight: LICENSING_WEIGHTS.licensePresent * COMPOSITE_WEIGHTS.licensing,
      text: 'Add an open source license to clarify how others can use, modify, and distribute this project',
    })
  }

  // OSI approved — any license being OSI-approved counts
  if (anyOsiApproved) {
    score += LICENSING_WEIGHTS.osiApproved
  } else if (license.spdxId && license.spdxId !== 'NOASSERTION') {
    recommendations.push({
      bucket: 'documentation',
      category: 'licensing',
      item: 'osi_license',
      weight: LICENSING_WEIGHTS.osiApproved * COMPOSITE_WEIGHTS.licensing,
      text: 'Consider adopting an OSI-approved license for broader compatibility and trust',
    })
  }

  // Tier classified — any license being classified counts
  if (anyTierClassified) {
    score += LICENSING_WEIGHTS.tierClassified
  }

  // DCO/CLA enforced
  if (contributorAgreement.enforced) {
    score += LICENSING_WEIGHTS.dcoClaEnforced
  } else {
    recommendations.push({
      bucket: 'documentation',
      category: 'licensing',
      item: 'dco_cla',
      weight: LICENSING_WEIGHTS.dcoClaEnforced * COMPOSITE_WEIGHTS.licensing,
      text: 'Consider enforcing a Developer Certificate of Origin (DCO) or Contributor License Agreement (CLA) to ensure contributions are legally vetted',
    })
  }

  return { score, recommendations }
}

export function getDocumentationScore(
  docResult: DocumentationResult,
  licensingResult: LicensingResult | 'unavailable',
  stars: number | 'unavailable',
  inclusiveNamingResult?: InclusiveNamingResult | 'unavailable',
  profile: CalibrationProfile = 'community',
): DocumentationScoreDefinition {
  const recommendations: DocumentationRecommendation[] = []

  // File presence sub-score — license file excluded from scoring (scored in licensing sub-score).
  // Weights sum to 1.10 (5 traditional files + 2 community templates) and the sum is capped at
  // 1.0, so community-template weights are additive recovery signals that do not destabilize
  // scores for fully-documented repositories (research.md Q1).
  let filePresenceScore = 0
  for (const check of docResult.fileChecks) {
    if (check.name === 'license') continue
    const weight = FILE_WEIGHTS[check.name] ?? 0
    if (check.found) {
      filePresenceScore += weight
    } else {
      recommendations.push({
        bucket: 'documentation',
        category: 'file',
        item: check.name,
        weight: weight * COMPOSITE_WEIGHTS.filePresence,
        text: FILE_RECOMMENDATIONS[check.name] ?? `Add ${check.name}`,
      })
    }
  }
  if (filePresenceScore > 1) filePresenceScore = 1

  // README quality sub-score
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
        weight: weight * COMPOSITE_WEIGHTS.readmeQuality,
        text: SECTION_RECOMMENDATIONS[section.name] ?? `Add ${section.name} section to your README`,
      })
    }
  }

  // Licensing sub-score
  let licensingScore = 0
  if (licensingResult !== 'unavailable') {
    const licensing = getLicensingScore(licensingResult)
    licensingScore = licensing.score
    recommendations.push(...licensing.recommendations)
  }

  // Inclusive naming sub-score
  let inclusiveNamingScore = 0
  const hasInclusiveNaming = inclusiveNamingResult != null && inclusiveNamingResult !== 'unavailable'
  if (hasInclusiveNaming) {
    const iniScore = getInclusiveNamingScore(inclusiveNamingResult)
    inclusiveNamingScore = iniScore.compositeScore
    for (const rec of iniScore.recommendations) {
      recommendations.push({
        bucket: 'documentation',
        category: 'inclusive_naming',
        item: rec.item,
        weight: rec.weight,
        text: rec.text,
      })
    }
  }

  // Composite score — four-part, three-part, or two-part fallback
  let compositeScore: number
  const hasLicensing = licensingResult !== 'unavailable'
  if (hasLicensing && hasInclusiveNaming) {
    compositeScore =
      filePresenceScore * COMPOSITE_WEIGHTS.filePresence +
      readmeQualityScore * COMPOSITE_WEIGHTS.readmeQuality +
      licensingScore * COMPOSITE_WEIGHTS.licensing +
      inclusiveNamingScore * COMPOSITE_WEIGHTS.inclusiveNaming
  } else if (hasLicensing) {
    compositeScore =
      filePresenceScore * FALLBACK_NO_INI_WEIGHTS.filePresence +
      readmeQualityScore * FALLBACK_NO_INI_WEIGHTS.readmeQuality +
      licensingScore * FALLBACK_NO_INI_WEIGHTS.licensing
  } else {
    compositeScore =
      filePresenceScore * FALLBACK_NO_LICENSING_WEIGHTS.filePresence +
      readmeQualityScore * FALLBACK_NO_LICENSING_WEIGHTS.readmeQuality
  }

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
      licensingScore,
      inclusiveNamingScore,
      recommendations,
    }
  }

  const calibration = getCalibrationForStars(stars, profile)
  const percentile = calibration?.documentationScore
    ? interpolatePercentile(compositeScore, calibration.documentationScore)
    : Math.round(compositeScore * 99)
  const tone = percentileToTone(percentile)
  const bracketLabel = getBracketLabel(stars, profile)

  return {
    value: percentile,
    tone,
    percentile,
    bracketLabel,
    compositeScore,
    filePresenceScore,
    readmeQualityScore,
    licensingScore,
    inclusiveNamingScore,
    recommendations,
  }
}
