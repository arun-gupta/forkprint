import { fetchCNCFLandscape } from '@/lib/cncf-sandbox/landscape'
import type { LandscapeProjectStatus } from '@/lib/cncf-sandbox/types'

/** Returns a map of normalized repo URL → landscape project status for all repos in landscape.yml. */
export async function GET() {
  try {
    const data = await fetchCNCFLandscape()
    if (!data) {
      return Response.json({ repoStatuses: {} })
    }

    const repoStatuses: Record<string, LandscapeProjectStatus> = {}

    for (const url of data.repoUrls) {
      const projectStatus = data.projectStatusMap.get(url)
      repoStatuses[url] = projectStatus ?? 'landscape'
    }

    return Response.json({ repoStatuses })
  } catch {
    return Response.json({ repoStatuses: {} })
  }
}
