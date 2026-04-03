'use client'

import { useState } from 'react'
import { ScoreBadge } from '@/components/metric-cards/ScoreBadge'
import { HelpLabel } from '@/components/shared/HelpLabel'
import { SUSTAINABILITY_THRESHOLDS } from '@/lib/contributors/score-config'
import type { ContributorsSectionViewModel } from '@/lib/contributors/view-model'

interface SustainabilityPaneProps {
  section: ContributorsSectionViewModel
}

export function SustainabilityPane({ section }: SustainabilityPaneProps) {
  const [showThresholds, setShowThresholds] = useState(false)
  const [showExperimentalHeatmap, setShowExperimentalHeatmap] = useState(false)

  return (
    <section aria-label="Sustainability pane" className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">Sustainability</h3>
          <p className="mt-1 text-sm text-slate-600">{section.sustainabilityScore.description}</p>
        </div>
        <div className="w-full md:max-w-xs">
          <ScoreBadge category="Sustainability" value={section.sustainabilityScore.value} tone={section.sustainabilityScore.tone} />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">How is this scored?</p>
            <p className="mt-1 text-sm text-slate-700">
              ForkPrint scores sustainability from recent commit concentration. Lower top-20% share means the active contributor base is more distributed.
            </p>
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
          {SUSTAINABILITY_THRESHOLDS.map((threshold) => (
            <div key={threshold.value} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">
              <span className="font-semibold text-slate-900">{threshold.value}</span>{' '}
              <span>
                {threshold.maxTopContributorShare === Number.POSITIVE_INFINITY
                  ? '> 75%'
                  : `<= ${(threshold.maxTopContributorShare * 100).toFixed(0)}%`}
              </span>
            </div>
          ))}
        </div>
        {showThresholds ? (
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {SUSTAINABILITY_THRESHOLDS.map((threshold) => (
              <div key={threshold.value} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{threshold.value}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {threshold.maxTopContributorShare === Number.POSITIVE_INFINITY
                    ? '> 75%'
                    : `<= ${(threshold.maxTopContributorShare * 100).toFixed(0)}%`}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{threshold.description}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-3 md:grid-cols-2">
        {section.sustainabilityMetrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              <HelpLabel label={metric.label} helpText={metric.hoverText} />
            </dt>
            <dd className="mt-1 text-base font-semibold text-slate-900">{metric.value}</dd>
            {metric.supportingText ? <p className="mt-1 text-xs text-slate-500">{metric.supportingText}</p> : null}
          </div>
        ))}
      </dl>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-900">Experimental</p>
          <p className="text-sm text-amber-900">{section.experimentalWarning}</p>
          <p className="text-sm text-amber-900">
            <a
              href="https://chaoss.community/kb/metric-elephant-factor/"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-2"
            >
              CHAOSS Elephant Factor reference
            </a>
          </p>
        </div>
        <dl className="mt-3 grid gap-3 md:grid-cols-2">
          {section.experimentalMetrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-amber-200 bg-white p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                <HelpLabel label={metric.label} helpText={metric.hoverText} />
              </dt>
              <dd className="mt-1 text-base font-semibold text-slate-900">{metric.value}</dd>
            </div>
          ))}
        </dl>
        {section.experimentalHeatmap.length > 0 ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Attributed organization heatmap</p>
                <p className="mt-1 text-xs text-slate-500">Darker bubbles indicate more experimentally attributed recent commits.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowExperimentalHeatmap((current) => !current)}
                className="rounded-full border border-amber-200 px-3 py-1 text-xs font-medium text-amber-900 transition hover:border-amber-300"
                aria-pressed={showExperimentalHeatmap}
              >
                {showExperimentalHeatmap ? 'Hide heatmap' : 'Show heatmap'}
              </button>
            </div>
            {showExperimentalHeatmap ? (
              <div className="mt-3 grid grid-cols-4 gap-x-2 gap-y-2 sm:grid-cols-6 lg:grid-cols-8" role="list" aria-label="Attributed organization heatmap">
                {section.experimentalHeatmap.map((cell) => (
                  <div
                    key={`${cell.contributor}-${cell.commitsLabel}`}
                    role="listitem"
                    className="flex flex-col items-center gap-1"
                    title={`${cell.contributor}: ${cell.commitsLabel}`}
                  >
                    <div
                      aria-label={`${cell.contributor} ${cell.commitsLabel}`}
                      className={`h-4 w-4 rounded-full border ${
                        cell.intensity === 'max'
                          ? 'border-amber-950 bg-amber-950'
                          : cell.intensity === 'higher'
                            ? 'border-amber-800 bg-amber-800'
                            : cell.intensity === 'high'
                              ? 'border-amber-600 bg-amber-600'
                              : cell.intensity === 'medium'
                                ? 'border-amber-400 bg-amber-400'
                                : cell.intensity === 'low'
                                  ? 'border-amber-200 bg-amber-200'
                                  : 'border-amber-100 bg-amber-100'
                      }`}
                    />
                    <p className="max-w-20 text-center text-[10px] font-medium leading-tight text-slate-700">{cell.contributor}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {section.missingData.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-900">Missing data</p>
          <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
            {section.missingData.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
