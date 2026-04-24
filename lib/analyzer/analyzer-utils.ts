import type { ActivityWindowDays, AnalysisDiagnostic, RateLimitState, RepositoryFetchFailure, Unavailable } from './analysis-result'
import type {
  AnalyzerError,
  ResponsivenessIssueNode,
  ResponseSignal,
  SearchActorNode,
  SearchCommentNode,
  SearchReviewNode,
} from './types'

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

export function extractRateLimitFromError(error: unknown): RateLimitState | null {
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

export function buildFailure(repo: string, error: unknown): RepositoryFetchFailure {
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

export function buildDiagnostic(
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

export function computeMedian(values: number[]): number | Unavailable {
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

export function computePercentile(values: number[], percentile: number): number | Unavailable {
  if (values.length === 0) {
    return 'unavailable'
  }

  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.max(0, Math.ceil(sorted.length * percentile) - 1)
  return sorted[index] ?? 'unavailable'
}

export function computeRatio(numerator: number | Unavailable, denominator: number | Unavailable): number | Unavailable {
  if (typeof numerator !== 'number' || typeof denominator !== 'number' || denominator <= 0) {
    return 'unavailable'
  }

  return numerator / denominator
}

export function computeMedianDurationHours<T extends { createdAt: string }>(
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

export function computeMedianDurationHoursWithinWindow<T extends { createdAt: string }>(
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

export function getWindowCutoffTime(windowDays: ActivityWindowDays) {
  return Date.now() - windowDays * 24 * 60 * 60 * 1000
}

export function filterNodesByStartDate<T extends { createdAt: string }>(nodes: T[], windowDays: ActivityWindowDays) {
  const cutoffTime = getWindowCutoffTime(windowDays)

  return nodes.filter((node) => {
    const createdAt = new Date(node.createdAt).getTime()
    return !Number.isNaN(createdAt) && createdAt >= cutoffTime
  })
}

export function filterNodesByEndDate<T extends object, K extends keyof T>(
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

export function isBotLogin(login: string | null) {
  if (!login) {
    return false
  }

  return login.includes('[bot]') || login.endsWith('-bot')
}

export function getFirstNonAuthorInteraction<T extends { createdAt: string; author: SearchActorNode | null }>(
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

export function getDurationHours(start: string, end: string | null): number | null {
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

export function getIssueFirstResponseDurationHours(issue: ResponsivenessIssueNode): number | null {
  return getDurationHours(issue.createdAt, getFirstNonAuthorInteraction(issue.author?.login ?? null, issue.comments.nodes)?.createdAt ?? null)
}

export function getPullRequestFirstReviewDurationHours(pullRequest: { createdAt: string; author: SearchActorNode | null; reviews: { nodes: Array<{ createdAt: string; author: SearchActorNode | null }> } }): number | null {
  const firstReview = getFirstNonAuthorInteraction(pullRequest.author?.login ?? null, pullRequest.reviews.nodes)
  return getDurationHours(pullRequest.createdAt, firstReview?.createdAt ?? null)
}

export function getResponseSignal(
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

export function collectIssueFirstResponseTimestamps(issues: ResponsivenessIssueNode[], windowDays: ActivityWindowDays): string[] | Unavailable {
  const timestamps = filterNodesByStartDate(issues, windowDays)
    .map((issue) => getFirstNonAuthorInteraction(issue.author?.login ?? null, issue.comments.nodes)?.createdAt ?? null)
    .filter((value): value is string => Boolean(value))

  return timestamps.length > 0 ? timestamps : 'unavailable'
}

export function collectIssueCloseTimestamps(issues: ResponsivenessIssueNode[], windowDays: ActivityWindowDays): string[] | Unavailable {
  const timestamps = filterNodesByEndDate(issues, 'closedAt', windowDays)
    .map((issue) => issue.closedAt)
    .filter((value): value is string => Boolean(value))
  return timestamps.length > 0 ? timestamps : 'unavailable'
}

export function collectPullRequestMergeTimestamps(
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

export function computeStaleIssueRatio(staleIssueCount: number | undefined, openIssueCount: number | undefined): number | Unavailable {
  if (typeof staleIssueCount !== 'number' || typeof openIssueCount !== 'number' || openIssueCount <= 0) {
    return 'unavailable'
  }

  return staleIssueCount / openIssueCount
}

export function computeStaleItemRatio(staleItemCount: number | undefined, openItemCount: number | undefined): number | Unavailable {
  if (typeof staleItemCount !== 'number' || typeof openItemCount !== 'number' || openItemCount <= 0) {
    return 'unavailable'
  }

  return staleItemCount / openItemCount
}

export function countReleaseDatesWithinWindow(releaseDates: string[], now: Date, windowDays: ActivityWindowDays): number | Unavailable {
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

// Types re-exported for convenience — domain modules only need one import
export type { SearchCommentNode, SearchReviewNode }
