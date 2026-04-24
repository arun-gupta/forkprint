import type { ActivityWindowDays, ActivityWindowMetrics, AnalysisDiagnostic, RateLimitState, ResponsivenessMetrics } from './analysis-result'
import { queryGitHubGraphQL } from './github-graphql'
import { REPO_RESPONSIVENESS_METADATA_QUERY, buildResponsivenessDetailQuery } from './queries'
import type {
  DetailNode,
  MetadataIssueNode,
  MetadataPullRequestNode,
  RepoResponsivenessMetadataResponse,
  RepoResponsivenessResponse,
  ResponsivenessIssueNode,
  ResponsivenessPullRequestNode,
} from './types'
import {
  buildDiagnostic,
  computeMedian,
  computePercentile,
  computeRatio,
  computeStaleItemRatio,
  filterNodesByEndDate,
  filterNodesByStartDate,
  getDurationHours,
  getIssueFirstResponseDurationHours,
  getPullRequestFirstReviewDurationHours,
  getResponseSignal,
} from './analyzer-utils'

export const DETAIL_BATCH_SIZE = 10

export async function fetchResponsivenessTwoPass(
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

export function mergeResponsivenessData(
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

export function createUnavailableResponsivenessResponse(): RepoResponsivenessResponse {
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

export function buildResponsivenessMetricsByWindow(
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

export function buildResponsivenessMetricsForWindow(
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
  ].filter((signal): signal is NonNullable<typeof signal> => signal != null)

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

export type { AnalysisDiagnostic }
