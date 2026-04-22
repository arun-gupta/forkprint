import type { AspirantField, AspirantReadinessResult, ParsedApplicationField } from '@/lib/cncf-sandbox/types'

interface CNCFReadinessTabProps {
  aspirantResult: AspirantReadinessResult
  onNavigateToTab?: (tab: string) => void
  repoSlug?: string
}

const STATUS_ICON: Record<string, string> = {
  ready: '✅',
  partial: '⚠️',
  missing: '❌',
  'human-only': '📋',
}

function FieldRow({ field, onNavigateToTab }: { field: AspirantField; onNavigateToTab?: (tab: string) => void }) {
  const icon = STATUS_ICON[field.status] ?? '—'
  const pointImpact = field.weight > 0 ? `+${field.weight} pts if resolved` : null

  return (
    <li className="flex flex-col gap-1 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span aria-hidden="true">{icon}</span>
          <span className="font-medium text-slate-800 dark:text-slate-100">{field.label}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {pointImpact && field.status !== 'ready' ? (
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{pointImpact}</span>
          ) : null}
          {field.homeTab && onNavigateToTab ? (
            <button
              type="button"
              onClick={() => onNavigateToTab(field.homeTab!)}
              className="text-xs text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            >
              View
            </button>
          ) : null}
        </div>
      </div>
      {field.evidence ? (
        <p className="text-xs text-slate-600 dark:text-slate-400">{field.evidence}</p>
      ) : null}
      {field.remediationHint && field.status !== 'ready' ? (
        <p className="text-xs text-slate-700 dark:text-slate-300">{field.remediationHint}</p>
      ) : null}
    </li>
  )
}

