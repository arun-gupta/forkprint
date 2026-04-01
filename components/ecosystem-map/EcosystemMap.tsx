'use client'

import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildEcosystemRows } from '@/lib/ecosystem-map/chart-data'

interface EcosystemMapProps {
  results: AnalysisResult[]
}

export function EcosystemMap({ results }: EcosystemMapProps) {
  const rows = buildEcosystemRows(results)

  if (rows.length === 0) {
    return null
  }

  return (
    <section aria-label="Ecosystem map" className="rounded border border-gray-200 bg-gray-50 p-4">
      <h2 className="font-semibold text-gray-900">Ecosystem map</h2>
      <div className="mt-3 space-y-3">
        {rows.map((row) => (
          <article key={row.repo} className="rounded border border-gray-200 bg-white p-3">
            <h3 className="font-medium text-gray-900">{row.repo}</h3>
            <div className="mt-2 grid gap-1 text-sm text-gray-700">
              <p>Stars: {row.starsLabel}</p>
              <p>Forks: {row.forksLabel}</p>
              <p>Watchers: {row.watchersLabel}</p>
            </div>
            {row.plotStatusNote ? <p className="mt-2 text-sm text-amber-700">{row.plotStatusNote}</p> : null}
          </article>
        ))}
      </div>
    </section>
  )
}
