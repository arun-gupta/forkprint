import type { AnalysisResult, ContributorWindowDays, ContributorWindowMetrics, Unavailable } from '@/lib/analyzer/analysis-result'
import { buildContributorRatioMetricRows } from '@/lib/health-ratios/view-model'
import { computeContributionConcentration, formatPercentage, getSustainabilityScoreFromCommitCounts } from './score-config'

export interface ContributorMetricRow {
  label: string
  value: string
  hoverText?: string
  supportingText?: string
  secondaryValue?: string
  breakdown?: {
    segments: Array<{
      label: string
      value: number
      tone: 'strong' | 'medium' | 'light'
    }>
  }
}

export interface ContributorHeatmapCell {
  contributor: string
  commits: number
  commitsLabel: string
  intensity: 'lowest' | 'low' | 'medium' | 'high' | 'higher' | 'max'
}

export interface ContributorsSectionViewModel {
  repo: string
  windowDays: ContributorWindowDays
  botModeSummary: string
  coreMetrics: ContributorMetricRow[]
  heatmap: ContributorHeatmapCell[]
  experimentalHeatmap: ContributorHeatmapCell[]
  sustainabilityScore: ReturnType<typeof getSustainabilityScoreFromCommitCounts>
  sustainabilityMetrics: ContributorMetricRow[]
  experimentalMetrics: ContributorMetricRow[]
  experimentalWarning: string
  missingData: string[]
}

export function buildContributorsViewModels(
  results: AnalysisResult[],
  options: { includeBots?: boolean; windowDays?: ContributorWindowDays } = {},
): ContributorsSectionViewModel[] {
  const includeBots = options.includeBots ?? false
  const windowDays = options.windowDays ?? 90

  return results.map((result) => {
    const windowMetrics = getContributorWindowMetrics(result, windowDays)
    const filteredCommitCountsByAuthor = filterCommitCountsByAuthorBots(windowMetrics.commitCountsByAuthor, includeBots)
    const sustainabilityScore = getSustainabilityScoreFromCommitCounts(filteredCommitCountsByAuthor, result.stars)
    const concentration = computeContributionConcentration(filteredCommitCountsByAuthor)
    const repeatContributors = computeRepeatContributors(filteredCommitCountsByAuthor)
    const activeContributors = getActiveContributorCount(filteredCommitCountsByAuthor)
    const contributionTypes = computeContributionTypes(result)
    const experimentalCommitCounts = windowMetrics.commitCountsByExperimentalOrg
    const elephantFactor = computeElephantFactor(experimentalCommitCounts)
    const singleVendorDependencyRatio = computeSingleVendorDependencyRatio(experimentalCommitCounts)

    return {
      repo: result.repo,
      windowDays,
      botModeSummary: includeBots
        ? `Including detected bot accounts in recent-commit contributor metrics for the last ${windowDays} days.`
        : `Detected bot accounts are excluded from recent-commit contributor metrics for the last ${windowDays} days by default.`,
      coreMetrics: [
        {
          label: 'Contributor composition',
          value: formatMetric(result.totalContributors),
          secondaryValue: 'GitHub API contributors',
          hoverText: getContributorCompositionHoverText(result.totalContributors, activeContributors, repeatContributors, windowDays),
          supportingText: getContributorCompositionText(result.totalContributors, activeContributors, repeatContributors),
          breakdown: getContributorCompositionBreakdown(result.totalContributors, activeContributors, repeatContributors),
        },
        ...buildContributorRatioMetricRows(result, {
          repeatContributors: windowMetrics.repeatContributors,
          newContributors: windowMetrics.newContributors,
        }),
      ],
      heatmap: buildHeatmap(filteredCommitCountsByAuthor),
      experimentalHeatmap: buildHeatmap(experimentalCommitCounts, 'organization'),
      sustainabilityScore,
      sustainabilityMetrics: [
        {
          label: 'Top 20% contributor share',
          value: formatPercentage(sustainabilityScore.concentration),
          supportingText: getTopContributorGroupText(
            sustainabilityScore.topContributorCount,
            sustainabilityScore.contributorCount,
          ),
        },
        {
          label: 'Maintainer count',
          value: formatMetric(result.maintainerCount),
          hoverText: getMaintainerCountHoverText(result.maintainerCount),
        },
        {
          label: 'Types of contributions',
          value: contributionTypes.length > 0 ? contributionTypes.join(', ') : '—',
          hoverText: getContributionTypesHoverText(contributionTypes),
        },
      ],
      experimentalMetrics: [
        {
          label: 'Elephant Factor',
          value: formatMetric(elephantFactor),
          hoverText: getElephantFactorHoverText(
            elephantFactor,
            windowMetrics.experimentalAttributedAuthors,
            windowMetrics.experimentalUnattributedAuthors,
          ),
        },
        {
          label: 'Single-vendor dependency ratio',
          value: formatPercentage(singleVendorDependencyRatio),
          hoverText: getSingleVendorDependencyHoverText(
            singleVendorDependencyRatio,
            windowMetrics.experimentalAttributedAuthors,
            windowMetrics.experimentalUnattributedAuthors,
          ),
        },
      ],
      experimentalWarning:
        'Best-effort estimate. Uses heuristic public GitHub organization attribution and may be incomplete or inaccurate.',
      missingData: buildMissingDataList(
        result,
        windowMetrics,
        concentration,
        contributionTypes,
      ),
    }
  })
}

