import type {
  ActivityCadenceMetrics,
  ActivityWindowDays,
  ActivityWindowMetrics,
  AnalysisDiagnostic,
  AnalysisResult,
  AnalyzeInput,
  AnalyzeResponse,
  ContributorWindowDays,
  ContributorWindowMetrics,
  DocumentationFileCheck,
  DocumentationResult,
  RateLimitState,
  ReadmeSectionCheck,
  ResponsivenessMetrics,
  RepositoryFetchFailure,
  Unavailable,
} from './analysis-result'
import { ACTIVITY_WINDOW_DAYS, CONTRIBUTOR_WINDOW_DAYS } from './analysis-result'
import { queryGitHubGraphQL } from './github-graphql'
import { fetchContributorCount, fetchMaintainerCount, fetchPublicUserOrganizations, type MaintainerToken } from './github-rest'
import { REPO_COMMIT_AND_RELEASES_QUERY, REPO_ACTIVITY_COUNTS_QUERY, REPO_COMMIT_HISTORY_PAGE_QUERY, REPO_DISCUSSIONS_PAGE_QUERY, REPO_OVERVIEW_QUERY, REPO_README_BLOB_QUERY, REPO_RESPONSIVENESS_METADATA_QUERY, buildResponsivenessDetailQuery } from './queries'
import { extractLicensingResult, type LicenseFileInfo } from './extract-licensing'
import { MATURITY_CONFIG } from '@/lib/scoring/config-loader'
import { extractInclusiveNamingResult } from '@/lib/inclusive-naming/checker'
import { buildActivityCadenceMetrics } from '@/lib/activity/cadence'
import { detectReleaseHealth } from '@/lib/release-health/detect'
import type { SecurityResult, DirectSecurityCheck } from '@/lib/security/analysis-result'
import { fetchScorecardData } from '@/lib/security/scorecard-client'
import { fetchBranchProtection } from '@/lib/security/direct-checks'

interface DocBlob {
  text?: string
  oid?: string
}

interface ResolvedReadme {
  path: string
  text: string | null
}

// GitHub GraphQL `object(expression: "HEAD:<path>")` is case-sensitive on the
// filename, so the README is detected via a case-insensitive match on the root
// tree's entries instead of a fixed set of path probes (issue #351). Matches
// README, README.md, README.rst, README.txt, README.markdown, etc. regardless
// of casing.
const README_FILENAME_PATTERN = /^readme(\.[a-z0-9]+)?$/i

function findReadmeEntry(
  rootTree: { entries: Array<{ name: string; type: string }> } | null | undefined,
): { name: string } | null {
  const entries = rootTree?.entries ?? []
  const match = entries.find((entry) => entry.type === 'blob' && README_FILENAME_PATTERN.test(entry.name))
  return match ? { name: match.name } : null
}

async function resolveReadme(
  token: string,
  owner: string,
  name: string,
  rootTree: { entries: Array<{ name: string; type: string }> } | null | undefined,
): Promise<{ readme: ResolvedReadme | null; rateLimit: RateLimitState | null }> {
  const match = findReadmeEntry(rootTree)
  if (!match) return { readme: null, rateLimit: null }

  const response = await queryGitHubGraphQL<{
    repository: { object: { text: string | null } | null } | null
  }>(token, REPO_README_BLOB_QUERY, {
    owner,
    name,
    expression: `HEAD:${match.name}`,
  })
  return {
    readme: { path: match.name, text: response.data.repository?.object?.text ?? null },
    rateLimit: response.rateLimit ?? null,
  }
}

interface RepoOverviewResponse {
  repository: {
    name: string
    description: string | null
    createdAt: string
    primaryLanguage: { name: string } | null
    stargazerCount: number
    forkCount: number
    watchers: { totalCount: number }
    issues: { totalCount: number }
    pullRequests?: { totalCount: number }
    defaultBranchRef?: { name: string } | null
    repositoryTopics?: { nodes: Array<{ topic: { name: string } }> } | null
    licenseInfo?: { spdxId: string | null; name: string | null } | null
    rootTree?: { entries: Array<{ name: string; type: string }> } | null
    docLicense?: DocBlob | null
    docLicenseLower?: DocBlob | null
    docLicenseMd?: DocBlob | null
    docLicenseMdLower?: DocBlob | null
    docLicenseTxt?: DocBlob | null
    docLicenseTxtLower?: DocBlob | null
    docCopying?: DocBlob | null
    docCopyingLower?: DocBlob | null
    docLicenseMit?: DocBlob | null
    docLicenseApache?: DocBlob | null
    docLicenseBsd?: DocBlob | null
    docContributing?: DocBlob | null
    docContributingRst?: DocBlob | null
    docContributingTxt?: DocBlob | null
    docContributingLower?: DocBlob | null
    docContributingDocs?: DocBlob | null
    docContributingGithub?: DocBlob | null
    docCodeOfConduct?: DocBlob | null
    docCodeOfConductRst?: DocBlob | null
    docCodeOfConductTxt?: DocBlob | null
    docCodeOfConductHyphenLower?: DocBlob | null
    docCodeOfConductUnderscoreLower?: DocBlob | null
    docCodeOfConductDocs?: DocBlob | null
    docCodeOfConductGithub?: DocBlob | null
    cncfAdopters?: DocBlob | null
    cncfAdoptersLower?: DocBlob | null
    cncfAdoptersPlain?: DocBlob | null
    cncfAdoptersDocs?: DocBlob | null
    cncfRoadmap?: DocBlob | null
    cncfRoadmapLower?: DocBlob | null
    cncfRoadmapDocs?: DocBlob | null
    cncfMaintainers?: DocBlob | null
    cncfMaintainersMd?: DocBlob | null
    cncfMaintainersMdLower?: DocBlob | null
    cncfCodeowners?: DocBlob | null
    cncfCodeownersGithub?: DocBlob | null
    docLicenseRst?: DocBlob | null
    docLicenseRstLower?: DocBlob | null
    docSecurity?: DocBlob | null
    docSecurityLower?: DocBlob | null
    docSecurityRst?: DocBlob | null
    docSecurityGithub?: DocBlob | null
    docSecurityGithubLower?: DocBlob | null
    docSecurityDocs?: DocBlob | null
    docSecurityDocsLower?: DocBlob | null
    docSecurityContacts?: DocBlob | null
    docChangelog?: DocBlob | null
    docChangelogPlain?: DocBlob | null
    docChangelogDocs?: DocBlob | null
    docChanges?: DocBlob | null
    docChangesRst?: DocBlob | null
    docHistory?: DocBlob | null
    docNews?: DocBlob | null
    secDependabot?: DocBlob | null
    secDependabotYaml?: DocBlob | null
    secRenovateRoot?: DocBlob | null
    secRenovateGithub?: DocBlob | null
    secRenovateConfig?: DocBlob | null
    secRenovateRc?: DocBlob | null
    hasDiscussionsEnabled?: boolean | null
    commFunding?: { oid: string } | null
    commIssueTemplateLegacyRoot?: { oid: string } | null
    commIssueTemplateLegacyGithub?: { oid: string } | null
    commIssueTemplateDir?: { entries: Array<{ name: string }> } | null
    commPrTemplateRoot?: { oid: string } | null
    commPrTemplateGithub?: { oid: string } | null
    commPrTemplateDocs?: { oid: string } | null
    commDiscussionsRecent?: {
      totalCount?: number
      pageInfo?: { hasNextPage: boolean; endCursor: string | null }
      nodes: Array<{ createdAt: string }>
    } | null
    commGovernanceRoot?: { oid: string } | null
    commGovernanceGithub?: { oid: string } | null
    commGovernanceDocs?: { oid: string } | null
    onbDevcontainerDir?: { entries: Array<{ name: string }> } | null
    onbDevcontainerJson?: { oid: string } | null
    onbDockerComposeYml?: { oid: string } | null
    onbDockerComposeYaml?: { oid: string } | null
    onbGitpod?: { oid: string } | null
    workflowDir?: {
      entries: Array<{
        name: string
        object: { text: string } | null
      }>
    } | null
  } | null
}

interface RepoCommitAndReleasesResponse {
  repository: {
    releases: {
      totalCount: number
      nodes: Array<{
        tagName: string
        name: string | null
        description: string | null
        isPrerelease: boolean
        createdAt: string
        publishedAt: string | null
      }>
    }
    refs: { totalCount: number } | null
    defaultBranchRef: {
      target: {
        lifetime?: { totalCount: number }
        recent30: { totalCount: number }
        recent60: { totalCount: number }
        recent90: { totalCount: number }
        recent180: { totalCount: number }
        recent365?: { totalCount: number }
        recent365Commits: CommitHistoryConnection | null
      } | null
    } | null
  } | null
}

interface SearchCount { issueCount: number }

interface RepoActivityCountsResponse {
  prsOpened30: SearchCount
  prsOpened60: SearchCount
  prsOpened90: SearchCount
  prsOpened180: SearchCount
  prsOpened365: SearchCount
  prsMerged30: SearchCount
  prsMerged60: SearchCount
  prsMerged90: SearchCount
  prsMerged180: SearchCount
  prsMerged365: SearchCount
  issuesOpened30: SearchCount
  issuesOpened60: SearchCount
  issuesOpened90: SearchCount
  issuesOpened180: SearchCount
  issuesOpened365: SearchCount
  issuesClosed30: SearchCount
  issuesClosed60: SearchCount
  issuesClosed90: SearchCount
  issuesClosed180: SearchCount
  issuesClosed365: SearchCount
  staleIssues30: SearchCount
  staleIssues60: SearchCount
  staleIssues90: SearchCount
  staleIssues180: SearchCount
  staleIssues365: SearchCount
  goodFirstIssues?: SearchCount
  goodFirstIssuesHyphenated?: SearchCount
  goodFirstIssuesBeginner?: SearchCount
  goodFirstIssuesStarter?: SearchCount
  recentMergedPullRequests: {
    nodes: Array<{
      createdAt: string
      mergedAt: string | null
      authorAssociation?: string | null
    }>
  }
  recentClosedIssues: {
    nodes: Array<{
      createdAt: string
      closedAt: string | null
    }>
  }
}

type RepoActivityResponse = RepoCommitAndReleasesResponse & RepoActivityCountsResponse

interface SearchActorNode {
  login: string | null
}

interface SearchCommentNode {
  createdAt: string
  author: SearchActorNode | null
}

interface SearchReviewNode {
  createdAt: string
  author: SearchActorNode | null
}

interface ResponsivenessIssueNode {
  createdAt: string
  closedAt?: string | null
  author: SearchActorNode | null
  comments: {
    totalCount: number
    nodes: SearchCommentNode[]
  }
}

interface ResponsivenessPullRequestNode {
  createdAt: string
  author: SearchActorNode | null
  comments: {
    totalCount: number
    nodes: SearchCommentNode[]
  }
  reviews: {
    totalCount: number
    nodes: SearchReviewNode[]
  }
}

// Pass 1 metadata types — no nested comment/review nodes
interface MetadataIssueNode {
  id: string
  createdAt: string
  closedAt?: string | null
  author: SearchActorNode | null
  comments: { totalCount: number }
}

interface MetadataPullRequestNode {
  id: string
  createdAt: string
  author: SearchActorNode | null
  comments: { totalCount: number }
  reviews: { totalCount: number }
}

interface RepoResponsivenessMetadataResponse {
  recentCreatedIssues: { nodes: MetadataIssueNode[] }
  recentClosedIssues: { nodes: MetadataIssueNode[] }
  recentCreatedPullRequests: { nodes: MetadataPullRequestNode[] }
  recentMergedPullRequests: { nodes: Array<{ createdAt: string; mergedAt: string | null }> }
  staleOpenPullRequests30: { issueCount: number }
  staleOpenPullRequests60: { issueCount: number }
  staleOpenPullRequests90: { issueCount: number }
  staleOpenPullRequests180: { issueCount: number }
  staleOpenPullRequests365: { issueCount: number }
}

// Pass 2 detail node — returned by node() queries
interface DetailNode {
  id: string
  createdAt: string
  author: SearchActorNode | null
  comments?: { totalCount: number; nodes: SearchCommentNode[] }
  reviews?: { totalCount: number; nodes: SearchReviewNode[] }
}

interface RepoResponsivenessResponse {
  recentCreatedIssues: {
    nodes: ResponsivenessIssueNode[]
  }
  recentClosedIssues: {
    nodes: ResponsivenessIssueNode[]
  }
  recentCreatedPullRequests: {
    nodes: ResponsivenessPullRequestNode[]
  }
  recentMergedPullRequests: {
    nodes: Array<{
      createdAt: string
      mergedAt: string | null
    }>
  }
  staleOpenPullRequests30: {
    issueCount: number
  }
  staleOpenPullRequests60: {
    issueCount: number
  }
  staleOpenPullRequests90: {
    issueCount: number
  }
  staleOpenPullRequests180: {
    issueCount: number
  }
  staleOpenPullRequests365: {
    issueCount: number
  }
}

interface LegacyRepoActivityResponse {
  prsOpened?: { issueCount: number }
  prsMerged?: { issueCount: number }
  issuesClosed?: { issueCount: number }
}

interface RepoCommitHistoryPageResponse {
  repository: {
    defaultBranchRef: {
      target: {
        recent365Commits: CommitHistoryConnection | null
      } | null
    } | null
  } | null
}

interface CommitHistoryConnection {
  pageInfo: {
    hasNextPage: boolean
    endCursor: string | null
  }
  nodes: CommitNode[]
}

interface CommitNode {
  authoredDate: string
  message?: string
  author: {
    name: string | null
    email: string | null
    user: {
      login: string
    } | null
  } | null
}

const UNAVAILABLE_FIELDS: Array<keyof AnalysisResult> = [
  'releases12mo',
  'uniqueCommitAuthors90d',
  'totalContributors',
  'maintainerCount',
  'commitCountsByAuthor',
  'commitCountsByExperimentalOrg',
  'experimentalAttributedAuthors90d',
  'experimentalUnattributedAuthors90d',
  'issueFirstResponseTimestamps',
  'issueCloseTimestamps',
  'prMergeTimestamps',
  'goodFirstIssueCount',
  'devEnvironmentSetup',
  'gitpodPresent',
  'newContributorPRAcceptanceRate',
]

