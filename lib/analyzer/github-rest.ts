import type { RateLimitState } from './analysis-result'

export interface GitHubRestSuccess<T> {
  data: T
  rateLimit: RateLimitState | null
}

export async function fetchContributorCount(
  token: string,
  owner: string,
  name: string,
): Promise<GitHubRestSuccess<number | 'unavailable'>> {
  const path = `/repos/${owner}/${name}/contributors?per_page=1&anon=1`
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })

  if (!response.ok) {
    const retryAfterHeader = response.headers.get('Retry-After')
    const error = new Error(`GitHub REST request failed with status ${response.status}`)
    ;(error as Error & { status?: number; retryAfter?: number | 'unavailable' }).status = response.status
    ;(error as Error & { status?: number; retryAfter?: number | 'unavailable' }).retryAfter = retryAfterHeader
      ? Number(retryAfterHeader)
      : 'unavailable'
    throw error
  }

  const contributors = (await response.json()) as unknown[]
  const linkHeader = response.headers.get('Link')
  const rateLimit = extractRateLimit(response)

  return {
    data: parseContributorCount(contributors, linkHeader),
    rateLimit,
  }
}

export async function fetchMaintainerCount(
  token: string,
  owner: string,
  name: string,
): Promise<GitHubRestSuccess<number | 'unavailable'>> {
  const candidatePaths = [
    'OWNERS',
    'OWNERS_ALIASES',
    'OWNERS.alias',
    'MAINTAINERS',
    'MAINTAINERS.md',
    '.github/MAINTAINERS',
    '.github/MAINTAINERS.md',
    '.github/CODEOWNERS',
    'CODEOWNERS',
    'docs/CODEOWNERS',
    'GOVERNANCE.md',
  ]
  const maintainers = new Set<string>()
  let rateLimit: RateLimitState | null = null

  for (const path of candidatePaths) {
    const response = await fetch(`https://api.github.com/repos/${owner}/${name}/contents/${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (response.status === 404) {
      continue
    }

    if (!response.ok) {
      const retryAfterHeader = response.headers.get('Retry-After')
      const error = new Error(`GitHub REST request failed with status ${response.status}`)
      ;(error as Error & { status?: number; retryAfter?: number | 'unavailable' }).status = response.status
      ;(error as Error & { status?: number; retryAfter?: number | 'unavailable' }).retryAfter = retryAfterHeader
        ? Number(retryAfterHeader)
        : 'unavailable'
      throw error
    }

    const payload = (await response.json()) as { content?: string; encoding?: string }
    rateLimit = extractRateLimit(response) ?? rateLimit

    for (const maintainer of parseMaintainers(path, payload)) {
      maintainers.add(maintainer)
    }
  }

  return {
    data: maintainers.size > 0 ? maintainers.size : 'unavailable',
    rateLimit,
  }
}

export async function fetchPublicUserOrganizations(
  token: string,
  login: string,
): Promise<GitHubRestSuccess<string[] | 'unavailable'>> {
  const response = await fetch(`https://api.github.com/users/${login}/orgs`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })

  if (!response.ok) {
    const retryAfterHeader = response.headers.get('Retry-After')
    const error = new Error(`GitHub REST request failed with status ${response.status}`)
    ;(error as Error & { status?: number; retryAfter?: number | 'unavailable' }).status = response.status
    ;(error as Error & { status?: number; retryAfter?: number | 'unavailable' }).retryAfter = retryAfterHeader
      ? Number(retryAfterHeader)
      : 'unavailable'
    throw error
  }

  const payload = (await response.json()) as Array<{ login?: string }>
  const rateLimit = extractRateLimit(response)

  if (!Array.isArray(payload)) {
    return { data: 'unavailable', rateLimit }
  }

  return {
    data: payload.map((org) => org.login).filter((org): org is string => typeof org === 'string' && org.length > 0),
    rateLimit,
  }
}

function parseContributorCount(contributors: unknown[], linkHeader: string | null): number | 'unavailable' {
  if (!Array.isArray(contributors)) {
    return 'unavailable'
  }

  const lastPage = parseLastPage(linkHeader)
  if (lastPage !== null) {
    return lastPage
  }

  return contributors.length
}

function parseLastPage(linkHeader: string | null): number | null {
  if (!linkHeader) {
    return null
  }

  const lastMatch = linkHeader.match(/&page=(\d+)>; rel="last"/)
  if (!lastMatch) {
    return null
  }

  const parsed = Number(lastMatch[1])
  return Number.isFinite(parsed) ? parsed : null
}

function parseMaintainers(path: string, payload: { content?: string; encoding?: string }): Set<string> {
  if (!payload.content || payload.encoding !== 'base64') {
    return new Set()
  }

  const decoded = Buffer.from(payload.content, 'base64').toString('utf8')
  if (path.endsWith('CODEOWNERS')) {
    return parseCodeownersMaintainers(decoded)
  }

  if (path === 'OWNERS' || path === 'OWNERS_ALIASES' || path === 'OWNERS.alias') {
    return parseOwnersMaintainers(decoded)
  }

  return parseGenericMaintainers(decoded)
}

function parseCodeownersMaintainers(decoded: string) {
  const maintainers = new Set<string>()

  for (const rawLine of decoded.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    for (const match of line.matchAll(/@([A-Za-z0-9][A-Za-z0-9-]*)/g)) {
      const handle = match[1]?.toLowerCase()
      if (handle) {
        maintainers.add(handle)
      }
    }
  }

  return maintainers
}

function parseOwnersMaintainers(decoded: string) {
  const maintainers = new Set<string>()

  for (const rawLine of decoded.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || /^---+$/.test(line)) {
      continue
    }

    for (const match of line.matchAll(/@([A-Za-z0-9][A-Za-z0-9-]*)/g)) {
      const handle = match[1]?.toLowerCase()
      if (handle) {
        maintainers.add(handle)
      }
    }

    const candidate = line
      .replace(/\[[^\]]+\]/g, ' ')
      .replace(/[:,]/g, ' ')
      .trim()

    for (const token of candidate.split(/\s+/)) {
      const normalized = token.replace(/^@/, '').trim().toLowerCase()
      if (!isLikelyMaintainerToken(normalized)) {
        continue
      }

      maintainers.add(normalized)
    }
  }

  return maintainers
}

