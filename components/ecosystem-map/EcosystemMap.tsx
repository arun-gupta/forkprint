'use client'

import { useState } from 'react'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'

interface EcosystemMapProps {
  results: AnalysisResult[]
}

export function EcosystemMap({ results }: EcosystemMapProps) {
  const [legendExpanded, setLegendExpanded] = useState(false)

  if (results.length === 0) {
    return null
  }

  return (
    <section aria-label="Ecosystem map" className="rounded border border-gray-200 bg-gray-50 p-4 dark:bg-slate-800/60 dark:border-slate-700">
      <section className="mt-3 rounded border border-indigo-200 bg-white p-3 dark:bg-slate-900 dark:border-indigo-800/60">
        <div className="space-y-3">
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ecosystem spectrum</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  The ecosystem is summarized using three dimensions: reach, builder engagement, and attention.
                  Engagement and attention are scored as percentiles relative to repos in the same star bracket.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center self-start rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                aria-expanded={legendExpanded}
                onClick={() => setLegendExpanded((current) => !current)}
              >
                {legendExpanded ? 'Hide legend' : 'Show legend'}
              </button>
            </div>
          </div>
          {legendExpanded ? (
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:bg-slate-800/60 dark:border-slate-700">
                <p className="font-medium text-slate-900 dark:text-slate-100">Reach</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">stars — scored as a percentile within the star bracket</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:bg-slate-800/60 dark:border-slate-700">
                <p className="font-medium text-slate-900 dark:text-slate-100">Attention</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">watcher rate — scored as a percentile within the star bracket</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:bg-slate-800/60 dark:border-slate-700">
                <p className="font-medium text-slate-900 dark:text-slate-100">Builder engagement</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">fork rate — scored as a percentile within the star bracket</p>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </section>
  )
}

