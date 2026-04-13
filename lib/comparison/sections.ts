import type { AnalysisResult, Unavailable } from '@/lib/analyzer/analysis-result'
import { getMergeRateGuidance } from '@/lib/activity/merge-rate-guidance'
import { computeContributionConcentration, getSustainabilityScore, formatPercentage as formatContributorPercentage } from '@/lib/contributors/score-config'
import { getResponsivenessScore } from '@/lib/responsiveness/score-config'
import { getDocumentationScore } from '@/lib/documentation/score-config'
import { computeHealthRatio } from '@/lib/health-ratios/ratio-definitions'
import { formatPercentileLabel } from '@/lib/scoring/config-loader'

export type ComparisonSectionId = 'overview' | 'contributors' | 'activity' | 'responsiveness' | 'documentation' | 'health-ratios'
export type ComparisonAttributeId =
  | 'stars'
  | 'forks'
  | 'watchers'
  | 'fork-rate'
  | 'watcher-rate'
  | 'total-contributors'
  | 'maintainer-count'
  | 'top-contributor-share'
  | 'sustainability-score'
  | 'repeat-contributor-ratio'
  | 'new-contributor-ratio'
  | 'commits-90d'
  | 'pr-merge-rate'
  | 'issue-closure-rate'
  | 'releases-12mo'
  | 'stale-issue-ratio'
  | 'issue-first-response'
  | 'pr-first-review'
  | 'issue-resolution-rate'
  | 'stale-pr-ratio'
  | 'responsiveness-score'
  | 'documentation-score'
  | 'documentation-files-found'
  | 'documentation-readme-sections'
  | 'fork-rate-health'
  | 'repeat-contributor-ratio-health'

export type ComparisonDirection = 'higher-is-better' | 'lower-is-better' | 'neutral'
export type ComparisonValueType = 'number' | 'percentage' | 'duration' | 'label'

export interface ComparisonAttributeDefinition {
  id: ComparisonAttributeId
  sectionId: ComparisonSectionId
  label: string
  helpText: string
  direction: ComparisonDirection
  valueType: ComparisonValueType
  getValue: (result: AnalysisResult) => number | Unavailable
  formatValue?: (value: number | Unavailable, result?: AnalysisResult) => string
}

export interface ComparisonSectionDefinition {
  id: ComparisonSectionId
  label: string
  description: string
  attributes: ComparisonAttributeDefinition[]
}

function formatNumber(value: number | Unavailable) {
  if (value === 'unavailable') return '—'
  return new Intl.NumberFormat('en-US').format(value)
}

