import type { ContributorWindowDays, ContributorWindowMetrics, RateLimitState, Unavailable } from './analysis-result'
import { CONTRIBUTOR_WINDOW_DAYS } from './analysis-result'
import { queryGitHubGraphQL } from './github-graphql'
import { fetchPublicUserOrganizations } from './github-rest'
import { REPO_COMMIT_HISTORY_PAGE_QUERY } from './queries'
import type { CommitHistoryConnection, CommitNode, RepoCommitHistoryPageResponse } from './types'
import { extractRateLimitFromError } from './analyzer-utils'

// Cap commit history pagination to avoid extremely long analysis times
// for repos like torvalds/linux (50,000+ commits/year). 2,000 commits
// is enough to identify unique contributors and compute accurate ratios.
export const MAX_COMMIT_HISTORY_NODES = 2000

export async function collectRecentCommitHistory({
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

export function buildContributorMetricsByWindow(
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

export function buildContributorMetrics(
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

export function createUnavailableContributorWindowMetrics(): Record<ContributorWindowDays, ContributorWindowMetrics> {
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
      },
    ]),
  ) as Record<ContributorWindowDays, ContributorWindowMetrics>
}

export async function buildExperimentalOrganizationCommitCountsByWindow(
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

export function buildExperimentalMetricsByWindow(
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
          },
        ]
      }

      const commitCountsByExperimentalOrg = new Map<string, number>()
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
          unattributedAuthors.add(actorKey)
          continue
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
        },
      ]
    }),
  ) as Record<ContributorWindowDays, ContributorWindowMetrics>
}

export function filterCommitNodesByWindow(recentCommitNodes: CommitNode[], now: Date, windowDays: ContributorWindowDays) {
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

export function buildEarliestContributionByAuthor(recentCommitNodes: CommitNode[]): Map<string, number> | Unavailable {
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

export function getCommitActorKey(node: CommitNode): string | null {
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