function buildMissingDataList(
  result: AnalysisResult,
  windowMetrics: ContributorWindowMetrics,
  concentration: number | Unavailable,
  contributionTypes: string[],
): string[] {
  const fields: string[] = []

  if (result.totalContributors === 'unavailable') {
    fields.push('GitHub API contributors')
  }

  if (windowMetrics.uniqueCommitAuthors === 'unavailable') {
    fields.push('Active contributors')
  }

  if (windowMetrics.repeatContributors === 'unavailable') {
    fields.push('Repeat contributor ratio')
  }

  if (windowMetrics.newContributors === 'unavailable') {
    fields.push('New contributor ratio')
  }

  if (concentration === 'unavailable') {
    fields.push('Contribution concentration')
  }

  if (result.maintainerCount === 'unavailable') {
    fields.push('Maintainer count')
  }

  if (contributionTypes.length === 0) {
    fields.push('Types of contributions')
  }

  return fields
}

function getContributorWindowMetrics(
  result: AnalysisResult,
  windowDays: ContributorWindowDays,
): ContributorWindowMetrics {
  const fromWindowed = result.contributorMetricsByWindow?.[windowDays]
  if (fromWindowed) {
    return fromWindowed
  }

  const fallbackWindow = result.contributorMetricsByWindow?.[90]
  if (fallbackWindow) {
    return fallbackWindow
  }

  return {
    uniqueCommitAuthors: result.uniqueCommitAuthors90d,
    commitCountsByAuthor: result.commitCountsByAuthor,
    repeatContributors: 'unavailable',
    newContributors: 'unavailable',
    commitCountsByExperimentalOrg: result.commitCountsByExperimentalOrg,
    experimentalAttributedAuthors: result.experimentalAttributedAuthors90d,
    experimentalUnattributedAuthors: result.experimentalUnattributedAuthors90d,
  }
}

function getActiveContributorCount(commitCountsByAuthor: Record<string, number> | Unavailable): number | Unavailable {
  if (commitCountsByAuthor === 'unavailable') {
    return 'unavailable'
  }

  return Object.keys(commitCountsByAuthor).length
}

function getTotalContributorsHoverText(totalContributors: number | Unavailable) {
  if (totalContributors === 'unavailable') {
    return 'Unavailable because GitHub did not return a usable repository contributor count.'
  }

  return `${new Intl.NumberFormat('en-US').format(totalContributors)} contributors from GitHub's repository contributors API, including anonymous contributors when GitHub reports them. This can run higher than the contributor count shown on the GitHub repo page for large repositories.`
}

function computeRepeatContributors(commitCountsByAuthor: Record<string, number> | Unavailable): number | Unavailable {
  if (commitCountsByAuthor === 'unavailable') {
    return 'unavailable'
  }

  return Object.values(commitCountsByAuthor).filter((count) => count > 1).length
}

function getContributorCompositionBreakdown(
  totalContributors: number | Unavailable,
  activeContributors: number | Unavailable,
  repeatContributors: number | Unavailable,
) {
  if (activeContributors === 'unavailable' || repeatContributors === 'unavailable') {
    return undefined
  }

  const oneTimeContributors = Math.max(activeContributors - repeatContributors, 0)
  const inactiveContributors = totalContributors === 'unavailable' ? 0 : Math.max(totalContributors - activeContributors, 0)

  return {
    segments: [
      { label: 'Repeat', value: repeatContributors, tone: 'strong' as const },
      { label: 'One-time', value: oneTimeContributors, tone: 'medium' as const },
      ...(totalContributors === 'unavailable' ? [] : [{ label: 'Inactive', value: inactiveContributors, tone: 'light' as const }]),
    ],
  }
}

