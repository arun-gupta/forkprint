import type { AnalysisResult, AnalyzeResponse, ResponsivenessMetrics } from '@/lib/analyzer/analysis-result'
import { getActivityScore } from '@/lib/activity/score-config'
import { buildComparisonSections } from '@/lib/comparison/view-model'
import { limitComparedResults } from '@/lib/comparison/view-model'
import { getContributorsScore } from '@/lib/contributors/score-config'
import { getDocumentationScore } from '@/lib/documentation/score-config'
import { buildContributorsViewModels } from '@/lib/contributors/view-model'
import { buildSpectrumProfile } from '@/lib/ecosystem-map/classification'
import { buildHealthRatioRows } from '@/lib/health-ratios/view-model'
import { assignReferenceIds, resolveReferenceId } from '@/lib/recommendations/reference-id'
import { formatHours, formatPercentage, getResponsivenessScore } from '@/lib/responsiveness/score-config'
import { getHealthScore } from '@/lib/scoring/health-score'
import { getSecurityScore } from '@/lib/security/score-config'
import { computeCommunityCompleteness, type CommunitySignalKey } from '@/lib/community/completeness'
import { encodeRepos } from '@/lib/export/shareable-url'

export interface MarkdownExportResult {
  blob: Blob
  filename: string
}

function fmt(value: unknown): string {
  if (value === 'unavailable' || value === null || value === undefined) return '—'
  if (typeof value === 'number') return new Intl.NumberFormat('en-US').format(value)
  return String(value)
}

function fmtHours(value: unknown): string {
  if (value === 'unavailable' || value === null || value === undefined) return '—'
  return formatHours(value as number | 'unavailable')
}

function fmtPct(value: unknown): string {
  if (value === 'unavailable' || value === null || value === undefined) return '—'
  return formatPercentage(value as number | 'unavailable')
}

