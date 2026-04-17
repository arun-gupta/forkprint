import { cookies } from 'next/headers'
import { getDevPat } from '@/lib/dev/server-pat'

export const runtime = 'nodejs'

const OAUTH_STATE_COOKIE = 'repo_pulse_oauth_state'

export type ScopeTier = 'baseline' | 'read-org' | 'admin-org'

export function buildOAuthScope(tier: ScopeTier): string {
  switch (tier) {
    case 'admin-org':
      return 'public_repo admin:org'
    case 'read-org':
      return 'public_repo read:org'
    default:
      return 'public_repo'
  }
}

export function resolveScopeTier(url: URL): ScopeTier {
  const explicit = url.searchParams.get('scope_tier')
  if (explicit === 'admin-org') return 'admin-org'
  if (explicit === 'read-org') return 'read-org'
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
    const username = await fetchGithubUsername(devPat)
    if (username) {
      const base = new URL('/', request.url)
      const fragment = `token=${encodeURIComponent(devPat)}&username=${encodeURIComponent(username)}&scopes=${encodeURIComponent(scope)}`
      return Response.redirect(`${base.toString()}#${fragment}`, 302)
    }
    return Response.json(
      { error: 'DEV_GITHUB_PAT is set but rejected by GitHub (invalid or lacking public_repo scope).' },
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

async function fetchGithubUsername(token: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    })
    if (!res.ok) return null
    const body = (await res.json()) as { login?: string }
    return body.login ?? null
  } catch {
    return null
  }
}
