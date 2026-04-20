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

export type MaintainerToken = { token: string; kind: 'user' | 'team' }

export interface MaintainersResult {
  count: number | 'unavailable'
  tokens: MaintainerToken[] | 'unavailable'
}

export async function fetchMaintainerCount(
  token: string,
  owner: string,
  name: string,
): Promise<GitHubRestSuccess<MaintainersResult>> {
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
  // Dedup across all source files by the canonical token string. A token
  // seen as both 'user' and 'team' (shouldn't happen in practice) prefers
  // 'team' since a '/'-containing token is unambiguously team.
  const tokens = new Map<string, MaintainerToken>()
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

    for (const t of parseMaintainerTokens(path, payload)) {
      const existing = tokens.get(t.token)
      if (!existing || (existing.kind === 'user' && t.kind === 'team')) {
        tokens.set(t.token, t)
      }
    }
  }

  const tokenList = Array.from(tokens.values())
  return {
    data: {
      count: tokenList.length > 0 ? tokenList.length : 'unavailable',
      tokens: tokenList.length > 0 ? tokenList : 'unavailable',
    },
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

export type OrgAdminListResult =
  | { kind: 'ok'; admins: { login: string }[] }
  | { kind: 'rate-limited' }
  | { kind: 'auth-failed' }
  | { kind: 'scope-insufficient' }
  | { kind: 'network' }
  | { kind: 'unknown' }

export async function fetchOrgAdmins(token: string, org: string): Promise<OrgAdminListResult> {
  const admins: { login: string }[] = []
  let url: string | null = `https://api.github.com/orgs/${encodeURIComponent(org)}/members?role=admin&per_page=100`

  try {
    while (url) {
      const response: Response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      })

      const status = classifyRestStatus(response)
      if (status !== 'ok') return status

      const payload = (await response.json()) as Array<{ login?: unknown }>
      if (!Array.isArray(payload)) return { kind: 'unknown' }
      for (const member of payload) {
        if (typeof member.login === 'string' && member.login.length > 0) {
          admins.push({ login: member.login })
        }
      }

      url = parseNextLink(response.headers.get('Link'))
    }
  } catch {
    return { kind: 'network' }
  }

  return { kind: 'ok', admins }
}

export type OrgTwoFactorRequirementResult =
  | { kind: 'ok'; twoFactorRequirementEnabled: boolean | null }
  | { kind: 'rate-limited' }
  | { kind: 'auth-failed' }
  | { kind: 'not-found' }
  | { kind: 'network' }
  | { kind: 'unknown' }

