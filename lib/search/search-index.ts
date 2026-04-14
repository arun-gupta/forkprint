import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { ResultTabId } from '@/specs/006-results-shell/contracts/results-shell-props'
import type { SearchIndex } from './types'
import { RECOMMENDATION_CATALOG } from '@/lib/recommendations/catalog'

type Extractor = (results: AnalysisResult[]) => string[]

function str(value: unknown): string {
  if (value === 'unavailable' || value === null || value === undefined) return ''
  if (typeof value === 'number') return String(value)
  return String(value)
}

function pct(value: unknown): string {
  if (typeof value !== 'number') return ''
  return `${Math.round(value * 100)}%`
}

const DOC_FILE_LABELS: Record<string, string> = {
  readme: 'README',
  license: 'LICENSE',
  contributing: 'CONTRIBUTING',
  code_of_conduct: 'CODE_OF_CONDUCT',
  security: 'SECURITY',
  changelog: 'CHANGELOG',
}

const README_SECTION_LABELS: Record<string, string> = {
  description: 'Description / Overview',
  installation: 'Installation / Setup',
  usage: 'Usage / Examples',
  contributing: 'Contributing',
  license: 'License',
}

const DIRECT_CHECK_LABELS: Record<string, string> = {
  security_policy: 'Security Policy (SECURITY.md)',
  dependabot: 'Dependency Automation (Dependabot/Renovate)',
  ci_cd: 'CI/CD Pipelines (GitHub Actions)',
  branch_protection: 'Branch Protection',
}

/**
 * Overview: only text visible in the MetricCard component —
 * repo name, created date, health score bracket, ecosystem profile
 * (Reach/Attention/Engagement with stars/watcher-rate/fork-rate),
 * score badge categories, and recommendation count.
 * Does NOT include the collapsed detail rows (commits, PRs, issues, etc.)
 * since those are not visible in the overview.
 */
function extractOverview(results: AnalysisResult[]): string[] {
  const entries: string[] = []
  for (const r of results) {
    entries.push(r.repo)
    entries.push(str(r.description))
    entries.push(str(r.primaryLanguage))
    if (r.stars !== 'unavailable') entries.push(`${str(r.stars)} stars`)
    if (r.topics.length > 0) entries.push(r.topics.join(' '))
  }
  return entries.filter(Boolean)
}

/**
 * Contributors: contributor names, org names, counts.
 */
function extractContributors(results: AnalysisResult[]): string[] {
  const entries: string[] = []
  for (const r of results) {
    entries.push(r.repo)
    if (r.totalContributors !== 'unavailable') entries.push(`Total contributors ${str(r.totalContributors)}`)
    if (r.maintainerCount !== 'unavailable') entries.push(`Maintainer count ${str(r.maintainerCount)}`)
    if (r.uniqueCommitAuthors90d !== 'unavailable') entries.push(`Unique commit authors (90d) ${str(r.uniqueCommitAuthors90d)}`)
    if (r.commitCountsByAuthor && r.commitCountsByAuthor !== 'unavailable') {
      for (const [author, count] of Object.entries(r.commitCountsByAuthor)) {
        entries.push(`${author} ${count} commits`)
      }
    }
    if (r.commitCountsByExperimentalOrg && r.commitCountsByExperimentalOrg !== 'unavailable') {
      for (const [org, count] of Object.entries(r.commitCountsByExperimentalOrg)) {
        entries.push(`${org} ${count} commits`)
      }
    }
  }
  return entries.filter(Boolean)
}

/**
 * Activity: commits, PRs, issues, releases — only labels that pair with actual data.
 */
function extractActivity(results: AnalysisResult[]): string[] {
  const entries: string[] = []
  for (const r of results) {
    entries.push(r.repo)
    if (r.commits30d !== 'unavailable') entries.push(`Commits ${str(r.commits30d)}`)
    if (r.commits90d !== 'unavailable') entries.push(`Commits ${str(r.commits90d)}`)
    if (r.prsOpened90d !== 'unavailable') entries.push(`Pull requests Opened ${str(r.prsOpened90d)}`)
    if (r.prsMerged90d !== 'unavailable') entries.push(`Merged ${str(r.prsMerged90d)}`)
    const mergeRate = typeof r.prsOpened90d === 'number' && typeof r.prsMerged90d === 'number' && r.prsOpened90d > 0
      ? r.prsMerged90d / r.prsOpened90d : null
    if (mergeRate !== null) entries.push(`Merge rate ${pct(mergeRate)}`)
    if (r.issuesOpen !== 'unavailable') entries.push(`Issues Opened ${str(r.issuesOpen)}`)
    if (r.issuesClosed90d !== 'unavailable') entries.push(`Closed ${str(r.issuesClosed90d)}`)
    if (typeof r.staleIssueRatio === 'number') entries.push(`Stale issue ratio ${pct(r.staleIssueRatio)}`)
    if (typeof r.medianTimeToMergeHours === 'number') entries.push(`Median time to merge ${str(r.medianTimeToMergeHours)}`)
    if (typeof r.medianTimeToCloseHours === 'number') entries.push(`Median time to close ${str(r.medianTimeToCloseHours)}`)
    if (r.releases12mo !== 'unavailable') entries.push(`Releases ${str(r.releases12mo)}`)
  }
  return entries.filter(Boolean)
}

