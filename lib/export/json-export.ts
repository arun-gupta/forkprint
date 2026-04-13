import type { AnalysisResult, AnalyzeResponse } from '@/lib/analyzer/analysis-result'
import { getActivityScore } from '@/lib/activity/score-config'
import { buildComparisonSections } from '@/lib/comparison/view-model'
import { getSustainabilityScore } from '@/lib/contributors/score-config'
import { buildContributorsViewModels } from '@/lib/contributors/view-model'
import { buildHealthRatioRows } from '@/lib/health-ratios/view-model'
import { getDocumentationScore } from '@/lib/documentation/score-config'
import { getResponsivenessScore } from '@/lib/responsiveness/score-config'

export interface JsonExportResult {
  blob: Blob
  filename: string
}

interface RepoScores {
  activity: { value: number | string; tone: string; description: string }
  sustainability: { value: number | string; tone: string; description: string }
  responsiveness: { value: number | string; tone: string; description: string }
  documentation: { value: number | string; tone: string; filesFound: number; readmeSections: number } | null
}

function computeScores(result: AnalysisResult): RepoScores {
  const activity = getActivityScore(result)
  const sustainability = getSustainabilityScore(result)
  const responsiveness = getResponsivenessScore(result)
  let documentation: RepoScores['documentation'] = null
  if (result.documentationResult !== 'unavailable') {
    const docScore = getDocumentationScore(result.documentationResult, result.licensingResult, result.stars)
    documentation = {
      value: docScore.value,
      tone: docScore.tone,
      filesFound: result.documentationResult.fileChecks.filter((f) => f.found).length,
      readmeSections: result.documentationResult.readmeSections.filter((s) => s.detected).length,
    }
  }
  return {
    activity: { value: activity.value, tone: activity.tone, description: activity.description },
    sustainability: { value: sustainability.value, tone: sustainability.tone, description: sustainability.description },
    responsiveness: { value: responsiveness.value, tone: responsiveness.tone, description: responsiveness.description },
    documentation,
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

function computeHealthRatios(result: AnalysisResult) {
  const rows = buildHealthRatioRows([result])
  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    label: row.label,
    value: row.cells[0]?.value ?? 'unavailable',
    displayValue: row.cells[0]?.displayValue ?? '—',
  }))
}

function computeContributors(result: AnalysisResult) {
  const section = buildContributorsViewModels([result])[0]
  if (!section) return undefined
  return {
    sustainabilityScore: section.sustainabilityScore.value,
    sustainabilityMetrics: section.sustainabilityMetrics.map((m) => ({ label: m.label, value: m.value })),
    coreMetrics: section.coreMetrics.map((m) => ({ label: m.label, value: m.value })),
    experimentalMetrics: section.experimentalMetrics.map((m) => ({ label: m.label, value: m.value })),
  }
}

function computeComparison(results: AnalysisResult[]) {
  if (results.length < 2) return undefined
  return buildComparisonSections(results).map((section) => ({
    id: section.id,
    label: section.label,
    rows: section.rows.map((row) => ({
      attributeId: row.attributeId,
      label: row.label,
      medianValue: row.medianValue,
      medianDisplay: row.medianDisplay,
      cells: row.cells.map((cell) => ({
        repo: cell.repo,
        rawValue: cell.rawValue,
        displayValue: cell.displayValue,
        deltaDisplay: cell.deltaDisplay,
        status: cell.status,
      })),
    })),
  }))
}

export function buildJsonExport(response: AnalyzeResponse): JsonExportResult {
  const enriched = {
    ...response,
    results: response.results.map((result) => ({
      ...result,
      scores: computeScores(result),
      contributors: computeContributors(result),
      healthRatios: computeHealthRatios(result),
    })),
    comparison: computeComparison(response.results),
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
