import { analyzeOrgInventory } from '@/lib/analyzer/org-inventory'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { org?: string; token?: string | null }

    if (typeof body.org !== 'string' || !body.org.trim()) {
      return Response.json({ error: { message: 'A GitHub organization is required.', code: 'INVALID_INPUT' } }, { status: 400 })
    }

    const token = body.token

    if (!token) {
      return Response.json({ error: { message: 'Authentication required.', code: 'UNAUTHENTICATED' } }, { status: 401 })
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
    return Response.json({ error: { message: 'Organization inventory request failed.', code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}