function daysAgo(from: Date, n: number): Date {
  const d = new Date(from)
  d.setDate(from.getDate() - n)
  return d
}

export async function analyze(input: AnalyzeInput): Promise<AnalyzeResponse> {
  const results: AnalysisResult[] = []
  const failures: RepositoryFetchFailure[] = []
  const diagnostics: AnalysisDiagnostic[] = []
  let latestRateLimit: RateLimitState | null = null

  for (const repo of input.repos) {
    const [owner, name] = repo.split('/')
    const repoStart = Date.now()

    try {
      console.log(`[analyzer] ${repo} — fetching overview`)
      const overview = await queryGitHubGraphQL<RepoOverviewResponse>(input.token, REPO_OVERVIEW_QUERY, {
        owner,
        name,
      })
      latestRateLimit = overview.rateLimit ?? latestRateLimit

      if (!overview.data.repository) {
        console.warn(`[analyzer] ${repo} — not found, skipping`)
        failures.push({
          repo,
          reason: 'Repository could not be analyzed.',
          code: 'NOT_FOUND',
        })
        continue
      }

      const now = new Date()
      const since30 = daysAgo(now, 30)
      const since60 = daysAgo(now, 60)
      const since90 = daysAgo(now, 90)
      const since180 = daysAgo(now, 180)
      const since365 = daysAgo(now, 365)
      const repoSearch = `${owner}/${name}`

      // Fetch OpenSSF Scorecard data and branch protection in parallel
      console.log(`[analyzer] ${repo} — fetching OpenSSF Scorecard + branch protection`)
      const scorecardPromise = fetchScorecardData(owner!, name!)
      const defaultBranch = overview.data.repository?.defaultBranchRef?.name ?? 'main'
      const branchProtectionPromise = fetchBranchProtection(owner!, name!, defaultBranch, input.token)

      // Pass 1: Commit history + releases (lightweight — no search queries)
      console.log(`[analyzer] ${repo} — pass 1: commit history + releases`)
      const commitAndReleases = await queryGitHubGraphQL<RepoCommitAndReleasesResponse>(input.token, REPO_COMMIT_AND_RELEASES_QUERY, {
        owner,
        name,
        since30: since30.toISOString(),
        since60: since60.toISOString(),
        since90: since90.toISOString(),
        since180: since180.toISOString(),
        since365: since365.toISOString(),
      })
      latestRateLimit = commitAndReleases.rateLimit ?? latestRateLimit

      // Pass 2: Search-based PR/issue counts (may hit RESOURCE_LIMITS_EXCEEDED)
      console.log(`[analyzer] ${repo} — pass 2: activity counts (search-based)`)
      const searchVariables = {
        prsOpened30Query: buildSearchQuery(repoSearch, 'is:pr', 'created', since30),
        prsOpened60Query: buildSearchQuery(repoSearch, 'is:pr', 'created', since60),
        prsOpened90Query: buildSearchQuery(repoSearch, 'is:pr', 'created', since90),
        prsOpened180Query: buildSearchQuery(repoSearch, 'is:pr', 'created', since180),
        prsOpened365Query: buildSearchQuery(repoSearch, 'is:pr', 'created', since365),
        prsMerged30Query: buildSearchQuery(repoSearch, 'is:pr is:merged', 'merged', since30),
        prsMerged60Query: buildSearchQuery(repoSearch, 'is:pr is:merged', 'merged', since60),
        prsMerged90Query: buildSearchQuery(repoSearch, 'is:pr is:merged', 'merged', since90),
        prsMerged180Query: buildSearchQuery(repoSearch, 'is:pr is:merged', 'merged', since180),
        prsMerged365Query: buildSearchQuery(repoSearch, 'is:pr is:merged', 'merged', since365),
        issuesOpened30Query: buildSearchQuery(repoSearch, 'is:issue', 'created', since30),
        issuesOpened60Query: buildSearchQuery(repoSearch, 'is:issue', 'created', since60),
        issuesOpened90Query: buildSearchQuery(repoSearch, 'is:issue', 'created', since90),
        issuesOpened180Query: buildSearchQuery(repoSearch, 'is:issue', 'created', since180),
        issuesOpened365Query: buildSearchQuery(repoSearch, 'is:issue', 'created', since365),
        issuesClosed30Query: buildSearchQuery(repoSearch, 'is:issue', 'closed', since30),
        issuesClosed60Query: buildSearchQuery(repoSearch, 'is:issue', 'closed', since60),
        issuesClosed90Query: buildSearchQuery(repoSearch, 'is:issue', 'closed', since90),
        issuesClosed180Query: buildSearchQuery(repoSearch, 'is:issue', 'closed', since180),
        issuesClosed365Query: buildSearchQuery(repoSearch, 'is:issue', 'closed', since365),
        staleIssues30Query: buildOpenIssuesOlderThanQuery(repoSearch, since30),
        staleIssues60Query: buildOpenIssuesOlderThanQuery(repoSearch, since60),
        staleIssues90Query: buildOpenIssuesOlderThanQuery(repoSearch, since90),
        staleIssues180Query: buildOpenIssuesOlderThanQuery(repoSearch, since180),
        staleIssues365Query: buildOpenIssuesOlderThanQuery(repoSearch, since365),
        ...buildGoodFirstIssueQueries(repoSearch),
      }

      let activityCounts: RepoActivityCountsResponse
      try {
        const countsResponse = await queryGitHubGraphQL<RepoActivityCountsResponse>(input.token, REPO_ACTIVITY_COUNTS_QUERY, searchVariables)
        latestRateLimit = countsResponse.rateLimit ?? latestRateLimit
        activityCounts = countsResponse.data
      } catch (countsError) {
        latestRateLimit = extractRateLimitFromError(countsError) ?? latestRateLimit
        diagnostics.push(buildDiagnostic(repo, 'github-graphql:activity-counts', countsError))
        activityCounts = buildUnavailableActivityCounts()
      }

      // Merge pass 1 + pass 2 into the combined activity response
      const activity = {
        data: { ...commitAndReleases.data, ...activityCounts } as RepoActivityResponse,
        rateLimit: latestRateLimit,
      }

      console.log(`[analyzer] ${repo} — fetching responsiveness metrics`)
      const responsiveness = await fetchResponsivenessTwoPass(
        input.token,
        {
          issuesCreated365Query: buildSearchQuery(repoSearch, 'is:issue', 'created', since365),
          issuesClosed365Query: buildSearchQuery(repoSearch, 'is:issue', 'closed', since365),
          prsCreated365Query: buildSearchQuery(repoSearch, 'is:pr', 'created', since365),
          prsMerged365Query: buildSearchQuery(repoSearch, 'is:pr is:merged', 'merged', since365),
          stalePrs30Query: buildOpenPullRequestsOlderThanQuery(repoSearch, since30),
          stalePrs60Query: buildOpenPullRequestsOlderThanQuery(repoSearch, since60),
          stalePrs90Query: buildOpenPullRequestsOlderThanQuery(repoSearch, since90),
          stalePrs180Query: buildOpenPullRequestsOlderThanQuery(repoSearch, since180),
          stalePrs365Query: buildOpenPullRequestsOlderThanQuery(repoSearch, since365),
        },
        diagnostics,
        repo,
      )
      latestRateLimit = responsiveness.rateLimit ?? latestRateLimit

      console.log(`[analyzer] ${repo} — fetching contributor + maintainer counts`)
      const contributorCount = await fetchContributorCount(input.token, owner, name).catch((error) => {
        latestRateLimit = extractRateLimitFromError(error) ?? latestRateLimit
        diagnostics.push(buildDiagnostic(repo, 'github-rest:contributors', error))

        return {
          data: 'unavailable' as const,
          rateLimit: extractRateLimitFromError(error),
        }
      })
      latestRateLimit = contributorCount.rateLimit ?? latestRateLimit

      const maintainers = await fetchMaintainerCount(input.token, owner, name).catch((error) => {
        latestRateLimit = extractRateLimitFromError(error) ?? latestRateLimit
        diagnostics.push(buildDiagnostic(repo, 'github-rest:maintainers', error))

        return {
          data: { count: 'unavailable' as const, tokens: 'unavailable' as const },
          rateLimit: extractRateLimitFromError(error),
        }
      })
      latestRateLimit = maintainers.rateLimit ?? latestRateLimit

      console.log(`[analyzer] ${repo} — collecting commit history`)
      const commitHistory = await collectRecentCommitHistory({
        token: input.token,
        owner,
        name,
        since365: since365.toISOString(),
        initialConnection: activity.data.repository?.defaultBranchRef?.target?.recent365Commits ?? null,
      })
      latestRateLimit = commitHistory.rateLimit ?? latestRateLimit

      // Paginate discussions (if enabled) so the Activity-tab window
       // selector can compute real per-window counts rather than saturating
       // at the 100-node overview cap — issue #194.
       let discussionTimestamps: string[] | undefined
       let discussionsTruncated = false
       if (overview.data.repository?.hasDiscussionsEnabled === true) {
         console.log(`[analyzer] ${repo} — paginating discussions`)
         const discussionPagination = await collectRecentDiscussionTimestamps({
           token: input.token,
           owner: owner!,
           name: name!,
           initialConnection: overview.data.repository?.commDiscussionsRecent ?? null,
         })
         discussionTimestamps = discussionPagination.createdAt
         discussionsTruncated = discussionPagination.truncated
         latestRateLimit = discussionPagination.rateLimit ?? latestRateLimit
       }

      const contributorMetricsByWindow = buildContributorMetricsByWindow(commitHistory.nodes, now)
      const activityMetricsByWindow = buildActivityMetricsByWindow(
        activity.data,
        now,
        commitHistory.nodes,
        overview.data.repository?.issues.totalCount,
      )
      const commitTimestamps365d = commitHistory.nodes.length > 0
        ? commitHistory.nodes.map((node) => node.authoredDate)
        : 'unavailable'
      const activityCadenceByWindow = buildActivityCadenceByWindow(commitTimestamps365d, now)
      const experimentalOrgAttribution = await buildExperimentalOrganizationCommitCountsByWindow(input.token, commitHistory.nodes, now)
      latestRateLimit = experimentalOrgAttribution.rateLimit ?? latestRateLimit

      console.log(`[analyzer] ${repo} — resolving README (case-insensitive)`)
      const readmeResolution = await resolveReadme(input.token, owner!, name!, overview.data.repository?.rootTree).catch((error) => {
        latestRateLimit = extractRateLimitFromError(error) ?? latestRateLimit
        diagnostics.push(buildDiagnostic(repo, 'github-graphql:readme-blob', error))
        return { readme: null, rateLimit: null }
      })
      latestRateLimit = readmeResolution.rateLimit ?? latestRateLimit

      const analysisResult = buildAnalysisResult(
        repo,
        overview.data,
        activity.data,
        responsiveness.data,
        contributorMetricsByWindow,
        activityMetricsByWindow,
        activityCadenceByWindow,
        commitTimestamps365d,
        contributorCount.data,
        maintainers.data.count,
        maintainers.data.tokens,
        experimentalOrgAttribution.data,
        commitHistory.nodes,
        readmeResolution.readme,
        discussionTimestamps,
        discussionsTruncated,
        now,
      )

      // Populate Scorecard data and branch protection (fetched in parallel earlier)
      const [scorecardData, branchProtection] = await Promise.all([scorecardPromise, branchProtectionPromise])
      if (analysisResult.securityResult !== 'unavailable') {
        analysisResult.securityResult.scorecard = scorecardData
        analysisResult.securityResult.branchProtectionEnabled = branchProtection
        // Update the branch_protection direct check
        const bpCheck = analysisResult.securityResult.directChecks.find((c) => c.name === 'branch_protection')
        if (bpCheck) {
          bpCheck.detected = branchProtection === 'unavailable' ? 'unavailable' : branchProtection
          bpCheck.details = branchProtection === true ? 'Branch protection enabled' :
            branchProtection === false ? 'No branch protection rules detected' : null
        }
      }

      results.push(analysisResult)
      const repoElapsed = ((Date.now() - repoStart) / 1000).toFixed(1)
      console.log(`[analyzer] ${repo} — done in ${repoElapsed}s`)
    } catch (error) {
      const repoElapsed = ((Date.now() - repoStart) / 1000).toFixed(1)
      console.error(`[analyzer] ${repo} — failed after ${repoElapsed}s:`, error)
      latestRateLimit = latestRateLimit ?? extractRateLimitFromError(error)
      diagnostics.push(buildDiagnostic(repo, 'analyze', error, 'error'))
      failures.push(buildFailure(repo, error))
    }
  }

  return {
    results,
    failures,
    rateLimit: latestRateLimit,
    diagnostics,
  }
}

interface ResponseSignal {
  firstResponderKind: 'bot' | 'human' | null
  firstHumanResponseAt: string | null
}

interface AnalyzerError {
  message?: string
  status?: number
  retryAfter?: number | Unavailable
}

export function toAnalyzerError(error: unknown): AnalyzerError {
  if (error === null || typeof error !== 'object') return {}
  const e = error as Record<string, unknown>
  return {
    message: typeof e.message === 'string' ? e.message : undefined,
    status: typeof e.status === 'number' ? e.status : undefined,
    retryAfter: typeof e.retryAfter === 'number' || e.retryAfter === 'unavailable'
      ? e.retryAfter as number | Unavailable
      : undefined,
  }
}

function extractRateLimitFromError(error: unknown): RateLimitState | null {
  const maybeError = toAnalyzerError(error)

  if (maybeError.status !== 403 && maybeError.retryAfter == null) {
    return null
  }

  return {
    limit: 'unavailable',
    remaining: 'unavailable',
    resetAt: 'unavailable',
    retryAfter: maybeError.retryAfter ?? 'unavailable',
  }
}

