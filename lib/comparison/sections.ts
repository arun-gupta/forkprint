import type { AnalysisResult, Unavailable } from '@/lib/analyzer/analysis-result'
import { getMergeRateGuidance } from '@/lib/activity/merge-rate-guidance'
import { computeContributionConcentration, getContributorsScore, formatPercentage as formatContributorPercentage } from '@/lib/contributors/score-config'
import { computeCommunityCompleteness } from '@/lib/community/completeness'
import { getResponsivenessScore } from '@/lib/responsiveness/score-config'
import { getDocumentationScore } from '@/lib/documentation/score-config'
import { computeHealthRatio } from '@/lib/health-ratios/ratio-definitions'
import { formatPercentileLabel } from '@/lib/scoring/config-loader'

export type ComparisonSectionId = 'overview' | 'maturity' | 'contributors' | 'activity' | 'responsiveness' | 'documentation' | 'community' | 'health-ratios'
export type ComparisonAttributeId =
  | 'stars'
  | 'forks'
  | 'watchers'
  | 'fork-rate'
  | 'watcher-rate'
  | 'age-years'
  | 'stars-per-year'
  | 'contributors-per-year'
  | 'commits-per-month'
  | 'growth-trajectory'
  | 'community-completeness'
  | 'community-signals-present'
  | 'community-discussions-enabled'
  | 'community-discussions-count'
  | 'community-funding'
  | 'total-contributors'
  | 'maintainer-count'
  | 'top-contributor-share'
  | 'contributors-score'
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
  | 'contributors-factor-concentration'
  | 'contributors-factor-maintainer-depth'
  | 'contributors-factor-repeat-ratio'
  | 'contributors-factor-new-inflow'
  | 'contributors-factor-breadth'

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

function formatNormalizedRateCell(
  value: number | Unavailable,
  unit: '/yr' | '/mo',
  raw: number | 'too-new' | Unavailable | undefined,
): string {
  if (raw === 'too-new') return 'Too new to normalize'
  if (value === 'unavailable') return '—'
  const formatted = value >= 100
    ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
    : new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)
  return `${formatted} ${unit}`
}

function formatTrajectoryCell(
  value: 'accelerating' | 'stable' | 'declining' | Unavailable | undefined,
): string {
  if (value === undefined || value === 'unavailable') return 'Insufficient verified public data'
  return value.charAt(0).toUpperCase() + value.slice(1)
}


function getContributorWindowMetrics(result: AnalysisResult) {
  return result.contributorMetricsByWindow?.[90]
}

