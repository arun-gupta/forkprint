import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
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

export function serializeOrgContext(
  org: string,
  view: OrgSummaryViewModel,
  opts: { maxRepos?: number } = {},
): SerializedChatContext {
  const { maxRepos = 500 } = opts

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
    maxReposIncluded: maxRepos,
    perRepoSummary: view.perRepoStatusList.slice(0, maxRepos).map((e) => ({
      repo: e.repo,
      status: e.status,
      error: e.errorReason,
    })),
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