function buildAnalysisResult(
  repo: string,
  overview: RepoOverviewResponse,
  activity: RepoActivityResponse,
  responsiveness: RepoResponsivenessResponse,
  contributorMetricsByWindow: Record<ContributorWindowDays, ContributorWindowMetrics>,
  activityMetricsByWindow: Record<ActivityWindowDays, ActivityWindowMetrics>,
  activityCadenceByWindow: Record<ActivityWindowDays, ActivityCadenceMetrics> | undefined,
  commitTimestamps365d: string[] | Unavailable,
  totalContributorCount: number | Unavailable,
  maintainerCount: number | Unavailable,
  maintainerTokens: MaintainerToken[] | Unavailable,
  experimentalMetricsByWindow: Record<ContributorWindowDays, ContributorWindowMetrics>,
  recentCommitNodes: CommitNode[],
  readmeResolved: ResolvedReadme | null,
  discussionTimestamps?: string[],
  discussionsTruncated?: boolean,
  now: Date = new Date(),
): AnalysisResult {
  const defaultBranchTarget = activity.repository?.defaultBranchRef?.target
  const legacyActivity = activity as RepoActivityResponse & LegacyRepoActivityResponse
  const contributorMetrics = contributorMetricsByWindow[90]
  const experimentalMetrics = experimentalMetricsByWindow[90]
  const responsivenessMetricsByWindow = buildResponsivenessMetricsByWindow(
    responsiveness,
    activityMetricsByWindow,
    overview.repository?.issues.totalCount,
    overview.repository?.pullRequests?.totalCount,
  )
  const responsivenessMetrics = responsivenessMetricsByWindow[90]
  const issueFirstResponseTimestamps = collectIssueFirstResponseTimestamps(responsiveness.recentCreatedIssues?.nodes ?? [], 90)
  const issueCloseTimestamps = collectIssueCloseTimestamps(responsiveness.recentClosedIssues?.nodes ?? [], 90)
  const prMergeTimestamps = collectPullRequestMergeTimestamps(responsiveness.recentMergedPullRequests?.nodes ?? [], 90)
  const onboardingSignals = extractOnboardingSignals(overview.repository, activity)
  const missingFields = [...UNAVAILABLE_FIELDS].filter((field) => {
    if (field === 'releases12mo') {
      return activityMetricsByWindow[365].releases === 'unavailable'
    }

    if (field === 'uniqueCommitAuthors90d') {
      return contributorMetrics.uniqueCommitAuthors === 'unavailable'
    }

    if (field === 'commitCountsByAuthor') {
      return contributorMetrics.commitCountsByAuthor === 'unavailable'
    }

    if (field === 'totalContributors') {
      const resolvedTotal = totalContributorCount !== 'unavailable'
        ? totalContributorCount
        : contributorMetricsByWindow[365].uniqueCommitAuthors !== 'unavailable' && contributorMetricsByWindow[365].uniqueCommitAuthors > 0
          ? contributorMetricsByWindow[365].uniqueCommitAuthors
          : 'unavailable'
      return resolvedTotal === 'unavailable'
    }

    if (field === 'maintainerCount') {
      return maintainerCount === 'unavailable'
    }

    if (field === 'commitCountsByExperimentalOrg') {
      return experimentalMetrics.commitCountsByExperimentalOrg === 'unavailable'
    }

    if (field === 'experimentalAttributedAuthors90d') {
      return experimentalMetrics.experimentalAttributedAuthors === 'unavailable'
    }

    if (field === 'experimentalUnattributedAuthors90d') {
      return experimentalMetrics.experimentalUnattributedAuthors === 'unavailable'
    }

    if (field === 'issueFirstResponseTimestamps') {
      return issueFirstResponseTimestamps === 'unavailable'
    }

    if (field === 'issueCloseTimestamps') {
      return issueCloseTimestamps === 'unavailable'
    }

    if (field === 'prMergeTimestamps') {
      return prMergeTimestamps === 'unavailable'
    }

    if (field === 'goodFirstIssueCount') {
      return onboardingSignals.goodFirstIssueCount === 'unavailable'
    }

    if (field === 'devEnvironmentSetup') {
      return onboardingSignals.devEnvironmentSetup === 'unavailable'
    }

    if (field === 'gitpodPresent') {
      return onboardingSignals.gitpodPresent === 'unavailable'
    }

    if (field === 'newContributorPRAcceptanceRate') {
      return onboardingSignals.newContributorPRAcceptanceRate === 'unavailable'
    }

    return false
  })

  return {
    repo,
    name: overview.repository?.name ?? 'unavailable',
    description: overview.repository?.description ?? 'unavailable',
    createdAt: overview.repository?.createdAt ?? 'unavailable',
    primaryLanguage: overview.repository?.primaryLanguage?.name ?? 'unavailable',
    stars: overview.repository?.stargazerCount ?? 'unavailable',
    forks: overview.repository?.forkCount ?? 'unavailable',
    watchers: overview.repository?.watchers.totalCount ?? 'unavailable',
    commits30d: defaultBranchTarget?.recent30.totalCount ?? 'unavailable',
    commits90d: defaultBranchTarget?.recent90.totalCount ?? 'unavailable',
    releases12mo: activityMetricsByWindow[365].releases,
    prsOpened90d: activity.prsOpened90?.issueCount ?? legacyActivity.prsOpened?.issueCount ?? 'unavailable',
    prsMerged90d: activity.prsMerged90?.issueCount ?? legacyActivity.prsMerged?.issueCount ?? 'unavailable',
    issuesOpen: overview.repository?.issues.totalCount ?? 'unavailable',
    issuesClosed90d: activity.issuesClosed90?.issueCount ?? legacyActivity.issuesClosed?.issueCount ?? 'unavailable',
    uniqueCommitAuthors90d: contributorMetrics.uniqueCommitAuthors,
    totalContributors: totalContributorCount !== 'unavailable'
      ? totalContributorCount
      : contributorMetricsByWindow[365].uniqueCommitAuthors !== 'unavailable' && contributorMetricsByWindow[365].uniqueCommitAuthors > 0
        ? contributorMetricsByWindow[365].uniqueCommitAuthors
        : 'unavailable',
    totalContributorsSource: totalContributorCount !== 'unavailable' ? 'api' : 'commit-history',
    maintainerCount,
    maintainerTokens,
    commitCountsByAuthor: contributorMetrics.commitCountsByAuthor,
    commitCountsByExperimentalOrg: experimentalMetrics.commitCountsByExperimentalOrg,
    experimentalAttributedAuthors90d: experimentalMetrics.experimentalAttributedAuthors,
    experimentalUnattributedAuthors90d: experimentalMetrics.experimentalUnattributedAuthors,
    contributorMetricsByWindow: Object.fromEntries(
      CONTRIBUTOR_WINDOW_DAYS.map((windowDays) => [
        windowDays,
        {
          ...contributorMetricsByWindow[windowDays],
          commitCountsByExperimentalOrg: experimentalMetricsByWindow[windowDays].commitCountsByExperimentalOrg,
          experimentalAttributedAuthors: experimentalMetricsByWindow[windowDays].experimentalAttributedAuthors,
          experimentalUnattributedAuthors: experimentalMetricsByWindow[windowDays].experimentalUnattributedAuthors,
          commitAuthorsByExperimentalOrg: experimentalMetricsByWindow[windowDays].commitAuthorsByExperimentalOrg,
          commitCountsByEmailDomain: experimentalMetricsByWindow[windowDays].commitCountsByEmailDomain,
          commitAuthorsByEmailDomain: experimentalMetricsByWindow[windowDays].commitAuthorsByEmailDomain,
        },
      ]),
    ) as Record<ContributorWindowDays, ContributorWindowMetrics>,
    activityMetricsByWindow,
    activityCadenceByWindow,
    commitTimestamps365d,
    responsivenessMetricsByWindow,
    responsivenessMetrics,
    staleIssueRatio: activityMetricsByWindow[90].staleIssueRatio,
    medianTimeToMergeHours: activityMetricsByWindow[90].medianTimeToMergeHours,
    medianTimeToCloseHours: activityMetricsByWindow[90].medianTimeToCloseHours,
    documentationResult: extractDocumentationResult(overview.repository, readmeResolved),
    licensingResult: overview.repository
      ? (() => {
          const repo = overview.repository
          // Collect license file content for SPDX expression parsing
          const licenseFileContent =
            repo.docLicense?.text ?? repo.docLicenseLower?.text ??
            repo.docLicenseMd?.text ?? repo.docLicenseMdLower?.text ??
            repo.docLicenseTxt?.text ?? repo.docLicenseTxtLower?.text ??
            repo.docLicenseRst?.text ?? repo.docLicenseRstLower?.text ??
            repo.docCopying?.text ?? repo.docCopyingLower?.text ?? null
          // Collect additional license files (LICENSE-MIT, LICENSE-APACHE, etc.)
          const additionalLicenseFiles: LicenseFileInfo[] = [
            { suffix: 'MIT', content: repo.docLicenseMit?.text ?? null },
            { suffix: 'APACHE', content: repo.docLicenseApache?.text ?? null },
            { suffix: 'BSD', content: repo.docLicenseBsd?.text ?? null },
          ]
          return extractLicensingResult(
            repo.licenseInfo ?? null,
            recentCommitNodes.filter((n): n is CommitNode & { message: string } => typeof n.message === 'string'),
            repo.workflowDir ?? null,
            licenseFileContent,
            additionalLicenseFiles,
          )
        })()
      : 'unavailable',
    defaultBranchName: overview.repository?.defaultBranchRef?.name ?? 'unavailable',
    topics: overview.repository?.repositoryTopics?.nodes.map((n) => n.topic.name) ?? [],
    inclusiveNamingResult: overview.repository
      ? extractInclusiveNamingResult(
          overview.repository.defaultBranchRef?.name ?? null,
          overview.repository.description ?? null,
          overview.repository.repositoryTopics?.nodes.map((n) => n.topic.name) ?? [],
        )
      : 'unavailable',
    issueFirstResponseTimestamps,
    issueCloseTimestamps,
    prMergeTimestamps,
    securityResult: extractSecurityResult(overview.repository),
    ...extractCommunitySignals(overview.repository, 90, discussionTimestamps, discussionsTruncated),
    releaseHealthResult: extractReleaseHealthResult(activity, now),
    ...onboardingSignals,
    ...extractMaturitySignals({
      createdAt: overview.repository?.createdAt ?? 'unavailable',
      stars: overview.repository?.stargazerCount ?? 'unavailable',
      totalContributors: totalContributorCount !== 'unavailable'
        ? totalContributorCount
        : contributorMetricsByWindow[365].uniqueCommitAuthors !== 'unavailable' && contributorMetricsByWindow[365].uniqueCommitAuthors > 0
          ? contributorMetricsByWindow[365].uniqueCommitAuthors
          : 'unavailable',
      lifetimeCommits: defaultBranchTarget?.lifetime?.totalCount ?? 'unavailable',
      recent365Commits: defaultBranchTarget?.recent365?.totalCount ?? 'unavailable',
      now,
    }),
    missingFields,
  }
}

function buildActivityCadenceByWindow(
  commitTimestamps365d: string[] | Unavailable,
  now: Date,
): Record<ActivityWindowDays, ActivityCadenceMetrics> | undefined {
  if (!Array.isArray(commitTimestamps365d)) {
    return undefined
  }

  return Object.fromEntries(
    ACTIVITY_WINDOW_DAYS.map((windowDays) => [
      windowDays,
      buildActivityCadenceMetrics({
        commitTimestamps: commitTimestamps365d,
        now,
        windowDays,
      }),
    ]),
  ) as Record<ActivityWindowDays, ActivityCadenceMetrics>
}

const DAYS_PER_YEAR = 365.25
const DAYS_PER_MONTH = 30.4375

interface MaturityExtractInputs {
  createdAt: string | Unavailable
  stars: number | Unavailable
  totalContributors: number | Unavailable
  lifetimeCommits: number | Unavailable
  recent365Commits: number | Unavailable
  now: Date
}

/**
 * Pure-function classifier for Growth Trajectory (P2-F11 / #74).
 * Compares recent (last-12mo) commits/month against lifetime commits/month
 * using config-driven ratios. Below minimumTrajectoryAgeDays, output is
 * 'unavailable' — constitution §II forbids guessing when a repo is too
 * young for the comparison to be meaningful.
 */
export function classifyGrowthTrajectory(
  recentCommitsPerMonth: number | Unavailable,
  lifetimeCommitsPerMonth: number | Unavailable,
  ageInDays: number | Unavailable,
): 'accelerating' | 'stable' | 'declining' | Unavailable {
  if (ageInDays === 'unavailable') return 'unavailable'
  if (ageInDays < MATURITY_CONFIG.minimumTrajectoryAgeDays) return 'unavailable'
  if (recentCommitsPerMonth === 'unavailable' || lifetimeCommitsPerMonth === 'unavailable') return 'unavailable'
  if (lifetimeCommitsPerMonth <= 0) return 'unavailable'
  const ratio = recentCommitsPerMonth / lifetimeCommitsPerMonth
  if (ratio >= MATURITY_CONFIG.acceleratingRatio) return 'accelerating'
  if (ratio <= MATURITY_CONFIG.decliningRatio) return 'declining'
  return 'stable'
}

/**
 * Derives the seven Project Maturity fields. All derivations map to verified
 * GraphQL inputs (`createdAt`, `stars`, `totalContributors`, lifetime and
 * 365d `history.totalCount`). Missing inputs propagate as 'unavailable';
 * below-threshold age yields 'too-new' for normalized rates.
 */
