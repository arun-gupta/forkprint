import { cookies } from 'next/headers'
import { getDevPat } from '@/lib/dev/server-pat'

export const runtime = 'nodejs'

const OAUTH_STATE_COOKIE = 'repo_pulse_oauth_state'

export function buildOAuthScope(elevated: boolean): string {
  return elevated ? 'public_repo read:org' : 'public_repo'
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const elevated = url.searchParams.get('elevated') === '1'
  const scope = buildOAuthScope(elevated)

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
