import type { AnalysisResult, InclusiveNamingResult } from '@/lib/analyzer/analysis-result'

const UNAVAILABLE = 'unavailable';

export function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    repo: 'owner/repo',
    name: UNAVAILABLE,
    description: UNAVAILABLE,
    createdAt: UNAVAILABLE,
    primaryLanguage: UNAVAILABLE,
    stars: UNAVAILABLE,
    forks: UNAVAILABLE,
    watchers: UNAVAILABLE,
    commits30d: UNAVAILABLE,
    commits90d: UNAVAILABLE,
    releases12mo: UNAVAILABLE,
    prsOpened90d: UNAVAILABLE,
    prsMerged90d: UNAVAILABLE,
    issuesOpen: UNAVAILABLE,
    issuesClosed90d: UNAVAILABLE,
    uniqueCommitAuthors90d: UNAVAILABLE,
    totalContributors: UNAVAILABLE,
    maintainerCount: UNAVAILABLE,
    commitCountsByAuthor: UNAVAILABLE,
    commitCountsByExperimentalOrg: UNAVAILABLE,
    experimentalAttributedAuthors90d: UNAVAILABLE,
    experimentalUnattributedAuthors90d: UNAVAILABLE,
    issueFirstResponseTimestamps: UNAVAILABLE,
    issueCloseTimestamps: UNAVAILABLE,
    prMergeTimestamps: UNAVAILABLE,
    documentationResult: UNAVAILABLE,
    licensingResult: UNAVAILABLE,
    defaultBranchName: UNAVAILABLE,
    topics: [],
    inclusiveNamingResult: UNAVAILABLE,
    securityResult: UNAVAILABLE,
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