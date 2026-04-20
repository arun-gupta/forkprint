import {
  fetchOrgAdmins,
  fetchUserLatestOrgCommit,
  fetchUserOrgMembership,
  fetchUserPublicEvents,
  type FetchUserLatestOrgCommitOptions,
  type OrgAdminListResult,
} from '@/lib/analyzer/github-rest'
import { STALE_ADMIN_THRESHOLD_DAYS } from '@/lib/config/governance'
import {
  classifyAdmin,
  type AdminActivityInput,
  type AdminListUnavailableReason,
  type StaleAdminMode,
  type StaleAdminRecord,
  type StaleAdminsSection,
  type StaleAdminUnavailableReason,
} from '@/lib/governance/stale-admins'

const PER_ADMIN_CONCURRENCY = 5

// Unavailable reasons we will auto-retry server-side after the first fan-out.
// `admin-account-404` is terminal (deleted user) and excluded.
const AUTO_RETRYABLE_REASONS: ReadonlySet<StaleAdminUnavailableReason> = new Set([
  'rate-limited',
  'commit-search-failed',
  'events-fetch-failed',
])

// Second-pass budget and spacing. Bounded hard so we never blow the
// serverless function timeout — remaining items simply stay Unavailable and
// the client's Retry button becomes the fallback.
const AUTO_RETRY_BUDGET_MS = 10_000
const AUTO_RETRY_SPACING_MS = 500

export async function GET(request: Request) {
  const url = new URL(request.url)
  const org = url.searchParams.get('org')?.trim()
  const ownerType = (url.searchParams.get('ownerType') ?? 'Organization').trim()
  const elevatedRequested = url.searchParams.get('elevated') === '1'

  if (!org) {
    return Response.json(
      { error: { message: 'Organization is required.', code: 'INVALID_ORG' } },
      { status: 400 },
    )
  }

  const token = getBearerToken(request)
  if (!token) {
    return Response.json(
      { error: { message: 'Authentication required.', code: 'UNAUTHENTICATED' } },
      { status: 401 },
    )
  }

  const resolvedAt = new Date().toISOString()

  if (ownerType !== 'Organization') {
    const section: StaleAdminsSection = {
      kind: 'stale-admins',
      applicability: 'not-applicable-non-org',
      mode: 'baseline',
      thresholdDays: STALE_ADMIN_THRESHOLD_DAYS,
      admins: [],
      resolvedAt,
    }
    return Response.json({ section })
  }

  const adminListResult = await fetchOrgAdmins(token, org)
  if (adminListResult.kind !== 'ok') {
    const section: StaleAdminsSection = {
      kind: 'stale-admins',
      applicability: 'admin-list-unavailable',
      mode: elevatedRequested ? 'elevated-ineffective' : 'baseline',
      thresholdDays: STALE_ADMIN_THRESHOLD_DAYS,
      admins: [],
      adminListUnavailableReason: mapAdminListReason(adminListResult),
      resolvedAt,
    }
    return Response.json({ section })
  }

  const membership = elevatedRequested ? await fetchUserOrgMembership(token, org) : null
  const mode: StaleAdminMode = elevatedRequested
    ? membership?.isMember
      ? 'elevated-effective'
      : 'elevated-ineffective'
    : 'baseline'

  const firstPass = await resolveAllAdminsWithConcurrency(
    adminListResult.admins.map((a) => a.login),
    token,
    org,
    resolvedAt,
  )
  const admins = await retryUnavailableAdminsSerially(firstPass, token, org, resolvedAt)

  const section: StaleAdminsSection = {
    kind: 'stale-admins',
    applicability: 'applicable',
    mode,
    thresholdDays: STALE_ADMIN_THRESHOLD_DAYS,
    admins,
    resolvedAt,
  }

  return Response.json({ section })
}