export async function fetchOrgTwoFactorRequirement(
  token: string,
  org: string,
): Promise<OrgTwoFactorRequirementResult> {
  try {
    const response = await fetch(`https://api.github.com/orgs/${encodeURIComponent(org)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (response.status === 403 && isRateLimited(response)) return { kind: 'rate-limited' }
    if (response.status === 401) return { kind: 'auth-failed' }
    if (response.status === 404) return { kind: 'not-found' }
    if (!response.ok) return { kind: 'unknown' }

    const payload = (await response.json()) as { two_factor_requirement_enabled?: unknown }
    const raw = payload?.two_factor_requirement_enabled
    const value: boolean | null = raw === true ? true : raw === false ? false : null
    return { kind: 'ok', twoFactorRequirementEnabled: value }
  } catch {
    return { kind: 'network' }
  }
}

export type UserPublicEventsResult =
  | { kind: 'ok'; lastActivityAt: string | null }
  | { kind: 'admin-account-404' }
  | { kind: 'rate-limited'; retryAvailableAt: string | null }
  | { kind: 'events-fetch-failed' }

export async function fetchUserPublicEvents(
  token: string,
  username: string,
): Promise<UserPublicEventsResult> {
  try {
    const response = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )

    if (response.status === 404) return { kind: 'admin-account-404' }
    if (response.status === 403 && isRateLimited(response)) {
      return { kind: 'rate-limited', retryAvailableAt: parseRetryAvailableAt(response) }
    }
    if (!response.ok) return { kind: 'events-fetch-failed' }

    const payload = (await response.json()) as Array<{ created_at?: unknown }>
    if (!Array.isArray(payload) || payload.length === 0) {
      return { kind: 'ok', lastActivityAt: null }
    }
    const first = payload[0]
    if (!first || typeof first.created_at !== 'string') {
      return { kind: 'ok', lastActivityAt: null }
    }
    return { kind: 'ok', lastActivityAt: first.created_at }
  } catch {
    return { kind: 'events-fetch-failed' }
  }
}

export type UserLatestOrgCommitResult =
  | { kind: 'ok'; lastActivityAt: string | null }
  | { kind: 'rate-limited'; retryAvailableAt: string | null }
  | { kind: 'commit-search-failed' }

// Search Commits has a 30 req/min quota — roughly 10x tighter than core REST.
// In admin-resolution bursts this cap is routinely hit; a single short retry
// recovers most near-boundary cases without serializing the whole fan-out.
const COMMIT_SEARCH_RETRY_MAX_WAIT_MS = 3000
const COMMIT_SEARCH_DEFAULT_RETRY_MS = 1500

export interface FetchUserLatestOrgCommitOptions {
  sleep?: (ms: number) => Promise<void>
  /** Max in-function retries on rate-limit. Default 1 (two total attempts). */
  maxRetries?: number
}

export async function fetchUserLatestOrgCommit(
  token: string,
  username: string,
  org: string,
  options: FetchUserLatestOrgCommitOptions = {},
): Promise<UserLatestOrgCommitResult> {
  const sleep = options.sleep ?? defaultSleep
  const maxRetries = options.maxRetries ?? 1
  let attempt = 0

  while (true) {
    try {
      const q = `author:${username}+org:${org}`
      const response = await fetch(
        `https://api.github.com/search/commits?q=${encodeURIComponent(q)}&sort=author-date&order=desc&per_page=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      )

      if (response.status === 403) {
        const rateLimited = isRateLimited(response) || (await hasSecondaryRateLimitBody(response))
        if (rateLimited) {
          if (attempt < maxRetries) {
            const wait = Math.min(
              parseRetryAfterMs(response) ?? COMMIT_SEARCH_DEFAULT_RETRY_MS,
              COMMIT_SEARCH_RETRY_MAX_WAIT_MS,
            )
            await sleep(wait)
            attempt++
            continue
          }
          return { kind: 'rate-limited', retryAvailableAt: parseRetryAvailableAt(response) }
        }
      }
      if (!response.ok) return { kind: 'commit-search-failed' }

      const payload = (await response.json()) as {
        total_count?: number
        items?: Array<{ commit?: { author?: { date?: unknown } } }>
      }
      if (!payload || typeof payload.total_count !== 'number' || payload.total_count === 0) {
        return { kind: 'ok', lastActivityAt: null }
      }
      const first = payload.items?.[0]
      const date = first?.commit?.author?.date
      if (typeof date !== 'string') return { kind: 'ok', lastActivityAt: null }
      return { kind: 'ok', lastActivityAt: date }
    } catch {
      return { kind: 'commit-search-failed' }
    }
  }
}

async function hasSecondaryRateLimitBody(response: Response): Promise<boolean> {
  try {
    const body = (await response.clone().json()) as { message?: unknown }
    const message = typeof body.message === 'string' ? body.message.toLowerCase() : ''
    return (
      message.includes('secondary rate limit') ||
      message.includes('abuse detection') ||
      message.includes('api rate limit exceeded')
    )
  } catch {
    return false
  }
}

function parseRetryAfterMs(response: Response): number | null {
  const header = response.headers.get('Retry-After')
  if (!header) return null
  const seconds = Number(header)
  if (!Number.isFinite(seconds) || seconds < 0) return null
  return seconds * 1000
}