function formatPercentage(value: number | Unavailable) {
  if (value === 'unavailable') return '—'
  return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value * 100)}%`
}

function formatDurationHours(value: number | Unavailable) {
  if (value === 'unavailable') return '—'
  if (value >= 24) {
    return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value / 24)}d`
  }
  return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}h`
}


function getContributorWindowMetrics(result: AnalysisResult) {
  return result.contributorMetricsByWindow?.[90]
}

function getActivityWindowMetrics(result: AnalysisResult) {
  return result.activityMetricsByWindow?.[90]
}

function getResponsivenessWindowMetrics(result: AnalysisResult) {
  return result.responsivenessMetricsByWindow?.[90] ?? result.responsivenessMetrics
}

export const COMPARISON_SECTIONS: ComparisonSectionDefinition[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Compare ecosystem reach and attention signals.',
    attributes: [
      {
        id: 'stars',
        sectionId: 'overview',
        label: 'Stars',
        helpText: 'GitHub stars for the repository.',
        direction: 'higher-is-better',
        valueType: 'number',
        getValue: (result) => result.stars,
        formatValue: formatNumber,
      },
      {
        id: 'forks',
        sectionId: 'overview',
        label: 'Forks',
        helpText: 'GitHub forks for the repository.',
        direction: 'higher-is-better',
        valueType: 'number',
        getValue: (result) => result.forks,
        formatValue: formatNumber,
      },
      {
        id: 'watchers',
        sectionId: 'overview',
        label: 'Watchers',
        helpText: 'GitHub watchers for the repository.',
        direction: 'higher-is-better',
        valueType: 'number',
        getValue: (result) => result.watchers,
        formatValue: formatNumber,
      },
      {
        id: 'fork-rate',
        sectionId: 'overview',
        label: 'Fork rate',
        helpText: 'Forks divided by stars.',
        direction: 'higher-is-better',
        valueType: 'percentage',
        getValue: (result) => computeHealthRatio(result.forks, result.stars),
        formatValue: formatPercentage,
      },
      {
        id: 'watcher-rate',
        sectionId: 'overview',
        label: 'Watcher rate',
        helpText: 'Watchers divided by stars.',
        direction: 'higher-is-better',
        valueType: 'percentage',
        getValue: (result) => computeHealthRatio(result.watchers, result.stars),
        formatValue: formatPercentage,
      },
    ],
  },
  {
    id: 'contributors',
    label: 'Contributors',
    description: 'Compare contributor breadth and sustainability signals.',
    attributes: [
      {
        id: 'total-contributors',
        sectionId: 'contributors',
        label: 'Total contributors',
        helpText: 'Total verified contributors in the available history.',
        direction: 'higher-is-better',
        valueType: 'number',
        getValue: (result) => result.totalContributors,
        formatValue: formatNumber,
      },
      {
        id: 'maintainer-count',
        sectionId: 'contributors',
        label: 'Maintainer count',
        helpText: 'Verified maintainer count from public maintainer files when available.',
        direction: 'higher-is-better',
        valueType: 'number',
        getValue: (result) => result.maintainerCount,
        formatValue: formatNumber,
      },
      {
        id: 'top-contributor-share',
        sectionId: 'contributors',
        label: 'Top contributor share',
        helpText: 'Share of commits owned by the top 20% of contributors. Lower is healthier.',
        direction: 'lower-is-better',
        valueType: 'percentage',
        getValue: (result) => computeContributionConcentration(result.commitCountsByAuthor),
        formatValue: formatContributorPercentage,
      },
      {
        id: 'sustainability-score',
        sectionId: 'contributors',
        label: 'Sustainability score',
        helpText: 'Derived sustainability score from contributor concentration, as a percentile within the star bracket.',
        direction: 'higher-is-better',
        valueType: 'number',
        getValue: (result) => {
          const score = getSustainabilityScore(result)
          if (typeof score.value !== 'number') return 'unavailable'
          return score.value
        },
        formatValue: (value) => {
          if (value === 'unavailable') return '—'
          return formatPercentileLabel(value as number)
        },
      },
      {
        id: 'repeat-contributor-ratio',
        sectionId: 'contributors',
        label: 'Repeat contributor ratio',
        helpText: 'Repeat contributors divided by total contributors in the selected contributor window.',
        direction: 'higher-is-better',
        valueType: 'percentage',
        getValue: (result) => {
          const metrics = getContributorWindowMetrics(result)
          return computeHealthRatio(metrics?.repeatContributors ?? 'unavailable', result.totalContributors)
        },
        formatValue: formatPercentage,
      },
      {
        id: 'new-contributor-ratio',
        sectionId: 'contributors',
        label: 'New contributor ratio',
        helpText: 'New contributors divided by total contributors in the selected contributor window.',
        direction: 'neutral',
        valueType: 'percentage',
        getValue: (result) => {
          const metrics = getContributorWindowMetrics(result)
          return computeHealthRatio(metrics?.newContributors ?? 'unavailable', result.totalContributors)
        },
        formatValue: formatPercentage,
      },
    ],
  },
  {
    id: 'activity',
    label: 'Activity',
    description: 'Compare throughput and flow-health signals.',
    attributes: [
      {
        id: 'commits-90d',
        sectionId: 'activity',
        label: 'Commits (90d)',
        helpText: 'Verified commits in the 90-day activity window.',
        direction: 'higher-is-better',
        valueType: 'number',
        getValue: (result) => getActivityWindowMetrics(result)?.commits ?? result.commits90d,
        formatValue: formatNumber,
      },
      {
        id: 'pr-merge-rate',
        sectionId: 'activity',
        label: 'PR merge rate',
        helpText: 'Merged pull requests divided by opened pull requests in the selected window.',
        direction: 'higher-is-better',
        valueType: 'percentage',
        getValue: (result) => {
          const metrics = getActivityWindowMetrics(result)
          return computeHealthRatio(metrics?.prsMerged ?? 'unavailable', metrics?.prsOpened ?? 'unavailable')
        },
        formatValue: (value, result) => {
          if (!result) return formatPercentage(value)
          const metrics = getActivityWindowMetrics(result)
          return getMergeRateGuidance(metrics?.prsMerged ?? 'unavailable', metrics?.prsOpened ?? 'unavailable', result.stars).tableDisplayValue
        },
      },
      {
        id: 'issue-closure-rate',
        sectionId: 'activity',
        label: 'Issue closure rate',
        helpText: 'Closed issues divided by opened issues in the selected window.',
        direction: 'higher-is-better',
        valueType: 'percentage',
        getValue: (result) => {
          const metrics = getActivityWindowMetrics(result)
          return computeHealthRatio(metrics?.issuesClosed ?? 'unavailable', metrics?.issuesOpened ?? 'unavailable')
        },
        formatValue: formatPercentage,
      },
      {
        id: 'releases-12mo',
        sectionId: 'activity',
        label: 'Releases (12m)',
        helpText: 'Verified releases in the trailing 12-month window.',
        direction: 'higher-is-better',
        valueType: 'number',
        getValue: (result) => getActivityWindowMetrics(result)?.releases ?? result.releases12mo,
        formatValue: formatNumber,
      },
      {
        id: 'stale-issue-ratio',
        sectionId: 'activity',
        label: 'Stale issue ratio',
        helpText: 'Share of currently open issues older than the selected window cutoff. Lower is healthier.',
        direction: 'lower-is-better',
        valueType: 'percentage',
        getValue: (result) => getActivityWindowMetrics(result)?.staleIssueRatio ?? result.staleIssueRatio ?? 'unavailable',
        formatValue: formatPercentage,
      },
    ],
  },
  {
    id: 'responsiveness',
    label: 'Responsiveness',
    description: 'Compare response-time and backlog-health signals.',
    attributes: [
      {
        id: 'issue-first-response',
        sectionId: 'responsiveness',
        label: 'Issue first response',
        helpText: 'Median time to first issue response. Lower is better.',
        direction: 'lower-is-better',
        valueType: 'duration',
        getValue: (result) => getResponsivenessWindowMetrics(result)?.issueFirstResponseMedianHours ?? 'unavailable',
        formatValue: formatDurationHours,
      },
      {
        id: 'pr-first-review',
        sectionId: 'responsiveness',
        label: 'PR first review',
        helpText: 'Median time to first PR review. Lower is better.',
        direction: 'lower-is-better',
        valueType: 'duration',
        getValue: (result) => getResponsivenessWindowMetrics(result)?.prFirstReviewMedianHours ?? 'unavailable',
        formatValue: formatDurationHours,
      },
      {
        id: 'issue-resolution-rate',
        sectionId: 'responsiveness',
        label: 'Issue resolution rate',
        helpText: 'Closed issues divided by opened issues in the selected responsiveness window.',
        direction: 'higher-is-better',
        valueType: 'percentage',
        getValue: (result) => getResponsivenessWindowMetrics(result)?.issueResolutionRate ?? 'unavailable',
        formatValue: formatPercentage,
      },
      {
        id: 'stale-pr-ratio',
        sectionId: 'responsiveness',
        label: 'Stale PR ratio',
        helpText: 'Share of stale open pull requests. Lower is healthier.',
        direction: 'lower-is-better',
        valueType: 'percentage',
        getValue: (result) => getResponsivenessWindowMetrics(result)?.stalePrRatio ?? 'unavailable',
        formatValue: formatPercentage,
      },
      {
        id: 'responsiveness-score',
        sectionId: 'responsiveness',
        label: 'Responsiveness score',
        helpText: 'Derived responsiveness score based on response-time, backlog-health, and engagement signals, as a percentile within the star bracket.',
        direction: 'higher-is-better',
        valueType: 'number',
        getValue: (result) => {
          const score = getResponsivenessScore(result)
          if (typeof score.value !== 'number') return 'unavailable'
          return score.value
        },
        formatValue: (value) => {
          if (value === 'unavailable') return '—'
          return formatPercentileLabel(value as number)
        },
      },
    ],
  },
  {
    id: 'documentation',
    label: 'Documentation',
    description: 'Compare documentation completeness across repositories.',
    attributes: [
      {
        id: 'documentation-score',
        sectionId: 'documentation',
        label: 'Documentation score',
        helpText: 'Weighted composite of file presence (60%) and README quality (40%), as a percentile within the star bracket.',
        direction: 'higher-is-better',
        valueType: 'number',
        getValue: (result) => {
          if (result.documentationResult === 'unavailable') return 'unavailable'
          const score = getDocumentationScore(result.documentationResult, result.licensingResult, result.stars)
          if (typeof score.value !== 'number') return 'unavailable'
          return score.value
        },
        formatValue: (value) => {
          if (value === 'unavailable') return '—'
          return formatPercentileLabel(value as number)
        },
      },
      {
        id: 'documentation-files-found',
        sectionId: 'documentation',
        label: 'Files found',
        helpText: 'Number of key documentation files present (out of 6: README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG).',
        direction: 'higher-is-better',
        valueType: 'number',
        getValue: (result) => {
          if (result.documentationResult === 'unavailable') return 'unavailable'
          return result.documentationResult.fileChecks.filter((f) => f.found).length
        },
        formatValue: (value) => {
          if (value === 'unavailable') return '—'
          return `${value} / 6`
        },
      },
      {
        id: 'documentation-readme-sections',
        sectionId: 'documentation',
        label: 'README sections',
        helpText: 'Number of recommended README sections detected (out of 5: description, installation, usage, contributing, license).',
        direction: 'higher-is-better',
        valueType: 'number',
        getValue: (result) => {
          if (result.documentationResult === 'unavailable') return 'unavailable'
          return result.documentationResult.readmeSections.filter((s) => s.detected).length
        },
        formatValue: (value) => {
          if (value === 'unavailable') return '—'
          return `${value} / 5`
        },
      },
    ],
  },
  {
    id: 'health-ratios',
    label: 'Health Ratios',
    description: 'Compare reusable cross-repo ratio signals.',
    attributes: [
      {
        id: 'fork-rate-health',
        sectionId: 'health-ratios',
        label: 'Fork rate',
        helpText: 'Forks divided by stars.',
        direction: 'higher-is-better',
        valueType: 'percentage',
        getValue: (result) => computeHealthRatio(result.forks, result.stars),
        formatValue: formatPercentage,
      },
      {
        id: 'repeat-contributor-ratio-health',
        sectionId: 'health-ratios',
        label: 'Repeat contributor ratio',
        helpText: 'Repeat contributors divided by total contributors.',
        direction: 'higher-is-better',
        valueType: 'percentage',
        getValue: (result) => {
          const metrics = getContributorWindowMetrics(result)
          return computeHealthRatio(metrics?.repeatContributors ?? 'unavailable', result.totalContributors)
        },
        formatValue: formatPercentage,
      },
    ],
  },
]

export const COMPARISON_SECTION_MAP = Object.fromEntries(COMPARISON_SECTIONS.map((section) => [section.id, section])) as Record<
  ComparisonSectionId,
  ComparisonSectionDefinition
>

export const COMPARISON_ATTRIBUTE_MAP = Object.fromEntries(
  COMPARISON_SECTIONS.flatMap((section) => section.attributes.map((attribute) => [attribute.id, attribute])),
) as Record<ComparisonAttributeId, ComparisonAttributeDefinition>

export const DEFAULT_ENABLED_SECTIONS = COMPARISON_SECTIONS.map((section) => section.id)
export const DEFAULT_ENABLED_ATTRIBUTES = COMPARISON_SECTIONS.flatMap((section) => section.attributes.map((attribute) => attribute.id))
export const COMPARISON_MAX_REPOS = 4