async function resolveAdmin(
  username: string,
  token: string,
  org: string,
  resolvedAt: string,
  commitSearchOptions: FetchUserLatestOrgCommitOptions = {},
): Promise<StaleAdminRecord> {
  const eventsResult = await fetchUserPublicEvents(token, username)

  let error: StaleAdminUnavailableReason | null = null
  let lastActivityAt: string | null = null
  let lastActivitySource: AdminActivityInput['lastActivitySource'] = null

  if (eventsResult.kind === 'ok' && eventsResult.lastActivityAt) {
    lastActivityAt = eventsResult.lastActivityAt
    lastActivitySource = 'public-events'
  } else if (eventsResult.kind === 'admin-account-404') {
    error = 'admin-account-404'
  } else if (eventsResult.kind === 'rate-limited') {
    error = 'rate-limited'
  } else {
    // events-fetch-failed OR ok-but-empty → fall through to commit search
    const commitResult = await fetchUserLatestOrgCommit(token, username, org, commitSearchOptions)
    if (commitResult.kind === 'ok' && commitResult.lastActivityAt) {
      lastActivityAt = commitResult.lastActivityAt
      lastActivitySource = 'org-commit-search'
    } else if (commitResult.kind === 'rate-limited') {
      error = 'rate-limited'
    } else if (commitResult.kind === 'commit-search-failed') {
      // If events also errored (not just empty), propagate that first
      error = eventsResult.kind === 'events-fetch-failed' ? 'events-fetch-failed' : 'commit-search-failed'
    }
    // else: both ok-but-empty → no error; classifier maps to no-public-activity
  }

  return classifyAdmin(
    { username, lastActivityAt, lastActivitySource, error },
    STALE_ADMIN_THRESHOLD_DAYS,
    new Date(resolvedAt),
  )
}

async function resolveAllAdminsWithConcurrency(
  usernames: string[],
  token: string,
  org: string,
  resolvedAt: string,
): Promise<StaleAdminRecord[]> {
  const results: StaleAdminRecord[] = new Array(usernames.length)
  let cursor = 0

  async function worker() {
    while (true) {
      const i = cursor++
      if (i >= usernames.length) return
      const username = usernames[i]!
      try {
        results[i] = await resolveAdmin(username, token, org, resolvedAt)
      } catch {
        results[i] = {
          username,
          classification: 'unavailable',
          lastActivityAt: null,
          lastActivitySource: null,
          unavailableReason: 'events-fetch-failed',
        }
      }
    }
  }

  const workerCount = Math.min(PER_ADMIN_CONCURRENCY, usernames.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}

// Auto-retry pass: after the concurrent fan-out, walk still-unavailable admins
// serially with small inter-request spacing. Serializing keeps us well under
// the Search Commits 30 req/min quota, and the delay gives GitHub's rate-limit
// window time to slide. Bounded by a hard deadline so we never extend the
// response beyond the budget — admins still Unavailable after the deadline
// remain Unavailable for the client's Retry button to handle.
export async function retryUnavailableAdminsSerially(
  admins: StaleAdminRecord[],
  token: string,
  org: string,
  resolvedAt: string,
  opts: { now?: () => number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<StaleAdminRecord[]> {
  const now = opts.now ?? Date.now
  const sleep = opts.sleep ?? defaultSleep

  const retryable = admins
    .map((admin, index) => ({ admin, index }))
    .filter(
      ({ admin }) =>
        admin.classification === 'unavailable' &&
        admin.unavailableReason !== null &&
        AUTO_RETRYABLE_REASONS.has(admin.unavailableReason),
    )
  if (retryable.length === 0) return admins

  const deadline = now() + AUTO_RETRY_BUDGET_MS
  const next = [...admins]

  for (const { admin, index } of retryable) {
    if (now() >= deadline) break
    try {
      // maxRetries=0 disables fetchUserLatestOrgCommit's in-function retry —
      // this pass IS the retry, and the inter-request spacing is our backoff.
      next[index] = await resolveAdmin(admin.username, token, org, resolvedAt, {
        maxRetries: 0,
      })
    } catch {
      // Keep the original unavailable record on unexpected throw.
    }
    if (now() < deadline) await sleep(AUTO_RETRY_SPACING_MS)
  }

  return next
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function mapAdminListReason(result: OrgAdminListResult): AdminListUnavailableReason {
  switch (result.kind) {
    case 'rate-limited':
      return 'rate-limited'
    case 'auth-failed':
      return 'auth-failed'
    case 'scope-insufficient':
      return 'scope-insufficient'
    case 'network':
      return 'network'
    default:
      return 'unknown'
  }
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization')
  if (!authorization) return null
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}
