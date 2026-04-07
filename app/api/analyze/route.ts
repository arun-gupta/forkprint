import { analyze } from '@/lib/analyzer/analyze'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { repos?: string[]; token?: string | null }

    if (!Array.isArray(body.repos) || body.repos.length === 0) {
      return Response.json({ error: 'At least one repository is required.' }, { status: 400 })
    }

    const token = body.token

    if (!token) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }

    const response = await analyze({
      repos: body.repos,
      token,
    })

    return Response.json(response)
  } catch {
    return Response.json({ error: 'Analysis request failed.' }, { status: 500 })
  }
}
