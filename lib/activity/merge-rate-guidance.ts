import type { Unavailable } from '@/lib/analyzer/analysis-result'
import { formatPercentileLabel, getCalibrationForStars, interpolatePercentile, percentileToTone } from '@/lib/scoring/config-loader'

export interface MergeRateGuidance {
  ratio: number | Unavailable
  percentage: string
  percentile: number
  percentileLabel: string
  summary: string
  recommendation: string
  helpText: string
  tableDisplayValue: string
}

export function getMergeRateGuidance(
  merged: number | Unavailable,
  opened: number | Unavailable,
  stars: number | Unavailable = 'unavailable',
): MergeRateGuidance {
  if (typeof merged !== 'number' || typeof opened !== 'number' || opened <= 0) {
    return {
      ratio: 'unavailable',
      percentage: '—',
      percentile: 0,
      percentileLabel: '—',
      summary: 'RepoPulse cannot verify enough PR flow data to judge merge throughput in the selected window.',
      recommendation: 'Collect more opened and merged PR activity before drawing conclusions.',
      helpText:
        'Merged pull requests divided by opened pull requests, ranked as a percentile against repos in the same star bracket.',
      tableDisplayValue: '—',
    }
  }

  const ratio = merged / opened
  const percentage = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(ratio * 100)

  const cal = getCalibrationForStars(stars)
  const percentile = interpolatePercentile(ratio, cal.prMergeRate)
  const percentileLabel = formatPercentileLabel(percentile)
  const tone = percentileToTone(percentile)

  const summary = tone === 'success'
    ? 'Healthy merge throughput relative to incoming PR volume.'
    : tone === 'warning'
      ? 'Some PR throughput is healthy, but a meaningful share of opened PRs are not being merged.'
      : 'Many opened PRs are not reaching merge in the selected window.'

  const recommendation = tone === 'success'
    ? 'Keep reviewer capacity and triage discipline aligned with incoming PR volume so throughput stays healthy.'
    : tone === 'warning'
      ? 'Triage stalled PRs faster and tighten reviewer coverage or contribution scope to improve conversion.'
      : 'Reduce PR backlog, speed up reviewer response, or close low-likelihood PRs sooner so maintainers can focus on mergeable changes.'

  return {
    ratio,
    percentage: `${percentage}%`,
    percentile,
    percentileLabel,
    summary,
    recommendation,
    helpText:
      `Merged pull requests divided by opened pull requests. This repo is at the ${percentileLabel} compared to repos in the same star bracket.`,
    tableDisplayValue: `${percentage}% (${percentileLabel})`,
  }
}