function parseGenericMaintainers(decoded: string) {
  const maintainers = new Set<string>()

  for (const rawLine of decoded.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || /^---+$/.test(line)) {
      continue
    }

    for (const match of line.matchAll(/@([A-Za-z0-9][A-Za-z0-9-]*)/g)) {
      const handle = match[1]?.toLowerCase()
      if (handle) {
        maintainers.add(handle)
      }
    }

    const candidate = line
      .replace(/\[[^\]]+\]/g, ' ')
      .replace(/[:,]/g, ' ')
      .trim()

    for (const token of candidate.split(/\s+/)) {
      const normalized = token.replace(/^@/, '').trim().toLowerCase()
      if (!isLikelyMaintainerToken(normalized)) {
        continue
      }

      maintainers.add(normalized)
    }
  }

  return maintainers
}

function isLikelyMaintainerToken(token: string) {
  if (!token || token.length < 2) {
    return false
  }

  if (!/^[a-z0-9][a-z0-9-]*$/.test(token)) {
    return false
  }

  const stopwords = new Set([
    'and',
    'approvers',
    'reviewers',
    'labels',
    'emeritus_approvers',
    'emeritus-reviewers',
    'options',
    'filters',
    'aliases',
    'maintainers',
    'owners',
    'governance',
  ])

  return !stopwords.has(token)
}

function extractRateLimit(response: Response): RateLimitState | null {
  const remaining = response.headers.get('X-RateLimit-Remaining')
  const resetAt = response.headers.get('X-RateLimit-Reset')

  return {
    remaining: remaining ? Number(remaining) : 'unavailable',
    resetAt: resetAt ? new Date(Number(resetAt) * 1000).toISOString() : 'unavailable',
    retryAfter: 'unavailable',
  }
}
