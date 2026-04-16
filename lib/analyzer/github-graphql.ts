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
