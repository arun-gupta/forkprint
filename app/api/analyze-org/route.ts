import { analyzeOrgInventory } from '@/lib/analyzer/org-inventory'
import { resolveServerToken } from '@/lib/auth/dev-pat'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { org?: string; token?: string | null }

    if (typeof body.org !== 'string' || !body.org.trim()) {
      return Response.json({ error: 'A GitHub organization is required.' }, { status: 400 })
    }

    const token = resolveServerToken(body.token)

    if (!token) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }

    console.log(`[analyze-org] Starting inventory for org: ${body.org}`)
    const start = Date.now()

    const response = await analyzeOrgInventory({
      org: body.org,
      token,
    })

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`[analyze-org] Completed in ${elapsed}s — ${response.results.length} repos found`)

    return Response.json(response)
  } catch (error) {
    console.error(`[analyze-org] Request failed:`, error)
    return Response.json({ error: 'Organization inventory request failed.' }, { status: 500 })
  }
}
