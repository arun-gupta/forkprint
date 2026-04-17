'use client'

import { useState } from 'react'
import type { ResponsivenessScoreDefinition } from '@/lib/responsiveness/score-config'
import { formatPercentileLabel } from '@/lib/scoring/config-loader'

interface ResponsivenessScoreHelpProps {
  score: ResponsivenessScoreDefinition
}

export function ResponsivenessScoreHelp({ score }: ResponsivenessScoreHelpProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:bg-slate-800/60 dark:border-slate-700">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">How is Responsiveness scored?</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{score.summary}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowDetails((current) => !current)}
          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-600 dark:text-slate-200"
          aria-pressed={showDetails}
        >
          {showDetails ? 'Hide details' : 'Show details'}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {score.weightedCategories.map((category) => (
          <div key={category.label} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
            <span className="font-semibold text-slate-900 dark:text-slate-100">{category.label}</span> <span>{category.weightLabel}</span>
            {category.percentile !== undefined ? (
              <span className="ml-1 text-slate-500 dark:text-slate-400">({formatPercentileLabel(category.percentile)})</span>
            ) : null}
          </div>
        ))}
      </div>
      {showDetails ? (
        <div className="mt-3 grid gap-2 md:grid-cols-1">
          {score.weightedCategories.map((category) => (
            <div key={category.label} className="rounded-lg border border-slate-200 bg-white p-3 dark:bg-slate-900 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{category.label} ({category.weightLabel})</p>
                {category.percentile !== undefined ? (
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatPercentileLabel(category.percentile)}</p>
                ) : null}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{category.description}</p>
            </div>
          ))}
        </div>
      ) : null}
      {score.missingInputs.length > 0 ? (
        <p className="mt-3 text-xs text-amber-800 dark:text-amber-200">Missing inputs: {score.missingInputs.join(', ')}</p>
      ) : null}
    </div>
  )
}
