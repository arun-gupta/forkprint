import type { AnalysisResult, AnalyzeResponse } from '@/lib/analyzer/analysis-result'
import { getActivityScore } from '@/lib/activity/score-config'
import { buildComparisonSections } from '@/lib/comparison/view-model'
import { getContributorsScore } from '@/lib/contributors/score-config'
import { buildContributorsViewModels } from '@/lib/contributors/view-model'
import { buildHealthRatioRows } from '@/lib/health-ratios/view-model'
import { getDocumentationScore } from '@/lib/documentation/score-config'
import { assignReferenceIds, resolveReferenceId } from '@/lib/recommendations/reference-id'
import { getResponsivenessScore } from '@/lib/responsiveness/score-config'
import { getHealthScore } from '@/lib/scoring/health-score'
import { getInclusiveNamingScore } from '@/lib/inclusive-naming/score-config'
import { getSecurityScore } from '@/lib/security/score-config'
import { computeCommunityCompleteness } from '@/lib/community/completeness'

export interface JsonExportResult {
  blob: Blob
  filename: string
}

interface RepoScores {
  activity: { value: number | string; tone: string; description: string }
  contributors: { value: number | string; tone: string; description: string }
  responsiveness: { value: number | string; tone: string; description: string }
  documentation: { value: number | string; tone: string; filesFound: number; readmeSections: number } | null
  security: { value: number | string; tone: string; mode: string } | null
}

function computeScores(result: AnalysisResult): RepoScores {
  const activity = getActivityScore(result)
  const contributors = getContributorsScore(result)
  const responsiveness = getResponsivenessScore(result)
  let documentation: RepoScores['documentation'] = null
  if (result.documentationResult !== 'unavailable') {
    const docScore = getDocumentationScore(result.documentationResult, result.licensingResult, result.stars, result.inclusiveNamingResult)
    documentation = {
      value: docScore.value,
      tone: docScore.tone,
      filesFound: result.documentationResult.fileChecks.filter((f) => f.found).length,
      readmeSections: result.documentationResult.readmeSections.filter((s) => s.detected).length,
    }
  }
  let security: RepoScores['security'] = null
  if (result.securityResult && result.securityResult !== 'unavailable') {
    const secScore = getSecurityScore(result.securityResult, result.stars)
    security = { value: secScore.value, tone: secScore.tone, mode: secScore.mode }
  }
  return {
    activity: { value: activity.value, tone: activity.tone, description: activity.description },
    contributors: { value: contributors.value, tone: contributors.tone, description: contributors.description },
    responsiveness: { value: responsiveness.value, tone: responsiveness.tone, description: responsiveness.description },
    documentation,
    security,
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
    contributorsScore: section.contributorsScore.value,
    contributorsScoreFactors: section.contributorsScore.weightedFactors.map((f) => ({
      label: f.label,
      weightLabel: f.weightLabel,
      percentile: f.percentile ?? null,
    })),
    contributorsMetrics: section.contributorsMetrics.map((m) => ({ label: m.label, value: m.value })),
    coreMetrics: section.coreMetrics.map((m) => ({ label: m.label, value: m.value })),
    experimentalMetrics: section.experimentalMetrics.map((m) => ({ label: m.label, value: m.value })),
  }
}

function computeRecommendations(result: AnalysisResult) {
  const healthScore = getHealthScore(result)
  const nonSecurityRecs = healthScore.recommendations.filter((r) => r.tab !== 'security')
  const securityRecs = result.securityResult !== 'unavailable'
    ? getSecurityScore(result.securityResult, result.stars).recommendations
    : []

  const nonSecurityWithIds = assignReferenceIds(nonSecurityRecs).map((r) => ({
    referenceId: r.referenceId,
    bucket: r.bucket,
    message: r.message,
  }))

  const securityWithIds = securityRecs.map((rec, i) => ({
    referenceId: resolveReferenceId(rec.item, 'Security', i + 1),
    bucket: 'Security',
    title: rec.title ?? rec.text,
    riskLevel: rec.riskLevel,
    category: rec.category,
    evidence: rec.evidence,
    remediationHint: rec.remediationHint,
  }))

  return [...nonSecurityWithIds, ...securityWithIds]
}

