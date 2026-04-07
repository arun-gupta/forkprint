import { cookies } from 'next/headers'

export const runtime = 'nodejs'

const OAUTH_STATE_COOKIE = 'repo_pulse_oauth_state'

export async function GET() {
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
    scope: 'public_repo',
    state,
  })

  return Response.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`, 302)
}
