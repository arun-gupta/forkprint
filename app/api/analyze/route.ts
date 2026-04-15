import { analyze } from '@/lib/analyzer/analyze'
import { resolveServerToken } from '@/lib/auth/dev-pat'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { repos?: string[]; token?: string | null }

    if (!Array.isArray(body.repos) || body.repos.length === 0) {
      return Response.json({ error: 'At least one repository is required.' }, { status: 400 })
    }

    const token = resolveServerToken(body.token)

    if (!token) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }

    console.log(`[analyze] Starting analysis for ${body.repos.length} repo(s): ${body.repos.join(', ')}`)
    const start = Date.now()

    const response = await analyze({
      repos: body.repos,
      token,
    })

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`[analyze] Completed in ${elapsed}s — ${response.results.length} succeeded, ${response.failures.length} failed`)
    if (response.rateLimit) {
      console.log(`[analyze] Rate limit remaining: ${response.rateLimit.remaining}, resets at: ${response.rateLimit.resetAt}`)
    }
    if (response.diagnostics?.length) {
      for (const d of response.diagnostics) {
        console.warn(`[analyze] Diagnostic: ${d.repo} ${d.source} — ${d.message}`)
      }
    }

    return Response.json(response)
  } catch (error) {
    console.error(`[analyze] Request failed:`, error)
    return Response.json({ error: 'Analysis request failed.' }, { status: 500 })
  }
}
