import type { Unavailable } from '@/lib/analyzer/analysis-result'

export interface MergeRateGuidance {
  ratio: number | Unavailable
  percentage: string
  band: 'strong' | 'mixed' | 'weak' | 'unavailable'
  bandLabel: string
  summary: string
  recommendation: string
  helpText: string
  tableDisplayValue: string
}

export function getMergeRateGuidance(
  merged: number | Unavailable,
  opened: number | Unavailable,
): MergeRateGuidance {
  if (typeof merged !== 'number' || typeof opened !== 'number' || opened <= 0) {
    return {
      ratio: 'unavailable',
      percentage: '—',
      band: 'unavailable',
      bandLabel: '—',
      summary: 'RepoPulse cannot verify enough PR flow data to judge merge throughput in the selected window.',
      recommendation: 'Collect more opened and merged PR activity before drawing conclusions.',
      helpText:
        'Merged pull requests divided by opened pull requests. Strong is 70% or higher, Mixed is 40% to 69.9%, and Weak is below 40%.',
      tableDisplayValue: '—',
    }
  }

  const ratio = merged / opened
  const percentage = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(ratio * 100)

  if (ratio >= 0.7) {
    return {
      ratio,
      percentage: `${percentage}%`,
      band: 'strong',
      bandLabel: 'Strong',
      summary: 'Healthy merge throughput relative to incoming PR volume.',
      recommendation: 'Keep reviewer capacity and triage discipline aligned with incoming PR volume so throughput stays healthy.',
      helpText:
        'Merged pull requests divided by opened pull requests. Strong is 70% or higher. High merge rates usually indicate healthy PR triage and review throughput.',
      tableDisplayValue: `${percentage}% · Strong`,
    }
  }

  if (ratio >= 0.4) {
    return {
      ratio,
      percentage: `${percentage}%`,
      band: 'mixed',
      bandLabel: 'Mixed',
      summary: 'Some PR throughput is healthy, but a meaningful share of opened PRs are not being merged.',
      recommendation: 'Triage stalled PRs faster and tighten reviewer coverage or contribution scope to improve conversion.',
      helpText:
        'Merged pull requests divided by opened pull requests. Mixed is 40% to 69.9%. This usually points to uneven triage or a meaningful backlog of opened PRs that are not landing.',
      tableDisplayValue: `${percentage}% · Mixed`,
    }
  }

  return {
    ratio,
    percentage: `${percentage}%`,
    band: 'weak',
    bandLabel: 'Weak',
    summary: 'Many opened PRs are not reaching merge in the selected window.',
    recommendation: 'Reduce PR backlog, speed up reviewer response, or close low-likelihood PRs sooner so maintainers can focus on mergeable changes.',
    helpText:
      'Merged pull requests divided by opened pull requests. Weak is below 40%. Low merge rates often signal review bottlenecks, stale PR backlog, or contribution mismatch.',
    tableDisplayValue: `${percentage}% · Weak`,
  }
}
