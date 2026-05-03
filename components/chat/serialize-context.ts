import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { OrgRepoSummary } from '@/lib/analyzer/org-inventory'
import type { OrgSummaryViewModel } from '@/lib/org-aggregation/types'

export type ChatContextType = 'repos' | 'org'

export interface SerializedChatContext {
  contextType: ChatContextType
  text: string
}

function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const k of keys) {
    result[k] = obj[k]
  }
  return result
}

function summarizeRepo(r: AnalysisResult): object {
  return pick(r, [
    'repo',
    'name',
    'description',
    'primaryLanguage',
    'stars',
    'forks',
    'commits30d',
    'commits90d',
    'releases12mo',
    'prsOpened90d',
    'prsMerged90d',
    'issuesOpen',
    'issuesClosed90d',
    'uniqueCommitAuthors90d',
    'totalContributors',
    'maintainerCount',
    'securityResult',
    'documentationResult',
    'licensingResult',
    'inclusiveNamingResult',
  ])
}

export function serializeReposContext(results: AnalysisResult[]): SerializedChatContext {
  const summaries = results.map(summarizeRepo)
  const text = [
    `# Repository Analysis Context`,
    `Analyzed ${results.length} repo(s): ${results.map((r) => r.repo).join(', ')}`,
    '',
    '```json',
    JSON.stringify(summaries, null, 2),
    '```',
  ].join('\n')
  return { contextType: 'repos', text }
}

function extractPanelValue(panel: { value: unknown; status: string; contributingReposCount: number } | undefined): unknown {
  if (!panel) return null
  return { status: panel.status, repoCount: panel.contributingReposCount, data: panel.value }
}

export type OrgSortBy = 'stars' | 'health' | 'activity'

const HEALTH_ORDER: Record<string, number> = { failed: 0, 'in-progress': 1, queued: 2, done: 3 }

function sortedRepoNames(
  perRepoStatusList: OrgSummaryViewModel['perRepoStatusList'],
  orgRepos: OrgRepoSummary[],
  sortBy: OrgSortBy,
): string[] {
  const repoIndex = new Map(orgRepos.map((r) => [r.repo, r]))
  const list = [...perRepoStatusList]

  if (sortBy === 'stars') {
    list.sort((a, b) => {
      const sa = repoIndex.get(a.repo)?.stars
      const sb = repoIndex.get(b.repo)?.stars
      const na = typeof sa === 'number' ? sa : -1
      const nb = typeof sb === 'number' ? sb : -1
      return nb - na
    })
  } else if (sortBy === 'activity') {
    list.sort((a, b) => {
      const pa = repoIndex.get(a.repo)?.pushedAt
      const pb = repoIndex.get(b.repo)?.pushedAt
      const da = typeof pa === 'string' ? pa : ''
      const db = typeof pb === 'string' ? pb : ''
      return db.localeCompare(da)
    })
  } else {
    // health: failed first (most urgent)
    list.sort((a, b) => (HEALTH_ORDER[a.badge] ?? 99) - (HEALTH_ORDER[b.badge] ?? 99))
  }

  return list.map((e) => e.repo)
}

export function serializeOrgContext(
  org: string,
  view: OrgSummaryViewModel,
  opts: { maxRepos?: number; sortBy?: OrgSortBy; orgRepos?: OrgRepoSummary[] } = {},
): SerializedChatContext {
  const { maxRepos = 500, sortBy = 'stars', orgRepos = [] } = opts

  const orderedRepoNames = sortedRepoNames(view.perRepoStatusList, orgRepos, sortBy)
  const statusByRepo = new Map(view.perRepoStatusList.map((e) => [e.repo, e]))

  const summary = {
    org,
    runStatus: {
      total: view.status.total,
      succeeded: view.status.succeeded,
      failed: view.status.failed,
      status: view.status.status,
    },
    panels: {
      projectFootprint: extractPanelValue(view.panels['project-footprint']),
      securityRollup: extractPanelValue(view.panels['security-rollup']),
      busFactor: extractPanelValue(view.panels['bus-factor']),
      contributorDiversity: extractPanelValue(view.panels['contributor-diversity']),
      maintainers: extractPanelValue(view.panels['maintainers']),
      activityRollup: extractPanelValue(view.panels['activity-rollup']),
      responsivenessRollup: extractPanelValue(view.panels['responsiveness-rollup']),
      documentationCoverage: extractPanelValue(view.panels['documentation-coverage']),
      licenseConsistency: extractPanelValue(view.panels['license-consistency']),
      governance: extractPanelValue(view.panels['governance']),
      orgRecommendations: extractPanelValue(view.panels['org-recommendations']),
      inactiveRepos: extractPanelValue(view.panels['inactive-repos']),
      repoAge: extractPanelValue(view.panels['repo-age']),
      languages: extractPanelValue(view.panels['languages']),
    },
    sortedBy: sortBy,
    maxReposIncluded: maxRepos,
    perRepoSummary: orderedRepoNames.slice(0, maxRepos).map((repo) => {
      const e = statusByRepo.get(repo)
      const inv = orgRepos.find((r) => r.repo === repo)
      return {
        repo,
        status: e?.status,
        error: e?.errorReason,
        stars: typeof inv?.stars === 'number' ? inv.stars : undefined,
        pushedAt: typeof inv?.pushedAt === 'string' ? inv.pushedAt : undefined,
      }
    }),
  }

  const text = [
    `# Org Analysis Context`,
    `Organization: ${org} (${view.status.succeeded} repos analyzed)`,
    '',
    '```json',
    JSON.stringify(summary, null, 2),
    '```',
  ].join('\n')

  return { contextType: 'org', text }
}
