import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { getActivityScore, type ActivityScoreDefinition } from '@/lib/activity/score-config'
import { getResponsivenessScore, type ResponsivenessScoreDefinition } from '@/lib/responsiveness/score-config'
import { getSustainabilityScore, type SustainabilityScoreDefinition } from '@/lib/contributors/score-config'
import { getDocumentationScore, type DocumentationRecommendation } from '@/lib/documentation/score-config'
import { formatPercentileLabel, formatPercentileOrdinal, getBracketLabel, percentileToTone } from '@/lib/scoring/config-loader'
import type { ScoreTone } from '@/specs/008-metric-cards/contracts/metric-card-props'

export interface HealthScoreRecommendation {
  bucket: string
  percentile: number
  message: string
  tab: 'activity' | 'responsiveness' | 'contributors' | 'documentation'
}

export interface HealthScoreDefinition {
  percentile: number | null
  label: string
  tone: ScoreTone
  bracketLabel: string
  buckets: Array<{
    name: string
    percentile: number | null
    weight: number
    label: string
  }>
  recommendations: HealthScoreRecommendation[]
}

const WEIGHTS = {
  activity: 0.30,
  responsiveness: 0.30,
  sustainability: 0.25,
  documentation: 0.15,
} as const

export function getHealthScore(result: AnalysisResult): HealthScoreDefinition {
  const activity = getActivityScore(result)
  const responsiveness = getResponsivenessScore(result)
  const sustainability = getSustainabilityScore(result)
  const documentation = result.documentationResult !== 'unavailable'
    ? getDocumentationScore(result.documentationResult, result.licensingResult, result.stars)
    : null
  const bracketLabel = activity.bracketLabel || responsiveness.bracketLabel || sustainability.bracketLabel || ''

  const activityPercentile = typeof activity.value === 'number' ? activity.percentile : null
  const responsivenessPercentile = typeof responsiveness.value === 'number' ? responsiveness.percentile : null
  const sustainabilityPercentile = typeof sustainability.value === 'number' ? sustainability.percentile : null
  const documentationPercentile = documentation !== null && typeof documentation.value === 'number' ? documentation.percentile : null

  // Compute weighted average from available buckets
  const bucketValues: Array<{ percentile: number; weight: number }> = []
  if (activityPercentile !== null) bucketValues.push({ percentile: activityPercentile, weight: WEIGHTS.activity })
  if (responsivenessPercentile !== null) bucketValues.push({ percentile: responsivenessPercentile, weight: WEIGHTS.responsiveness })
  if (sustainabilityPercentile !== null) bucketValues.push({ percentile: sustainabilityPercentile, weight: WEIGHTS.sustainability })
  if (documentationPercentile !== null) bucketValues.push({ percentile: documentationPercentile, weight: WEIGHTS.documentation })

  let compositePercentile: number | null = null
  if (bucketValues.length > 0) {
    const totalWeight = bucketValues.reduce((s, b) => s + b.weight, 0)
    const weightedSum = bucketValues.reduce((s, b) => s + b.percentile * (b.weight / totalWeight), 0)
    compositePercentile = Math.min(99, Math.max(0, Math.round(weightedSum)))
  }

  // Generate recommendations for all buckets — no percentile gate
  const recommendations: HealthScoreRecommendation[] = []
  if (activityPercentile !== null) {
    recommendations.push(...getActivityRecommendations(activity))
  }
  if (responsivenessPercentile !== null) {
    recommendations.push(...getResponsivenessRecommendations(responsiveness))
  }
  if (sustainabilityPercentile !== null) {
    recommendations.push({
      bucket: 'Sustainability',
      percentile: sustainabilityPercentile,
      message: 'Onboard more contributors to reduce single-maintainer risk. The top 20% of contributors account for a disproportionate share of commits.',
      tab: 'contributors',
    })
  }
  if (result.maintainerCount === 'unavailable') {
    recommendations.push({
      bucket: 'Sustainability',
      percentile: sustainabilityPercentile ?? 0,
      message: 'No maintainers identified. Add a CODEOWNERS or MAINTAINERS.md file to make maintainer responsibility visible.',
      tab: 'contributors',
    })
  }
  if (documentation !== null) {
    for (const rec of documentation.recommendations) {
      recommendations.push({
        bucket: 'Documentation',
        percentile: documentationPercentile ?? 0,
        message: rec.text,
        tab: 'documentation',
      })
    }
  }

  return {
    percentile: compositePercentile,
    label: compositePercentile !== null ? formatPercentileOrdinal(compositePercentile) : 'Insufficient data',
    tone: compositePercentile !== null ? percentileToTone(compositePercentile) : 'neutral',
    bracketLabel,
    buckets: [
      { name: 'Activity', percentile: activityPercentile, weight: WEIGHTS.activity, label: activityPercentile !== null ? formatPercentileLabel(activityPercentile) : 'N/A' },
      { name: 'Responsiveness', percentile: responsivenessPercentile, weight: WEIGHTS.responsiveness, label: responsivenessPercentile !== null ? formatPercentileLabel(responsivenessPercentile) : 'N/A' },
      { name: 'Sustainability', percentile: sustainabilityPercentile, weight: WEIGHTS.sustainability, label: sustainabilityPercentile !== null ? formatPercentileLabel(sustainabilityPercentile) : 'N/A' },
      { name: 'Documentation', percentile: documentationPercentile, weight: WEIGHTS.documentation, label: documentationPercentile !== null ? formatPercentileLabel(documentationPercentile) : 'N/A' },
    ],
    recommendations,
  }
}