export function extractMaturitySignals(inputs: MaturityExtractInputs): {
  ageInDays: number | Unavailable
  lifetimeCommits: number | Unavailable
  starsPerYear: number | 'too-new' | Unavailable
  contributorsPerYear: number | 'too-new' | Unavailable
  commitsPerMonthLifetime: number | 'too-new' | Unavailable
  commitsPerMonthRecent12mo: number | Unavailable
  growthTrajectory: 'accelerating' | 'stable' | 'declining' | Unavailable
} {
  const { createdAt, stars, totalContributors, lifetimeCommits, recent365Commits, now } = inputs

  let ageInDays: number | Unavailable = 'unavailable'
  if (createdAt !== 'unavailable') {
    const created = new Date(createdAt).getTime()
    if (!Number.isNaN(created)) {
      ageInDays = Math.max(0, (now.getTime() - created) / (24 * 60 * 60 * 1000))
    }
  }

  const tooNewGate = ageInDays !== 'unavailable' && ageInDays < MATURITY_CONFIG.minimumNormalizationAgeDays

  const normalizePerYear = (value: number | Unavailable): number | 'too-new' | Unavailable => {
    if (value === 'unavailable') return 'unavailable'
    if (ageInDays === 'unavailable') return 'unavailable'
    if (tooNewGate) return 'too-new'
    return value / (ageInDays / DAYS_PER_YEAR)
  }

  const starsPerYear = normalizePerYear(stars)
  const contributorsPerYear = normalizePerYear(totalContributors)

  let commitsPerMonthLifetime: number | 'too-new' | Unavailable
  if (lifetimeCommits === 'unavailable' || ageInDays === 'unavailable') {
    commitsPerMonthLifetime = 'unavailable'
  } else if (tooNewGate) {
    commitsPerMonthLifetime = 'too-new'
  } else {
    commitsPerMonthLifetime = lifetimeCommits / (ageInDays / DAYS_PER_MONTH)
  }

  const commitsPerMonthRecent12mo: number | Unavailable =
    recent365Commits === 'unavailable' ? 'unavailable' : recent365Commits / (365 / DAYS_PER_MONTH)

  // Build numeric inputs for classifier (reject the 'too-new' branch — below
  // normalization age, the trajectory is age-gated independently).
  const lifetimeNumeric: number | Unavailable =
    typeof commitsPerMonthLifetime === 'number' ? commitsPerMonthLifetime : 'unavailable'

  const growthTrajectory = classifyGrowthTrajectory(
    commitsPerMonthRecent12mo,
    lifetimeNumeric,
    ageInDays,
  )

  return {
    ageInDays,
    lifetimeCommits,
    starsPerYear,
    contributorsPerYear,
    commitsPerMonthLifetime,
    commitsPerMonthRecent12mo,
    growthTrajectory,
  }
}

function extractReleaseHealthResult(
  activity: RepoActivityResponse,
  now: Date,
): AnalysisResult['releaseHealthResult'] {
  const repo = activity.repository
  if (!repo) return 'unavailable'
  const releasesConnection = repo.releases
  const rawNodes = releasesConnection?.nodes ?? []
  const totalReleasesAllTime = typeof releasesConnection?.totalCount === 'number'
    ? releasesConnection.totalCount
    : rawNodes.length
  const totalTags: number | Unavailable = typeof repo.refs?.totalCount === 'number'
    ? repo.refs.totalCount
    : 'unavailable'
  return detectReleaseHealth({
    releases: rawNodes.map((r) => ({
      tagName: r.tagName,
      name: r.name,
      body: r.description,
      isPrerelease: r.isPrerelease,
      createdAt: r.createdAt,
      publishedAt: r.publishedAt,
    })),
    totalReleasesAllTime,
    totalTags,
    now,
  })
}

export function extractDocumentationResult(
  repo: RepoOverviewResponse['repository'],
  readmeResolved: ResolvedReadme | null = null,
): DocumentationResult | Unavailable {
  if (!repo) return 'unavailable'

  const findFirst = (...aliases: (DocBlob | null | undefined)[]): DocBlob | null =>
    aliases.find((a) => a != null) ?? null

  const licenseBlob = findFirst(
    repo.docLicense,
    repo.docLicenseLower,
    repo.docLicenseMd,
    repo.docLicenseMdLower,
    repo.docLicenseTxt,
    repo.docLicenseTxtLower,
    repo.docLicenseRst,
    repo.docLicenseRstLower,
    repo.docCopying,
    repo.docCopyingLower,
    repo.docLicenseMit,
    repo.docLicenseApache,
    repo.docLicenseBsd,
  )
  const contributingBlob = findFirst(repo.docContributing, repo.docContributingRst, repo.docContributingTxt, repo.docContributingLower, repo.docContributingDocs, repo.docContributingGithub)
  const codeOfConductBlob = findFirst(repo.docCodeOfConduct, repo.docCodeOfConductRst, repo.docCodeOfConductTxt, repo.docCodeOfConductHyphenLower, repo.docCodeOfConductUnderscoreLower, repo.docCodeOfConductDocs, repo.docCodeOfConductGithub)
  const securityBlob = findFirst(
    repo.docSecurity, repo.docSecurityLower, repo.docSecurityRst,
    repo.docSecurityGithub, repo.docSecurityGithubLower,
    repo.docSecurityDocs, repo.docSecurityDocsLower,
    repo.docSecurityContacts,
  )
  const changelogBlob = findFirst(repo.docChangelog, repo.docChangelogPlain, repo.docChangelogDocs, repo.docChanges, repo.docChangesRst, repo.docHistory, repo.docNews)

  // README is resolved via case-insensitive match on the root tree (issue #351).
  // If the caller didn't run that async resolution (e.g., unit tests), fall back
  // to matching the repo fixture's own rootTree synchronously so unit tests can
  // still exercise detection without mocking a second GraphQL round-trip.
  const readme: ResolvedReadme | null = readmeResolved ?? (() => {
    const entry = findReadmeEntry(repo.rootTree)
    return entry ? { path: entry.name, text: null } : null
  })()

  const licensePathMap: [string, DocBlob | null | undefined][] = [
    ['LICENSE', repo.docLicense], ['license', repo.docLicenseLower],
    ['LICENSE.md', repo.docLicenseMd], ['license.md', repo.docLicenseMdLower],
    ['LICENSE.txt', repo.docLicenseTxt], ['license.txt', repo.docLicenseTxtLower],
    ['LICENSE.rst', repo.docLicenseRst], ['license.rst', repo.docLicenseRstLower],
    ['COPYING', repo.docCopying], ['copying', repo.docCopyingLower],
    ['LICENSE-MIT', repo.docLicenseMit], ['LICENSE-APACHE', repo.docLicenseApache], ['LICENSE-BSD', repo.docLicenseBsd],
  ]
  const contributingPathMap: [string, DocBlob | null | undefined][] = [
    ['CONTRIBUTING.md', repo.docContributing], ['CONTRIBUTING.rst', repo.docContributingRst], ['CONTRIBUTING.txt', repo.docContributingTxt],
    ['contributing.md', repo.docContributingLower], ['docs/CONTRIBUTING.md', repo.docContributingDocs], ['.github/CONTRIBUTING.md', repo.docContributingGithub],
  ]
  const codeOfConductPathMap: [string, DocBlob | null | undefined][] = [
    ['CODE_OF_CONDUCT.md', repo.docCodeOfConduct], ['CODE_OF_CONDUCT.rst', repo.docCodeOfConductRst], ['CODE_OF_CONDUCT.txt', repo.docCodeOfConductTxt],
    ['code-of-conduct.md', repo.docCodeOfConductHyphenLower], ['code_of_conduct.md', repo.docCodeOfConductUnderscoreLower],
    ['docs/CODE_OF_CONDUCT.md', repo.docCodeOfConductDocs], ['.github/CODE_OF_CONDUCT.md', repo.docCodeOfConductGithub],
  ]
  const changelogPathMap: [string, DocBlob | null | undefined][] = [
    ['CHANGELOG.md', repo.docChangelog], ['CHANGELOG', repo.docChangelogPlain], ['docs/CHANGELOG.md', repo.docChangelogDocs],
    ['CHANGES.md', repo.docChanges], ['CHANGES.rst', repo.docChangesRst], ['HISTORY.md', repo.docHistory], ['NEWS.md', repo.docNews],
  ]

  function foundPath(pathMap: [string, DocBlob | null | undefined][]): string | null {
    for (const [path, blob] of pathMap) {
      if (blob != null) return path
    }
    return null
  }

  const readmeContent = readme?.text ?? null

  // Community-signal file checks (P2-F05). Issue templates: directory with at
  // least one .md/.yml/.yaml entry OR a legacy ISSUE_TEMPLATE.md. PR template:
  // any of the three supported locations. Synthesized here so the Documentation
  // scoring pipeline can fold them in alongside the five traditional files.
  const issueTemplateDirEntries = repo.commIssueTemplateDir?.entries ?? []
  const hasIssueTemplateDir = issueTemplateDirEntries.some((e) => /\.(md|ya?ml)$/i.test(e.name))
  const hasLegacyIssueTemplate = repo.commIssueTemplateLegacyRoot != null || repo.commIssueTemplateLegacyGithub != null
  const hasIssueTemplates = hasIssueTemplateDir || hasLegacyIssueTemplate
  const issueTemplatePath = hasIssueTemplateDir
    ? '.github/ISSUE_TEMPLATE/'
    : repo.commIssueTemplateLegacyGithub
      ? '.github/ISSUE_TEMPLATE.md'
      : repo.commIssueTemplateLegacyRoot
        ? 'ISSUE_TEMPLATE.md'
        : null

  const prTemplatePath = repo.commPrTemplateGithub
    ? '.github/PULL_REQUEST_TEMPLATE.md'
    : repo.commPrTemplateRoot
      ? 'PULL_REQUEST_TEMPLATE.md'
      : repo.commPrTemplateDocs
        ? 'docs/PULL_REQUEST_TEMPLATE.md'
        : null
  const hasPullRequestTemplate = prTemplatePath !== null

  const governancePath = repo.commGovernanceRoot
    ? 'GOVERNANCE.md'
    : repo.commGovernanceGithub
      ? '.github/GOVERNANCE.md'
      : repo.commGovernanceDocs
        ? 'docs/GOVERNANCE.md'
        : null
  const hasGovernance = governancePath !== null

  const fileChecks: DocumentationFileCheck[] = [
    { name: 'readme', found: readme !== null, path: readme?.path ?? null },
    { name: 'license', found: licenseBlob !== null, path: foundPath(licensePathMap) },
    { name: 'contributing', found: contributingBlob !== null, path: foundPath(contributingPathMap) },
    { name: 'code_of_conduct', found: codeOfConductBlob !== null, path: foundPath(codeOfConductPathMap) },
    { name: 'security', found: securityBlob !== null, path: foundPath([
      ['SECURITY.md', repo.docSecurity], ['security.md', repo.docSecurityLower], ['SECURITY.rst', repo.docSecurityRst],
      ['.github/SECURITY.md', repo.docSecurityGithub], ['.github/security.md', repo.docSecurityGithubLower],
      ['docs/SECURITY.md', repo.docSecurityDocs], ['docs/security.md', repo.docSecurityDocsLower],
      ['SECURITY_CONTACTS', repo.docSecurityContacts],
    ]) },
    { name: 'changelog', found: changelogBlob !== null, path: foundPath(changelogPathMap) },
    { name: 'issue_templates', found: hasIssueTemplates, path: issueTemplatePath },
    { name: 'pull_request_template', found: hasPullRequestTemplate, path: prTemplatePath },
    { name: 'governance', found: hasGovernance, path: governancePath },
  ]

  const readmeSections = detectReadmeSections(readmeContent)

  const adoptersFile = !!(
    repo.cncfAdopters ?? repo.cncfAdoptersLower ?? repo.cncfAdoptersPlain ?? repo.cncfAdoptersDocs
  )

  const roadmapFile = !!(
    repo.cncfRoadmap ?? repo.cncfRoadmapLower ?? repo.cncfRoadmapDocs
  )

  const maintainersFile = !!(
    repo.cncfMaintainers ?? repo.cncfMaintainersMd ?? repo.cncfMaintainersMdLower ??
    repo.cncfCodeowners ?? repo.cncfCodeownersGithub
  )

  // First 2000 chars of whichever CoC filename variant was found
  const cocContent = (codeOfConductBlob?.text?.slice(0, 2000)) ?? null

  return { fileChecks, readmeSections, readmeContent, adoptersFile, roadmapFile, maintainersFile, cocContent }
}

interface CommunitySignalSet {
  hasIssueTemplates: boolean | Unavailable
  hasPullRequestTemplate: boolean | Unavailable
  hasFundingConfig: boolean | Unavailable
  hasDiscussionsEnabled: boolean | Unavailable
  discussionsCountWindow: number | Unavailable
  discussionsWindowDays: ActivityWindowDays | Unavailable
  discussionsRecentCreatedAt: string[] | Unavailable
  discussionsRecentTruncated: boolean
}

/**
 * Extract the five community signals from the REPO_OVERVIEW response.
 *
 * Issue templates: directory under `.github/ISSUE_TEMPLATE/` containing at
 * least one `.md` or `.yml`/`.yaml` file, OR a legacy `ISSUE_TEMPLATE.md`
 * in the repo root or `.github/`.
 *
 * Pull-request template: `PULL_REQUEST_TEMPLATE.md` in `.github/`, repo
 * root, or `docs/`.
 *
 * Funding config: `.github/FUNDING.yml`.
 *
 * Discussions enabled: repository-level flag.
 *
 * Discussions count: gated on `hasDiscussionsEnabled === true`. Counts
 * discussions created within the last `windowDays` from the first 100
 * recent discussions. See specs/180-community-scoring/research.md Q2.
 */