function computeSecurity(result: AnalysisResult) {
  if (!result.securityResult || result.securityResult === 'unavailable') return undefined
  const score = getSecurityScore(result.securityResult, result.stars)
  return {
    score: score.value,
    tone: score.tone,
    mode: score.mode,
    compositeScore: score.compositeScore,
    scorecardScore: score.scorecardScore,
    directCheckScore: score.directCheckScore,
    scorecard: result.securityResult.scorecard !== 'unavailable'
      ? {
          overallScore: result.securityResult.scorecard.overallScore,
          version: result.securityResult.scorecard.scorecardVersion,
          checks: result.securityResult.scorecard.checks.map((c) => ({
            name: c.name,
            score: c.score,
            reason: c.reason,
          })),
        }
      : null,
    directChecks: result.securityResult.directChecks.map((c) => ({
      name: c.name,
      detected: c.detected,
      details: c.details,
    })),
  }
}

function computeLicensing(result: AnalysisResult) {
  if (!result.licensingResult || result.licensingResult === 'unavailable') return undefined
  const lr = result.licensingResult
  return {
    license: {
      spdxId: lr.license.spdxId,
      name: lr.license.name,
      osiApproved: lr.license.osiApproved,
      permissivenessTier: lr.license.permissivenessTier,
    },
    additionalLicenses: lr.additionalLicenses.map((l) => ({
      spdxId: l.spdxId,
      name: l.name,
      osiApproved: l.osiApproved,
      permissivenessTier: l.permissivenessTier,
    })),
    contributorAgreement: {
      enforced: lr.contributorAgreement.enforced,
      signedOffByRatio: lr.contributorAgreement.signedOffByRatio,
      dcoOrClaBot: lr.contributorAgreement.dcoOrClaBot,
    },
  }
}

function computeInclusiveNaming(result: AnalysisResult) {
  if (!result.inclusiveNamingResult || result.inclusiveNamingResult === 'unavailable') return undefined
  const inr = result.inclusiveNamingResult
  const score = getInclusiveNamingScore(inr)
  return {
    compositeScore: score.compositeScore,
    branchScore: score.branchScore,
    metadataScore: score.metadataScore,
    defaultBranchName: inr.defaultBranchName,
    branchCheck: {
      term: inr.branchCheck.term,
      passed: inr.branchCheck.passed,
      severity: inr.branchCheck.severity,
      replacements: inr.branchCheck.replacements,
    },
    metadataChecks: inr.metadataChecks.map((c) => ({
      checkType: c.checkType,
      term: c.term,
      passed: c.passed,
      severity: c.severity,
      replacements: c.replacements,
    })),
  }
}

function computeCommunity(result: AnalysisResult) {
  const completeness = computeCommunityCompleteness(result)

  // Signals map — one entry per CommunitySignalKey, present state is
  // 'unknown' when the signal couldn't be determined (FR-016).
  type PresentState = boolean | 'unknown'
  const makeSignal = (key: (typeof completeness.present)[number]): { present: PresentState } => {
    if (completeness.present.includes(key)) return { present: true }
    if (completeness.missing.includes(key)) return { present: false }
    return { present: 'unknown' }
  }

  return {
    signals: {
      code_of_conduct: makeSignal('code_of_conduct'),
      issue_templates: makeSignal('issue_templates'),
      pull_request_template: makeSignal('pull_request_template'),
      codeowners: makeSignal('codeowners'),
      governance: makeSignal('governance'),
      funding: makeSignal('funding'),
      discussions_enabled: makeSignal('discussions_enabled'),
    },
    completeness: {
      ratio: completeness.ratio,
      percentile: completeness.percentile,
      tone: completeness.tone,
      presentCount: completeness.present.length,
      missingCount: completeness.missing.length,
      unknownCount: completeness.unknown.length,
    },
    discussions: {
      enabled: result.hasDiscussionsEnabled === true
        ? true
        : result.hasDiscussionsEnabled === false
          ? false
          : 'unknown' as const,
      // Per FR-008 / SC-003: windowDays and windowCount are null when Discussions is
      // disabled — the analyzer never claims an activity measurement it didn't make.
      windowDays: typeof result.discussionsWindowDays === 'number' ? result.discussionsWindowDays : null,
      windowCount: typeof result.discussionsCountWindow === 'number' ? result.discussionsCountWindow : null,
    },
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
      recommendations: computeRecommendations(result),
      security: computeSecurity(result),
      licensing: computeLicensing(result),
      inclusiveNaming: computeInclusiveNaming(result),
      community: computeCommunity(result),
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