/**
 * Responsiveness: only includes metric labels when data exists.
 */
function extractResponsiveness(results: AnalysisResult[]): string[] {
  const entries: string[] = []
  for (const r of results) {
    entries.push(r.repo)
    const rm = r.responsivenessMetrics
    if (rm) {
      if (rm.issueFirstResponseMedianHours !== 'unavailable') entries.push(`Issue first response (median) ${str(rm.issueFirstResponseMedianHours)}`)
      if (rm.issueFirstResponseP90Hours !== 'unavailable') entries.push(`Issue first response (p90) ${str(rm.issueFirstResponseP90Hours)}`)
      if (rm.prFirstReviewMedianHours !== 'unavailable') entries.push(`PR first review (median) ${str(rm.prFirstReviewMedianHours)}`)
      if (rm.prFirstReviewP90Hours !== 'unavailable') entries.push(`PR first review (p90) ${str(rm.prFirstReviewP90Hours)}`)
      if (rm.issueResolutionMedianHours !== 'unavailable') entries.push(`Issue resolution duration (median) ${str(rm.issueResolutionMedianHours)}`)
      if (rm.prMergeMedianHours !== 'unavailable') entries.push(`PR merge duration (median) ${str(rm.prMergeMedianHours)}`)
      if (rm.issueResolutionRate !== 'unavailable') entries.push(`Issue resolution rate ${str(rm.issueResolutionRate)}`)
      if (rm.contributorResponseRate !== 'unavailable') entries.push(`Contributor response rate ${str(rm.contributorResponseRate)}`)
      if (rm.staleIssueRatio !== 'unavailable') entries.push(`Stale issue ratio ${str(rm.staleIssueRatio)}`)
      if (rm.stalePrRatio !== 'unavailable') entries.push(`Stale PR ratio ${str(rm.stalePrRatio)}`)
      if (rm.openIssueCount !== 'unavailable') entries.push(`Open issues ${str(rm.openIssueCount)}`)
      if (rm.openPullRequestCount !== 'unavailable') entries.push(`Open PR backlog ${str(rm.openPullRequestCount)}`)
      if (rm.prReviewDepth !== 'unavailable') entries.push(`PR review depth ${str(rm.prReviewDepth)}`)
    }
  }
  return entries.filter(Boolean)
}

/**
 * Documentation: file names, README sections, license info — all data-driven.
 */
function extractDocumentation(results: AnalysisResult[]): string[] {
  const entries: string[] = []
  for (const r of results) {
    entries.push(r.repo)
    const doc = r.documentationResult
    if (doc && doc !== 'unavailable') {
      for (const fc of doc.fileChecks) {
        const label = DOC_FILE_LABELS[fc.name] ?? fc.name
        entries.push(`${label} ${fc.found ? 'found' : 'not found'}`)
        if (fc.path) entries.push(fc.path)
      }
      for (const rs of doc.readmeSections) {
        const label = README_SECTION_LABELS[rs.name] ?? rs.name
        entries.push(`${label} ${rs.detected ? 'detected' : 'not detected'}`)
      }
    }
    const lic = r.licensingResult
    if (lic && lic !== 'unavailable') {
      if (lic.license.spdxId) entries.push(lic.license.spdxId)
      if (lic.license.name) entries.push(lic.license.name)
      if (lic.license.osiApproved) entries.push('OSI Approved')
      if (lic.license.permissivenessTier) entries.push(lic.license.permissivenessTier)
      if (lic.contributorAgreement.dcoOrClaBot) entries.push('DCO CLA enforcement detected')
      for (const al of lic.additionalLicenses) {
        if (al.spdxId) entries.push(al.spdxId)
        if (al.name) entries.push(al.name)
      }
    }
    const inc = r.inclusiveNamingResult
    if (inc && inc !== 'unavailable') {
      if (inc.defaultBranchName) entries.push(`Default branch ${inc.defaultBranchName}`)
      for (const mc of inc.metadataChecks) {
        if (!mc.passed && mc.term) entries.push(`${mc.term} ${mc.severity ?? ''}`)
      }
    }
  }
  return entries.filter(Boolean)
}

/**
 * Security: scorecard check names/scores/reasons, direct check labels/details.
 */
function extractSecurity(results: AnalysisResult[]): string[] {
  const entries: string[] = []
  for (const r of results) {
    entries.push(r.repo)
    const sec = r.securityResult
    if (!sec || sec === 'unavailable') continue
    if (sec.scorecard && sec.scorecard !== 'unavailable') {
      entries.push(`OpenSSF Scorecard ${sec.scorecard.overallScore}/10`)
      for (const check of sec.scorecard.checks) {
        entries.push(`${check.name} ${check.score}/10 ${check.reason}`)
      }
    }
    for (const dc of sec.directChecks) {
      const label = DIRECT_CHECK_LABELS[dc.name] ?? dc.name
      entries.push(`${label} ${dc.detected === true ? 'detected' : dc.detected === false ? 'not detected' : 'unavailable'}`)
      if (dc.details) entries.push(dc.details)
    }
  }
  return entries.filter(Boolean)
}

