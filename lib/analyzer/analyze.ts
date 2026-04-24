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
import { newContributorMinSampleSize as NEW_CONTRIBUTOR_MIN_SAMPLE_SIZE } from '@/lib/community/score-config'

import type {
  CommitHistoryConnection,
  CommitNode,
  DocBlob,
  LegacyRepoActivityResponse,
  RepoActivityCountsResponse,
  RepoActivityResponse,
  RepoCommitAndReleasesResponse,
  RepoCommitHistoryPageResponse,
  RepoOverviewResponse,
  RepoResponsivenessResponse,
  ResolvedReadme,
  ResponseSignal,
} from './types'

import {
  buildDiagnostic,
  buildFailure,
  collectIssueCloseTimestamps,
  collectIssueFirstResponseTimestamps,
  collectPullRequestMergeTimestamps,
  computeStaleIssueRatio,
  countReleaseDatesWithinWindow,
  computeMedianDurationHoursWithinWindow,
  extractRateLimitFromError,
} from './analyzer-utils'

export { toAnalyzerError } from './analyzer-utils'

import {
  buildActivityCadenceByWindow,
  buildActivityMetricsByWindow,
  buildUnavailableActivityCounts,
  collectRecentDiscussionTimestamps,
  extractReleaseHealthResult,
} from './extract-activity'

import {
  buildContributorMetricsByWindow,
  buildExperimentalOrganizationCommitCountsByWindow,
  collectRecentCommitHistory,
} from './extract-contributors'

import {
  buildResponsivenessMetricsByWindow,
  fetchResponsivenessTwoPass,
} from './extract-responsiveness'

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
      const since30 = new Date(now)
      since30.setDate(now.getDate() - 30)
      const since90 = new Date(now)
      since90.setDate(now.getDate() - 90)
      const since60 = new Date(now)
      since60.setDate(now.getDate() - 60)
      const since180 = new Date(now)
      since180.setDate(now.getDate() - 180)
      const since365 = new Date(now)
      since365.setDate(now.getDate() - 365)
      const staleBefore30 = new Date(now)
      staleBefore30.setDate(now.getDate() - 30)
      const staleBefore60 = new Date(now)
      staleBefore60.setDate(now.getDate() - 60)
      const staleBefore90 = new Date(now)
      staleBefore90.setDate(now.getDate() - 90)
      const staleBefore180 = new Date(now)
      staleBefore180.setDate(now.getDate() - 180)
      const staleBefore365 = new Date(now)
      staleBefore365.setDate(now.getDate() - 365)
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
        staleIssues30Query: buildOpenIssuesOlderThanQuery(repoSearch, staleBefore30),
        staleIssues60Query: buildOpenIssuesOlderThanQuery(repoSearch, staleBefore60),
        staleIssues90Query: buildOpenIssuesOlderThanQuery(repoSearch, staleBefore90),
        staleIssues180Query: buildOpenIssuesOlderThanQuery(repoSearch, staleBefore180),
        staleIssues365Query: buildOpenIssuesOlderThanQuery(repoSearch, staleBefore365),
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
          stalePrs30Query: buildOpenPullRequestsOlderThanQuery(repoSearch, staleBefore30),
          stalePrs60Query: buildOpenPullRequestsOlderThanQuery(repoSearch, staleBefore60),
          stalePrs90Query: buildOpenPullRequestsOlderThanQuery(repoSearch, staleBefore90),
          stalePrs180Query: buildOpenPullRequestsOlderThanQuery(repoSearch, staleBefore180),
          stalePrs365Query: buildOpenPullRequestsOlderThanQuery(repoSearch, staleBefore365),
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
