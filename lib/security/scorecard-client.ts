import type { ScorecardAssessment, ScorecardCheck } from './analysis-result'
import type { Unavailable } from '@/lib/analyzer/analysis-result'

const SCORECARD_API_BASE = 'https://api.securityscorecards.dev/projects/github.com'
const SCORECARD_TIMEOUT_MS = 5000

interface ScorecardApiResponse {
  score: number
  repo: { name: string }
  scorecard: { version: string }
  checks: Array<{
    name: string
    score: number
    reason: string
  }>
}

export async function fetchScorecardData(
  owner: string,
  repo: string,
): Promise<ScorecardAssessment | Unavailable> {
  const url = `${SCORECARD_API_BASE}/${owner}/${repo}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SCORECARD_TIMEOUT_MS)

  try {
    const response = await fetch(url, { signal: controller.signal })

    if (!response.ok) {
      return 'unavailable'
    }

    const data: ScorecardApiResponse = await response.json()

    const checks: ScorecardCheck[] = data.checks.map((c) => ({
      name: c.name,
      score: c.score,
      reason: c.reason,
    }))

    return {
      overallScore: data.score,
      checks,
      scorecardVersion: data.scorecard.version,
    }
  } catch {
    return 'unavailable'
  } finally {
    clearTimeout(timeout)
  }
}