export function extractCommunitySignals(
  repo: RepoOverviewResponse['repository'],
  windowDays: ActivityWindowDays = 90,
  discussionTimestamps?: string[],
  discussionsTruncated?: boolean,
): CommunitySignalSet {
  if (!repo) {
    return {
      hasIssueTemplates: 'unavailable',
      hasPullRequestTemplate: 'unavailable',
      hasFundingConfig: 'unavailable',
      hasDiscussionsEnabled: 'unavailable',
      discussionsCountWindow: 'unavailable',
      discussionsWindowDays: 'unavailable',
      discussionsRecentCreatedAt: 'unavailable',
      discussionsRecentTruncated: false,
    }
  }

  // Issue templates — either legacy file or directory with at least one template entry
  const dirEntries = repo.commIssueTemplateDir?.entries ?? []
  const hasTemplateDir = dirEntries.some((e) => /\.(md|ya?ml)$/i.test(e.name))
  const hasLegacyTemplate =
    repo.commIssueTemplateLegacyRoot != null || repo.commIssueTemplateLegacyGithub != null
  const hasIssueTemplates: boolean = hasTemplateDir || hasLegacyTemplate

  // PR template — any of the three supported locations
  const hasPullRequestTemplate: boolean =
    repo.commPrTemplateRoot != null ||
    repo.commPrTemplateGithub != null ||
    repo.commPrTemplateDocs != null

  // FUNDING.yml
  const hasFundingConfig: boolean = repo.commFunding != null

  // Discussions enabled
  const hasDiscussionsEnabled: boolean | Unavailable =
    typeof repo.hasDiscussionsEnabled === 'boolean' ? repo.hasDiscussionsEnabled : 'unavailable'

  // Discussions count in window (gated on enablement). The raw
  // `createdAt` array is also preserved so the UI can recompute counts for
  // other windows without re-fetching — see issue #194.
  let discussionsCountWindow: number | Unavailable = 'unavailable'
  let discussionsWindowDays: ActivityWindowDays | Unavailable = 'unavailable'
  let discussionsRecentCreatedAt: string[] | Unavailable = 'unavailable'
  let discussionsRecentTruncated = false
  if (hasDiscussionsEnabled === true) {
    // Prefer the fully-paginated list when supplied by the analyzer; fall
    // back to the first 100 nodes from the overview payload for test code
    // paths (community-signals.test.ts) that don't stub pagination.
    const timestamps =
      discussionTimestamps ?? (repo.commDiscussionsRecent?.nodes ?? []).map((n) => n.createdAt)
    discussionsRecentCreatedAt = timestamps
    discussionsRecentTruncated = discussionsTruncated ?? false
    const sinceMs = Date.now() - windowDays * 24 * 60 * 60 * 1000
    discussionsCountWindow = timestamps.filter((iso) => {
      const created = Date.parse(iso)
      return Number.isFinite(created) && created >= sinceMs
    }).length
    discussionsWindowDays = windowDays
  }

  return {
    hasIssueTemplates,
    hasPullRequestTemplate,
    hasFundingConfig,
    hasDiscussionsEnabled,
    discussionsCountWindow,
    discussionsWindowDays,
    discussionsRecentCreatedAt,
    discussionsRecentTruncated,
  }
}

import { newContributorMinSampleSize as NEW_CONTRIBUTOR_MIN_SAMPLE_SIZE } from '@/lib/community/score-config'

interface OnboardingSignalSet {
  goodFirstIssueCount: number | Unavailable
  devEnvironmentSetup: boolean | Unavailable
  gitpodPresent: boolean | Unavailable
  newContributorPRAcceptanceRate: number | Unavailable
}

export function extractOnboardingSignals(
  repo: RepoOverviewResponse['repository'],
  activityCounts: Pick<
    RepoActivityCountsResponse,
    | 'goodFirstIssues'
    | 'goodFirstIssuesHyphenated'
    | 'goodFirstIssuesBeginner'
    | 'goodFirstIssuesStarter'
    | 'recentMergedPullRequests'
  > | null,
): OnboardingSignalSet {
  if (!repo) {
    return {
      goodFirstIssueCount: 'unavailable',
      devEnvironmentSetup: 'unavailable',
      gitpodPresent: 'unavailable',
      newContributorPRAcceptanceRate: 'unavailable',
    }
  }

  // devEnvironmentSetup: any primary dev env file present
  const hasDevcontainerDir = (repo.onbDevcontainerDir?.entries?.length ?? 0) > 0
  const devEnvironmentSetup: boolean =
    hasDevcontainerDir ||
    repo.onbDevcontainerJson != null ||
    repo.onbDockerComposeYml != null ||
    repo.onbDockerComposeYaml != null

  // gitpodPresent: bonus-only signal
  const gitpodPresent: boolean = repo.onbGitpod != null

  // goodFirstIssueCount
  const goodFirstIssueBuckets = [
    activityCounts?.goodFirstIssues,
    activityCounts?.goodFirstIssuesHyphenated,
    activityCounts?.goodFirstIssuesBeginner,
    activityCounts?.goodFirstIssuesStarter,
  ]
  const goodFirstIssueCount: number | Unavailable =
    goodFirstIssueBuckets.some((bucket) => bucket != null)
      ? goodFirstIssueBuckets.reduce((total, bucket) => total + (bucket?.issueCount ?? 0), 0)
      : 'unavailable'

  // newContributorPRAcceptanceRate: first-time merged / first-time total
  let newContributorPRAcceptanceRate: number | Unavailable = 'unavailable'
  if (activityCounts?.recentMergedPullRequests != null) {
    const firstTimePRs = activityCounts.recentMergedPullRequests.nodes.filter(
      (n) => n.authorAssociation === 'FIRST_TIME_CONTRIBUTOR',
    )
    const total = firstTimePRs.length
    if (total >= NEW_CONTRIBUTOR_MIN_SAMPLE_SIZE) {
      const merged = firstTimePRs.filter((n) => n.mergedAt != null).length
      newContributorPRAcceptanceRate = merged / total
    }
  }

  return { goodFirstIssueCount, devEnvironmentSetup, gitpodPresent, newContributorPRAcceptanceRate }
}

export function extractSecurityResult(repo: RepoOverviewResponse['repository']): SecurityResult | 'unavailable' {
  if (!repo) return 'unavailable'

  const hasDependabot = (repo.secDependabot != null) || (repo.secDependabotYaml != null)
  const hasRenovate = (repo.secRenovateRoot != null) || (repo.secRenovateGithub != null) ||
    (repo.secRenovateConfig != null) || (repo.secRenovateRc != null)
  const securityPathMap: Array<[string, DocBlob | null | undefined]> = [
    ['SECURITY.md', repo.docSecurity],
    ['security.md', repo.docSecurityLower],
    ['SECURITY.rst', repo.docSecurityRst],
    ['.github/SECURITY.md', repo.docSecurityGithub],
    ['.github/security.md', repo.docSecurityGithubLower],
    ['docs/SECURITY.md', repo.docSecurityDocs],
    ['docs/security.md', repo.docSecurityDocsLower],
    ['SECURITY_CONTACTS', repo.docSecurityContacts],
  ]
  const securityPath = securityPathMap.find(([, blob]) => blob != null)?.[0] ?? null
  const hasSecurity = securityPath !== null
  const hasWorkflows = repo.workflowDir?.entries != null && repo.workflowDir.entries.length > 0

  const securityDetails = !hasSecurity
    ? null
    : securityPath === 'SECURITY_CONTACTS'
      ? 'SECURITY_CONTACTS detected (Kubernetes/CNCF convention — consider promoting to SECURITY.md for GitHub-standard recognition)'
      : `${securityPath} detected`

  const directChecks: DirectSecurityCheck[] = [
    {
      name: 'security_policy',
      detected: hasSecurity,
      details: securityDetails,
    },
    {
      name: 'dependabot',
      detected: hasDependabot || hasRenovate,
      details: hasDependabot ? 'Dependabot configuration detected' :
        hasRenovate ? 'Renovate configuration detected' : null,
    },
    {
      name: 'ci_cd',
      detected: hasWorkflows,
      details: hasWorkflows ? `${repo.workflowDir!.entries.length} workflow file(s) detected` : null,
    },
    {
      name: 'branch_protection',
      detected: 'unavailable',
      details: null,
    },
  ]

  return {
    scorecard: 'unavailable',
    directChecks,
    branchProtectionEnabled: 'unavailable',
  }
}

// Matches both Markdown headings (## Title) and RST headings (Title\n====)
function sectionPatterns(keyword: RegExp): RegExp[] {
  return [
    new RegExp(`^#+\\s*${keyword.source}`, 'im'),               // Markdown: ## Keyword
    new RegExp(`^(${keyword.source})[^\\n]*\\n[=\\-~^"]+$`, 'im'), // RST: Keyword\n======
  ]
}

const SECTION_PATTERNS: Array<{ name: ReadmeSectionCheck['name']; patterns: RegExp[] }> = [
  { name: 'description', patterns: sectionPatterns(/(?:about|overview|description|introduction|what is|features)/) },
  { name: 'installation', patterns: sectionPatterns(/(?:install(?:ation|ing)?|setup|getting\s*started|quick\s*start)/) },
  { name: 'usage', patterns: sectionPatterns(/(?:usage|examples?|how\s*to\s*use|tutorial|demo)/) },
  { name: 'contributing', patterns: sectionPatterns(/(?:contribut(?:ing|e|ors?)|how\s*to\s*contribute)/) },
  { name: 'license', patterns: sectionPatterns(/licen[sc]e/) },
]

function detectReadmeSections(content: string | null): ReadmeSectionCheck[] {
  if (!content) {
    return SECTION_PATTERNS.map(({ name }) => ({ name, detected: false }))
  }

  // Treat the first non-empty paragraph as a description if no explicit heading
  const hasDescriptionHeading = SECTION_PATTERNS[0]!.patterns.some((p) => p.test(content))
  const firstParagraph = content.split('\n').find((line) => line.trim().length > 0 && !line.startsWith('#'))
  const hasImplicitDescription = !hasDescriptionHeading && firstParagraph != null && firstParagraph.trim().length > 20

  return SECTION_PATTERNS.map(({ name, patterns }) => {
    if (name === 'description') {
      return { name, detected: hasDescriptionHeading || hasImplicitDescription }
    }
    return { name, detected: patterns.some((p) => p.test(content)) }
  })
}

function buildSearchQuery(repoSearch: string, qualifiers: string, dateField: 'created' | 'merged' | 'closed', since: Date) {
  return `repo:${repoSearch} ${qualifiers} ${dateField}:>=${since.toISOString().slice(0, 10)}`
}

function buildOpenIssuesOlderThanQuery(repoSearch: string, before: Date) {
  return `repo:${repoSearch} is:issue is:open created:<${before.toISOString().slice(0, 10)}`
}

function buildOpenPullRequestsOlderThanQuery(repoSearch: string, before: Date) {
  return `repo:${repoSearch} is:pr is:open created:<${before.toISOString().slice(0, 10)}`
}

function buildExclusiveIssueLabelQuery(repoSearch: string, label: string, excludedLabels: string[] = []): string {
  const exclusions = excludedLabels.map((excludedLabel) => `-label:"${excludedLabel}"`).join(' ')
  return `repo:${repoSearch} is:issue is:open label:"${label}"${exclusions ? ` ${exclusions}` : ''}`
}

export function buildGoodFirstIssueQueries(repoSearch: string): Record<
  | 'goodFirstIssueQuery'
  | 'goodFirstIssueHyphenatedQuery'
  | 'goodFirstIssueBeginnerQuery'
  | 'goodFirstIssueStarterQuery',
  string
> {
  return {
    goodFirstIssueQuery: buildExclusiveIssueLabelQuery(repoSearch, 'good first issue'),
    goodFirstIssueHyphenatedQuery: buildExclusiveIssueLabelQuery(repoSearch, 'good-first-issue', ['good first issue']),
    goodFirstIssueBeginnerQuery: buildExclusiveIssueLabelQuery(repoSearch, 'beginner', ['good first issue', 'good-first-issue']),
    goodFirstIssueStarterQuery: buildExclusiveIssueLabelQuery(repoSearch, 'starter', ['good first issue', 'good-first-issue', 'beginner']),
  }
}

// ─── Two-pass responsiveness fetch ───────────────────────────────────────────

const DETAIL_BATCH_SIZE = 10

async function fetchResponsivenessTwoPass(
  token: string,
  variables: Record<string, string>,
  diagnostics: Array<{ repo: string; source: string; message: string }>,
  repo: string,
): Promise<{ data: RepoResponsivenessResponse; rateLimit: RateLimitState | null }> {
  // Pass 1: Lightweight metadata query
  const metadataResult = await queryGitHubGraphQL<RepoResponsivenessMetadataResponse>(
    token,
    REPO_RESPONSIVENESS_METADATA_QUERY,
    variables,
  ).catch((error) => {
    diagnostics.push(buildDiagnostic(repo, 'github-graphql:responsiveness-metadata', error))
    return null
  })

  if (!metadataResult) {
    return { data: createUnavailableResponsivenessResponse(), rateLimit: null }
  }

  const metadata = metadataResult.data

  // Collect node IDs that need detail fetching (issues with comments, PRs with comments/reviews)
  const detailRequests: Array<{ id: string; type: 'issue' | 'pr' }> = []

  for (const issue of metadata.recentCreatedIssues?.nodes ?? []) {
    if (issue?.id && issue.comments?.totalCount > 0) {
      detailRequests.push({ id: issue.id, type: 'issue' })
    }
  }
  for (const issue of metadata.recentClosedIssues?.nodes ?? []) {
    if (issue?.id && issue.comments?.totalCount > 0) {
      detailRequests.push({ id: issue.id, type: 'issue' })
    }
  }
  for (const pr of metadata.recentCreatedPullRequests?.nodes ?? []) {
    if (pr?.id && (pr.comments?.totalCount > 0 || pr.reviews?.totalCount > 0)) {
      detailRequests.push({ id: pr.id, type: 'pr' })
    }
  }

  // Deduplicate by id
  const seen = new Set<string>()
  const uniqueRequests = detailRequests.filter((r) => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })

  // Pass 2: Fetch comment/review details in batches
  const detailMap = new Map<string, DetailNode>()
  let latestRateLimit = metadataResult.rateLimit

  for (let i = 0; i < uniqueRequests.length; i += DETAIL_BATCH_SIZE) {
    const batch = uniqueRequests.slice(i, i + DETAIL_BATCH_SIZE)
    const detailQuery = buildResponsivenessDetailQuery(batch)

    const detailResult = await queryGitHubGraphQL<Record<string, DetailNode | null>>(
      token,
      detailQuery,
      {},
    ).catch((error) => {
      diagnostics.push(buildDiagnostic(repo, 'github-graphql:responsiveness-detail', error))
      return null
    })

    if (detailResult) {
      latestRateLimit = detailResult.rateLimit ?? latestRateLimit
      for (let j = 0; j < batch.length; j++) {
        const node = detailResult.data[`node${j}`]
        if (node?.id) {
          detailMap.set(node.id, node)
        }
      }
    }
  }

  // Merge metadata + details into the full response shape
  const response = mergeResponsivenessData(metadata, detailMap)

  return { data: response, rateLimit: latestRateLimit }
}

