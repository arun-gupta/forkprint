import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { getActivityScore, type ActivityScoreDefinition } from '@/lib/activity/score-config'
import { getResponsivenessScore, type ResponsivenessScoreDefinition } from '@/lib/responsiveness/score-config'
import { getContributorsScore, type ContributorsScoreDefinition } from '@/lib/contributors/score-config'
import { getDocumentationScore } from '@/lib/documentation/score-config'
import { getSecurityScore } from '@/lib/security/score-config'
import { RECOMMENDATION_PERCENTILE_GATE, formatPercentileLabel, formatPercentileOrdinal, percentileToTone } from '@/lib/scoring/config-loader'
import { SOLO_WEIGHTS, detectSoloProjectProfile, type SoloProjectDetection } from '@/lib/scoring/solo-profile'
import { generateReleaseHealthRecommendations } from '@/lib/release-health/recommendations'
import type { ScoreTone } from '@/specs/008-metric-cards/contracts/metric-card-props'

export interface HealthScoreRecommendation {
  bucket: string
  /** Stable catalog key for reference ID lookup (e.g. "pr_flow", "file:readme") */
  key: string
  percentile: number
  message: string
  tab: 'activity' | 'responsiveness' | 'contributors' | 'documentation' | 'security'
}

export type HealthScoreProfile = 'community' | 'solo'

export interface HealthScoreBucket {
  name: string
  percentile: number | null
  weight: number
  label: string
  hidden?: boolean
}

export interface HealthScoreDefinition {
  percentile: number | null
  label: string
  tone: ScoreTone
  bracketLabel: string
  buckets: HealthScoreBucket[]
  recommendations: HealthScoreRecommendation[]
  profile: HealthScoreProfile
  soloDetection: SoloProjectDetection
}

export const WEIGHTS = {
  activity: 0.25,
  responsiveness: 0.25,
  contributors: 0.23,
  documentation: 0.12,
  security: 0.15,
} as const

export interface HealthScoreOptions {
  /**
   * 'auto' (default) — classify via detectSoloProjectProfile
   * 'community' — force community weights (user override)
   * 'solo' — force solo weights (user override)
   */
  mode?: 'auto' | HealthScoreProfile
}

