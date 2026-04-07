import type { AnalysisResult, AnalyzeResponse, ResponsivenessMetrics } from '@/lib/analyzer/analysis-result'
import { getActivityScore } from '@/lib/activity/score-config'
import { getSustainabilityScore } from '@/lib/contributors/score-config'
import { buildContributorsViewModels } from '@/lib/contributors/view-model'
import { formatHours, formatPercentage, getResponsivenessScore } from '@/lib/responsiveness/score-config'
import { encodeRepos } from '@/lib/export/shareable-url'

export interface MarkdownExportResult {
  blob: Blob
  filename: string
}

function fmt(value: unknown): string {
  if (value === 'unavailable' || value === null || value === undefined) return 'N/A'
  if (typeof value === 'number') return new Intl.NumberFormat('en-US').format(value)
  return String(value)
}

function fmtHours(value: unknown): string {
  if (value === 'unavailable' || value === null || value === undefined) return 'N/A'
  return formatHours(value as number | 'unavailable')
}

function fmtPct(value: unknown): string {
  if (value === 'unavailable' || value === null || value === undefined) return 'N/A'
  return formatPercentage(value as number | 'unavailable')
}

function fmtRatio(numerator: number | 'unavailable', denominator: number | 'unavailable'): string {
  if (typeof numerator !== 'number' || typeof denominator !== 'number' || denominator <= 0) return 'N/A'
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format((numerator / denominator) * 100)}%`
}

function getResponsivenessMetrics(result: AnalysisResult): ResponsivenessMetrics {
  return (
    result.responsivenessMetricsByWindow?.[90] ??
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

function renderRepo(result: AnalysisResult, appUrl?: string): string {
  const activity = getActivityScore(result)
  const sustainability = getSustainabilityScore(result)
  const responsiveness = getResponsivenessScore(result)
  const contributors = buildContributorsViewModels([result])[0]
  const rm = getResponsivenessMetrics(result)
  const am = result.activityMetricsByWindow?.[90]

  const prsOpened = am?.prsOpened ?? result.prsOpened90d
  const prsMerged = am?.prsMerged ?? result.prsMerged90d
  const issuesOpened = am?.issuesOpened ?? 'unavailable'
  const issuesClosed = am?.issuesClosed ?? result.issuesClosed90d
  const staleIssueRatio = am?.staleIssueRatio ?? result.staleIssueRatio ?? 'unavailable'
  const medianMergeHours = am?.medianTimeToMergeHours ?? result.medianTimeToMergeHours ?? 'unavailable'
  const medianCloseHours = am?.medianTimeToCloseHours ?? result.medianTimeToCloseHours ?? 'unavailable'
  const releases = am?.releases ?? result.releases12mo

  const githubUrl = `https://github.com/${result.repo}`

  const lines: string[] = [
    `## ${result.repo}`,
    '',
    `- **GitHub**: [${result.repo}](${githubUrl})`,
    ...(appUrl ? [`- **Analysis**: [View in RepoPulse](${appUrl})`] : []),
    '',
    '### Overview',
    '',
    `- **Stars**: ${fmt(result.stars)}`,
    `- **Forks**: ${fmt(result.forks)}`,
    `- **Watchers**: ${fmt(result.watchers)}`,
    `- **Primary language**: ${fmt(result.primaryLanguage)}`,
    `- **Description**: ${fmt(result.description)}`,
    `- **Created**: ${fmt(result.createdAt)}`,
    '',
    '### Contributors',
    '',
    `- **Score**: ${sustainability.value}`,
    `- **Total contributors**: ${fmt(result.totalContributors)}`,
    `- **Unique commit authors (90 days)**: ${fmt(result.uniqueCommitAuthors90d)}`,
    `- **Repeat contributors (90 days)**: ${fmt(result.contributorMetricsByWindow?.[90]?.repeatContributors ?? 'unavailable')}`,
    `- **New contributors (90 days)**: ${fmt(result.contributorMetricsByWindow?.[90]?.newContributors ?? 'unavailable')}`,
    `- **Maintainer count**: ${fmt(result.maintainerCount)}`,
    `- **Top 20% contributor share**: ${fmtPct(sustainability.concentration)}`,
    ...(contributors ? contributors.sustainabilityMetrics
      .filter((m) => m.label === 'Types of contributions')
      .map((m) => `- **Types of contributions**: ${m.value}`) : []),
    ...(contributors?.experimentalMetrics.length
      ? [
          '',
          '#### Experimental (heuristic org attribution)',
          '',
          ...contributors.experimentalMetrics.map((m) => `- **${m.label}**: ${m.value}`),
        ]
      : []),
    '',
    '### Activity',
    '',
    `- **Score**: ${activity.value}`,
    `- **Commits (30 days)**: ${fmt(result.commits30d)}`,
    `- **Commits (90 days)**: ${fmt(result.commits90d)}`,
    `- **PRs opened (90 days)**: ${fmt(prsOpened)}`,
    `- **PRs merged (90 days)**: ${fmt(prsMerged)}`,
    `- **PR merge rate**: ${fmtRatio(prsMerged, prsOpened)}`,
    `- **Issues opened (90 days)**: ${fmt(issuesOpened)}`,
    `- **Issues closed (90 days)**: ${fmt(issuesClosed)}`,
    `- **Issue closure rate**: ${fmtRatio(issuesClosed, issuesOpened)}`,
    `- **Stale issue ratio**: ${fmtPct(staleIssueRatio)}`,
    `- **Median time to merge**: ${fmtHours(medianMergeHours)}`,
    `- **Median time to close**: ${fmtHours(medianCloseHours)}`,
    `- **Releases (12 months)**: ${fmt(releases)}`,
    '',
    '### Responsiveness',
    '',
    `- **Score**: ${responsiveness.value}`,
    '',
    '#### Issue & PR response time',
    '',
    `- **Issue first response (median)**: ${fmtHours(rm.issueFirstResponseMedianHours)}`,
    `- **Issue first response (p90)**: ${fmtHours(rm.issueFirstResponseP90Hours)}`,
    `- **PR first review (median)**: ${fmtHours(rm.prFirstReviewMedianHours)}`,
    `- **PR first review (p90)**: ${fmtHours(rm.prFirstReviewP90Hours)}`,
    '',
    '#### Resolution metrics',
    '',
    `- **Issue resolution duration (median)**: ${fmtHours(rm.issueResolutionMedianHours)}`,
    `- **Issue resolution duration (p90)**: ${fmtHours(rm.issueResolutionP90Hours)}`,
    `- **PR merge duration (median)**: ${fmtHours(rm.prMergeMedianHours)}`,
    `- **PR merge duration (p90)**: ${fmtHours(rm.prMergeP90Hours)}`,
    `- **Issue resolution rate**: ${fmtPct(rm.issueResolutionRate)}`,
    '',
    '#### Maintainer activity signals',
    '',
    `- **Contributor response rate**: ${fmtPct(rm.contributorResponseRate)}`,
    `- **Human first-response ratio**: ${fmtPct(rm.humanResponseRatio)}`,
    `- **Bot first-response ratio**: ${fmtPct(rm.botResponseRatio)}`,
    '',
    '#### Volume & backlog health',
    '',
    `- **Open issues**: ${fmt(rm.openIssueCount)}`,
    `- **Open PR backlog**: ${fmt(rm.openPullRequestCount)}`,
    `- **Stale issue ratio**: ${fmtPct(rm.staleIssueRatio)}`,
    `- **Stale PR ratio**: ${fmtPct(rm.stalePrRatio)}`,
    '',
    '#### Engagement quality signals',
    '',
    `- **PR review depth**: ${fmt(rm.prReviewDepth)}`,
    `- **Issues closed without comment**: ${fmtPct(rm.issuesClosedWithoutCommentRatio)}`,
  ]

  if (result.missingFields.length > 0) {
    lines.push('', '### Missing Data', '')
    for (const field of result.missingFields) {
      lines.push(`- ${field}`)
    }
  }

  return lines.join('\n')
}