function mergeResponsivenessData(
  metadata: RepoResponsivenessMetadataResponse,
  detailMap: Map<string, DetailNode>,
): RepoResponsivenessResponse {
  function enrichIssue(meta: MetadataIssueNode): ResponsivenessIssueNode {
    const detail = detailMap.get(meta.id)
    return {
      createdAt: meta.createdAt,
      closedAt: meta.closedAt,
      author: meta.author,
      comments: detail?.comments ?? { totalCount: meta.comments.totalCount, nodes: [] },
    }
  }

  function enrichPR(meta: MetadataPullRequestNode): ResponsivenessPullRequestNode {
    const detail = detailMap.get(meta.id)
    return {
      createdAt: meta.createdAt,
      author: meta.author,
      comments: detail?.comments ?? { totalCount: meta.comments.totalCount, nodes: [] },
      reviews: detail?.reviews ?? { totalCount: meta.reviews.totalCount, nodes: [] },
    }
  }

  return {
    recentCreatedIssues: {
      nodes: (metadata.recentCreatedIssues?.nodes ?? []).filter(Boolean).map(enrichIssue),
    },
    recentClosedIssues: {
      nodes: (metadata.recentClosedIssues?.nodes ?? []).filter(Boolean).map(enrichIssue),
    },
    recentCreatedPullRequests: {
      nodes: (metadata.recentCreatedPullRequests?.nodes ?? []).filter(Boolean).map(enrichPR),
    },
    recentMergedPullRequests: metadata.recentMergedPullRequests,
    staleOpenPullRequests30: metadata.staleOpenPullRequests30,
    staleOpenPullRequests60: metadata.staleOpenPullRequests60,
    staleOpenPullRequests90: metadata.staleOpenPullRequests90,
    staleOpenPullRequests180: metadata.staleOpenPullRequests180,
    staleOpenPullRequests365: metadata.staleOpenPullRequests365,
  }
}

function createUnavailableResponsivenessResponse(): RepoResponsivenessResponse {
  return {
    recentCreatedIssues: { nodes: [] },
    recentClosedIssues: { nodes: [] },
    recentCreatedPullRequests: { nodes: [] },
    recentMergedPullRequests: { nodes: [] },
    staleOpenPullRequests30: { issueCount: 0 },
    staleOpenPullRequests60: { issueCount: 0 },
    staleOpenPullRequests90: { issueCount: 0 },
    staleOpenPullRequests180: { issueCount: 0 },
    staleOpenPullRequests365: { issueCount: 0 },
  }
}

function buildResponsivenessMetricsByWindow(
  responsiveness: RepoResponsivenessResponse,
  activityMetricsByWindow: Record<ActivityWindowDays, ActivityWindowMetrics>,
  openIssueCount: number | undefined,
  openPullRequestCount: number | undefined,
): Record<ActivityWindowDays, ResponsivenessMetrics> {
  const recentCreatedIssues = responsiveness.recentCreatedIssues?.nodes ?? []
  const recentClosedIssues = responsiveness.recentClosedIssues?.nodes ?? []
  const recentCreatedPullRequests = responsiveness.recentCreatedPullRequests?.nodes ?? []
  const recentMergedPullRequests = responsiveness.recentMergedPullRequests?.nodes ?? []

  return {
    30: buildResponsivenessMetricsForWindow(
      30,
      recentCreatedIssues,
      recentClosedIssues,
      recentCreatedPullRequests,
      recentMergedPullRequests,
      activityMetricsByWindow[30],
      responsiveness.staleOpenPullRequests30?.issueCount,
      openIssueCount,
      openPullRequestCount,
    ),
    60: buildResponsivenessMetricsForWindow(
      60,
      recentCreatedIssues,
      recentClosedIssues,
      recentCreatedPullRequests,
      recentMergedPullRequests,
      activityMetricsByWindow[60],
      responsiveness.staleOpenPullRequests60?.issueCount,
      openIssueCount,
      openPullRequestCount,
    ),
    90: buildResponsivenessMetricsForWindow(
      90,
      recentCreatedIssues,
      recentClosedIssues,
      recentCreatedPullRequests,
      recentMergedPullRequests,
      activityMetricsByWindow[90],
      responsiveness.staleOpenPullRequests90?.issueCount,
      openIssueCount,
      openPullRequestCount,
    ),
    180: buildResponsivenessMetricsForWindow(
      180,
      recentCreatedIssues,
      recentClosedIssues,
      recentCreatedPullRequests,
      recentMergedPullRequests,
      activityMetricsByWindow[180],
      responsiveness.staleOpenPullRequests180?.issueCount,
      openIssueCount,
      openPullRequestCount,
    ),
    365: buildResponsivenessMetricsForWindow(
      365,
      recentCreatedIssues,
      recentClosedIssues,
      recentCreatedPullRequests,
      recentMergedPullRequests,
      activityMetricsByWindow[365],
      responsiveness.staleOpenPullRequests365?.issueCount,
      openIssueCount,
      openPullRequestCount,
    ),
  }
}

function buildResponsivenessMetricsForWindow(
  windowDays: ActivityWindowDays,
  recentCreatedIssues: ResponsivenessIssueNode[],
  recentClosedIssues: ResponsivenessIssueNode[],
  recentCreatedPullRequests: ResponsivenessPullRequestNode[],
  recentMergedPullRequests: Array<{ createdAt: string; mergedAt: string | null }>,
  activityMetrics: ActivityWindowMetrics,
  staleOpenPullRequestCount: number | undefined,
  openIssueCount: number | undefined,
  openPullRequestCount: number | undefined,
): ResponsivenessMetrics {
  const issueNodesInWindow = filterNodesByStartDate(recentCreatedIssues, windowDays)
  const closedIssueNodesInWindow = filterNodesByEndDate(recentClosedIssues, 'closedAt', windowDays)
  const createdPullRequestsInWindow = filterNodesByStartDate(recentCreatedPullRequests, windowDays)
  const mergedPullRequestsInWindow = filterNodesByEndDate(recentMergedPullRequests, 'mergedAt', windowDays)

  const issueFirstResponseDurations = issueNodesInWindow
    .map((issue) => getIssueFirstResponseDurationHours(issue))
    .filter((value): value is number => value != null)
  const prFirstReviewDurations = createdPullRequestsInWindow
    .map((pullRequest) => getPullRequestFirstReviewDurationHours(pullRequest))
    .filter((value): value is number => value != null)
  const issueResolutionDurations = closedIssueNodesInWindow
    .map((issue) => getDurationHours(issue.createdAt, issue.closedAt ?? null))
    .filter((value): value is number => value != null)
  const prMergeDurations = mergedPullRequestsInWindow
    .map((pullRequest) => getDurationHours(pullRequest.createdAt, pullRequest.mergedAt))
    .filter((value): value is number => value != null)

  const interactionSignals = [
    ...issueNodesInWindow.map((issue) => getResponseSignal(issue.author?.login ?? null, issue.comments.nodes)),
    ...createdPullRequestsInWindow.map((pullRequest) =>
      getResponseSignal(pullRequest.author?.login ?? null, [...pullRequest.comments.nodes, ...pullRequest.reviews.nodes]),
    ),
  ].filter((signal): signal is ResponseSignal => signal != null)

  const itemsWithHumanResponse = interactionSignals.filter((signal) => signal.firstHumanResponseAt != null).length
  const itemsWithBotFirstResponse = interactionSignals.filter((signal) => signal.firstResponderKind === 'bot').length
  const itemsWithHumanFirstResponse = interactionSignals.filter((signal) => signal.firstResponderKind === 'human').length
  const itemsWithAnyFirstResponse = interactionSignals.filter((signal) => signal.firstResponderKind != null).length

  return {
    issueFirstResponseMedianHours: computeMedian(issueFirstResponseDurations),
    issueFirstResponseP90Hours: computePercentile(issueFirstResponseDurations, 0.9),
    prFirstReviewMedianHours: computeMedian(prFirstReviewDurations),
    prFirstReviewP90Hours: computePercentile(prFirstReviewDurations, 0.9),
    issueResolutionMedianHours: computeMedian(issueResolutionDurations),
    issueResolutionP90Hours: computePercentile(issueResolutionDurations, 0.9),
    prMergeMedianHours: computeMedian(prMergeDurations),
    prMergeP90Hours: computePercentile(prMergeDurations, 0.9),
    issueResolutionRate: computeRatio(activityMetrics.issuesClosed, activityMetrics.issuesOpened),
    contributorResponseRate:
      interactionSignals.length > 0 ? itemsWithHumanResponse / interactionSignals.length : 'unavailable',
    botResponseRatio: itemsWithAnyFirstResponse > 0 ? itemsWithBotFirstResponse / itemsWithAnyFirstResponse : 'unavailable',
    humanResponseRatio: itemsWithAnyFirstResponse > 0 ? itemsWithHumanFirstResponse / itemsWithAnyFirstResponse : 'unavailable',
    staleIssueRatio: activityMetrics.staleIssueRatio,
    stalePrRatio: computeStaleItemRatio(staleOpenPullRequestCount, openPullRequestCount),
    prReviewDepth:
      createdPullRequestsInWindow.length > 0
        ? createdPullRequestsInWindow.reduce((total, pullRequest) => total + pullRequest.reviews.totalCount, 0) /
          createdPullRequestsInWindow.length
        : 'unavailable',
    issuesClosedWithoutCommentRatio:
      closedIssueNodesInWindow.length > 0
        ? closedIssueNodesInWindow.filter((issue) => issue.comments.totalCount === 0).length / closedIssueNodesInWindow.length
        : 'unavailable',
    openIssueCount: typeof openIssueCount === 'number' ? openIssueCount : 'unavailable',
    openPullRequestCount: typeof openPullRequestCount === 'number' ? openPullRequestCount : 'unavailable',
  }
}

function buildActivityMetricsByWindow(
  activity: RepoActivityResponse,
  now: Date,
  recentCommitNodes: CommitNode[],
  openIssueCount: number | undefined,
): Record<ActivityWindowDays, ActivityWindowMetrics> {
  const legacyActivity = activity as RepoActivityResponse & LegacyRepoActivityResponse
  const defaultBranchTarget = activity.repository?.defaultBranchRef?.target
  const releaseDates =
    activity.repository?.releases?.nodes?.map((release) => release.publishedAt ?? release.createdAt).filter((value): value is string => Boolean(value)) ??
    []

  const commitCountsByWindow: Record<ActivityWindowDays, number | Unavailable> = {
    30: defaultBranchTarget?.recent30?.totalCount ?? 'unavailable',
    60: defaultBranchTarget?.recent60?.totalCount ?? 'unavailable',
    90: defaultBranchTarget?.recent90?.totalCount ?? 'unavailable',
    180: defaultBranchTarget?.recent180?.totalCount ?? 'unavailable',
    365: recentCommitNodes.length > 0 ? recentCommitNodes.length : defaultBranchTarget?.recent365Commits?.nodes.length ?? 'unavailable',
  }

  const mergedPullRequestNodes = activity.recentMergedPullRequests?.nodes ?? []
  const closedIssueNodes = activity.recentClosedIssues?.nodes ?? []

  return {
    30: {
      commits: commitCountsByWindow[30],
      prsOpened: activity.prsOpened30?.issueCount ?? 'unavailable',
      prsMerged: activity.prsMerged30?.issueCount ?? 'unavailable',
      issuesOpened: activity.issuesOpened30?.issueCount ?? 'unavailable',
      issuesClosed: activity.issuesClosed30?.issueCount ?? 'unavailable',
      releases: countReleaseDatesWithinWindow(releaseDates, now, 30),
      staleIssueRatio: computeStaleIssueRatio(activity.staleIssues30?.issueCount, openIssueCount),
      medianTimeToMergeHours: computeMedianDurationHoursWithinWindow(mergedPullRequestNodes, 'mergedAt', now, 30),
      medianTimeToCloseHours: computeMedianDurationHoursWithinWindow(closedIssueNodes, 'closedAt', now, 30),
    },
    60: {
      commits: commitCountsByWindow[60],
      prsOpened: activity.prsOpened60?.issueCount ?? 'unavailable',
      prsMerged: activity.prsMerged60?.issueCount ?? 'unavailable',
      issuesOpened: activity.issuesOpened60?.issueCount ?? 'unavailable',
      issuesClosed: activity.issuesClosed60?.issueCount ?? 'unavailable',
      releases: countReleaseDatesWithinWindow(releaseDates, now, 60),
      staleIssueRatio: computeStaleIssueRatio(activity.staleIssues60?.issueCount, openIssueCount),
      medianTimeToMergeHours: computeMedianDurationHoursWithinWindow(mergedPullRequestNodes, 'mergedAt', now, 60),
      medianTimeToCloseHours: computeMedianDurationHoursWithinWindow(closedIssueNodes, 'closedAt', now, 60),
    },
    90: {
      commits: commitCountsByWindow[90],
      prsOpened: activity.prsOpened90?.issueCount ?? legacyActivity.prsOpened?.issueCount ?? 'unavailable',
      prsMerged: activity.prsMerged90?.issueCount ?? legacyActivity.prsMerged?.issueCount ?? 'unavailable',
      issuesOpened: activity.issuesOpened90?.issueCount ?? 'unavailable',
      issuesClosed: activity.issuesClosed90?.issueCount ?? legacyActivity.issuesClosed?.issueCount ?? 'unavailable',
      releases: countReleaseDatesWithinWindow(releaseDates, now, 90),
      staleIssueRatio: computeStaleIssueRatio(activity.staleIssues90?.issueCount, openIssueCount),
      medianTimeToMergeHours: computeMedianDurationHoursWithinWindow(mergedPullRequestNodes, 'mergedAt', now, 90),
      medianTimeToCloseHours: computeMedianDurationHoursWithinWindow(closedIssueNodes, 'closedAt', now, 90),
    },
    180: {
      commits: commitCountsByWindow[180],
      prsOpened: activity.prsOpened180?.issueCount ?? 'unavailable',
      prsMerged: activity.prsMerged180?.issueCount ?? 'unavailable',
      issuesOpened: activity.issuesOpened180?.issueCount ?? 'unavailable',
      issuesClosed: activity.issuesClosed180?.issueCount ?? 'unavailable',
      releases: countReleaseDatesWithinWindow(releaseDates, now, 180),
      staleIssueRatio: computeStaleIssueRatio(activity.staleIssues180?.issueCount, openIssueCount),
      medianTimeToMergeHours: computeMedianDurationHoursWithinWindow(mergedPullRequestNodes, 'mergedAt', now, 180),
      medianTimeToCloseHours: computeMedianDurationHoursWithinWindow(closedIssueNodes, 'closedAt', now, 180),
    },
    365: {
      commits: commitCountsByWindow[365],
      prsOpened: activity.prsOpened365?.issueCount ?? 'unavailable',
      prsMerged: activity.prsMerged365?.issueCount ?? 'unavailable',
      issuesOpened: activity.issuesOpened365?.issueCount ?? 'unavailable',
      issuesClosed: activity.issuesClosed365?.issueCount ?? 'unavailable',
      releases: countReleaseDatesWithinWindow(releaseDates, now, 365),
      staleIssueRatio: computeStaleIssueRatio(activity.staleIssues365?.issueCount, openIssueCount),
      medianTimeToMergeHours: computeMedianDurationHoursWithinWindow(mergedPullRequestNodes, 'mergedAt', now, 365),
      medianTimeToCloseHours: computeMedianDurationHoursWithinWindow(closedIssueNodes, 'closedAt', now, 365),
    },
  }
}

