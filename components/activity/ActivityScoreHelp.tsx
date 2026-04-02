'use client'

import { useState } from 'react'
import type { ActivityScoreDefinition } from '@/lib/activity/score-config'

interface ActivityScoreHelpProps {
  score: ActivityScoreDefinition
}

export function ActivityScoreHelp({ score }: ActivityScoreHelpProps) {
  const [showThresholds, setShowThresholds] = useState(false)

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">How is Activity scored?</p>
          <p className="mt-1 text-sm text-slate-700">{score.summary}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowThresholds((current) => !current)}
          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          aria-pressed={showThresholds}
        >
          {showThresholds ? 'Hide thresholds' : 'Show thresholds'}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {score.weightedFactors.map((factor) => (
          <div key={factor.label} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">
            <span className="font-semibold text-slate-900">{factor.label}</span> <span>{factor.weightLabel}</span>
          </div>
        ))}
      </div>
      {showThresholds ? (
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {score.thresholds.map((threshold) => (
            <div key={threshold.label} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{threshold.label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{threshold.rule}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{threshold.description}</p>
            </div>
          ))}
        </div>
      ) : null}
      {score.missingInputs.length > 0 ? (
        <p className="mt-3 text-xs text-amber-800">Missing inputs: {score.missingInputs.join(', ')}</p>
      ) : null}
    </div>
  )
}