function getActivityRecommendations(score: ActivityScoreDefinition): HealthScoreRecommendation[] {
  const recs: HealthScoreRecommendation[] = []
  const factors = score.weightedFactors

  const prFlow = factors.find((f) => f.label === 'PR flow')
  if (prFlow?.percentile !== undefined) {
    recs.push({ bucket: 'Activity', percentile: prFlow.percentile, message: 'Reduce PR backlog and speed up review throughput to improve merge rate.', tab: 'activity' })
  }

  const issueFlow = factors.find((f) => f.label === 'Issue flow')
  if (issueFlow?.percentile !== undefined) {
    recs.push({ bucket: 'Activity', percentile: issueFlow.percentile, message: 'Triage and close stale issues to improve issue flow.', tab: 'activity' })
  }

  const completionSpeed = factors.find((f) => f.label === 'Completion speed')
  if (completionSpeed?.percentile !== undefined) {
    recs.push({ bucket: 'Activity', percentile: completionSpeed.percentile, message: 'Reduce time to merge PRs and close issues to improve completion speed.', tab: 'activity' })
  }

  const sustained = factors.find((f) => f.label === 'Sustained activity')
  if (sustained?.percentile !== undefined) {
    recs.push({ bucket: 'Activity', percentile: sustained.percentile, message: 'Increase commit frequency to show sustained development momentum.', tab: 'activity' })
  }

  return recs
}

function getResponsivenessRecommendations(score: ResponsivenessScoreDefinition): HealthScoreRecommendation[] {
  const recs: HealthScoreRecommendation[] = []
  const categories = score.weightedCategories

  const responseTime = categories.find((c) => c.label === 'Issue & PR response time')
  if (responseTime?.percentile !== undefined) {
    recs.push({ bucket: 'Responsiveness', percentile: responseTime.percentile, message: 'Reduce issue and PR first-response times — contributors are waiting longer than most repos in this bracket.', tab: 'responsiveness' })
  }

  const resolution = categories.find((c) => c.label === 'Resolution metrics')
  if (resolution?.percentile !== undefined) {
    recs.push({ bucket: 'Responsiveness', percentile: resolution.percentile, message: 'Speed up issue resolution and PR merge times to improve throughput.', tab: 'responsiveness' })
  }

  const backlog = categories.find((c) => c.label === 'Volume & backlog health')
  if (backlog?.percentile !== undefined) {
    recs.push({ bucket: 'Responsiveness', percentile: backlog.percentile, message: 'Address stale issues and PRs to improve backlog health.', tab: 'responsiveness' })
  }

  return recs
}