export function getHealthScore(result: AnalysisResult, options: HealthScoreOptions = {}): HealthScoreDefinition {
  const soloDetection = detectSoloProjectProfile(result)
  const profile: HealthScoreProfile = options.mode === 'solo'
    ? 'solo'
    : options.mode === 'community'
      ? 'community'
      : soloDetection.isSolo ? 'solo' : 'community'

  const activity = getActivityScore(result, 90, profile)
  // Responsiveness and Contributors remain community-calibrated — solo profile
  // hides those buckets from the scorecard, so rerouting their calibration
  // would be wasted work. They still render on their own tabs at community
  // scaling, which is correct because those tabs reflect community expectations.
  const responsiveness = getResponsivenessScore(result)
  const contributors = getContributorsScore(result)
  const documentation = result.documentationResult !== 'unavailable'
    ? getDocumentationScore(result.documentationResult, result.licensingResult, result.stars, result.inclusiveNamingResult, profile, result.releaseHealthResult)
    : null
  const security = result.securityResult !== 'unavailable'
    ? getSecurityScore(result.securityResult, result.stars, profile)
    : null
  const bracketLabel = activity.bracketLabel || responsiveness.bracketLabel || contributors.bracketLabel || ''

  const activityPercentile = typeof activity.value === 'number' ? activity.percentile : null
  const responsivenessPercentile = typeof responsiveness.value === 'number' ? responsiveness.percentile : null
  const contributorsPercentile = typeof contributors.value === 'number' ? contributors.percentile : null
  const documentationPercentile = documentation !== null && typeof documentation.value === 'number' ? documentation.percentile : null
  const securityPercentile = security !== null && typeof security.value === 'number' ? security.percentile : null

  // Compute weighted average from available buckets. Solo profile hides
  // Contributors and Responsiveness and re-weights the remaining three.
  const bucketValues: Array<{ percentile: number; weight: number }> = []
  const activityWeight = profile === 'solo' ? SOLO_WEIGHTS.activity : WEIGHTS.activity
  const documentationWeight = profile === 'solo' ? SOLO_WEIGHTS.documentation : WEIGHTS.documentation
  const securityWeight = profile === 'solo' ? SOLO_WEIGHTS.security : WEIGHTS.security

  if (activityPercentile !== null) bucketValues.push({ percentile: activityPercentile, weight: activityWeight })
  if (profile !== 'solo' && responsivenessPercentile !== null) bucketValues.push({ percentile: responsivenessPercentile, weight: WEIGHTS.responsiveness })
  if (profile !== 'solo' && contributorsPercentile !== null) bucketValues.push({ percentile: contributorsPercentile, weight: WEIGHTS.contributors })
  if (documentationPercentile !== null) bucketValues.push({ percentile: documentationPercentile, weight: documentationWeight })
  if (securityPercentile !== null) bucketValues.push({ percentile: securityPercentile, weight: securityWeight })

  let compositePercentile: number | null = null
  if (bucketValues.length > 0) {
    const totalWeight = bucketValues.reduce((s, b) => s + b.weight, 0)
    const weightedSum = bucketValues.reduce((s, b) => s + b.percentile * (b.weight / totalWeight), 0)
    compositePercentile = Math.min(99, Math.max(0, Math.round(weightedSum)))
  }

  // Sub-factor recommendations are gated by RECOMMENDATION_PERCENTILE_GATE
  // (issue #230): only emit when the sub-factor is below the gate so
  // top performers are not scolded. Solo profile additionally suppresses
  // Contributors and Responsiveness recommendations since those buckets
  // are hidden from the score.
  const recommendations: HealthScoreRecommendation[] = []
  if (activityPercentile !== null) {
    recommendations.push(...getActivityRecommendations(activity))
  }
  if (profile !== 'solo' && responsivenessPercentile !== null) {
    recommendations.push(...getResponsivenessRecommendations(responsiveness))
  }
  if (profile !== 'solo' && contributorsPercentile !== null) {
    recommendations.push(...getContributorsRecommendations(contributors))
  }
  if (profile !== 'solo' && result.maintainerCount === 'unavailable') {
    recommendations.push({
      bucket: 'Contributors',
      key: 'no_maintainers',
      percentile: contributorsPercentile ?? 0,
      message: 'No maintainers identified. Add a CODEOWNERS or MAINTAINERS.md file to make maintainer responsibility visible.',
      tab: 'contributors',
    })
  }
  // CTR-3 (community lens): emit when FUNDING.yml is verifiably absent.
  // 'unknown' / 'unavailable' state intentionally skipped — never guess.
  // Suppressed in solo profile — funding disclosure signals community shape.
  if (profile !== 'solo' && result.hasFundingConfig === false) {
    recommendations.push({
      bucket: 'Contributors',
      key: 'file:funding',
      percentile: contributorsPercentile ?? 0,
      message: 'Add a .github/FUNDING.yml to disclose sponsorship or funding channels.',
      tab: 'contributors',
    })
  }
  // ACT-5 (community lens): emit when GitHub Discussions is verifiably disabled.
  if (result.hasDiscussionsEnabled === false) {
    recommendations.push({
      bucket: 'Activity',
      key: 'feature:discussions_enabled',
      percentile: activityPercentile ?? 0,
      message: 'Enable GitHub Discussions to give contributors a dedicated space for long-form conversation.',
      tab: 'activity',
    })
  }
  if (documentation !== null && (documentationPercentile ?? 0) < RECOMMENDATION_PERCENTILE_GATE) {
    for (const rec of documentation.recommendations) {
      recommendations.push({
        bucket: 'Documentation',
        key: `${rec.category}:${rec.item}`,
        percentile: documentationPercentile ?? 0,
        message: rec.text,
        tab: 'documentation',
      })
    }
  }
  if (security !== null && (securityPercentile ?? 0) < RECOMMENDATION_PERCENTILE_GATE) {
    for (const rec of security.recommendations) {
      recommendations.push({
        bucket: 'Security',
        key: rec.item,
        percentile: securityPercentile ?? 0,
        message: rec.text,
        tab: 'security',
      })
    }
  }
  // Release Health recommendations (P2-F09 / #69). Gate-honoring + staleness
  // tiering is implemented inside generateReleaseHealthRecommendations.
  recommendations.push(
    ...generateReleaseHealthRecommendations(result, {
      activityPercentile: activityPercentile ?? 0,
      documentationPercentile: documentationPercentile ?? 0,
    }),
  )

  const buckets: HealthScoreBucket[] = [
    { name: 'Activity', percentile: activityPercentile, weight: activityWeight, label: activityPercentile !== null ? formatPercentileLabel(activityPercentile) : 'N/A' },
    { name: 'Responsiveness', percentile: responsivenessPercentile, weight: WEIGHTS.responsiveness, label: responsivenessPercentile !== null ? formatPercentileLabel(responsivenessPercentile) : 'N/A', hidden: profile === 'solo' },
    { name: 'Contributors', percentile: contributorsPercentile, weight: WEIGHTS.contributors, label: contributorsPercentile !== null ? formatPercentileLabel(contributorsPercentile) : 'N/A', hidden: profile === 'solo' },
    { name: 'Documentation', percentile: documentationPercentile, weight: documentationWeight, label: documentationPercentile !== null ? formatPercentileLabel(documentationPercentile) : 'N/A' },
    { name: 'Security', percentile: securityPercentile, weight: securityWeight, label: securityPercentile !== null ? formatPercentileLabel(securityPercentile) : 'N/A' },
  ]

  return {
    percentile: compositePercentile,
    label: compositePercentile !== null ? formatPercentileOrdinal(compositePercentile) : 'Insufficient data',
    tone: compositePercentile !== null ? percentileToTone(compositePercentile) : 'neutral',
    bracketLabel,
    buckets,
    recommendations,
    profile,
    soloDetection,
  }
}

