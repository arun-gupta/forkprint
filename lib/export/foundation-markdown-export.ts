import type { FoundationResult } from '@/components/foundation/FoundationResultsView'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { triggerDownload } from '@/lib/export/json-export'

export interface FoundationMarkdownExportResult {
  blob: Blob
  filename: string
}

function fmt(value: unknown): string {
  if (value === 'unavailable' || value === null || value === undefined) return '—'
  if (typeof value === 'number') return new Intl.NumberFormat('en-US').format(value)
  return String(value)
}

function buildRepoSection(repoResult: AnalysisResult): string {
  const lines: string[] = [`## ${repoResult.repo}`, '']

  if (repoResult.landscapeOverride) {
    const status = repoResult.landscapeStatus ?? 'CNCF'
    lines.push(`> Already a CNCF ${status} project — not evaluated for sandbox readiness.`, '')
    return lines.join('\n')
  }

  const ar = repoResult.aspirantResult
  if (!ar) {
    lines.push('> No readiness data available.', '')
    return lines.join('\n')
  }

  const { readinessScore, readyCount, totalAutoCheckable, autoFields, tagRecommendation, sandboxApplication } = ar
  const icon = readinessScore >= 80 ? '🟢' : readinessScore >= 50 ? '🟡' : '🔴'
  lines.push(`**${icon} Score:** ${readinessScore} / 100 — ${readyCount} of ${totalAutoCheckable} auto-checkable fields ready`, '')

  if (sandboxApplication) {
    const filedDate = new Date(sandboxApplication.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    lines.push(
      `**Application:** [#${sandboxApplication.issueNumber}](${sandboxApplication.issueUrl}) — ${sandboxApplication.state === 'OPEN' ? 'open, under review' : 'closed'} (filed ${filedDate})`,
      '',
    )
  }

  if (tagRecommendation.primaryTag) {
    lines.push(`**Recommended TAG:** ${tagRecommendation.primaryTag}`, '')
  }

  const readyFields = autoFields.filter((f) => f.status === 'ready')
  const needsWorkFields = [...autoFields.filter((f) => f.status !== 'ready')].reverse()

  if (needsWorkFields.length > 0) {
    lines.push('### Needs Work', '')
    for (const f of needsWorkFields) {
      const statusIcon = f.status === 'missing' ? '❌' : '⚠️'
      const pts = f.weight > 0 ? ` (+${f.weight} pts if resolved)` : ''
      lines.push(`- ${statusIcon} **${f.label}**${pts}${f.remediationHint ? ` — ${f.remediationHint}` : ''}`)
    }
    lines.push('')
  }

  if (readyFields.length > 0) {
    lines.push('### Ready', '')
    for (const f of readyFields) {
      lines.push(`- ✅ **${f.label}**${f.evidence ? ` — ${f.evidence}` : ''}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

function buildReposMarkdown(result: Extract<FoundationResult, { kind: 'repos' | 'projects-board' }>): string {
  const response = result.results
  const isBoard = result.kind === 'projects-board'

  const header = [
    isBoard ? '# Foundation Scan Report — CNCF Sandbox Board' : '# Foundation Scan Report',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    ...(isBoard ? [`**Source:** [CNCF Sandbox Board](${(result as Extract<FoundationResult, { kind: 'projects-board' }>).url})`] : []),
    '',
  ]

  const summaryRows = response.results.map((r) => {
    if (r.landscapeOverride) {
      return `| ${r.repo} | — | Already CNCF ${r.landscapeStatus ?? 'project'} |`
    }
    if (!r.aspirantResult) return `| ${r.repo} | — | No data |`
    const { readinessScore } = r.aspirantResult
    const status = readinessScore >= 80 ? '🟢 Ready' : readinessScore >= 50 ? '🟡 Needs work' : '🔴 Not ready'
    return `| ${r.repo} | ${readinessScore} / 100 | ${status} |`
  })

  const summaryLines = [
    '## Summary',
    '',
    '| Repository | Score | Status |',
    '| --- | --- | --- |',
    ...summaryRows,
    '',
  ]

  const skippedLines: string[] = []
  if (isBoard) {
    const board = result as Extract<FoundationResult, { kind: 'projects-board' }>
    if (board.skipped.length > 0) {
      skippedLines.push('## Skipped Issues', '')
      for (const s of board.skipped) {
        skippedLines.push(`- [#${s.issueNumber} ${s.title}](${s.issueUrl}): ${s.reason}`)
      }
      skippedLines.push('')
    }
  }

  const failureLines: string[] = []
  if (response.failures.length > 0) {
    failureLines.push('## Failed Repositories', '')
    for (const f of response.failures) {
      failureLines.push(`- **${f.repo}**: ${f.reason}`)
    }
    failureLines.push('')
  }

  const parts = [...header, ...summaryLines, ...skippedLines, ...failureLines]
  for (const repoResult of response.results) {
    parts.push('---', '', buildRepoSection(repoResult))
  }

  return parts.join('\n')
}

function buildOrgMarkdown(result: Extract<FoundationResult, { kind: 'org' }>): string {
  const { org, summary, results } = result.inventory

  const lines = [
    `# Foundation Scan Report — ${org}`,
    '',
    `**Generated:** ${new Date().toISOString()}`,
    `**Organization:** [github.com/${org}](https://github.com/${org})`,
    '',
    '## Summary',
    '',
    '| Metric | Value |',
    '| --- | --- |',
    `| Total public repositories | ${fmt(summary.totalPublicRepos)} |`,
    `| Total stars | ${fmt(summary.totalStars)} |`,
    `| Active repositories | ${fmt(summary.activeRepoCount)} |`,
    `| Archived repositories | ${fmt(summary.archivedRepoCount)} |`,
    '',
  ]

  if (summary.languageDistribution.length > 0) {
    lines.push(
      '### Language Distribution',
      '',
      '| Language | Repositories |',
      '| --- | --- |',
      ...summary.languageDistribution.slice(0, 10).map((l) => `| ${l.language} | ${l.repoCount} |`),
      '',
    )
  }

  lines.push(
    '## Repository Inventory',
    '',
    '| Repository | Stars | Language | Last Push | Status |',
    '| --- | --- | --- | --- | --- |',
  )

  for (const r of results) {
    const push =
      r.pushedAt !== 'unavailable'
        ? new Date(r.pushedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : '—'
    const status = r.archived ? 'Archived' : r.isFork ? `Fork of ${r.parentRepo ?? '?'}` : 'Active'
    lines.push(`| [${r.name}](${r.url}) | ${fmt(r.stars)} | ${fmt(r.primaryLanguage)} | ${push} | ${status} |`)
  }
  lines.push('')

  return lines.join('\n')
}

export function buildFoundationMarkdownExport(result: FoundationResult): FoundationMarkdownExportResult {
  let markdown: string
  if (result.kind === 'repos' || result.kind === 'projects-board') {
    markdown = buildReposMarkdown(result)
  } else {
    markdown = buildOrgMarkdown(result)
  }

  const blob = new Blob([markdown], { type: 'text/markdown' })
  const now = new Date()
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  const filename = `foundation-scan-${ts}.md`
  return { blob, filename }
}

export function downloadFoundationMarkdown(result: FoundationResult): void {
  triggerDownload(buildFoundationMarkdownExport(result))
}
