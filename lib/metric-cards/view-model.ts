import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildEcosystemRows } from '@/lib/ecosystem-map/chart-data'
import { getScoreBadges, type ScoreBadgeDefinition } from './score-config'
import { getHealthScore, type HealthScoreDefinition } from '@/lib/scoring/health-score'

export interface MetricCardViewModel {
  repo: string
  name: string
  createdAtLabel: string
  starsLabel: string
  forksLabel: string
  watchersLabel: string
  description: string
  primaryLanguage: string
  details: Array<{ label: string; value: string }>
  missingFields: string[]
  profile: ReturnType<typeof buildEcosystemRows>[number]['profile']
  scoreBadges: ScoreBadgeDefinition[]
  healthScore: HealthScoreDefinition
}

export function buildMetricCardViewModels(results: AnalysisResult[]): MetricCardViewModel[] {
  const ecosystemRows = new Map(buildEcosystemRows(results).map((row) => [row.repo, row]))

  return results.map((result) => {
    const ecosystemRow = ecosystemRows.get(result.repo)

    return {
      repo: result.repo,
      name: formatText(result.name, result.repo),
      createdAtLabel: formatDate(result.createdAt),
      starsLabel: formatMetric(result.stars),
      forksLabel: formatMetric(result.forks),
      watchersLabel: formatMetric(result.watchers),
      description: formatText(result.description),
      primaryLanguage: formatText(result.primaryLanguage),
      details: [
        { label: 'Primary language', value: formatText(result.primaryLanguage) },
        { label: 'Description', value: formatText(result.description) },
        { label: 'Created', value: formatDate(result.createdAt) },
        { label: 'Commits (30d)', value: formatMetric(result.commits30d) },
        { label: 'Commits (90d)', value: formatMetric(result.commits90d) },
        { label: 'Releases (12mo)', value: formatMetric(result.releases12mo) },
        { label: 'PRs opened (90d)', value: formatMetric(result.prsOpened90d) },
        { label: 'PRs merged (90d)', value: formatMetric(result.prsMerged90d) },
        { label: 'Open issues', value: formatMetric(result.issuesOpen) },
        { label: 'Issues closed (90d)', value: formatMetric(result.issuesClosed90d) },
        { label: 'Active contributors (90d)', value: formatMetric(result.uniqueCommitAuthors90d) },
        { label: 'Total contributors', value: formatMetric(result.totalContributors) },
      ],
      missingFields: result.missingFields,
      profile: ecosystemRow?.profile ?? null,
      scoreBadges: getScoreBadges(result),
      healthScore: getHealthScore(result),
    }
  })
}

function formatMetric(value: number | 'unavailable') {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US').format(value)
  }

  return '—'
}

function formatText(value: string | 'unavailable', fallback = '—') {
  if (value === 'unavailable' || value.trim().length === 0) {
    return fallback
  }

  return value
}

function formatDate(value: string | 'unavailable') {
  if (value === 'unavailable') {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(date)
}
