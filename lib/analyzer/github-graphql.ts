import type { RateLimitState } from './analysis-result'

export interface GitHubGraphQLSuccess<T> {
  data: T
  rateLimit: RateLimitState | null
}

export async function queryGitHubGraphQL<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<GitHubGraphQLSuccess<T>> {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    const retryAfterHeader = response.headers.get('Retry-After')
    const error = new Error(`GitHub GraphQL request failed with status ${response.status}`)
    ;(error as Error & { status?: number; retryAfter?: number | 'unavailable' }).status = response.status
    ;(error as Error & { status?: number; retryAfter?: number | 'unavailable' }).retryAfter = retryAfterHeader
      ? Number(retryAfterHeader)
      : 'unavailable'
    throw error
  }

  const payload = (await response.json()) as { data?: T; errors?: Array<{ message: string; type?: string }> }

  if (payload.errors?.length) {
    const isResourceLimitExceeded = payload.errors.some(
      (error) => error.type === 'RESOURCE_LIMITS_EXCEEDED' || error.message.includes('RESOURCE_LIMITS_EXCEEDED'),
    )

    // RESOURCE_LIMITS_EXCEEDED returns partial data — use what we got
    if (isResourceLimitExceeded && payload.data) {
      const data = payload.data
      const rateLimit = extractRateLimit(data)
      return { data, rateLimit }
    }

    throw new Error(payload.errors[0]?.message ?? 'GitHub GraphQL request failed')
  }

  const data = payload.data as T
  const rateLimit = extractRateLimit(data)

  return { data, rateLimit }
}

// ── Org member enumeration ─────────────────────────────────────────────────────

const ORG_MEMBERS_WITH_ROLES_QUERY = `
  query OrgMembersWithRoles($org: String!, $after: String) {
    organization(login: $org) {
      membersWithRole(first: 100, after: $after) {
        totalCount
        pageInfo { hasNextPage endCursor }
        edges { role node { login } }
      }
    }
    rateLimit { limit remaining resetAt }
  }
`

interface OrgMembersPage {
  organization?: {
    membersWithRole: {
      totalCount: number
      pageInfo: { hasNextPage: boolean; endCursor: string }
      edges: Array<{ role: 'MEMBER' | 'ADMIN'; node: { login: string } }>
    }
  }
  rateLimit?: unknown
}

export type OrgMembersWithRolesResult =
  | { kind: 'ok'; admins: string[]; nonAdminMembers: string[]; totalCount: number }
  | { kind: 'rate-limited' }
  | { kind: 'auth-failed' }
  | { kind: 'scope-insufficient' }
  | { kind: 'network' }
  | { kind: 'unknown' }

export async function fetchOrgMembersWithRoles(
  token: string,
  org: string,
): Promise<OrgMembersWithRolesResult> {
  const admins: string[] = []
  const nonAdminMembers: string[] = []
  let totalCount = 0
  let after: string | null = null

  try {
    while (true) {
      const result = await queryGitHubGraphQL<OrgMembersPage>(
        token,
        ORG_MEMBERS_WITH_ROLES_QUERY,
        { org, after },
      )

      const connection = result.data.organization?.membersWithRole
      if (!connection) return { kind: 'unknown' }

      totalCount = connection.totalCount
      for (const edge of connection.edges) {
        if (edge.role === 'ADMIN') {
          admins.push(edge.node.login)
        } else {
          nonAdminMembers.push(edge.node.login)
        }
      }

      if (!connection.pageInfo.hasNextPage) break
      after = connection.pageInfo.endCursor
    }
  } catch (err) {
    const error = err as { status?: number; retryAfter?: number | 'unavailable' }
    if (error.status === 401) return { kind: 'auth-failed' }
    if (error.status === 403) {
      if (typeof error.retryAfter === 'number') return { kind: 'rate-limited' }
      return { kind: 'scope-insufficient' }
    }
    return { kind: 'network' }
  }

  return { kind: 'ok', admins, nonAdminMembers, totalCount }
}

function extractRateLimit(data: unknown): RateLimitState | null {
  if (!data || typeof data !== 'object' || !('rateLimit' in data)) {
    return null
  }

  const rateLimit = (data as { rateLimit?: { limit?: number; remaining?: number; resetAt?: string } }).rateLimit

  return {
    limit: typeof rateLimit?.limit === 'number' ? rateLimit.limit : 'unavailable',
    remaining: typeof rateLimit?.remaining === 'number' ? rateLimit.remaining : 'unavailable',
    resetAt: typeof rateLimit?.resetAt === 'string' ? rateLimit.resetAt : 'unavailable',
    retryAfter: 'unavailable',
  }
}