function isBelowGate(percentile: number | undefined): percentile is number {
  return percentile !== undefined && percentile < RECOMMENDATION_PERCENTILE_GATE
}

export function getActivityRecommendations(score: ActivityScoreDefinition): HealthScoreRecommendation[] {
  const recs: HealthScoreRecommendation[] = []
  const factors = score.weightedFactors

  const prFlow = factors.find((f) => f.label === 'PR flow')
  if (isBelowGate(prFlow?.percentile)) {
    recs.push({ bucket: 'Activity', key: 'pr_flow', percentile: prFlow!.percentile!, message: 'Reduce PR backlog and speed up review throughput to improve merge rate.', tab: 'activity' })
  }

  const issueFlow = factors.find((f) => f.label === 'Issue flow')
  if (isBelowGate(issueFlow?.percentile)) {
    recs.push({ bucket: 'Activity', key: 'issue_flow', percentile: issueFlow!.percentile!, message: 'Triage and close stale issues to improve issue flow.', tab: 'activity' })
  }

  const completionSpeed = factors.find((f) => f.label === 'Completion speed')
  if (isBelowGate(completionSpeed?.percentile)) {
    recs.push({ bucket: 'Activity', key: 'completion_speed', percentile: completionSpeed!.percentile!, message: 'Reduce time to merge PRs and close issues to improve completion speed.', tab: 'activity' })
  }

  const sustained = factors.find((f) => f.label === 'Sustained activity')
  if (isBelowGate(sustained?.percentile)) {
    recs.push({ bucket: 'Activity', key: 'sustained_activity', percentile: sustained!.percentile!, message: 'Increase commit frequency to show sustained development momentum.', tab: 'activity' })
  }

  return recs
}

