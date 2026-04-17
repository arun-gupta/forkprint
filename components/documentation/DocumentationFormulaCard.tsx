'use client'

import { useState } from 'react'
import { COMPOSITE_WEIGHTS } from '@/lib/documentation/score-config'

const FACTORS: { label: string; weight: number; description: string }[] = [
  {
    label: 'File Presence',
    weight: COMPOSITE_WEIGHTS.filePresence,
    description: 'Presence of key documentation files: README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, and CHANGELOG.',
  },
  {
    label: 'README Quality',
    weight: COMPOSITE_WEIGHTS.readmeQuality,
    description: 'Detection of key README sections: project description, installation, usage, contributing, and license mention.',
  },
  {
    label: 'Licensing & Compliance',
    weight: COMPOSITE_WEIGHTS.licensing,
    description: 'License recognition, OSI approval, permissiveness classification, and DCO/CLA enforcement.',
  },
  {
    label: 'Inclusive Naming',
    weight: COMPOSITE_WEIGHTS.inclusiveNaming,
    description: 'Checks default branch name and repo metadata for non-inclusive terms per the Inclusive Naming Initiative word list. Tier 1 terms carry full penalty, Tier 2 moderate, Tier 3 minor.',
  },
]

function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

export function DocumentationFormulaCard() {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:bg-slate-800/60 dark:border-slate-700">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">How is Documentation scored?</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
            Composite of file presence ({formatPercent(COMPOSITE_WEIGHTS.filePresence)}), README quality ({formatPercent(COMPOSITE_WEIGHTS.readmeQuality)}), licensing compliance ({formatPercent(COMPOSITE_WEIGHTS.licensing)}), and inclusive naming ({formatPercent(COMPOSITE_WEIGHTS.inclusiveNaming)}).
          </p>
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
        {FACTORS.map((factor) => (
          <div key={factor.label} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
            <span className="font-semibold text-slate-900 dark:text-slate-100">{factor.label}</span> <span>{formatPercent(factor.weight)}</span>
          </div>
        ))}
      </div>
      {showDetails ? (
        <div className="mt-3 grid gap-2 md:grid-cols-1">
          {FACTORS.map((factor) => (
            <div key={factor.label} className="rounded-lg border border-slate-200 bg-white p-3 dark:bg-slate-900 dark:border-slate-700">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{factor.label} ({formatPercent(factor.weight)})</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{factor.description}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