function countReleaseDatesWithinWindow(releaseDates: string[], now: Date, windowDays: ActivityWindowDays): number | Unavailable {
  if (releaseDates.length === 0) {
    return 0
  }

  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - windowDays)

  return releaseDates.filter((value) => {
    const date = new Date(value)
    return !Number.isNaN(date.getTime()) && date >= cutoff
  }).length
}

function computeStaleIssueRatio(staleIssueCount: number | undefined, openIssueCount: number | undefined): number | Unavailable {
  if (typeof staleIssueCount !== 'number' || typeof openIssueCount !== 'number' || openIssueCount <= 0) {
    return 'unavailable'
  }

  return staleIssueCount / openIssueCount
}

function computeStaleItemRatio(staleItemCount: number | undefined, openItemCount: number | undefined): number | Unavailable {
  if (typeof staleItemCount !== 'number' || typeof openItemCount !== 'number' || openItemCount <= 0) {
    return 'unavailable'
  }

  return staleItemCount / openItemCount
}

function collectIssueFirstResponseTimestamps(issues: ResponsivenessIssueNode[], windowDays: ActivityWindowDays): string[] | Unavailable {
  const timestamps = filterNodesByStartDate(issues, windowDays)
    .map((issue) => getFirstNonAuthorInteraction(issue.author?.login ?? null, issue.comments.nodes)?.createdAt ?? null)
    .filter((value): value is string => Boolean(value))

  return timestamps.length > 0 ? timestamps : 'unavailable'
}

function collectIssueCloseTimestamps(issues: ResponsivenessIssueNode[], windowDays: ActivityWindowDays): string[] | Unavailable {
  const timestamps = filterNodesByEndDate(issues, 'closedAt', windowDays)
    .map((issue) => issue.closedAt)
    .filter((value): value is string => Boolean(value))
  return timestamps.length > 0 ? timestamps : 'unavailable'
}

function collectPullRequestMergeTimestamps(
  pullRequests: Array<{
    createdAt: string
    mergedAt: string | null
  }>,
  windowDays: ActivityWindowDays,
): string[] | Unavailable {
  const timestamps = filterNodesByEndDate(pullRequests, 'mergedAt', windowDays)
    .map((pullRequest) => pullRequest.mergedAt)
    .filter((value): value is string => Boolean(value))
  return timestamps.length > 0 ? timestamps : 'unavailable'
}

function computeMedianDurationHours<T extends { createdAt: string }>(
  nodes: Array<T & Record<string, string | null>> | undefined,
  endField: string,
): number | Unavailable {
  if (!nodes?.length) {
    return 'unavailable'
  }

  const durations = nodes
    .map((node) => {
      const createdAt = new Date(node.createdAt)
      const endValue = node[endField]
      const endedAt = typeof endValue === 'string' ? new Date(endValue) : null

      if (Number.isNaN(createdAt.getTime()) || !endedAt || Number.isNaN(endedAt.getTime()) || endedAt < createdAt) {
        return null
      }

      return (endedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
    })
    .filter((value): value is number => value != null)
    .sort((left, right) => left - right)

  if (durations.length === 0) {
    return 'unavailable'
  }

  const middle = Math.floor(durations.length / 2)
  if (durations.length % 2 === 1) {
    return durations[middle] ?? 'unavailable'
  }

  const lower = durations[middle - 1]
  const upper = durations[middle]
  if (lower == null || upper == null) {
    return 'unavailable'
  }

  return (lower + upper) / 2
}

function computeMedian(values: number[]): number | Unavailable {
  if (values.length === 0) {
    return 'unavailable'
  }

  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? 'unavailable'
  }

  const lower = sorted[middle - 1]
  const upper = sorted[middle]
  if (lower == null || upper == null) {
    return 'unavailable'
  }

  return (lower + upper) / 2
}

function computePercentile(values: number[], percentile: number): number | Unavailable {
  if (values.length === 0) {
    return 'unavailable'
  }

  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.max(0, Math.ceil(sorted.length * percentile) - 1)
  return sorted[index] ?? 'unavailable'
}

function computeRatio(numerator: number | Unavailable, denominator: number | Unavailable): number | Unavailable {
  if (typeof numerator !== 'number' || typeof denominator !== 'number' || denominator <= 0) {
    return 'unavailable'
  }

  return numerator / denominator
}

function getIssueFirstResponseDurationHours(issue: ResponsivenessIssueNode): number | null {
  return getDurationHours(issue.createdAt, getFirstNonAuthorInteraction(issue.author?.login ?? null, issue.comments.nodes)?.createdAt ?? null)
}

function getPullRequestFirstReviewDurationHours(pullRequest: ResponsivenessPullRequestNode): number | null {
  const firstReview = getFirstNonAuthorInteraction(pullRequest.author?.login ?? null, pullRequest.reviews.nodes)
  return getDurationHours(pullRequest.createdAt, firstReview?.createdAt ?? null)
}

function getResponseSignal(
  authorLogin: string | null,
  interactions: Array<{ createdAt: string; author: SearchActorNode | null }>,
): ResponseSignal | null {
  const firstResponse = getFirstNonAuthorInteraction(authorLogin, interactions)
  if (!firstResponse) {
    return {
      firstResponderKind: null,
      firstHumanResponseAt: null,
    }
  }

  return {
    firstResponderKind: isBotLogin(firstResponse.author?.login ?? null) ? 'bot' : 'human',
    firstHumanResponseAt: isBotLogin(firstResponse.author?.login ?? null) ? null : firstResponse.createdAt,
  }
}

function getFirstNonAuthorInteraction<T extends { createdAt: string; author: SearchActorNode | null }>(
  authorLogin: string | null,
  interactions: T[],
): T | null {
  const createdAtSorted = [...interactions].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  )

  for (const interaction of createdAtSorted) {
    const responderLogin = interaction.author?.login ?? null
    if (!responderLogin || responderLogin === authorLogin) {
      continue
    }

    return interaction
  }

  return null
}

function getDurationHours(start: string, end: string | null): number | null {
  if (!end) {
    return null
  }

  const startedAt = new Date(start)
  const endedAt = new Date(end)

  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime()) || endedAt < startedAt) {
    return null
  }

  return (endedAt.getTime() - startedAt.getTime()) / (1000 * 60 * 60)
}

function filterNodesByStartDate<T extends { createdAt: string }>(nodes: T[], windowDays: ActivityWindowDays) {
  const cutoffTime = getWindowCutoffTime(windowDays)

  return nodes.filter((node) => {
    const createdAt = new Date(node.createdAt).getTime()
    return !Number.isNaN(createdAt) && createdAt >= cutoffTime
  })
}

function filterNodesByEndDate<T extends object, K extends keyof T>(
  nodes: T[],
  endField: K,
  windowDays: ActivityWindowDays,
) {
  const cutoffTime = getWindowCutoffTime(windowDays)

  return nodes.filter((node) => {
    const endValue = node[endField]
    if (typeof endValue !== 'string') {
      return false
    }

    const endedAt = new Date(endValue).getTime()
    return !Number.isNaN(endedAt) && endedAt >= cutoffTime
  })
}

function getWindowCutoffTime(windowDays: ActivityWindowDays) {
  return Date.now() - windowDays * 24 * 60 * 60 * 1000
}

function isBotLogin(login: string | null) {
  if (!login) {
    return false
  }

  return login.includes('[bot]') || login.endsWith('-bot')
}

function computeMedianDurationHoursWithinWindow<T extends { createdAt: string }>(
  nodes: Array<T & Record<string, string | null>>,
  endField: string,
  now: Date,
  windowDays: ActivityWindowDays,
): number | Unavailable {
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - windowDays)

  const windowNodes = nodes.filter((node) => {
    const endValue = node[endField]
    if (typeof endValue !== 'string') {
      return false
    }

    const endDate = new Date(endValue)
    return !Number.isNaN(endDate.getTime()) && endDate >= cutoff
  })

  return computeMedianDurationHours(windowNodes, endField)
}

async function buildExperimentalOrganizationCommitCountsByWindow(
  token: string,
  recentCommitNodes: CommitNode[],
  now: Date,
): Promise<{
  data: Record<ContributorWindowDays, ContributorWindowMetrics>
  rateLimit: RateLimitState | null
}> {
  if (recentCommitNodes.length === 0) {
    return {
      data: createUnavailableContributorWindowMetrics(),
      rateLimit: null,
    }
  }

  const uniqueLogins = new Set<string>()
  for (const node of recentCommitNodes) {
    const login = node.author?.user?.login?.trim()
    if (login) {
      uniqueLogins.add(login)
    }
  }

  let rateLimit: RateLimitState | null = null
  const organizationsByLogin = new Map<string, string[]>()

  for (const login of uniqueLogins) {
    const response = await fetchPublicUserOrganizations(token, login).catch((error) => ({
      data: 'unavailable' as const,
      rateLimit: extractRateLimitFromError(error),
    }))
    rateLimit = response.rateLimit ?? rateLimit

    if (response.data === 'unavailable') {
      organizationsByLogin.set(login, [])
      continue
    }

    organizationsByLogin.set(login, response.data)
  }

  return {
    data: buildExperimentalMetricsByWindow(recentCommitNodes, organizationsByLogin, now),
    rateLimit,
  }
}

// Cap discussions pagination. Discussions pages are small and cheap, but
// we still bound worst-case cost for hyperactive forums (e.g. vercel/next.js
// which has thousands). 20 pages × 100 = 2,000 within-year discussions —
// comfortably above the saturation point while preventing runaway cost.
const MAX_DISCUSSION_PAGES = 20
const DISCUSSION_WINDOW_CAP_DAYS = 365

async function collectRecentDiscussionTimestamps({
  token,
  owner,
  name,
  initialConnection,
}: {
  token: string
  owner: string
  name: string
  initialConnection: NonNullable<RepoOverviewResponse['repository']>['commDiscussionsRecent'] | null | undefined
}): Promise<{ createdAt: string[]; truncated: boolean; rateLimit: RateLimitState | null }> {
  if (!initialConnection) {
    return { createdAt: [], truncated: false, rateLimit: null }
  }

  const createdAt: string[] = initialConnection.nodes.map((n) => n.createdAt)
  const cutoffMs = Date.now() - DISCUSSION_WINDOW_CAP_DAYS * 24 * 60 * 60 * 1000
  let rateLimit: RateLimitState | null = null
  let hasNextPage = initialConnection.pageInfo?.hasNextPage ?? false
  let cursor = initialConnection.pageInfo?.endCursor ?? null

  // Short-circuit: if the first page already crossed the 365d cutoff,
  // everything we care about is in hand.
  const crossedCutoff = (nodes: string[]): boolean => {
    if (nodes.length === 0) return false
    const oldestMs = Date.parse(nodes[nodes.length - 1]!)
    return Number.isFinite(oldestMs) && oldestMs < cutoffMs
  }
  if (crossedCutoff(createdAt)) {
    return { createdAt, truncated: false, rateLimit }
  }

  let pagesFetched = 1 // the initial overview page counts as page 1
  while (
    hasNextPage &&
    cursor &&
    pagesFetched < MAX_DISCUSSION_PAGES
  ) {
    const response = await queryGitHubGraphQL<{
      repository: { discussions: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: Array<{ createdAt: string }> } } | null
    }>(token, REPO_DISCUSSIONS_PAGE_QUERY, { owner, name, after: cursor })
    rateLimit = response.rateLimit ?? rateLimit
    const connection = response.data.repository?.discussions
    if (!connection) break
    const pageTimestamps = connection.nodes.map((n) => n.createdAt)
    createdAt.push(...pageTimestamps)
    pagesFetched += 1
    if (crossedCutoff(pageTimestamps)) {
      return { createdAt, truncated: false, rateLimit }
    }
    hasNextPage = connection.pageInfo.hasNextPage
    cursor = connection.pageInfo.endCursor
  }

  // Truncated only when we hit the page cap while still inside the window.
  const truncated = hasNextPage && pagesFetched >= MAX_DISCUSSION_PAGES
  return { createdAt, truncated, rateLimit }
}

// Cap commit history pagination to avoid extremely long analysis times
// for repos like torvalds/linux (50,000+ commits/year). 2,000 commits
// is enough to identify unique contributors and compute accurate ratios.
const MAX_COMMIT_HISTORY_NODES = 2000

