import { ACTIVITY_WINDOW_DAYS, type ActivityWindowDays, type AnalysisResult, type ResponsivenessMetrics } from '@/lib/analyzer/analysis-result'
import { formatCount, formatHours, formatPercentage, getResponsivenessScore } from './score-config'

export interface ResponsivenessMetricViewModel {
  label: string
  value: string
  helpText?: string
}

export interface ResponsivenessPaneViewModel {
  title:
    | 'Issue & PR response time'
    | 'Resolution metrics'
    | 'Maintainer activity signals'
    | 'Volume & backlog health'
    | 'Engagement quality signals'
  metrics: ResponsivenessMetricViewModel[]
}

export interface ResponsivenessSectionViewModel {
  repo: string
  panes: ResponsivenessPaneViewModel[]
  score: ReturnType<typeof getResponsivenessScore>
}

export function getResponsivenessWindowOptions() {
  return ACTIVITY_WINDOW_DAYS.map((days) => ({
    days,
    label: days === 365 ? '12 months' : `${days}d`,
  }))
}

export function buildResponsivenessSections(results: AnalysisResult[], windowDays: ActivityWindowDays): ResponsivenessSectionViewModel[] {
  return results.map((result) => {
    const metrics = getResponsivenessMetrics(result, windowDays)

    return {
      repo: result.repo,
      panes: buildPanes(metrics),
      score: getResponsivenessScore(result, windowDays),
    }
  })
}

function getResponsivenessMetrics(result: AnalysisResult, windowDays: ActivityWindowDays): ResponsivenessMetrics {
  return (
    result.responsivenessMetricsByWindow?.[windowDays] ??
    result.responsivenessMetrics ?? {
      issueFirstResponseMedianHours: 'unavailable',
      issueFirstResponseP90Hours: 'unavailable',
      prFirstReviewMedianHours: 'unavailable',
      prFirstReviewP90Hours: 'unavailable',
      issueResolutionMedianHours: 'unavailable',
      issueResolutionP90Hours: 'unavailable',
      prMergeMedianHours: result.medianTimeToMergeHours ?? 'unavailable',
      prMergeP90Hours: 'unavailable',
      issueResolutionRate: 'unavailable',
      contributorResponseRate: 'unavailable',
      botResponseRatio: 'unavailable',
      humanResponseRatio: 'unavailable',
      staleIssueRatio: result.staleIssueRatio ?? 'unavailable',
      stalePrRatio: 'unavailable',
      prReviewDepth: 'unavailable',
      issuesClosedWithoutCommentRatio: 'unavailable',
      openIssueCount: result.issuesOpen,
      openPullRequestCount: 'unavailable',
    }
  )
}

function buildPanes(metrics: ResponsivenessMetrics): ResponsivenessPaneViewModel[] {
  return [
    {
      title: 'Issue & PR response time',
      metrics: [
        { label: 'Issue first response (median)', value: formatHours(metrics.issueFirstResponseMedianHours) },
        {
          label: 'Issue first response (p90)',
          value: formatHours(metrics.issueFirstResponseP90Hours),
          helpText: '90th percentile time from issue open to the first non-author response. Shows slower outliers.',
        },
        { label: 'PR first review (median)', value: formatHours(metrics.prFirstReviewMedianHours) },
        {
          label: 'PR first review (p90)',
          value: formatHours(metrics.prFirstReviewP90Hours),
          helpText: '90th percentile time from pull request open to the first non-author review. Shows slower outliers.',
        },
      ],
    },
    {
      title: 'Resolution metrics',
      metrics: [
        { label: 'Issue resolution duration (median)', value: formatHours(metrics.issueResolutionMedianHours) },
        {
          label: 'Issue resolution duration (p90)',
          value: formatHours(metrics.issueResolutionP90Hours),
          helpText: '90th percentile time from issue open to close. Shows slower-to-resolve outliers.',
        },
        { label: 'PR merge duration (median)', value: formatHours(metrics.prMergeMedianHours) },
        {
          label: 'PR merge duration (p90)',
          value: formatHours(metrics.prMergeP90Hours),
          helpText: '90th percentile time from pull request open to merge. Shows slower merge outliers.',
        },
        {
          label: 'Issue resolution rate',
          value: formatPercentage(metrics.issueResolutionRate),
          helpText: 'Closed issues divided by opened issues in the selected recent window.',
        },
      ],
    },
    {
      title: 'Maintainer activity signals',
      metrics: [
        {
          label: 'Contributor response rate',
          value: formatPercentage(metrics.contributorResponseRate),
          helpText: 'Share of newly opened issues and pull requests that received at least one non-author human response.',
        },
        {
          label: 'Human first-response ratio',
          value: formatPercentage(metrics.humanResponseRatio),
          helpText: 'Share of first responses that came from a human account rather than a bot.',
        },
        {
          label: 'Bot first-response ratio',
          value: formatPercentage(metrics.botResponseRatio),
          helpText: 'Share of first responses that came from bot accounts such as accounts ending in [bot] or -bot.',
        },
      ],
    },
    {
      title: 'Volume & backlog health',
      metrics: [
        {
          label: 'Stale issue ratio',
          value: formatPercentage(metrics.staleIssueRatio),
          helpText: 'Share of currently open issues that have been open longer than the selected recent window.',
        },
        {
          label: 'Stale PR ratio',
          value: formatPercentage(metrics.stalePrRatio),
          helpText: 'Share of currently open pull requests that have been open longer than the selected recent window.',
        },
        { label: 'Open issues', value: formatCount(metrics.openIssueCount) },
        { label: 'Open PR backlog', value: formatCount(metrics.openPullRequestCount) },
      ],
    },
    {
      title: 'Engagement quality signals',
      metrics: [
        {
          label: 'PR review depth',
          value: formatCount(metrics.prReviewDepth, 1),
          helpText: 'Average number of review events recorded per newly opened pull request in the selected window.',
        },
        {
          label: 'Issues closed without comment',
          value: formatPercentage(metrics.issuesClosedWithoutCommentRatio),
          helpText: 'Share of issues closed in the selected window that had no public issue comments.',
        },
      ],
    },
  ]
}

