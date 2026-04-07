import { cookies } from 'next/headers'

export const runtime = 'nodejs'

const OAUTH_STATE_COOKIE = 'repo_pulse_oauth_state'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const error = url.searchParams.get('error')
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const { origin } = new URL(request.url)
  const appUrl = origin

  // Handle user denial or GitHub error
  if (error) {
    return Response.redirect(`${appUrl}/?auth_error=${encodeURIComponent(error)}`, 302)
  }

  // Validate CSRF state
  const cookieStore = await cookies()
  const storedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value

  if (!storedState || storedState !== state) {
    return Response.redirect(`${appUrl}/?auth_error=invalid_state`, 302)
  }

  cookieStore.delete(OAUTH_STATE_COOKIE)

  // Exchange code for access token
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  })

  const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string }

  if (!tokenData.access_token) {
    return Response.redirect(`${appUrl}/?auth_error=token_exchange_failed`, 302)
  }

  // Fetch GitHub username
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github+json',
    },
  })

  const userData = (await userResponse.json()) as { login?: string }
  const username = userData.login ?? 'unknown'

  // Return token to client via URL fragment (never sent to server)
  const fragment = `token=${encodeURIComponent(tokenData.access_token)}&username=${encodeURIComponent(username)}`
  return Response.redirect(`${appUrl}/#${fragment}`, 302)
}
