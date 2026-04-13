'use client'

import { useState } from 'react'
import { ScoreBadge } from '@/components/metric-cards/ScoreBadge'
import { HelpLabel } from '@/components/shared/HelpLabel'
import { MetricValue } from '@/components/shared/MetricValue'
import { TagPill, ActiveFilterBar } from '@/components/tags/TagPill'
import { formatPercentage } from '@/lib/contributors/score-config'
import type { ContributorsSectionViewModel } from '@/lib/contributors/view-model'
import { GOVERNANCE_SUSTAINABILITY_METRICS } from '@/lib/tags/governance'
import { ContributionBarChart } from './ContributionBarChart'

interface SustainabilityPaneProps {
  section: ContributorsSectionViewModel
}

export function SustainabilityPane({ section }: SustainabilityPaneProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [showExperimentalHeatmap, setShowExperimentalHeatmap] = useState(false)
  const [showExperimentalNames, setShowExperimentalNames] = useState(true)
  const [showExperimentalNumbers, setShowExperimentalNumbers] = useState(false)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const handleTagClick = (tag: string) => setActiveTag((prev) => (prev === tag ? null : tag))

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
              RepoPulse scores sustainability from recent commit concentration, ranked as a percentile against repos in the same star bracket. Lower top-20% share means the active contributor base is more distributed.
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
        {showDetails ? (
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Concentration</p>
            <p className="mt-1 text-sm text-slate-700">
              Top-20% contributor share: {formatPercentage(section.sustainabilityScore.concentration)}
              {section.sustainabilityScore.bracketLabel ? ` — scored relative to ${section.sustainabilityScore.bracketLabel} repositories` : ''}
            </p>
          </div>
        ) : null}
      </div>

      {activeTag ? (
        <div className="mt-4">
          <ActiveFilterBar tag={activeTag} onClear={() => setActiveTag(null)} />
        </div>
      ) : null}

      <dl className="mt-4 grid gap-3 md:grid-cols-2">
        {section.sustainabilityMetrics
          .filter((metric) => !activeTag || GOVERNANCE_SUSTAINABILITY_METRICS.has(metric.label))
          .map((metric) => {
            const isGov = GOVERNANCE_SUSTAINABILITY_METRICS.has(metric.label)
            return (
              <div key={metric.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <dt className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-500">
                  <HelpLabel label={metric.label} helpText={metric.hoverText} />
                  {isGov ? <TagPill tag="governance" active={activeTag === 'governance'} onClick={handleTagClick} /> : null}
                </dt>
                <dd className="mt-1 text-base"><MetricValue value={metric.value} /></dd>
                {metric.supportingText ? <p className="mt-1 text-xs text-slate-500">{metric.supportingText}</p> : null}
              </div>
            )
          })}
      </dl>

      {!activeTag ? (
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-900">Organization Affiliation</p>
          <p className="text-sm text-slate-600">{section.experimentalWarning}</p>
          <p className="text-sm text-slate-600">
            <a
              href="https://chaoss.community/kb/metric-elephant-factor/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-slate-700 underline underline-offset-2"
            >
              CHAOSS Elephant Factor reference
            </a>
          </p>
        </div>
        <dl className="mt-3 grid gap-3 md:grid-cols-2">
          {section.experimentalMetrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-slate-200 bg-white p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                <HelpLabel label={metric.label} helpText={metric.hoverText} />
              </dt>
              <dd className="mt-1 text-base"><MetricValue value={metric.value} /></dd>
            </div>
          ))}
        </dl>
        {section.experimentalHeatmap.length > 0 ? (
          <ContributionBarChart
            title="Organization contribution chart"
            description="Longer bars indicate more recent commits attributed via verified public GitHub organization membership."
            items={section.experimentalHeatmap}
            ariaLabel="Organization contribution bars"
            emptyText="—"
            tone="slate"
            entityLabel="organizations"
            defaultVisibleCount={8}
            collapsed={!showExperimentalHeatmap}
            showLabels={showExperimentalNames}
            showValues={showExperimentalNumbers}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => setShowExperimentalHeatmap((current) => !current)}
                  className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400"
                  aria-pressed={showExperimentalHeatmap}
                >
                  {showExperimentalHeatmap ? 'Hide chart' : 'Show chart'}
                </button>
                {showExperimentalHeatmap ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowExperimentalNames((current) => !current)}
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400"
                      aria-pressed={showExperimentalNames}
                    >
                      {showExperimentalNames ? 'Hide names' : 'Show names'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowExperimentalNumbers((current) => !current)}
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400"
                      aria-pressed={showExperimentalNumbers}
                    >
                      {showExperimentalNumbers ? 'Hide numbers' : 'Show numbers'}
                    </button>
                  </>
                ) : null}
              </>
            }
          />
        ) : null}
      </div>
      ) : null}

    </section>
  )
}