async function collectRecentCommitHistory({
  token,
  owner,
  name,
  since365,
  initialConnection,
}: {
  token: string
  owner: string
  name: string
  since365: string
  initialConnection: CommitHistoryConnection | null
}): Promise<{ nodes: CommitNode[]; rateLimit: RateLimitState | null }> {
  if (!initialConnection) {
    return { nodes: [], rateLimit: null }
  }

  const nodes = [...initialConnection.nodes]
  let rateLimit: RateLimitState | null = null
  let hasNextPage = initialConnection.pageInfo.hasNextPage
  let cursor = initialConnection.pageInfo.endCursor

  while (hasNextPage && cursor && nodes.length < MAX_COMMIT_HISTORY_NODES) {
    const response = await queryGitHubGraphQL<RepoCommitHistoryPageResponse>(token, REPO_COMMIT_HISTORY_PAGE_QUERY, {
      owner,
      name,
      since365,
      after: cursor,
    })

    rateLimit = response.rateLimit ?? rateLimit

    const connection = response.data.repository?.defaultBranchRef?.target?.recent365Commits
    if (!connection) {
      break
    }

    nodes.push(...connection.nodes)
    hasNextPage = connection.pageInfo.hasNextPage
    cursor = connection.pageInfo.endCursor
  }

  return { nodes, rateLimit }
}

function buildContributorMetricsByWindow(
  recentCommitNodes: CommitNode[],
  now: Date,
): Record<ContributorWindowDays, ContributorWindowMetrics> {
  const earliestContributionByAuthor = buildEarliestContributionByAuthor(recentCommitNodes)

  return Object.fromEntries(
    CONTRIBUTOR_WINDOW_DAYS.map((windowDays) => {
      const windowNodes = filterCommitNodesByWindow(recentCommitNodes, now, windowDays)
      const metrics = buildContributorMetrics(windowNodes, earliestContributionByAuthor, now, windowDays)

      return [
        windowDays,
        {
          ...metrics,
          commitCountsByExperimentalOrg: 'unavailable',
          experimentalAttributedAuthors: 'unavailable',
          experimentalUnattributedAuthors: 'unavailable',
        },
      ]
    }),
  ) as Record<ContributorWindowDays, ContributorWindowMetrics>
}

function buildContributorMetrics(
  recentCommitNodes: CommitNode[],
  earliestContributionByAuthor: Map<string, number> | Unavailable,
  now: Date,
  windowDays: ContributorWindowDays,
): Pick<ContributorWindowMetrics, 'uniqueCommitAuthors' | 'commitCountsByAuthor' | 'repeatContributors' | 'newContributors'> {
  if (recentCommitNodes.length === 0) {
    return {
      uniqueCommitAuthors: 0,
      commitCountsByAuthor: {},
      repeatContributors: 0,
      newContributors: 0,
    }
  }

  const commitCountsByAuthor = new Map<string, number>()

  for (const node of recentCommitNodes) {
    const actorKey = getCommitActorKey(node)

    if (!actorKey) {
      return {
        uniqueCommitAuthors: 'unavailable',
        commitCountsByAuthor: 'unavailable',
        repeatContributors: 'unavailable',
        newContributors: 'unavailable',
      }
    }

    commitCountsByAuthor.set(actorKey, (commitCountsByAuthor.get(actorKey) ?? 0) + 1)
  }

  const repeatContributors = Array.from(commitCountsByAuthor.values()).filter((count) => count > 1).length
  const newContributorCutoff = new Date(now)
  newContributorCutoff.setDate(now.getDate() - windowDays)

  const newContributors =
    earliestContributionByAuthor === 'unavailable'
      ? 'unavailable'
      : Array.from(commitCountsByAuthor.keys()).filter((actorKey) => {
          const firstSeenAt = earliestContributionByAuthor.get(actorKey)
          return typeof firstSeenAt === 'number' && firstSeenAt >= newContributorCutoff.getTime()
        }).length

  return {
    uniqueCommitAuthors: commitCountsByAuthor.size,
    commitCountsByAuthor: Object.fromEntries(commitCountsByAuthor.entries()),
    repeatContributors,
    newContributors,
  }
}

function createUnavailableContributorWindowMetrics(): Record<ContributorWindowDays, ContributorWindowMetrics> {
  return Object.fromEntries(
    CONTRIBUTOR_WINDOW_DAYS.map((windowDays) => [
      windowDays,
      {
        uniqueCommitAuthors: 'unavailable',
        commitCountsByAuthor: 'unavailable',
        repeatContributors: 'unavailable',
        newContributors: 'unavailable',
        commitCountsByExperimentalOrg: 'unavailable',
        experimentalAttributedAuthors: 'unavailable',
        experimentalUnattributedAuthors: 'unavailable',
        commitAuthorsByExperimentalOrg: 'unavailable',
        commitCountsByEmailDomain: 'unavailable',
        commitAuthorsByEmailDomain: 'unavailable',
      },
    ]),
  ) as Record<ContributorWindowDays, ContributorWindowMetrics>
}

function buildExperimentalMetricsByWindow(
  recentCommitNodes: CommitNode[],
  organizationsByLogin: Map<string, string[]>,
  now: Date,
): Record<ContributorWindowDays, ContributorWindowMetrics> {
  return Object.fromEntries(
    CONTRIBUTOR_WINDOW_DAYS.map((windowDays) => {
      const windowNodes = filterCommitNodesByWindow(recentCommitNodes, now, windowDays)
      if (windowNodes.length === 0) {
        return [
          windowDays,
          {
            uniqueCommitAuthors: 'unavailable',
            commitCountsByAuthor: 'unavailable',
            repeatContributors: 'unavailable',
            newContributors: 'unavailable',
            commitCountsByExperimentalOrg: 'unavailable',
            experimentalAttributedAuthors: 'unavailable',
            experimentalUnattributedAuthors: 'unavailable',
            commitAuthorsByExperimentalOrg: 'unavailable',
            commitCountsByEmailDomain: 'unavailable',
            commitAuthorsByEmailDomain: 'unavailable',
          },
        ]
      }

      const commitCountsByExperimentalOrg = new Map<string, number>()
      const commitAuthorsByExperimentalOrg = new Map<string, Set<string>>()
      const commitCountsByEmailDomain = new Map<string, number>()
      const commitAuthorsByEmailDomain = new Map<string, Set<string>>()
      const attributedAuthors = new Set<string>()
      const unattributedAuthors = new Set<string>()
      let sawResolvableAuthor = false

      for (const node of windowNodes) {
        const actorKey = getCommitActorKey(node)
        if (!actorKey) {
          continue
        }
        sawResolvableAuthor = true

        const login = node.author?.user?.login?.trim()
        if (!login) {
          // Email-based actor: track by email domain
          const email = node.author?.email?.toLowerCase()?.trim()
          if (email) {
            const domain = email.split('@')[1]
            if (domain) {
              commitCountsByEmailDomain.set(domain, (commitCountsByEmailDomain.get(domain) ?? 0) + 1)
              const dSet = commitAuthorsByEmailDomain.get(domain) ?? new Set<string>()
              if (dSet.size < 500) dSet.add(`email:${email}`)
              commitAuthorsByEmailDomain.set(domain, dSet)
            }
          }
          unattributedAuthors.add(actorKey)
          continue
        }

        // Always track commit email domain as a secondary corporate-attribution signal.
        // This is necessary because contributors to cross-company projects (e.g. kubernetes)
        // are typically members of the project org, not their employer's org, so the org
        // signal alone misses them. Email and org signals are combined in compute-corporate-metrics.
        const commitEmail = node.author?.email?.toLowerCase()?.trim()
        if (commitEmail) {
          const domain = commitEmail.split('@')[1]
          if (domain && domain !== 'users.noreply.github.com' && domain !== 'noreply.github.com') {
            commitCountsByEmailDomain.set(domain, (commitCountsByEmailDomain.get(domain) ?? 0) + 1)
            const dSet = commitAuthorsByEmailDomain.get(domain) ?? new Set<string>()
            if (dSet.size < 500) dSet.add(`login:${login}`)
            commitAuthorsByEmailDomain.set(domain, dSet)
          }
        }

        const orgs = organizationsByLogin.get(login) ?? []
        if (orgs.length === 0) {
          unattributedAuthors.add(actorKey)
          continue
        }

        attributedAuthors.add(actorKey)
        // Attribute commit to all public organizations the contributor belongs to
        for (const org of orgs) {
          commitCountsByExperimentalOrg.set(org, (commitCountsByExperimentalOrg.get(org) ?? 0) + 1)
          const aSet = commitAuthorsByExperimentalOrg.get(org) ?? new Set<string>()
          if (aSet.size < 500) aSet.add(actorKey)
          commitAuthorsByExperimentalOrg.set(org, aSet)
        }
      }

      // Include unaffiliated commits in the org map for transparent reporting
      if (unattributedAuthors.size > 0 && sawResolvableAuthor) {
        let unaffiliatedCommits = 0
        for (const node of windowNodes) {
          const actorKey = getCommitActorKey(node)
          if (actorKey && unattributedAuthors.has(actorKey)) {
            unaffiliatedCommits++
          }
        }
        if (unaffiliatedCommits > 0) {
          commitCountsByExperimentalOrg.set('Unaffiliated', unaffiliatedCommits)
        }
      }

      return [
        windowDays,
        {
          uniqueCommitAuthors: 'unavailable',
          commitCountsByAuthor: 'unavailable',
          repeatContributors: 'unavailable',
          newContributors: 'unavailable',
          commitCountsByExperimentalOrg:
            sawResolvableAuthor && commitCountsByExperimentalOrg.size > 0
              ? Object.fromEntries(commitCountsByExperimentalOrg.entries())
              : 'unavailable',
          experimentalAttributedAuthors: sawResolvableAuthor ? attributedAuthors.size : 'unavailable',
          experimentalUnattributedAuthors: sawResolvableAuthor ? unattributedAuthors.size : 'unavailable',
          commitAuthorsByExperimentalOrg: sawResolvableAuthor
            ? Object.fromEntries(
                Array.from(commitAuthorsByExperimentalOrg.entries()).map(([org, set]) => [org, Array.from(set)]),
              )
            : 'unavailable',
          commitCountsByEmailDomain: sawResolvableAuthor
            ? Object.fromEntries(commitCountsByEmailDomain.entries())
            : 'unavailable',
          commitAuthorsByEmailDomain: sawResolvableAuthor
            ? Object.fromEntries(
                Array.from(commitAuthorsByEmailDomain.entries()).map(([domain, set]) => [domain, Array.from(set)]),
              )
            : 'unavailable',
        },
      ]
    }),
  ) as Record<ContributorWindowDays, ContributorWindowMetrics>
}

function filterCommitNodesByWindow(recentCommitNodes: CommitNode[], now: Date, windowDays: ContributorWindowDays) {
  const cutoff = new Date(now)
  cutoff.setDate(now.getDate() - windowDays)

  return recentCommitNodes.filter((node) => {
    const authoredDate = Date.parse(node.authoredDate)
    if (Number.isNaN(authoredDate)) {
      return false
    }

    return authoredDate >= cutoff.getTime()
  })
}

function buildEarliestContributionByAuthor(recentCommitNodes: CommitNode[]): Map<string, number> | Unavailable {
  if (recentCommitNodes.length === 0) {
    return 'unavailable'
  }

  const earliestContributionByAuthor = new Map<string, number>()

  for (const node of recentCommitNodes) {
    const actorKey = getCommitActorKey(node)
    const authoredAt = Date.parse(node.authoredDate)

    if (!actorKey || Number.isNaN(authoredAt)) {
      return 'unavailable'
    }

    const currentEarliest = earliestContributionByAuthor.get(actorKey)
    if (currentEarliest == null || authoredAt < currentEarliest) {
      earliestContributionByAuthor.set(actorKey, authoredAt)
    }
  }

  return earliestContributionByAuthor
}

function getCommitActorKey(node: CommitNode): string | null {
  const login = node.author?.user?.login?.trim()
  if (login) {
    return `login:${login}`
  }

  const email = node.author?.email?.trim()
  if (email) {
    return `email:${email.toLowerCase()}`
  }

  const name = node.author?.name?.trim()
  if (name) {
    return `name:${name.toLowerCase()}`
  }

  return null
}

function buildFailure(repo: string, error: unknown): RepositoryFetchFailure {
  const maybeError = toAnalyzerError(error)
  const message = maybeError.message?.toLowerCase() ?? ''

  if (message.includes('not found')) {
    return { repo, reason: 'Repository could not be analyzed.', code: 'NOT_FOUND' }
  }

  if (maybeError.status === 401) {
    return { repo, reason: 'GitHub rejected the provided token.', code: 'UNAUTHORIZED' }
  }

  if (maybeError.status === 403 || message.includes('rate limit')) {
    return { repo, reason: 'GitHub rate limit prevented analysis.', code: 'RATE_LIMITED' }
  }

  return { repo, reason: 'Repository could not be analyzed.', code: 'FETCH_FAILED' }
}

function buildUnavailableActivityCounts(): RepoActivityCountsResponse {
  const unavailable = { issueCount: 0 }
  return {
    prsOpened30: unavailable, prsOpened60: unavailable, prsOpened90: unavailable, prsOpened180: unavailable, prsOpened365: unavailable,
    prsMerged30: unavailable, prsMerged60: unavailable, prsMerged90: unavailable, prsMerged180: unavailable, prsMerged365: unavailable,
    issuesOpened30: unavailable, issuesOpened60: unavailable, issuesOpened90: unavailable, issuesOpened180: unavailable, issuesOpened365: unavailable,
    issuesClosed30: unavailable, issuesClosed60: unavailable, issuesClosed90: unavailable, issuesClosed180: unavailable, issuesClosed365: unavailable,
    staleIssues30: unavailable, staleIssues60: unavailable, staleIssues90: unavailable, staleIssues180: unavailable, staleIssues365: unavailable,
    goodFirstIssues: unavailable,
    goodFirstIssuesHyphenated: unavailable,
    goodFirstIssuesBeginner: unavailable,
    goodFirstIssuesStarter: unavailable,
    recentMergedPullRequests: { nodes: [] },
    recentClosedIssues: { nodes: [] },
  }
}

function buildDiagnostic(
  repo: string,
  source: string,
  error: unknown,
  level: AnalysisDiagnostic['level'] = 'warn',
): AnalysisDiagnostic {
  const maybeError = toAnalyzerError(error)

  return {
    level,
    repo,
    source,
    message: maybeError.message ?? 'Unknown analysis error',
    status: maybeError.status,
    retryAfter: maybeError.retryAfter,
  }
}
