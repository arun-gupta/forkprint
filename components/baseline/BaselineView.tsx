'use client'

import { useState } from 'react'
import {
  type BracketCalibration,
  type BracketKey,
  type PercentileSet,
  formatPercentileLabel,
  getCalibration,
  getCalibrationMeta,
  interpolatePercentile,
} from '@/lib/scoring/config-loader'

const ALL_BRACKETS: BracketKey[] = ['emerging', 'growing', 'established', 'popular']

const BRACKET_LABELS: Record<BracketKey, string> = {
  emerging: 'Emerging (10-99 stars)',
  growing: 'Growing (100-999 stars)',
  established: 'Established (1k-10k stars)',
  popular: 'Popular (10k+ stars)',
}

const PERCENTAGE_METRICS = new Set([
  'prMergeRate', 'issueClosureRate', 'staleIssueRatio', 'stalePrRatio',
  'issueResolutionRate', 'contributorResponseRate', 'humanResponseRatio',
  'botResponseRatio', 'issuesClosedWithoutCommentRatio', 'topContributorShare',
  'forkRate', 'watcherRate',
])

const DURATION_METRICS = new Set([
  'medianTimeToMergeHours', 'medianTimeToCloseHours',
  'issueFirstResponseMedianHours', 'issueFirstResponseP90Hours',
  'prFirstReviewMedianHours', 'prFirstReviewP90Hours',
  'issueResolutionMedianHours', 'issueResolutionP90Hours',
  'prMergeMedianHours', 'prMergeP90Hours',
])

const INVERTED_METRICS = new Set([
  ...DURATION_METRICS,
  'staleIssueRatio', 'stalePrRatio', 'botResponseRatio',
  'issuesClosedWithoutCommentRatio', 'topContributorShare',
])

function formatValue(key: string, value: number): string {
  if (PERCENTAGE_METRICS.has(key)) return `${(value * 100).toFixed(1)}%`
  if (DURATION_METRICS.has(key)) {
    if (value < 24) return `${value.toFixed(1)}h`
    return `${(value / 24).toFixed(1)}d`
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)
}

interface MetricRow {
  label: string
  p25: string
  p50: string
  p75: string
  p90: string
  inverted: boolean
}

const METRIC_SECTIONS: Array<{ title: string; metrics: Array<{ key: keyof BracketCalibration; label: string }> }> = [
  {
    title: 'Overview',
    metrics: [
      { key: 'stars', label: 'Reach (stars)' },
      { key: 'watcherRate', label: 'Attention (watcher rate)' },
      { key: 'forkRate', label: 'Engagement (fork rate)' },
    ],
  },
  {
    title: 'Contributors / Sustainability',
    metrics: [
      { key: 'topContributorShare', label: 'Top 20% contributor commit share' },
    ],
  },
  {
    title: 'Activity',
    metrics: [
      { key: 'prMergeRate', label: 'PR — Merge rate' },
      { key: 'medianTimeToMergeHours', label: 'PR — Median time to merge' },
      { key: 'issueClosureRate', label: 'Issue — Closure rate' },
      { key: 'medianTimeToCloseHours', label: 'Issue — Median time to close' },
    ],
  },
  {
    title: 'Responsiveness',
    metrics: [
      // Response time
      { key: 'issueFirstResponseMedianHours', label: 'Response — Issue first response (median)' },
      { key: 'issueFirstResponseP90Hours', label: 'Response — Issue first response (p90)' },
      { key: 'prFirstReviewMedianHours', label: 'Response — PR first review (median)' },
      { key: 'prFirstReviewP90Hours', label: 'Response — PR first review (p90)' },
      // Resolution
      { key: 'issueResolutionMedianHours', label: 'Resolution — Issue duration (median)' },
      { key: 'issueResolutionP90Hours', label: 'Resolution — Issue duration (p90)' },
      { key: 'prMergeMedianHours', label: 'Resolution — PR merge duration (median)' },
      { key: 'prMergeP90Hours', label: 'Resolution — PR merge duration (p90)' },
      { key: 'issueResolutionRate', label: 'Resolution — Issue resolution rate' },
      // Maintainer signals
      { key: 'contributorResponseRate', label: 'Maintainer — Contributor response rate' },
      { key: 'humanResponseRatio', label: 'Maintainer — Human first-response ratio' },
      { key: 'botResponseRatio', label: 'Maintainer — Bot first-response ratio' },
      // Backlog health
      { key: 'staleIssueRatio', label: 'Backlog — Stale issue ratio' },
      { key: 'stalePrRatio', label: 'Backlog — Stale PR ratio' },
      // Engagement quality
      { key: 'prReviewDepth', label: 'Quality — PR review depth' },
      { key: 'issuesClosedWithoutCommentRatio', label: 'Quality — Issues closed without comment' },
    ],
  },
]