function getContributorCompositionText(
  totalContributors: number | Unavailable,
  activeContributors: number | Unavailable,
  repeatContributors: number | Unavailable,
) {
  if (activeContributors === 'unavailable' || repeatContributors === 'unavailable') {
    return undefined
  }

  const oneTimeContributors = Math.max(activeContributors - repeatContributors, 0)
  if (totalContributors === 'unavailable') {
    return `${new Intl.NumberFormat('en-US').format(repeatContributors)} repeat, ${new Intl.NumberFormat('en-US').format(oneTimeContributors)} one-time`
  }

  const inactiveContributors = Math.max(totalContributors - activeContributors, 0)
  return `${new Intl.NumberFormat('en-US').format(repeatContributors)} repeat, ${new Intl.NumberFormat('en-US').format(oneTimeContributors)} one-time, ${new Intl.NumberFormat('en-US').format(inactiveContributors)} inactive`
}

function getContributorCompositionHoverText(
  totalContributors: number | Unavailable,
  activeContributors: number | Unavailable,
  repeatContributors: number | Unavailable,
  windowDays: ContributorWindowDays,
) {
  const totalHover = getTotalContributorsHoverText(totalContributors)

  if (totalContributors === 'unavailable' || activeContributors === 'unavailable' || repeatContributors === 'unavailable') {
    return totalHover
  }

  const oneTimeContributors = Math.max(activeContributors - repeatContributors, 0)
  const inactiveContributors = Math.max(totalContributors - activeContributors, 0)

  return `${totalHover} Within that total, ${new Intl.NumberFormat('en-US').format(activeContributors)} contributors made at least one verified commit in the last ${windowDays} days: ${new Intl.NumberFormat('en-US').format(repeatContributors)} repeat and ${new Intl.NumberFormat('en-US').format(oneTimeContributors)} one-time. ${new Intl.NumberFormat('en-US').format(inactiveContributors)} were not active in the last ${windowDays} days.`
}

function formatMetric(value: number | Unavailable) {
  if (value === 'unavailable') {
    return '—'
  }

  return new Intl.NumberFormat('en-US').format(value)
}

function filterCommitCountsByAuthorBots(
  commitCountsByAuthor: Record<string, number> | Unavailable,
  includeBots: boolean,
): Record<string, number> | Unavailable {
  if (commitCountsByAuthor === 'unavailable' || includeBots) {
    return commitCountsByAuthor
  }

  const filtered = Object.fromEntries(
    Object.entries(commitCountsByAuthor).filter(([actorKey]) => !isLikelyBotActor(actorKey)),
  )

  return Object.keys(filtered).length > 0 ? filtered : 'unavailable'
}

function isLikelyBotActor(actorKey: string) {
  const [, rawIdentifier = actorKey] = actorKey.split(':', 2)
  const normalized =
    actorKey.startsWith('email:') && rawIdentifier.includes('@')
      ? rawIdentifier.slice(0, rawIdentifier.indexOf('@')).toLowerCase()
      : rawIdentifier.toLowerCase()

  return /\[bot\]$/.test(normalized) || /(?:^|[-_])(bot|robot)$/.test(normalized)
}

function computeContributionTypes(result: AnalysisResult) {
  const types: string[] = []

  if (result.commits90d !== 'unavailable' && result.commits90d > 0) {
    types.push('Commits')
  }
  if (
    (result.prsOpened90d !== 'unavailable' && result.prsOpened90d > 0) ||
    (result.prsMerged90d !== 'unavailable' && result.prsMerged90d > 0)
  ) {
    types.push('Pull requests')
  }
  if (
    (result.issuesOpen !== 'unavailable' && result.issuesOpen > 0) ||
    (result.issuesClosed90d !== 'unavailable' && result.issuesClosed90d > 0)
  ) {
    types.push('Issues')
  }

  return types
}

function computeElephantFactor(commitCountsByExperimentalOrg: Record<string, number> | Unavailable): number | Unavailable {
  if (commitCountsByExperimentalOrg === 'unavailable') {
    return 'unavailable'
  }

  const counts = Object.values(commitCountsByExperimentalOrg).filter((count) => count > 0).sort((a, b) => b - a)
  if (counts.length === 0) {
    return 'unavailable'
  }

  const total = counts.reduce((sum, count) => sum + count, 0)
  let runningTotal = 0

  for (let index = 0; index < counts.length; index += 1) {
    runningTotal += counts[index] ?? 0
    if (runningTotal / total >= 0.5) {
      return index + 1
    }
  }

  return 'unavailable'
}

