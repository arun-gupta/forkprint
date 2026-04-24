import type { ActivityCadenceMetrics, ActivityWindowDays, ActivityWindowMetrics, AnalysisResult, RateLimitState, Unavailable } from './analysis-result'
import { ACTIVITY_WINDOW_DAYS } from './analysis-result'
import { buildActivityCadenceMetrics } from '@/lib/activity/cadence'
import { detectReleaseHealth } from '@/lib/release-health/detect'
import { queryGitHubGraphQL } from './github-graphql'
import { REPO_DISCUSSIONS_PAGE_QUERY } from './queries'
import type { CommitNode, LegacyRepoActivityResponse, RepoActivityResponse, RepoActivityCountsResponse, RepoOverviewResponse } from './types'
import {
  computeMedianDurationHoursWithinWindow,
  computeStaleIssueRatio,
  countReleaseDatesWithinWindow,
} from './analyzer-utils'

// Cap discussions pagination. Discussions pages are small and cheap, but
// we still bound worst-case cost for hyperactive forums (e.g. vercel/next.js
// which has thousands). 20 pages × 100 = 2,000 within-year discussions —
// comfortably above the saturation point while preventing runaway cost.
export const MAX_DISCUSSION_PAGES = 20
export const DISCUSSION_WINDOW_CAP_DAYS = 365

// Cap commit history pagination to avoid extremely long analysis times
// for repos like torvalds/linux (50,000+ commits/year). 2,000 commits
// is enough to identify unique contributors and compute accurate ratios.
export const MAX_COMMIT_HISTORY_NODES = 2000

export async function collectRecentDiscussionTimestamps({
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

export function buildActivityCadenceByWindow(
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

export function buildActivityMetricsByWindow(
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

export function buildUnavailableActivityCounts(): RepoActivityCountsResponse {
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

export function extractReleaseHealthResult(
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