function buildMetricRow(key: string, label: string, ps: PercentileSet): MetricRow {
  return {
    label,
    p25: formatValue(key, ps.p25),
    p50: formatValue(key, ps.p50),
    p75: formatValue(key, ps.p75),
    p90: formatValue(key, ps.p90),
    inverted: INVERTED_METRICS.has(key),
  }
}

export function BaselineView() {
  const meta = getCalibrationMeta()
  const [selectedBracket, setSelectedBracket] = useState<BracketKey>('established')
  const cal = getCalibration(selectedBracket)

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-sky-900">OSS Health Score</h3>
        <p className="mt-2 text-sm text-sky-800">
          The composite health score is computed from three weighted buckets:
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800">Activity 36%</span>
          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800">Responsiveness 36%</span>
          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800">Sustainability 28%</span>
        </div>
        <p className="mt-2 text-xs text-sky-700">
          Each bucket produces a percentile score relative to repos in the same star bracket. The weighted average becomes the overall health score.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">Scoring Methodology</h3>
        <p className="mt-1 text-sm text-slate-600">
          Percentile thresholds derived from sampling real GitHub repositories. All RepoPulse scores are computed relative to these distributions.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {ALL_BRACKETS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setSelectedBracket(b)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                selectedBracket === b
                  ? 'bg-sky-900 text-white'
                  : 'border border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900'
              }`}
            >
              {BRACKET_LABELS[b]}
            </button>
          ))}
        </div>

        <dl className="mt-3 flex flex-wrap gap-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Calibration date</dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-900">{meta.generated}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Source</dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-900">{meta.source}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Sample size</dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-900">{meta.sampleSizes[selectedBracket]} repos</dd>
          </div>
        </dl>
      </section>

      {METRIC_SECTIONS.map((section) => (
        <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">{section.title}</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4 text-left">Metric</th>
                  <th className="pb-2 px-3 text-right">p25</th>
                  <th className="pb-2 px-3 text-right">p50</th>
                  <th className="pb-2 px-3 text-right">p75</th>
                  <th className="pb-2 px-3 text-right">p90</th>
                </tr>
              </thead>
              <tbody>
                {section.metrics.map((metric) => {
                  const ps = cal[metric.key] as PercentileSet
                  const row = buildMetricRow(metric.key, metric.label, ps)
                  return (
                    <tr key={metric.key} className="border-b border-slate-100">
                      <td className="py-2 pr-4 text-slate-700">
                        {row.label}
                        {row.inverted ? <span className="ml-1 text-xs text-slate-400" title="Lower is better">&darr;</span> : null}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">{row.p25}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">{row.p50}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">{row.p75}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">{row.p90}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <p className="text-xs text-slate-400">
        Metrics marked with &darr; are scored inversely (lower is better).{' '}
        <a
          href="https://github.com/arun-gupta/repo-pulse/blob/main/docs/scoring-and-calibration.md"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          Methodology
        </a>
      </p>
    </div>
  )
}
