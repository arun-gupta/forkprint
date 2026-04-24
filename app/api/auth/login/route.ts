import { cookies } from 'next/headers'
import { getDevPat } from '@/lib/dev/server-pat'

export const runtime = 'nodejs'

const OAUTH_STATE_COOKIE = 'repo_pulse_oauth_state'

export type ScopeTier = 'baseline' | 'read-org' | 'admin-org' | 'read-project'

export function buildOAuthScope(tier: ScopeTier): string {
  switch (tier) {
    case 'admin-org':
      return 'admin:org'
    case 'read-org':
      return 'read:org'
    case 'read-project':
      return 'read:project'
    default:
      return ''
  }
}

export function resolveScopeTier(url: URL): ScopeTier {
  const explicit = url.searchParams.get('scope_tier')
  if (explicit === 'admin-org') return 'admin-org'
  if (explicit === 'read-org') return 'read-org'
  if (explicit === 'read-project') return 'read-project'
  if (explicit === 'baseline') return 'baseline'
  // Legacy: ?elevated=1 maps to read-org
  if (url.searchParams.get('elevated') === '1') return 'read-org'
  return 'baseline'
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const tier = resolveScopeTier(url)
  const scope = buildOAuthScope(tier)

  // Dev-only short-circuit (#207): bypass GitHub OAuth when DEV_GITHUB_PAT is
  // set in `next dev`. Resolves the multi-worktree port-mismatch problem
  // without requiring OAuth App reconfiguration.
  const devPat = getDevPat()
  if (devPat) {
    const probe = await probeDevPat(devPat)
    if (probe) {
      // The user's tier selection is only a request; in dev, the PAT's *actual*
      // scopes are what the session can do. Surface those (not the request),
      // so the UI doesn't misrepresent the access rights.
      const effectiveScopes = probe.actualScopes ?? scope
      const base = new URL('/', request.url)
      const fragment = `token=${encodeURIComponent(devPat)}&username=${encodeURIComponent(probe.username)}&scopes=${encodeURIComponent(effectiveScopes)}`
      return Response.redirect(`${base.toString()}#${fragment}`, 302)
    }
    return Response.json(
      { error: 'DEV_GITHUB_PAT is set but rejected by GitHub (invalid token).' },
      { status: 500 },
    )
  }

  const clientId = process.env.GITHUB_CLIENT_ID

  if (!clientId) {
    return Response.json({ error: 'GitHub OAuth is not configured.' }, { status: 500 })
  }

  const state = crypto.randomUUID()
  const cookieStore = await cookies()

  cookieStore.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  })

  const params = new URLSearchParams({
    client_id: clientId,
    scope,
    state,
  })

  return Response.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`, 302)
}

interface DevPatProbe {
  username: string
  /**
   * Space-separated scope list reflecting what the PAT actually carries.
   * Null if GitHub did not return X-OAuth-Scopes (fine-grained PATs omit it).
   * When null, callers should fall back to the requested tier — the session
   * is then optimistic and individual API calls will fail honestly if the
   * fine-grained PAT lacks the needed permission.
   */
  actualScopes: string | null
}

async function probeDevPat(token: string): Promise<DevPatProbe | null> {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    })
    if (!res.ok) return null
    const body = (await res.json()) as { login?: string }
    if (!body.login) return null

    const scopesHeader = res.headers.get('x-oauth-scopes')
    const actualScopes = normalizeScopesHeader(scopesHeader)

    return { username: body.login, actualScopes }
  } catch {
    return null
  }
}

function normalizeScopesHeader(header: string | null): string | null {
  if (!header) return null
  const trimmed = header.trim()
  if (!trimmed) return null
  // GitHub returns comma-separated; we store space-separated for parity with
  // OAuth responses.
  return trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ')
}
