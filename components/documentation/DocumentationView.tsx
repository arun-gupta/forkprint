'use client'

import { ScoreBadge } from '@/components/metric-cards/ScoreBadge'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { getDocumentationScore } from '@/lib/documentation/score-config'

interface DocumentationViewProps {
  results: AnalysisResult[]
}

const FILE_LABELS: Record<string, string> = {
  readme: 'README',
  license: 'LICENSE',
  contributing: 'CONTRIBUTING',
  code_of_conduct: 'CODE_OF_CONDUCT',
  security: 'SECURITY',
  changelog: 'CHANGELOG',
}

const SECTION_LABELS: Record<string, string> = {
  description: 'Description / Overview',
  installation: 'Installation / Setup',
  usage: 'Usage / Examples',
  contributing: 'Contributing',
  license: 'License',
}

export function DocumentationView({ results }: DocumentationViewProps) {
  return (
    <section aria-label="Documentation view" className="space-y-6">
      {results.map((result) => {
        if (result.documentationResult === 'unavailable') {
          return (
            <div key={result.repo} className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">{result.repo}</h2>
              <p className="mt-2 text-sm text-slate-500">Documentation data unavailable.</p>
            </div>
          )
        }

        const score = getDocumentationScore(result.documentationResult, result.stars)
        const { fileChecks, readmeSections } = result.documentationResult
        const filesFound = fileChecks.filter((f) => f.found).length
        const sectionsDetected = readmeSections.filter((s) => s.detected).length

        return (
          <div key={result.repo} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{result.repo}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {filesFound} of {fileChecks.length} files present · {sectionsDetected} of {readmeSections.length} README sections detected
                </p>
              </div>
              <div className="w-full md:max-w-xs">
                <ScoreBadge category="Documentation" value={score.value} tone={score.tone} />
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {/* File presence */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Documentation files</h3>
                <ul className="mt-3 space-y-2">
                  {fileChecks.map((check) => (
                    <li key={check.name} className="flex items-start gap-2">
                      <span className={`mt-0.5 text-sm ${check.found ? 'text-emerald-600' : 'text-red-400'}`}>
                        {check.found ? '✓' : '✗'}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${check.found ? 'text-slate-900' : 'text-slate-400'}`}>
                          {FILE_LABELS[check.name] ?? check.name}
                          {check.found && check.path ? <span className="ml-1 font-normal text-slate-400">({check.path})</span> : null}
                          {check.found && check.licenseType ? <span className="ml-1 font-normal text-slate-400">— {check.licenseType}</span> : null}
                        </p>
                        {!check.found ? (
                          <p className="mt-0.5 text-xs text-amber-700">
                            {score.recommendations.find((r) => r.category === 'file' && r.item === check.name)?.text}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* README sections */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">README sections</h3>
                <ul className="mt-3 space-y-2">
                  {readmeSections.map((section) => (
                    <li key={section.name} className="flex items-start gap-2">
                      <span className={`mt-0.5 text-sm ${section.detected ? 'text-emerald-600' : 'text-red-400'}`}>
                        {section.detected ? '✓' : '✗'}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${section.detected ? 'text-slate-900' : 'text-slate-400'}`}>
                          {SECTION_LABELS[section.name] ?? section.name}
                        </p>
                        {!section.detected ? (
                          <p className="mt-0.5 text-xs text-amber-700">
                            {score.recommendations.find((r) => r.category === 'readme_section' && r.item === section.name)?.text}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )
      })}
    </section>
  )
}
