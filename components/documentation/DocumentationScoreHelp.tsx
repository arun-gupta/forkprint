'use client'

import { useState } from 'react'
import type { DocumentationScoreDefinition } from '@/lib/documentation/score-config'

interface DocumentationScoreHelpProps {
  score: DocumentationScoreDefinition
}

export function DocumentationScoreHelp({ score }: DocumentationScoreHelpProps) {
  const [showDetails, setShowDetails] = useState(false)

  const factors = [
    { label: 'File Presence', weight: '40%', value: `${Math.round(score.filePresenceScore * 100)}%`, description: 'Presence of key documentation files: README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, and CHANGELOG.' },
    { label: 'README Quality', weight: '30%', value: `${Math.round(score.readmeQualityScore * 100)}%`, description: 'Detection of key README sections: project description, installation, usage, contributing, and license mention.' },
    { label: 'Licensing & Compliance', weight: '30%', value: `${Math.round(score.licensingScore * 100)}%`, description: 'License recognition, OSI approval, permissiveness classification, and DCO/CLA enforcement.' },
  ]

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">How is Documentation scored?</p>
          <p className="mt-1 text-sm text-slate-700">
            Composite of file presence (40%), README quality (30%), and licensing compliance (30%).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowDetails((current) => !current)}
          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          aria-pressed={showDetails}
        >
          {showDetails ? 'Hide details' : 'Show details'}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {factors.map((factor) => (
          <div key={factor.label} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">
            <span className="font-semibold text-slate-900">{factor.label}</span> <span>{factor.weight}</span>
            <span className="ml-1 text-slate-500">({factor.value})</span>
          </div>
        ))}
      </div>
      {showDetails ? (
        <div className="mt-3 grid gap-2 md:grid-cols-1">
          {factors.map((factor) => (
            <div key={factor.label} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{factor.label} ({factor.weight})</p>
                <p className="text-sm font-semibold text-slate-900">{factor.value}</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{factor.description}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
