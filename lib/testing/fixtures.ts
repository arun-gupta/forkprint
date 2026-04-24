import type { AnalysisResult, InclusiveNamingResult } from '@/lib/analyzer/analysis-result'

export function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    repo: 'owner/repo',
    name: 'unavailable',
    description: 'unavailable',
    createdAt: 'unavailable',
    primaryLanguage: 'unavailable',
    stars: 'unavailable',
    forks: 'unavailable',
    watchers: 'unavailable',
    commits30d: 'unavailable',
    commits90d: 'unavailable',
    releases12mo: 'unavailable',
    prsOpened90d: 'unavailable',
    prsMerged90d: 'unavailable',
    issuesOpen: 'unavailable',
    issuesClosed90d: 'unavailable',
    uniqueCommitAuthors90d: 'unavailable',
    totalContributors: 'unavailable',
    maintainerCount: 'unavailable',
    commitCountsByAuthor: 'unavailable',
    commitCountsByExperimentalOrg: 'unavailable',
    experimentalAttributedAuthors90d: 'unavailable',
    experimentalUnattributedAuthors90d: 'unavailable',
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    documentationResult: 'unavailable',
    licensingResult: 'unavailable',
    defaultBranchName: 'unavailable',
    topics: [],
    inclusiveNamingResult: 'unavailable',
    securityResult: 'unavailable',
    missingFields: [],
    ...overrides,
  }
}

export const INCLUSIVE_NAMING_CLEAN: InclusiveNamingResult = {
  defaultBranchName: 'main',
  branchCheck: {
    checkType: 'branch',
    term: 'main',
    passed: true,
    tier: null,
    severity: null,
    replacements: [],
    context: null,
  },
  metadataChecks: [],
}
