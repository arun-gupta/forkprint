import type { AnalysisResult, AnalyzeResponse } from '@/lib/analyzer/analysis-result'
import { getActivityScore } from '@/lib/activity/score-config'
import { getSustainabilityScore } from '@/lib/contributors/score-config'
import { getResponsivenessScore } from '@/lib/responsiveness/score-config'

export interface JsonExportResult {
  blob: Blob
  filename: string
}

interface RepoScores {
  activity: { value: string; tone: string; description: string }
  sustainability: { value: string; tone: string; description: string }
  responsiveness: { value: string; tone: string; description: string }
}

function computeScores(result: AnalysisResult): RepoScores {
  const activity = getActivityScore(result)
  const sustainability = getSustainabilityScore(result)
  const responsiveness = getResponsivenessScore(result)
  return {
    activity: { value: String(activity.value), tone: activity.tone, description: activity.description },
    sustainability: { value: String(sustainability.value), tone: sustainability.tone, description: sustainability.description },
    responsiveness: { value: String(responsiveness.value), tone: responsiveness.tone, description: responsiveness.description },
  }
}

function buildTimestamp(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const HH = String(now.getHours()).padStart(2, '0')
  const MM = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}-${HH}${MM}${ss}`
}

export function buildJsonExport(response: AnalyzeResponse): JsonExportResult {
  const enriched = {
    ...response,
    results: response.results.map((result) => ({
      ...result,
      scores: computeScores(result),
    })),
  }
  const json = JSON.stringify(enriched, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const filename = `repopulse-${buildTimestamp()}.json`
  return { blob, filename }
}

export function triggerDownload({ blob, filename }: { blob: Blob; filename: string }): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