// Prefer Retry-After (relative, usually shorter) over X-RateLimit-Reset
// (absolute, usually further out). Returns an ISO timestamp at which the
// next request is expected to succeed, or null when GitHub gave us neither
// signal (secondary rate limits sometimes omit both).
export function parseRetryAvailableAt(response: Response, nowMs: number = Date.now()): string | null {
  const retryAfterMs = parseRetryAfterMs(response)
  if (retryAfterMs !== null) return new Date(nowMs + retryAfterMs).toISOString()
  const reset = response.headers.get('X-RateLimit-Reset')
  if (reset) {
    const secs = Number(reset)
    if (Number.isFinite(secs) && secs > 0) return new Date(secs * 1000).toISOString()
  }
  return null
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface UserOrgMembershipResult {
  isMember: boolean
  reason?: 'unknown'
}

export async function fetchUserOrgMembership(
  token: string,
  org: string,
): Promise<UserOrgMembershipResult> {
  try {
    const response = await fetch(
      `https://api.github.com/user/memberships/orgs/${encodeURIComponent(org)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )

    if (response.status === 404) return { isMember: false }
    if (!response.ok) return { isMember: false, reason: 'unknown' }

    const payload = (await response.json()) as { state?: unknown }
    return { isMember: payload?.state === 'active' }
  } catch {
    return { isMember: false, reason: 'unknown' }
  }
}

function classifyRestStatus(response: Response): 'ok' | OrgAdminListResult {
  if (response.ok) return 'ok'
  if (response.status === 403 && isRateLimited(response)) return { kind: 'rate-limited' }
  if (response.status === 401) return { kind: 'auth-failed' }
  if (response.status === 404) return { kind: 'unknown' }
  return { kind: 'unknown' }
}

function isRateLimited(response: Response): boolean {
  if (response.headers.get('X-RateLimit-Remaining') === '0') return true
  // Secondary rate limits surface as 403 with Retry-After but without the
  // `X-RateLimit-Remaining: 0` header. Present Retry-After is GitHub telling
  // the caller to back off — classify as rate-limited.
  if (response.headers.get('Retry-After')) return true
  return false
}

function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null
  const match = linkHeader.match(/<([^>]+)>; rel="next"/)
  return match ? match[1]! : null
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

// Matches @handle and @org/team. The `/team` path is optional and, when
// present, binds the token to 'team' kind per FR-009 (team handles are
// treated as a single unit, not expanded to member logins).
const AT_HANDLE_RE = /@([A-Za-z0-9][A-Za-z0-9-]*)(?:\/([A-Za-z0-9][A-Za-z0-9_.-]*))?/g

function parseMaintainerTokens(
  path: string,
  payload: { content?: string; encoding?: string },
): MaintainerToken[] {
  if (!payload.content || payload.encoding !== 'base64') {
    return []
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

function collectAtHandles(line: string, into: Map<string, MaintainerToken>) {
  for (const match of line.matchAll(AT_HANDLE_RE)) {
    const owner = match[1]?.toLowerCase()
    const team = match[2]?.toLowerCase()
    if (!owner) continue
    if (team) {
      const token = `${owner}/${team}`
      if (!into.has(token)) into.set(token, { token, kind: 'team' })
    } else {
      if (!into.has(owner)) into.set(owner, { token: owner, kind: 'user' })
    }
  }
}

function parseCodeownersMaintainers(decoded: string): MaintainerToken[] {
  const out = new Map<string, MaintainerToken>()
  for (const rawLine of decoded.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    collectAtHandles(line, out)
  }
  return Array.from(out.values())
}

function parseOwnersMaintainers(decoded: string): MaintainerToken[] {
  const out = new Map<string, MaintainerToken>()
  for (const rawLine of decoded.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || /^---+$/.test(line)) continue
    collectAtHandles(line, out)

    const candidate = line.replace(/\[[^\]]+\]/g, ' ').replace(/[:,]/g, ' ').trim()
    for (const token of candidate.split(/\s+/)) {
      const normalized = token.replace(/^@/, '').trim().toLowerCase()
      if (!isLikelyMaintainerToken(normalized)) continue
      if (!out.has(normalized)) out.set(normalized, { token: normalized, kind: 'user' })
    }
  }
  return Array.from(out.values())
}

function parseGenericMaintainers(decoded: string): MaintainerToken[] {
  const out = new Map<string, MaintainerToken>()
  for (const rawLine of decoded.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || /^---+$/.test(line)) continue
    collectAtHandles(line, out)

    const candidate = line.replace(/\[[^\]]+\]/g, ' ').replace(/[:,]/g, ' ').trim()
    for (const token of candidate.split(/\s+/)) {
      const normalized = token.replace(/^@/, '').trim().toLowerCase()
      if (!isLikelyMaintainerToken(normalized)) continue
      if (!out.has(normalized)) out.set(normalized, { token: normalized, kind: 'user' })
    }
  }
  return Array.from(out.values())
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
  const limit = response.headers.get('X-RateLimit-Limit')
  const remaining = response.headers.get('X-RateLimit-Remaining')
  const resetAt = response.headers.get('X-RateLimit-Reset')

  return {
    limit: limit ? Number(limit) : 'unavailable',
    remaining: remaining ? Number(remaining) : 'unavailable',
    resetAt: resetAt ? new Date(Number(resetAt) * 1000).toISOString() : 'unavailable',
    retryAfter: 'unavailable',
  }
}
