import type {
  ActivityWindowDays,
  AnalysisResult,
  ContributorWindowDays,
  Unavailable,
} from '@/lib/analyzer/analysis-result'
import {
  computeHealthRatio,
  getActivityRatioMetrics,
  getContributorRatioMetrics,
  getEcosystemRatioMetrics,
  HEALTH_RATIO_DEFINITIONS,
  type HealthRatioCategory,
} from './ratio-definitions'
import { getMergeRateGuidance } from '@/lib/activity/merge-rate-guidance'

export interface HealthRatioCell {
  repo: string
  value: number | Unavailable
  displayValue: string
}

export interface HealthRatioRowViewModel {
  id: string
  category: HealthRatioCategory
  label: string
  formula: string
  description: string
  cells: HealthRatioCell[]
}

export function formatHealthRatio(value: number | Unavailable) {
  if (typeof value !== 'number') {
    return '—'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)
}

export function buildHealthRatioRows(
  results: AnalysisResult[],
  options: {
    contributorWindowDays?: ContributorWindowDays
    activityWindowDays?: ActivityWindowDays
  } = {},
): HealthRatioRowViewModel[] {
  const contributorWindowDays = options.contributorWindowDays ?? 90
  const activityWindowDays = options.activityWindowDays ?? 90

  return HEALTH_RATIO_DEFINITIONS.map((definition) => ({
    id: definition.id,
    category: definition.category,
    label: definition.label,
    formula: definition.formula,
    description: definition.description,
    cells: results.map((result) => {
      const value = getRatioValueForDefinition(result, definition.id, contributorWindowDays, activityWindowDays)
      const windowMetrics = result.activityMetricsByWindow?.[activityWindowDays]
      return {
        repo: result.repo,
        value,
        displayValue:
          definition.id === 'pr-merge-rate'
            ? getMergeRateGuidance(windowMetrics?.prsMerged ?? 'unavailable', windowMetrics?.prsOpened ?? 'unavailable', result.stars).tableDisplayValue
            : formatHealthRatio(value),
      }
    }),
  }))
}

function getRatioValueForDefinition(
  result: AnalysisResult,
  definitionId: string,
  contributorWindowDays: ContributorWindowDays,
  activityWindowDays: ActivityWindowDays,
): number | Unavailable {
  if (definitionId === 'fork-rate') {
    return getEcosystemRatioMetrics(result).forkRate
  }

  if (definitionId === 'watcher-rate') {
    return getEcosystemRatioMetrics(result).watcherRate
  }

  if (definitionId === 'pr-merge-rate') {
    return getActivityRatioMetrics(result, activityWindowDays).prMergeRate
  }

  if (definitionId === 'stale-issue-ratio') {
    return getActivityRatioMetrics(result, activityWindowDays).staleIssueRatio
  }

  const contributorMetrics = result.contributorMetricsByWindow?.[contributorWindowDays]
  if (!contributorMetrics) {
    return 'unavailable'
  }

  if (definitionId === 'repeat-contributor-ratio') {
    return getContributorRatioMetrics(result, contributorMetrics).repeatContributorRatio
  }

  if (definitionId === 'new-contributor-ratio') {
    return getContributorRatioMetrics(result, contributorMetrics).newContributorRatio
  }

  return 'unavailable'
}

export function sortHealthRatioCells(cells: HealthRatioCell[], direction: 'asc' | 'desc' = 'desc'): HealthRatioCell[] {
  return [...cells].sort((left, right) => {
    if (left.value === 'unavailable' && right.value === 'unavailable') {
      return left.repo.localeCompare(right.repo)
    }

    if (left.value === 'unavailable') {
      return 1
    }

    if (right.value === 'unavailable') {
      return -1
    }

    const difference = direction === 'asc' ? left.value - right.value : right.value - left.value
    if (difference !== 0) {
      return difference
    }

    return left.repo.localeCompare(right.repo)
  })
}

export function buildContributorRatioMetricRows(
  result: AnalysisResult,
  windowMetrics: {
    repeatContributors: number | Unavailable
    newContributors: number | Unavailable
  },
): Array<{ label: string; value: string; hoverText: string }> {
  const repeatContributorRatio = computeHealthRatio(windowMetrics.repeatContributors, result.totalContributors)
  const newContributorRatio = computeHealthRatio(windowMetrics.newContributors, result.totalContributors)

  return [
    {
      label: 'Repeat contributor ratio',
      value: formatHealthRatioForHomeView(repeatContributorRatio),
      hoverText: 'Repeat contributors divided by total contributors. Repeat contributors made more than one verified commit in the selected window.',
    },
    {
      label: 'New contributor ratio',
      value: formatHealthRatioForHomeView(newContributorRatio),
      hoverText:
        'New contributors divided by total contributors. New contributors are authors whose first verified commit in the available 365-day history falls within the selected window.',
    },
  ]
}

function formatHealthRatioForHomeView(value: number | Unavailable) {
  if (typeof value !== 'number') {
    return 'unavailable'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)
}