export function getResponsivenessRecommendations(score: ResponsivenessScoreDefinition): HealthScoreRecommendation[] {
  const recs: HealthScoreRecommendation[] = []
  const categories = score.weightedCategories

  const responseTime = categories.find((c) => c.label === 'Issue & PR response time')
  if (isBelowGate(responseTime?.percentile)) {
    recs.push({ bucket: 'Responsiveness', key: 'response_time', percentile: responseTime!.percentile!, message: 'Reduce issue and PR first-response times — contributors are waiting longer than most repos in this bracket.', tab: 'responsiveness' })
  }

  const resolution = categories.find((c) => c.label === 'Resolution metrics')
  if (isBelowGate(resolution?.percentile)) {
    recs.push({ bucket: 'Responsiveness', key: 'resolution', percentile: resolution!.percentile!, message: 'Speed up issue resolution and PR merge times to improve throughput.', tab: 'responsiveness' })
  }

  const backlog = categories.find((c) => c.label === 'Volume & backlog health')
  if (isBelowGate(backlog?.percentile)) {
    recs.push({ bucket: 'Responsiveness', key: 'backlog_health', percentile: backlog!.percentile!, message: 'Address stale issues and PRs to improve backlog health.', tab: 'responsiveness' })
  }

  return recs
}

export function getContributorsRecommendations(score: ContributorsScoreDefinition): HealthScoreRecommendation[] {
  const recs: HealthScoreRecommendation[] = []
  const factors = score.weightedFactors

  const concentration = factors.find((f) => f.label === 'Contributor concentration')
  if (isBelowGate(concentration?.percentile)) {
    recs.push({
      bucket: 'Contributors',
      key: 'contributor_diversity',
      percentile: concentration!.percentile!,
      message: 'Onboard more contributors to reduce single-maintainer risk. The top 20% of contributors account for a disproportionate share of commits.',
      tab: 'contributors',
    })
  }

  const maintainerDepth = factors.find((f) => f.label === 'Maintainer depth')
  if (isBelowGate(maintainerDepth?.percentile)) {
    recs.push({
      bucket: 'Contributors',
      key: 'maintainer_depth',
      percentile: maintainerDepth!.percentile!,
      message: 'Grow maintainer depth by documenting additional owners in CODEOWNERS, MAINTAINERS.md, or GOVERNANCE.md so responsibility is not concentrated in a single person.',
      tab: 'contributors',
    })
  }

  const repeatRatio = factors.find((f) => f.label === 'Repeat-contributor ratio')
  if (isBelowGate(repeatRatio?.percentile)) {
    recs.push({
      bucket: 'Contributors',
      key: 'repeat_contributor_ratio',
      percentile: repeatRatio!.percentile!,
      message: 'Invest in contributor retention — a higher share of repeat contributors signals durable engagement beyond one-time drive-bys.',
      tab: 'contributors',
    })
  }

  const newInflow = factors.find((f) => f.label === 'New-contributor inflow')
  if (isBelowGate(newInflow?.percentile)) {
    recs.push({
      bucket: 'Contributors',
      key: 'new_contributor_inflow',
      percentile: newInflow!.percentile!,
      message: 'Surface good-first-issues and contributor onboarding so new contributors keep arriving alongside the returning base.',
      tab: 'contributors',
    })
  }

  const breadth = factors.find((f) => f.label === 'Contribution breadth')
  if (isBelowGate(breadth?.percentile)) {
    recs.push({
      bucket: 'Contributors',
      key: 'contribution_breadth',
      percentile: breadth!.percentile!,
      message: 'Encourage contributions across commits, pull requests, and issues so engagement is not limited to a single surface.',
      tab: 'contributors',
    })
  }

  return recs
}