function contributorsFactorRows(): ComparisonAttributeDefinition[] {
  const factors: Array<{
    id: ComparisonAttributeId
    label: string
    factorLabel: string
    helpText: string
  }> = [
    { id: 'contributors-factor-concentration', label: 'Concentration factor', factorLabel: 'Contributor concentration', helpText: 'Contributor-concentration sub-factor percentile (40% weight).' },
    { id: 'contributors-factor-maintainer-depth', label: 'Maintainer depth factor', factorLabel: 'Maintainer depth', helpText: 'Maintainer-depth sub-factor percentile (15% weight).' },
    { id: 'contributors-factor-repeat-ratio', label: 'Repeat-contributor factor', factorLabel: 'Repeat-contributor ratio', helpText: 'Repeat-contributor sub-factor percentile (20% weight).' },
    { id: 'contributors-factor-new-inflow', label: 'New-contributor inflow factor', factorLabel: 'New-contributor inflow', helpText: 'New-contributor-inflow sub-factor percentile (10% weight).' },
    { id: 'contributors-factor-breadth', label: 'Contribution breadth factor', factorLabel: 'Contribution breadth', helpText: 'Contribution-breadth sub-factor percentile (15% weight).' },
  ]
  return factors.map(({ id, label, factorLabel, helpText }) => ({
    id,
    sectionId: 'contributors' as const,
    label,
    helpText,
    direction: 'higher-is-better' as const,
    valueType: 'number' as const,
    getValue: (result: AnalysisResult) => {
      const factor = getContributorsScore(result).weightedFactors.find((f) => f.label === factorLabel)
      return factor?.percentile ?? 'unavailable'
    },
    formatValue: (value: number | Unavailable) => {
      if (value === 'unavailable') return '—'
      return formatPercentileLabel(value as number)
    },
  }))
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
    id: 'maturity',
    label: 'Maturity',
    description: 'Compare repository age and age-normalized velocity signals.',
    attributes: [
      {
        id: 'age-years',
        sectionId: 'maturity',
        label: 'Age (years)',
        helpText: 'Years since repository creation.',
        direction: 'neutral',
        valueType: 'number',
        getValue: (result) =>
          typeof result.ageInDays === 'number' ? result.ageInDays / 365.25 : 'unavailable',
        formatValue: (value) =>
          typeof value === 'number' ? `${value.toFixed(value >= 10 ? 0 : 1)} yr` : '—',
      },
      {
        id: 'stars-per-year',
        sectionId: 'maturity',
        label: 'Stars / year',
        helpText: 'Age-normalized star accumulation rate. Best age+stars cohort comparison signal — differentiates steady growers from flat plateaus.',
        direction: 'higher-is-better',
        valueType: 'number',
        getValue: (result) =>
          typeof result.starsPerYear === 'number' ? result.starsPerYear : 'unavailable',
        formatValue: (value, result) => formatNormalizedRateCell(value, '/yr', result?.starsPerYear),
      },
      {
        id: 'contributors-per-year',
        sectionId: 'maturity',
        label: 'Contributors / year',
        helpText: 'Age-normalized contributor growth rate.',
        direction: 'higher-is-better',
        valueType: 'number',
        getValue: (result) =>
          typeof result.contributorsPerYear === 'number' ? result.contributorsPerYear : 'unavailable',
        formatValue: (value, result) => formatNormalizedRateCell(value, '/yr', result?.contributorsPerYear),
      },
      {
        id: 'commits-per-month',
        sectionId: 'maturity',
        label: 'Commits / month',
        helpText: 'Lifetime commits normalized to a monthly rate.',
        direction: 'higher-is-better',
        valueType: 'number',
        getValue: (result) =>
          typeof result.commitsPerMonthLifetime === 'number' ? result.commitsPerMonthLifetime : 'unavailable',
        formatValue: (value, result) =>
          formatNormalizedRateCell(value, '/mo', result?.commitsPerMonthLifetime),
      },
      {
        id: 'growth-trajectory',
        sectionId: 'maturity',
        label: 'Growth trajectory',
        helpText: 'Last 12 months commits/month vs lifetime commits/month. Accelerating / Stable / Declining. Insufficient when age < 2 years.',
        direction: 'neutral',
        valueType: 'label',
        getValue: () => 'unavailable',
        formatValue: (_value, result) => formatTrajectoryCell(result?.growthTrajectory),
      },
    ],
  },
  {
    id: 'contributors',
    label: 'Contributors',
    description: 'Compare contributor breadth and diversity signals.',
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
        id: 'contributors-score',
        sectionId: 'contributors',
        label: 'Contributors score',
        helpText: 'Contributor-diversity score, derived from commit concentration and expressed as a percentile within the star bracket.',
        direction: 'higher-is-better',
        valueType: 'number',
        getValue: (result) => {
          const score = getContributorsScore(result)
          if (typeof score.value !== 'number') return 'unavailable'
          return score.value
        },
        formatValue: (value) => {
          if (value === 'unavailable') return '—'
          return formatPercentileLabel(value as number)
        },
      },
      ...contributorsFactorRows(),
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
          const score = getDocumentationScore(result.documentationResult, result.licensingResult, result.stars, result.inclusiveNamingResult)
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
    id: 'community',
    label: 'Community',
    description: 'Compare community signals across repositories. Community is a cross-cutting lens — it does not feed the composite OSS Health Score.',
    attributes: [
      {
        id: 'community-completeness',
        sectionId: 'community',
        label: 'Community completeness',
        helpText: 'Percentile rank of community signals present (count-based) against the peer bracket. Unknown signals are excluded from both numerator and denominator.',
        direction: 'higher-is-better',
        valueType: 'number',
        getValue: (result) => {
          const completeness = computeCommunityCompleteness(result)
          return completeness.percentile ?? 'unavailable'
        },
        formatValue: (value) => {
          if (value === 'unavailable') return '—'
          return formatPercentileLabel(value as number)
        },
      },
      {
        id: 'community-signals-present',
        sectionId: 'community',
        label: 'Community signals present',
        helpText: 'Count of community signals detected as present out of the signals that could be determined (unknowns excluded).',
        direction: 'higher-is-better',
        valueType: 'number',
        getValue: (result) => {
          const completeness = computeCommunityCompleteness(result)
          const known = completeness.present.length + completeness.missing.length
          if (known === 0) return 'unavailable'
          return completeness.present.length
        },
        formatValue: (value, result) => {
          if (value === 'unavailable') return '—'
          if (!result) return `${value}`
          const completeness = computeCommunityCompleteness(result)
          const known = completeness.present.length + completeness.missing.length
          return `${value} / ${known}`
        },
      },
      {
        id: 'community-discussions-enabled',
        sectionId: 'community',
        label: 'Discussions enabled',
        helpText: 'Whether GitHub Discussions is enabled for this repository.',
        direction: 'higher-is-better',
        valueType: 'label',
        getValue: (result) => {
          if (result.hasDiscussionsEnabled === true) return 1
          if (result.hasDiscussionsEnabled === false) return 0
          return 'unavailable'
        },
        formatValue: (value) => {
          if (value === 'unavailable') return '—'
          return value === 1 ? 'Yes' : 'No'
        },
      },
      {
        id: 'community-discussions-count',
        sectionId: 'community',
        label: 'Discussions (recent)',
        helpText: 'Number of Discussions created within the selected analysis window. Gated on Discussions being enabled.',
        direction: 'higher-is-better',
        valueType: 'number',
        getValue: (result) => {
          if (typeof result.discussionsCountWindow !== 'number') return 'unavailable'
          return result.discussionsCountWindow
        },
        formatValue: (value) => {
          if (value === 'unavailable') return '—'
          return formatNumber(value as number)
        },
      },
      {
        id: 'community-funding',
        sectionId: 'community',
        label: 'Funding disclosure',
        helpText: 'Presence of a .github/FUNDING.yml file declaring sponsorship or funding channels.',
        direction: 'higher-is-better',
        valueType: 'label',
        getValue: (result) => {
          if (result.hasFundingConfig === true) return 1
          if (result.hasFundingConfig === false) return 0
          return 'unavailable'
        },
        formatValue: (value) => {
          if (value === 'unavailable') return '—'
          return value === 1 ? 'Present' : 'Not detected'
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