export function buildMarkdownReport(response: AnalyzeResponse, analyzedRepos?: string[]): string {
  const timestamp = new Date().toISOString()
  const repoCount = response.results.length + response.failures.length
  const shareableUrl = analyzedRepos && analyzedRepos.length > 0 ? encodeRepos(analyzedRepos) : undefined

  const header = [
    '# RepoPulse Health Report',
    '',
    `- **Generated:** ${timestamp}`,
    `- **Repositories:** ${repoCount}`,
    ...(shareableUrl ? [`- **Source:** [View analysis](${shareableUrl})`] : []),
    '',
  ]

  const sections = response.results.map((result) => renderRepo(result, shareableUrl))

  const failureLines: string[] = []
  if (response.failures.length > 0) {
    failureLines.push('## Failed Repositories', '')
    for (const failure of response.failures) {
      failureLines.push(`- **${failure.repo}**: ${failure.reason}`)
    }
  }

  const parts = [...header]
  for (const section of sections) {
    parts.push('---', '', section, '')
  }
  if (failureLines.length > 0) {
    parts.push('---', '', ...failureLines)
  }

  return parts.join('\n')
}

export function buildMarkdownExport(response: AnalyzeResponse, analyzedRepos?: string[]): MarkdownExportResult {
  const markdown = buildMarkdownReport(response, analyzedRepos)
  const blob = new Blob([markdown], { type: 'text/markdown' })
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const HH = String(now.getHours()).padStart(2, '0')
  const MM = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const filename = `repopulse-${yyyy}-${mm}-${dd}-${HH}${MM}${ss}.md`
  return { blob, filename }
}