const ASSESSMENT_BADGE: Record<string, { label: string; className: string }> = {
  strong:   { label: '✓ Strong',   className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  adequate: { label: '~ Adequate', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  weak:     { label: '⚠ Weak',    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  empty:    { label: '✕ Empty',   className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
}

function HumanFieldRow({ field, parsed }: { field: AspirantField; parsed: ParsedApplicationField | null }) {
  const badge = parsed ? ASSESSMENT_BADGE[parsed.assessment] : null
  const hasParsed = parsed && parsed.content

  return (
    <li className={`rounded-lg border p-3 dark:border-slate-700 ${parsed?.assessment === 'empty' ? 'border-red-200 dark:border-red-800/50' : parsed?.assessment === 'weak' ? 'border-amber-200 dark:border-amber-800/50' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-slate-800 dark:text-slate-100">📋 {field.label}</p>
        {badge ? (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
            {badge.label}
          </span>
        ) : null}
      </div>

      {hasParsed ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            Current answer (from filed application)
          </summary>
          <p className="mt-1 whitespace-pre-wrap rounded bg-slate-50 px-2 py-1.5 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 max-h-40 overflow-y-auto">
            {parsed.content}
          </p>
        </details>
      ) : null}

      {parsed?.recommendation ? (
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
          <span className="font-semibold">Recommendation: </span>{parsed.recommendation}
        </p>
      ) : !hasParsed && field.explanatoryNote ? (
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{field.explanatoryNote}</p>
      ) : null}
    </li>
  )
}

function SandboxApplicationBanner({ application }: { application: import('@/lib/cncf-sandbox/types').SandboxApplicationIssue | null }) {
  if (application === null) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
        <span className="mt-0.5 text-base" aria-hidden="true">📋</span>
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">No application found in cncf/sandbox</p>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            When ready, file an issue at{' '}
            <a href="https://github.com/cncf/sandbox/issues/new/choose" target="_blank" rel="noreferrer" className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400">
              github.com/cncf/sandbox
            </a>{' '}
            to start the review process.
          </p>
        </div>
      </div>
    )
  }

  const isOpen = application.state === 'OPEN'
  const date = new Date(application.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${isOpen ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20' : 'border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800'}`}>
      <span className="mt-0.5 text-base" aria-hidden="true">{isOpen ? '🟢' : '⚫'}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
          Application {isOpen ? 'filed — under review' : 'filed — closed'} &mdash;{' '}
          <a href={application.issueUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400">
            #{application.issueNumber}
          </a>
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-400">
          {application.title} &middot; filed {date}
        </p>
      </div>
    </div>
  )
}

const STATUS_TEXT: Record<string, string> = {
  ready: '✅',
  partial: '⚠️',
  missing: '❌',
  'human-only': '📋',
}

const ASSESSMENT_ORDER: Record<string, number> = { empty: 0, weak: 1, adequate: 2, strong: 3 }

function buildMarkdownReport(aspirantResult: AspirantReadinessResult, repoSlug?: string): string {
  const { readinessScore, readyCount, totalAutoCheckable, autoFields, humanOnlyFields, tagRecommendation, sandboxApplication } = aspirantResult
  const readyFields = autoFields.filter((f) => f.status === 'ready')
  const needsWorkFields = [...autoFields.filter((f) => f.status !== 'ready')].reverse()
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const scoreBar = readinessScore >= 80 ? '🟢' : readinessScore >= 50 ? '🟡' : '🔴'

  const lines: string[] = [
    `# CNCF Sandbox Readiness Report`,
    '',
    repoSlug ? `**Repository**: ${repoSlug}` : '',
    `**Generated**: ${date}`,
    '',
    `> ⚠️ **Disclaimer**: This is an automated pre-flight check generated by [RepoPulse](https://github.com/arun-gupta/repo-pulse), not an official CNCF assessment. Scores are indicative only — TOC decisions are holistic and consider factors beyond what can be detected automatically. Verify TAG recommendations independently before making contact.`,
    '',
    `## ${scoreBar} Score: ${readinessScore} / 100`,
    '',
    `${readyCount} of ${totalAutoCheckable} auto-checkable fields ready.`,
    '',
  ].filter((l) => l !== undefined) as string[]

  if (sandboxApplication) {
    const filedDate = new Date(sandboxApplication.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    lines.push(`**Application**: [#${sandboxApplication.issueNumber}](${sandboxApplication.issueUrl}) — ${sandboxApplication.state === 'OPEN' ? 'open, under review' : 'closed'} (filed ${filedDate})`, '')
  } else {
    lines.push('**Application**: Not yet filed in [cncf/sandbox](https://github.com/cncf/sandbox/issues/new/choose)', '')
  }

  if (needsWorkFields.length > 0) {
    lines.push('## Needs Work Before Submitting', '')
    for (const f of needsWorkFields) {
      const icon = STATUS_TEXT[f.status] ?? '—'
      const pts = f.weight > 0 ? ` (+${f.weight} pts if resolved)` : ''
      lines.push(`### ${icon} ${f.label}${pts}`)
      if (f.evidence) lines.push(``, `> ${f.evidence}`)
      if (f.remediationHint) lines.push('', f.remediationHint)
      lines.push('')
    }
  }

  if (readyFields.length > 0) {
    lines.push('## Ready to Submit', '')
    for (const f of readyFields) {
      lines.push(`- ✅ **${f.label}**${f.evidence ? ` — ${f.evidence}` : ''}`)
    }
    lines.push('')
  }

  const sortedHumanOnlyForExport = [...humanOnlyFields].sort((a, b) => {
    const pa = sandboxApplication?.parsedFields?.find((p) => p.fieldId === a.id)
    const pb = sandboxApplication?.parsedFields?.find((p) => p.fieldId === b.id)
    const orderA = pa ? (ASSESSMENT_ORDER[pa.assessment] ?? 4) : 4
    const orderB = pb ? (ASSESSMENT_ORDER[pb.assessment] ?? 4) : 4
    return orderA - orderB
  })

  lines.push('## Needs Your Input', '')

  if (tagRecommendation.primaryTag) {
    lines.push(`### Recommended TAG: ${tagRecommendation.primaryTag}`)
    if (tagRecommendation.matchedSignals.length > 0) {
      lines.push(`Matched signals: ${tagRecommendation.matchedSignals.join(', ')}`)
    }
    lines.push('')
  }

  const EXPORT_GROUP_LABEL: Record<string, string> = {
    empty:    '🔴 Critical — must be filled',
    weak:     '🟡 Needs strengthening',
    adequate: '🔵 Acceptable — could be improved',
    strong:   '🟢 Looking good',
  }
  let lastExportGroup: string | null = null

  for (const f of sortedHumanOnlyForExport) {
    const parsed = sandboxApplication?.parsedFields?.find((p) => p.fieldId === f.id)
    const group = parsed?.assessment ?? null
    if (group && group !== lastExportGroup) {
      lines.push(`### ${EXPORT_GROUP_LABEL[group]}`, '')
      lastExportGroup = group
    }
    lines.push(`#### 📋 ${f.label}`)
    if (parsed?.recommendation) {
      lines.push('', `**Recommendation**: ${parsed.recommendation}`)
    } else if (!parsed?.content && f.explanatoryNote) {
      lines.push('', f.explanatoryNote)
    }
    if (parsed?.content) {
      lines.push('', '<details>', '<summary>Current answer (from filed application)</summary>', '', parsed.content, '', '</details>')
    }
    lines.push('')
  }

  lines.push('---', '_Generated by [RepoPulse](https://github.com/arun-gupta/repo-pulse) CNCF Aspirant Guidance_')

  return lines.join('\n')
}

function ExportButton({ aspirantResult, repoSlug }: { aspirantResult: AspirantReadinessResult; repoSlug?: string }) {
  const handleDownload = () => {
    const markdown = buildMarkdownReport(aspirantResult, repoSlug)
    const slug = repoSlug ? repoSlug.replace('/', '-') : 'repo'
    const now = new Date()
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cncf-readiness-${slug}-${timestamp}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      Download Readiness Report
    </button>
  )
}

export function CNCFReadinessTab({ aspirantResult, onNavigateToTab, repoSlug }: CNCFReadinessTabProps) {
  const { readinessScore, readyCount, totalAutoCheckable, autoFields, humanOnlyFields, tagRecommendation, sandboxApplication } = aspirantResult

  const readyFields = autoFields.filter((f) => f.status === 'ready')
  const needsWorkFields = [...autoFields.filter((f) => f.status !== 'ready')].reverse()

  const sortedHumanOnlyFields = [...humanOnlyFields].sort((a, b) => {
    const pa = sandboxApplication?.parsedFields?.find((p) => p.fieldId === a.id)
    const pb = sandboxApplication?.parsedFields?.find((p) => p.fieldId === b.id)
    // Unparsed (no application filed) treated as lowest priority — already sorted fine in config order
    const orderA = pa ? (ASSESSMENT_ORDER[pa.assessment] ?? 4) : 4
    const orderB = pb ? (ASSESSMENT_ORDER[pb.assessment] ?? 4) : 4
    return orderA - orderB
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Targeting: CNCF Sandbox
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            CNCF Readiness Score:{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">{readinessScore} / 100</span>
            {' — '}
            {readyCount} of {totalAutoCheckable} auto-checkable fields ready
          </p>
        </div>
        <ExportButton aspirantResult={aspirantResult} repoSlug={repoSlug} />
      </div>

      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
        <span className="font-semibold">Automated pre-flight check only.</span>{' '}
        This score is indicative — CNCF TOC decisions are holistic and consider factors beyond what can be detected automatically. Verify TAG recommendations independently before making contact.{' '}
        Generated by{' '}
        <a href="https://github.com/arun-gupta/repo-pulse" target="_blank" rel="noreferrer" className="underline hover:text-amber-900 dark:hover:text-amber-200">
          RepoPulse
        </a>.
      </p>

      <SandboxApplicationBanner application={sandboxApplication} />

      {needsWorkFields.length > 0 ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Needs work before submitting
          </h3>
          <ul className="space-y-2">
            {needsWorkFields.map((field) => (
              <FieldRow key={field.id} field={field} onNavigateToTab={onNavigateToTab} />
            ))}
          </ul>
        </section>
      ) : null}

      {readyFields.length > 0 ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Ready to submit
          </h3>
          <ul className="space-y-2">
            {readyFields.map((field) => (
              <FieldRow key={field.id} field={field} onNavigateToTab={onNavigateToTab} />
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Needs your input
        </h3>
        <div className="space-y-2">
          {tagRecommendation.primaryTag ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Recommended TAG: <span className="font-semibold">{tagRecommendation.primaryTag}</span>
              </p>
              {tagRecommendation.matchedSignals.length > 0 ? (
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                  Matched signals: {tagRecommendation.matchedSignals.join(', ')}
                </p>
              ) : null}
            </div>
          ) : tagRecommendation.fallbackNote ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm text-slate-700 dark:text-slate-300">{tagRecommendation.fallbackNote}</p>
            </div>
          ) : null}
          {sortedHumanOnlyFields.map((field, i) => {
            const parsed = sandboxApplication?.parsedFields?.find((p) => p.fieldId === field.id)
            const group = parsed?.assessment ?? null
            const prevGroup = i > 0
              ? (sandboxApplication?.parsedFields?.find((p) => p.fieldId === sortedHumanOnlyFields[i - 1].id)?.assessment ?? null)
              : null
            const showDivider = group !== null && group !== prevGroup
            const GROUP_LABEL: Record<string, { label: string; className: string }> = {
              empty: { label: 'Critical — must be filled', className: 'text-red-600 dark:text-red-400' },
              weak:  { label: 'Needs strengthening', className: 'text-amber-600 dark:text-amber-400' },
              adequate: { label: 'Acceptable — could be improved', className: 'text-blue-600 dark:text-blue-400' },
              strong: { label: 'Looking good', className: 'text-emerald-600 dark:text-emerald-400' },
            }
            return (
              <li key={field.id} className="list-none">
                {showDivider ? (
                  <div className="mb-2 mt-4 flex items-center gap-2 first:mt-0">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${GROUP_LABEL[group!]?.className ?? ''}`}>
                      {GROUP_LABEL[group!]?.label}
                    </span>
                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                  </div>
                ) : null}
                <HumanFieldRow field={field} parsed={parsed ?? null} />
              </li>
            )
          })}
        </div>
      </section>
    </div>
  )
}
