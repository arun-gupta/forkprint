import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { getActivityScore, type ActivityScoreDefinition } from '@/lib/activity/score-config'
import { getResponsivenessScore, type ResponsivenessScoreDefinition } from '@/lib/responsiveness/score-config'
import { getSustainabilityScore, type SustainabilityScoreDefinition } from '@/lib/contributors/score-config'
import { formatPercentileLabel, formatPercentileOrdinal, getBracketLabel, percentileToTone } from '@/lib/scoring/config-loader'
import type { ScoreTone } from '@/specs/008-metric-cards/contracts/metric-card-props'

export interface HealthScoreRecommendation {
  bucket: string
  percentile: number
  message: string
  tab: 'activity' | 'responsiveness' | 'contributors'
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
  activity: 0.36,
  responsiveness: 0.36,
  sustainability: 0.28,
} as const

export function getHealthScore(result: AnalysisResult): HealthScoreDefinition {
  const activity = getActivityScore(result)
  const responsiveness = getResponsivenessScore(result)
  const sustainability = getSustainabilityScore(result)
  const bracketLabel = activity.bracketLabel || responsiveness.bracketLabel || sustainability.bracketLabel || ''

  const activityPercentile = typeof activity.value === 'number' ? activity.percentile : null
  const responsivenessPercentile = typeof responsiveness.value === 'number' ? responsiveness.percentile : null
  const sustainabilityPercentile = typeof sustainability.value === 'number' ? sustainability.percentile : null

  // Compute weighted average from available buckets
  const bucketValues: Array<{ percentile: number; weight: number }> = []
  if (activityPercentile !== null) bucketValues.push({ percentile: activityPercentile, weight: WEIGHTS.activity })
  if (responsivenessPercentile !== null) bucketValues.push({ percentile: responsivenessPercentile, weight: WEIGHTS.responsiveness })
  if (sustainabilityPercentile !== null) bucketValues.push({ percentile: sustainabilityPercentile, weight: WEIGHTS.sustainability })

  let compositePercentile: number | null = null
  if (bucketValues.length > 0) {
    const totalWeight = bucketValues.reduce((s, b) => s + b.weight, 0)
    const weightedSum = bucketValues.reduce((s, b) => s + b.percentile * (b.weight / totalWeight), 0)
    compositePercentile = Math.min(99, Math.max(0, Math.round(weightedSum)))
  }

  // Generate recommendations for weak buckets
  const recommendations: HealthScoreRecommendation[] = []
  if (activityPercentile !== null && activityPercentile < 50) {
    recommendations.push(...getActivityRecommendations(activity))
  }
  if (responsivenessPercentile !== null && responsivenessPercentile < 50) {
    recommendations.push(...getResponsivenessRecommendations(responsiveness))
  }
  if (sustainabilityPercentile !== null && sustainabilityPercentile < 50) {
    recommendations.push({
      bucket: 'Sustainability',
      percentile: sustainabilityPercentile,
      message: 'Onboard more contributors to reduce single-maintainer risk. The top 20% of contributors account for a disproportionate share of commits.',
      tab: 'contributors',
    })
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
    ],
    recommendations,
  }
}

function getActivityRecommendations(score: ActivityScoreDefinition): HealthScoreRecommendation[] {
  const recs: HealthScoreRecommendation[] = []
  const factors = score.weightedFactors

  const prFlow = factors.find((f) => f.label === 'PR flow')
  if (prFlow?.percentile !== undefined && prFlow.percentile < 40) {
    recs.push({ bucket: 'Activity', percentile: prFlow.percentile, message: 'Reduce PR backlog and speed up review throughput to improve merge rate.', tab: 'activity' })
  }

  const issueFlow = factors.find((f) => f.label === 'Issue flow')
  if (issueFlow?.percentile !== undefined && issueFlow.percentile < 40) {
    recs.push({ bucket: 'Activity', percentile: issueFlow.percentile, message: 'Triage and close stale issues to improve issue flow.', tab: 'activity' })
  }

  const completionSpeed = factors.find((f) => f.label === 'Completion speed')
  if (completionSpeed?.percentile !== undefined && completionSpeed.percentile < 40) {
    recs.push({ bucket: 'Activity', percentile: completionSpeed.percentile, message: 'Reduce time to merge PRs and close issues to improve completion speed.', tab: 'activity' })
  }

  const sustained = factors.find((f) => f.label === 'Sustained activity')
  if (sustained?.percentile !== undefined && sustained.percentile < 40) {
    recs.push({ bucket: 'Activity', percentile: sustained.percentile, message: 'Increase commit frequency to show sustained development momentum.', tab: 'activity' })
  }

  if (recs.length === 0) {
    recs.push({ bucket: 'Activity', percentile: score.percentile, message: 'Overall activity is below average for repos in this bracket. Focus on PR throughput, issue triage, and commit cadence.', tab: 'activity' })
  }

  return recs
}

function getResponsivenessRecommendations(score: ResponsivenessScoreDefinition): HealthScoreRecommendation[] {
  const recs: HealthScoreRecommendation[] = []
  const categories = score.weightedCategories

  const responseTime = categories.find((c) => c.label === 'Issue & PR response time')
  if (responseTime?.percentile !== undefined && responseTime.percentile < 40) {
    recs.push({ bucket: 'Responsiveness', percentile: responseTime.percentile, message: 'Reduce issue and PR first-response times — contributors are waiting longer than most repos in this bracket.', tab: 'responsiveness' })
  }

  const resolution = categories.find((c) => c.label === 'Resolution metrics')
  if (resolution?.percentile !== undefined && resolution.percentile < 40) {
    recs.push({ bucket: 'Responsiveness', percentile: resolution.percentile, message: 'Speed up issue resolution and PR merge times to improve throughput.', tab: 'responsiveness' })
  }

  const backlog = categories.find((c) => c.label === 'Volume & backlog health')
  if (backlog?.percentile !== undefined && backlog.percentile < 40) {
    recs.push({ bucket: 'Responsiveness', percentile: backlog.percentile, message: 'Address stale issues and PRs to improve backlog health.', tab: 'responsiveness' })
  }

  if (recs.length === 0) {
    recs.push({ bucket: 'Responsiveness', percentile: score.percentile, message: 'Overall responsiveness is below average. Focus on response times and backlog management.', tab: 'responsiveness' })
  }

  return recs
}