function computeSingleVendorDependencyRatio(
  commitCountsByExperimentalOrg: Record<string, number> | Unavailable,
): number | Unavailable {
  if (commitCountsByExperimentalOrg === 'unavailable') {
    return 'unavailable'
  }

  const counts = Object.values(commitCountsByExperimentalOrg).filter((count) => count > 0)
  if (counts.length === 0) {
    return 'unavailable'
  }

  const total = counts.reduce((sum, count) => sum + count, 0)
  if (total === 0) {
    return 'unavailable'
  }

  return Math.max(...counts) / total
}

function getMaintainerCountHoverText(maintainerCount: number | Unavailable) {
  if (maintainerCount === 'unavailable') {
    return 'Unavailable because no supported public maintainer or owner file could be verified.'
  }

  return `${new Intl.NumberFormat('en-US').format(maintainerCount)} maintainers or owners parsed from supported public repository files such as OWNERS, MAINTAINERS, CODEOWNERS, or GOVERNANCE.md.`
}

function getContributionTypesHoverText(contributionTypes: string[]) {
  if (contributionTypes.length === 0) {
    return 'Unavailable because no verified recent commit, pull request, or issue activity could be confirmed.'
  }

  return `Observed from verified recent repository activity: ${contributionTypes.join(', ')}.`
}

function getTopContributorGroupText(
  topContributorCount: number | Unavailable,
  contributorCount: number | Unavailable,
) {
  if (topContributorCount === 'unavailable' || contributorCount === 'unavailable') {
    return undefined
  }

  return `${new Intl.NumberFormat('en-US').format(topContributorCount)} of ${new Intl.NumberFormat('en-US').format(contributorCount)} active contributors`
}

function getElephantFactorHoverText(
  elephantFactor: number | Unavailable,
  attributedAuthors: number | Unavailable,
  unattributedAuthors: number | Unavailable,
) {
  if (elephantFactor === 'unavailable') {
    return 'Experimental estimate unavailable because no active contributors could be attributed to a public GitHub organization.'
  }

  return `${new Intl.NumberFormat('en-US').format(elephantFactor)} guessed organization(s) account for at least 50% of experimentally attributed recent commits. Higher is generally healthier because contributor dependence is spread across more organizations. Attributed authors: ${formatMetric(
    attributedAuthors,
  )}. Unattributed authors: ${formatMetric(unattributedAuthors)}.`
}

function getSingleVendorDependencyHoverText(
  singleVendorDependencyRatio: number | Unavailable,
  attributedAuthors: number | Unavailable,
  unattributedAuthors: number | Unavailable,
) {
  if (singleVendorDependencyRatio === 'unavailable') {
    return 'Experimental estimate unavailable because no active contributors could be attributed to a public GitHub organization.'
  }

  return `${formatPercentage(singleVendorDependencyRatio)} of experimentally attributed recent commits are attributable to the largest guessed public organization. Lower is generally healthier because less activity depends on a single organization. Attributed authors: ${formatMetric(
    attributedAuthors,
  )}. Unattributed authors: ${formatMetric(unattributedAuthors)}.`
}

function buildHeatmap(
  commitCounts: Record<string, number> | Unavailable,
  kind: 'contributor' | 'organization' = 'contributor',
): ContributorHeatmapCell[] {
  if (commitCounts === 'unavailable') {
    return []
  }

  const entries = Object.entries(commitCounts).sort((left, right) => right[1] - left[1])
  const maxCommits = entries[0]?.[1] ?? 0

  return entries.map(([contributor, commits]) => ({
    contributor: kind === 'organization' ? contributor : formatContributorLabel(contributor),
    commits,
    commitsLabel: `${new Intl.NumberFormat('en-US').format(commits)} ${kind === 'organization' ? 'attributed ' : ''}${commits === 1 ? 'commit' : 'commits'}`,
    intensity: getIntensity(commits, maxCommits),
  }))
}

function formatContributorLabel(value: string) {
  const [, label = value] = value.split(':')
  return label
}

function getIntensity(commits: number, maxCommits: number): ContributorHeatmapCell['intensity'] {
  if (maxCommits <= 0) {
    return 'lowest'
  }

  const ratio = commits / maxCommits
  if (ratio >= 0.85) {
    return 'max'
  }
  if (ratio >= 0.7) {
    return 'higher'
  }
  if (ratio >= 0.5) {
    return 'high'
  }
  if (ratio >= 0.32) {
    return 'medium'
  }
  if (ratio >= 0.16) {
    return 'low'
  }

  return 'lowest'
}