function fmtRatio(numerator: number | 'unavailable', denominator: number | 'unavailable'): string {
  if (typeof numerator !== 'number' || typeof denominator !== 'number' || denominator <= 0) return '—'
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format((numerator / denominator) * 100)}%`
}

function formatCreatedAt(value: string | 'unavailable'): string | null {
  if (value === 'unavailable') return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}

function mdTable(rows: [string, string][]): string {
  const lines = ['| Metric | Value |', '| --- | --- |']
  for (const [label, value] of rows) {
    lines.push(`| ${label} | ${value} |`)
  }
  return lines.join('\n')
}

function getResponsivenessMetrics(result: AnalysisResult): ResponsivenessMetrics {
  return (
    result.responsivenessMetricsByWindow?.[90] ??
    result.responsivenessMetrics ?? {
      issueFirstResponseMedianHours: 'unavailable',
      issueFirstResponseP90Hours: 'unavailable',
      prFirstReviewMedianHours: 'unavailable',
      prFirstReviewP90Hours: 'unavailable',
      issueResolutionMedianHours: 'unavailable',
      issueResolutionP90Hours: 'unavailable',
      prMergeMedianHours: result.medianTimeToMergeHours ?? 'unavailable',
      prMergeP90Hours: 'unavailable',
      issueResolutionRate: 'unavailable',
      contributorResponseRate: 'unavailable',
      botResponseRatio: 'unavailable',
      humanResponseRatio: 'unavailable',
      staleIssueRatio: result.staleIssueRatio ?? 'unavailable',
      stalePrRatio: 'unavailable',
      prReviewDepth: 'unavailable',
      issuesClosedWithoutCommentRatio: 'unavailable',
      openIssueCount: result.issuesOpen,
      openPullRequestCount: 'unavailable',
    }
  )
}

const HEALTH_RATIO_CATEGORY_LABELS: Record<string, string> = {
  ecosystem: 'Overview',
  contributors: 'Contributors',
  activity: 'Activity',
}

function renderRepo(result: AnalysisResult, appUrl?: string): string {
  const activity = getActivityScore(result)
  const contributorsScore = getContributorsScore(result)
  const responsiveness = getResponsivenessScore(result)
  const contributors = buildContributorsViewModels([result])[0]
  const healthRatioRows = buildHealthRatioRows([result])
  const rm = getResponsivenessMetrics(result)
  const am = result.activityMetricsByWindow?.[90]

  const prsOpened = am?.prsOpened ?? result.prsOpened90d
  const prsMerged = am?.prsMerged ?? result.prsMerged90d
  const issuesOpened = am?.issuesOpened ?? 'unavailable'
  const issuesClosed = am?.issuesClosed ?? result.issuesClosed90d
  const staleIssueRatio = am?.staleIssueRatio ?? result.staleIssueRatio ?? 'unavailable'
  const medianMergeHours = am?.medianTimeToMergeHours ?? result.medianTimeToMergeHours ?? 'unavailable'
  const medianCloseHours = am?.medianTimeToCloseHours ?? result.medianTimeToCloseHours ?? 'unavailable'
  const releases = am?.releases ?? result.releases12mo

  const githubUrl = `https://github.com/${result.repo}`

  // Per-repo header
  const lines: string[] = [
    `## ${result.repo}`,
    '',
  ]
  if (result.description && result.description !== 'unavailable') {
    lines.push(result.description, '')
  }
  lines.push(
    `**GitHub**: [${result.repo}](${githubUrl})` + (appUrl ? ` | **RepoPulse**: [View analysis](${appUrl})` : ''),
    '',
  )

  // Overview section — mirrors the web Overview tab layout
  const spectrumProfile = buildSpectrumProfile(result)
  const createdLabel = formatCreatedAt(result.createdAt)

  lines.push('### Overview', '')
  if (createdLabel) lines.push(`**Created**: ${createdLabel}`, '')

  if (spectrumProfile) {
    lines.push(
      '#### Ecosystem Profile',
      '',
      '| Dimension | Ranking | Detail |',
      '| --- | --- | --- |',
      `| Reach | ${spectrumProfile.reachLabel} | — |`,
      `| Engagement | ${spectrumProfile.engagementLabel} | ${spectrumProfile.forkRateLabel} fork rate |`,
      `| Attention | ${spectrumProfile.attentionLabel} | ${spectrumProfile.watcherRateLabel} watcher rate |`,
      '',
    )
  }

  lines.push(
    mdTable([
      ['Stars', fmt(result.stars)],
      ['Forks', fmt(result.forks)],
      ['Watchers', fmt(result.watchers)],
      ['Primary language', fmt(result.primaryLanguage)],
    ]),
    '',
    '| Score | Value |',
    '| --- | --- |',
    `| Contributors | ${contributorsScore.value} |`,
    `| Activity | ${activity.value} |`,
    `| Responsiveness | ${responsiveness.value} |`,
    `| Documentation | ${result.documentationResult !== 'unavailable' ? getDocumentationScore(result.documentationResult, result.licensingResult, result.stars, result.inclusiveNamingResult).value : 'unavailable'} |`,
    `| Security | ${result.securityResult && result.securityResult !== 'unavailable' ? getSecurityScore(result.securityResult, result.stars).value : 'unavailable'} |`,
    '',
  )

  // Contributors section
  const typesOfContributions = contributors?.contributorsMetrics.find((m) => m.label === 'Types of contributions')?.value
  lines.push(
    '### Contributors',
    '',
    `**Contributors score**: ${contributorsScore.value}`,
    '',
    mdTable([
      ['Total contributors', fmt(result.totalContributors)],
      ['Unique commit authors (90 days)', fmt(result.uniqueCommitAuthors90d)],
      ['Repeat contributors (90 days)', fmt(result.contributorMetricsByWindow?.[90]?.repeatContributors ?? 'unavailable')],
      ['New contributors (90 days)', fmt(result.contributorMetricsByWindow?.[90]?.newContributors ?? 'unavailable')],
      ['Maintainer count', fmt(result.maintainerCount)],
      ['Top 20% contributor share', fmtPct(contributorsScore.concentration)],
      ...(typesOfContributions ? [['Types of contributions', typesOfContributions] as [string, string]] : []),
    ]),
    '',
    '**Score factors**',
    '',
    '| Factor | Weight | Percentile |',
    '| --- | --- | --- |',
    ...contributorsScore.weightedFactors.map((f) => `| ${f.label} | ${f.weightLabel} | ${f.percentile !== undefined ? `${f.percentile}` : '—'} |`),
    '',
  )

  if (contributors?.experimentalMetrics.length) {
    lines.push(
      '> **Experimental (heuristic org attribution)**',
      '>',
      '> Heuristic public-org attribution may be incomplete or inaccurate.',
      '>',
      ...contributors.experimentalMetrics.map((m) => `> | ${m.label} | ${m.value} |`).flatMap((row, i) =>
        i === 0 ? ['> | Metric | Value |', '> | --- | --- |', row] : [row]
      ),
      '',
    )
  }

  // Community section (cross-cutting lens, not a composite-weighted bucket).
  const communityLines = renderCommunitySection(result)
  if (communityLines.length > 0) {
    lines.push(...communityLines)
  }

  // Activity section with grouped tables
  lines.push(
    '### Activity',
    '',
    `**Score**: ${activity.value}`,
    '',
    '#### Commits',
    '',
    mdTable([
      ['Commits (30 days)', fmt(result.commits30d)],
      ['Commits (90 days)', fmt(result.commits90d)],
    ]),
    '',
    '#### Pull requests',
    '',
    mdTable([
      ['PRs opened (90 days)', fmt(prsOpened)],
      ['PRs merged (90 days)', fmt(prsMerged)],
      ['PR merge rate', fmtRatio(prsMerged, prsOpened)],
      ['Median time to merge', fmtHours(medianMergeHours)],
    ]),
    '',
    '#### Issues',
    '',
    mdTable([
      ['Issues opened (90 days)', fmt(issuesOpened)],
      ['Issues closed (90 days)', fmt(issuesClosed)],
      ['Issue closure rate', fmtRatio(issuesClosed, issuesOpened)],
      ['Stale issue ratio', fmtPct(staleIssueRatio)],
      ['Median time to close', fmtHours(medianCloseHours)],
    ]),
    '',
    '#### Releases',
    '',
    mdTable([
      ['Releases (12 months)', fmt(releases)],
    ]),
    '',
  )

  // Responsiveness section with grouped tables
  lines.push(
    '### Responsiveness',
    '',
    `**Score**: ${responsiveness.value}`,
    '',
    '#### Issue & PR response time',
    '',
    mdTable([
      ['Issue first response (median)', fmtHours(rm.issueFirstResponseMedianHours)],
      ['Issue first response (p90)', fmtHours(rm.issueFirstResponseP90Hours)],
      ['PR first review (median)', fmtHours(rm.prFirstReviewMedianHours)],
      ['PR first review (p90)', fmtHours(rm.prFirstReviewP90Hours)],
    ]),
    '',
    '#### Resolution metrics',
    '',
    mdTable([
      ['Issue resolution duration (median)', fmtHours(rm.issueResolutionMedianHours)],
      ['Issue resolution duration (p90)', fmtHours(rm.issueResolutionP90Hours)],
      ['PR merge duration (median)', fmtHours(rm.prMergeMedianHours)],
      ['PR merge duration (p90)', fmtHours(rm.prMergeP90Hours)],
      ['Issue resolution rate', fmtPct(rm.issueResolutionRate)],
    ]),
    '',
    '#### Maintainer activity signals',
    '',
    mdTable([
      ['Contributor response rate', fmtPct(rm.contributorResponseRate)],
      ['Human first-response ratio', fmtPct(rm.humanResponseRatio)],
      ['Bot first-response ratio', fmtPct(rm.botResponseRatio)],
    ]),
    '',
    '#### Volume & backlog health',
    '',
    mdTable([
      ['Open issues', fmt(rm.openIssueCount)],
      ['Open PR backlog', fmt(rm.openPullRequestCount)],
      ['Stale issue ratio', fmtPct(rm.staleIssueRatio)],
      ['Stale PR ratio', fmtPct(rm.stalePrRatio)],
    ]),
    '',
    '#### Engagement quality signals',
    '',
    mdTable([
      ['PR review depth', fmt(rm.prReviewDepth)],
      ['Issues closed without comment', fmtPct(rm.issuesClosedWithoutCommentRatio)],
    ]),
    '',
  )

  // Documentation section
  if (result.documentationResult !== 'unavailable') {
    const docScore = getDocumentationScore(result.documentationResult, result.licensingResult, result.stars, result.inclusiveNamingResult)
    const { fileChecks, readmeSections } = result.documentationResult
    const FILE_LABELS: Record<string, string> = {
      readme: 'README', license: 'LICENSE', contributing: 'CONTRIBUTING',
      code_of_conduct: 'CODE_OF_CONDUCT', security: 'SECURITY', changelog: 'CHANGELOG',
    }
    const SECTION_LABELS: Record<string, string> = {
      description: 'Description / Overview', installation: 'Installation / Setup',
      usage: 'Usage / Examples', contributing: 'Contributing', license: 'License',
    }

    lines.push(
      '### Documentation',
      '',
      `**Score**: ${docScore.value}`,
      '',
      '#### Files',
      '',
      mdTable(fileChecks.map((f) => [
        FILE_LABELS[f.name] ?? f.name,
        f.found ? `Present${f.path ? ` (${f.path})` : ''}` : 'Missing',
      ])),
      '',
      '#### README Sections',
      '',
      mdTable(readmeSections.map((s) => [
        SECTION_LABELS[s.name] ?? s.name,
        s.detected ? 'Detected' : 'Missing',
      ])),
      '',
    )
  }

  // Security section
  if (result.securityResult && result.securityResult !== 'unavailable') {
    const secScore = getSecurityScore(result.securityResult, result.stars)
    const DIRECT_CHECK_LABELS: Record<string, string> = {
      security_policy: 'Security Policy',
      dependabot: 'Dependabot / Dependency Updates',
      ci_cd: 'CI/CD Pipeline',
      branch_protection: 'Branch Protection',
    }

    lines.push(
      '### Security',
      '',
      `**Score**: ${secScore.value}`,
      `**Mode**: ${secScore.mode === 'scorecard' ? 'Scorecard + direct checks' : 'Direct checks only'}`,
      '',
    )

    if (result.securityResult.scorecard !== 'unavailable') {
      const sc = result.securityResult.scorecard
      lines.push(
        `#### OpenSSF Scorecard (v${sc.scorecardVersion})`,
        '',
        `**Overall score**: ${sc.overallScore} / 10`,
        '',
        '| Check | Score |',
        '| --- | --- |',
        ...sc.checks.map((c) =>
          `| ${c.name} | ${c.score === -1 ? 'Indeterminate' : `${c.score} / 10`} |`
        ),
        '',
      )
    }

    if (result.securityResult.directChecks.length > 0) {
      lines.push(
        '#### Direct Security Checks',
        '',
        '| Check | Status |',
        '| --- | --- |',
        ...result.securityResult.directChecks.map((c) => {
          const label = DIRECT_CHECK_LABELS[c.name] ?? c.name
          const status = c.detected === 'unavailable' ? 'Unavailable' : c.detected ? 'Detected' : 'Not detected'
          return `| ${label} | ${status} |`
        }),
        '',
      )
    }
  }

  // Licensing & Compliance section
  if (result.licensingResult && result.licensingResult !== 'unavailable') {
    const lr = result.licensingResult
    const license = lr.license

    lines.push(
      '### Licensing & Compliance',
      '',
    )

    const licensingRows: [string, string][] = [
      ['License', license.spdxId ? `${license.name} (${license.spdxId})` : 'Not detected'],
    ]
    if (lr.additionalLicenses.length > 0) {
      licensingRows.push(['Additional licenses', lr.additionalLicenses.map((l) => l.name).join(', ')])
    }
    licensingRows.push(
      ['OSI approved', license.osiApproved === true ? 'Yes' : license.osiApproved === false ? 'No' : '—'],
      ['Permissiveness tier', license.permissivenessTier ?? '—'],
      ['DCO/CLA enforced', lr.contributorAgreement.enforced === true ? 'Yes' : lr.contributorAgreement.enforced === false ? 'No' : '—'],
    )

    lines.push(mdTable(licensingRows), '')
  }

  // Inclusive Naming section
  if (result.inclusiveNamingResult && result.inclusiveNamingResult !== 'unavailable') {
    const inr = result.inclusiveNamingResult

    lines.push(
      '### Inclusive Naming',
      '',
    )

    // Default branch
    const branchStatus = inr.branchCheck.passed ? 'Pass' : 'Fail'
    const branchDetail = inr.defaultBranchName ? ` (\`${inr.defaultBranchName}\`)` : ''
    lines.push(`**Default branch**: ${branchStatus}${branchDetail}`, '')

    if (!inr.branchCheck.passed && inr.branchCheck.severity) {
      lines.push(`- Severity: ${inr.branchCheck.severity}`)
      if (inr.branchCheck.replacements.length > 0) {
        lines.push(`- Suggested replacements: ${inr.branchCheck.replacements.join(', ')}`)
      }
      lines.push('')
    }

    // Metadata checks
    const failingChecks = inr.metadataChecks.filter((c) => !c.passed)
    if (failingChecks.length > 0) {
      lines.push(
        '#### Findings',
        '',
        '| Term | Location | Severity | Suggested Replacement |',
        '| --- | --- | --- | --- |',
        ...failingChecks.map((c) =>
          `| ${c.term} | ${c.checkType} | ${c.severity ?? '—'} | ${c.replacements.length > 0 ? c.replacements.join(', ') : '—'} |`
        ),
        '',
      )
    } else {
      lines.push('No non-inclusive terms found.', '')
    }
  }

  // Health Ratios section with tables per category
  lines.push('### Health Ratios', '')

  const ratiosByCategory = new Map<string, typeof healthRatioRows>()
  for (const row of healthRatioRows) {
    const key = row.category
    if (!ratiosByCategory.has(key)) ratiosByCategory.set(key, [])
    ratiosByCategory.get(key)!.push(row)
  }
  for (const [category, rows] of ratiosByCategory) {
    const categoryLabel = HEALTH_RATIO_CATEGORY_LABELS[category] ?? category
    lines.push(
      `#### ${categoryLabel}`,
      '',
      mdTable(rows.map((row) => {
        const cell = row.cells[0]
        return [row.label, cell ? cell.displayValue : '—']
      })),
      '',
    )
  }

  // Recommendations section
  const healthScore = getHealthScore(result)
  const nonSecurityRecs = healthScore.recommendations.filter((r) => r.tab !== 'security')
  const securityRecs = result.securityResult !== 'unavailable'
    ? getSecurityScore(result.securityResult, result.stars).recommendations
    : []

  if (nonSecurityRecs.length > 0 || securityRecs.length > 0) {
    lines.push('### Recommendations', '')

    if (nonSecurityRecs.length > 0) {
      const withIds = assignReferenceIds(nonSecurityRecs)
      const grouped = new Map<string, typeof withIds>()
      for (const rec of withIds) {
        const group = grouped.get(rec.bucket) ?? []
        group.push(rec)
        grouped.set(rec.bucket, group)
      }
      for (const [bucket, recs] of grouped) {
        lines.push(`#### ${bucket}`, '')
        for (const rec of recs) {
          lines.push(`- **${rec.referenceId}** — ${rec.message}`)
        }
        lines.push('')
      }
    }

    if (securityRecs.length > 0) {
      lines.push('#### Security', '')
      for (const [i, rec] of securityRecs.entries()) {
        const refId = resolveReferenceId(rec.item, 'Security', i + 1)
        const title = rec.title ?? rec.text
        const risk = rec.riskLevel ? ` [${rec.riskLevel}]` : ''
        lines.push(`- **${refId}**${risk} — ${title}`)
      }
      lines.push('')
    }
  }

  if (result.missingFields.length > 0) {
    lines.push('### Missing Data', '')
    for (const field of result.missingFields) {
      lines.push(`- ${field}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

function renderComparison(results: AnalysisResult[]): string {
  const sections = buildComparisonSections(results)
  if (sections.length === 0) return ''

  const repos = limitComparedResults(results)
  const anchorRepo = repos[0]?.repo ?? ''

  const lines: string[] = ['## Comparison', '']

  for (const section of sections) {
    lines.push(`### ${section.label}`, '')

    const headerCols = ['Metric', ...repos.map((r) => r.repo === anchorRepo ? `${r.repo} (anchor)` : r.repo), 'Median']
    lines.push(`| ${headerCols.join(' | ')} |`)
    lines.push(`| ${headerCols.map(() => '---').join(' | ')} |`)

    for (const row of section.rows) {
      const valueCols = repos.map((r) => {
        const cell = row.cells.find((c) => c.repo === r.repo)
        if (!cell) return '—'
        if (cell.deltaDisplay && cell.deltaDisplay !== 'Same as anchor' && cell.repo !== anchorRepo) {
          return `${cell.displayValue} (${cell.deltaDisplay})`
        }
        return cell.displayValue
      })
      lines.push(`| ${[row.label, ...valueCols, row.medianDisplay].join(' | ')} |`)
    }

    lines.push('')
  }

  return lines.join('\n')
}

export function buildMarkdownReport(response: AnalyzeResponse, analyzedRepos?: string[]): string {
  const timestamp = new Date().toISOString()
  const repoCount = response.results.length + response.failures.length
  const shareableUrl = analyzedRepos && analyzedRepos.length > 0 ? encodeRepos(analyzedRepos) : undefined

  const header = [
    '# RepoPulse Health Report',
    '',
    `- **Generated:** ${timestamp}`,
    `- **Repositories:** ${repoCount}`,
    ...(shareableUrl ? [`- **Source:** [View analysis](${shareableUrl})`] : []),
    '',
  ]

  const sections = response.results.map((result) => renderRepo(result, shareableUrl))
  const comparisonSection = response.results.length >= 2 ? renderComparison(response.results) : ''

  const failureLines: string[] = []
  if (response.failures.length > 0) {
    failureLines.push('## Failed Repositories', '')
    for (const failure of response.failures) {
      failureLines.push(`- **${failure.repo}**: ${failure.reason}`)
    }
  }

  const parts = [...header]
  for (const section of sections) {
    parts.push('---', '', section, '')
  }
  if (comparisonSection) {
    parts.push('---', '', comparisonSection)
  }
  if (failureLines.length > 0) {
    parts.push('---', '', ...failureLines)
  }

  return parts.join('\n')
}

/**
 * Render the Community lens section for a repo's markdown export.
 *
 * Positioned between the Contributors section and the Activity section
 * (data-model.md §4). Shows completeness (ratio + percentile + counts) and
 * a 7-row signal status table. Empty array returned when completeness
 * ratio is null (all signals unknown), so the section doesn't render as
 * meaningless header-only output.
 */
function renderCommunitySection(result: AnalysisResult): string[] {
  const completeness = computeCommunityCompleteness(result)
  if (completeness.ratio === null) return []

  const total = completeness.present.length + completeness.missing.length
  const percentileLabel = completeness.percentile !== null
    ? `${completeness.percentile}th percentile`
    : '—'
  const status = (key: CommunitySignalKey): string => {
    if (completeness.present.includes(key)) return '✓ Present'
    if (completeness.missing.includes(key)) return '✗ Missing'
    return '? Unknown'
  }

  // Discussions row variant — more expressive when enabled
  const discussionsStatus = (() => {
    if (result.hasDiscussionsEnabled !== true && result.hasDiscussionsEnabled !== false) return '? Unknown'
    if (result.hasDiscussionsEnabled === false) return 'Not enabled'
    const count = typeof result.discussionsCountWindow === 'number' ? result.discussionsCountWindow : null
    const windowDays = typeof result.discussionsWindowDays === 'number' ? result.discussionsWindowDays : null
    if (count !== null && windowDays !== null) return `Enabled (${count} in last ${windowDays}d)`
    return 'Enabled'
  })()

  return [
    '### Community',
    '',
    `Community is a cross-cutting lens — it does not feed the composite OSS Health Score.`,
    '',
    `**Completeness:** ${percentileLabel} (${completeness.present.length}/${total} signals)`,
    '',
    '| Signal | Status |',
    '| --- | --- |',
    `| Code of Conduct | ${status('code_of_conduct')} |`,
    `| Issue templates | ${status('issue_templates')} |`,
    `| PR template | ${status('pull_request_template')} |`,
    `| CODEOWNERS / maintainer file | ${status('codeowners')} |`,
    `| GOVERNANCE.md | ${status('governance')} |`,
    `| FUNDING.yml | ${status('funding')} |`,
    `| Discussions | ${discussionsStatus} |`,
    '',
  ]
}

export function buildMarkdownExport(response: AnalyzeResponse, analyzedRepos?: string[]): MarkdownExportResult {
  const markdown = buildMarkdownReport(response, analyzedRepos)
  const blob = new Blob([markdown], { type: 'text/markdown' })
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const HH = String(now.getHours()).padStart(2, '0')
  const MM = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const filename = `repopulse-${yyyy}-${mm}-${dd}-${HH}${MM}${ss}.md`
  return { blob, filename }
}
