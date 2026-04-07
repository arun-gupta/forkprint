import { analyzeOrgInventory } from '@/lib/analyzer/org-inventory'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { org?: string; token?: string | null }

    if (typeof body.org !== 'string' || !body.org.trim()) {
      return Response.json({ error: 'A GitHub organization is required.' }, { status: 400 })
    }

    const token = body.token

    if (!token) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }

    const response = await analyzeOrgInventory({
      org: body.org,
      token,
    })

    return Response.json(response)
  } catch {
    return Response.json({ error: 'Organization inventory request failed.' }, { status: 500 })
  }
}