/**
 * Recommendations: only includes recommendations that would actually
 * be generated for this analysis result (failed checks, missing files, etc.).
 * Each entry includes the catalog ID, title, and risk level when available.
 */
function extractRecommendations(results: AnalysisResult[]): string[] {
  const entries: string[] = []
  for (const r of results) {
    entries.push(r.repo)
    // Security recommendations from scorecard checks that scored below 10
    const sec = r.securityResult
    if (sec && sec !== 'unavailable' && sec.scorecard && sec.scorecard !== 'unavailable') {
      for (const check of sec.scorecard.checks) {
        if (check.score < 10) {
          const catalogEntry = RECOMMENDATION_CATALOG.find((e) => e.key === check.name)
          if (catalogEntry) {
            entries.push(`${catalogEntry.id} ${catalogEntry.title} ${catalogEntry.bucket}`)
          }
        }
      }
    }
    // Direct check recommendations (only for failed checks)
    if (sec && sec !== 'unavailable') {
      for (const dc of sec.directChecks) {
        if (dc.detected === false) {
          const catalogEntry = RECOMMENDATION_CATALOG.find((e) => e.key === dc.name)
          if (catalogEntry) {
            entries.push(`${catalogEntry.id} ${catalogEntry.title} ${catalogEntry.bucket}`)
          }
        }
      }
    }
    // Documentation recommendations (only for missing files/sections)
    const doc = r.documentationResult
    if (doc && doc !== 'unavailable') {
      for (const fc of doc.fileChecks) {
        if (!fc.found) {
          const key = `file:${fc.name}`
          const catalogEntry = RECOMMENDATION_CATALOG.find((e) => e.key === key)
          if (catalogEntry) {
            entries.push(`${catalogEntry.id} ${catalogEntry.title} ${catalogEntry.bucket}`)
          }
        }
      }
      for (const rs of doc.readmeSections) {
        if (!rs.detected) {
          const key = `section:${rs.name}`
          const catalogEntry = RECOMMENDATION_CATALOG.find((e) => e.key === key)
          if (catalogEntry) {
            entries.push(`${catalogEntry.id} ${catalogEntry.title} ${catalogEntry.bucket}`)
          }
        }
      }
    }
    // Licensing recommendations
    const lic = r.licensingResult
    if (lic && lic !== 'unavailable') {
      if (!lic.license.spdxId) {
        const ce = RECOMMENDATION_CATALOG.find((e) => e.key === 'licensing:license')
        if (ce) entries.push(`${ce.id} ${ce.title} ${ce.bucket}`)
      }
      if (lic.license.spdxId && !lic.license.osiApproved) {
        const ce = RECOMMENDATION_CATALOG.find((e) => e.key === 'licensing:osi_license')
        if (ce) entries.push(`${ce.id} ${ce.title} ${ce.bucket}`)
      }
      if (!lic.contributorAgreement.enforced) {
        const ce = RECOMMENDATION_CATALOG.find((e) => e.key === 'licensing:dco_cla')
        if (ce) entries.push(`${ce.id} ${ce.title} ${ce.bucket}`)
      }
    }
  }
  return entries.filter(Boolean)
}

/**
 * Comparison: only indexed when 2+ repos are analyzed (matching the UI).
 * Only includes per-repo data values, not static row labels.
 */
function extractComparison(results: AnalysisResult[]): string[] {
  if (results.length < 2) return []

  const entries: string[] = []
  for (const r of results) {
    entries.push(r.repo)
    if (r.stars !== 'unavailable') entries.push(`Stars ${str(r.stars)}`)
    if (r.forks !== 'unavailable') entries.push(`Forks ${str(r.forks)}`)
    if (r.watchers !== 'unavailable') entries.push(`Watchers ${str(r.watchers)}`)
    if (r.totalContributors !== 'unavailable') entries.push(`Total contributors ${str(r.totalContributors)}`)
    if (r.maintainerCount !== 'unavailable') entries.push(`Maintainer count ${str(r.maintainerCount)}`)
    if (r.commits90d !== 'unavailable') entries.push(`Commits (90d) ${str(r.commits90d)}`)
    if (r.releases12mo !== 'unavailable') entries.push(`Releases (12mo) ${str(r.releases12mo)}`)
  }
  return entries.filter(Boolean)
}

const EXTRACTORS: Record<ResultTabId, Extractor> = {
  overview: extractOverview,
  contributors: extractContributors,
  activity: extractActivity,
  responsiveness: extractResponsiveness,
  documentation: extractDocumentation,
  security: extractSecurity,
  recommendations: extractRecommendations,
  comparison: extractComparison,
}

export function buildSearchIndex(results: AnalysisResult[]): SearchIndex {
  const index = {} as SearchIndex
  for (const [tabId, extractor] of Object.entries(EXTRACTORS)) {
    index[tabId as ResultTabId] = extractor(results)
  }
  return index
}
