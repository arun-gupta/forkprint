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
import {
  GOVERNANCE_DOC_FILES,
  GOVERNANCE_SCORECARD_CHECKS,
  GOVERNANCE_DIRECT_CHECKS,
  GOVERNANCE_CONTRIBUTORS_METRICS,
  LICENSING_IS_GOVERNANCE,
} from '@/lib/tags/governance'

const COMMUNITY_SIGNAL_COUNT = 7
const GOVERNANCE_SIGNAL_COUNT =
  GOVERNANCE_DOC_FILES.size +
  GOVERNANCE_SCORECARD_CHECKS.size +
  GOVERNANCE_DIRECT_CHECKS.size +
  GOVERNANCE_CONTRIBUTORS_METRICS.size +
  (LICENSING_IS_GOVERNANCE ? 1 : 0)

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
  'forkRate', 'watcherRate', 'documentationScore',
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
  {
    title: 'Contributors',
    metrics: [
      { key: 'topContributorShare', label: 'Top 20% contributor commit share' },
    ],
  },
  {
    title: 'Documentation',
    metrics: [
      { key: 'documentationScore', label: 'Documentation completeness score' },
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
          The composite health score is computed from five weighted buckets:
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800">Activity 25%</span>
          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800">Responsiveness 25%</span>
          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800">Contributors 23%</span>
          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800">Security 15%</span>
          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800">Documentation 12%</span>
        </div>
        <p className="mt-2 text-xs text-sky-700">
          Each bucket produces a percentile score relative to repos in the same star bracket. The weighted average becomes the overall health score.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">How Buckets Are Scored</h3>
        <p className="mt-1 text-sm text-slate-600">
          Every metric is derived from verified GitHub API data — nothing is estimated or inferred. Scores are percentile-based: a repo is ranked against others in the same star bracket, so an emerging project is compared to peers of similar visibility, not to the top 100 repos on GitHub.
        </p>
        <dl className="mt-3 space-y-3 text-sm text-slate-700">
          <div>
            <dt className="font-medium text-slate-900">Activity</dt>
            <dd>PR throughput, issue flow, commit cadence, release frequency, and completion speed over recent time windows.</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Responsiveness</dt>
            <dd>How quickly maintainers engage — issue and PR response times, resolution speed, backlog health, and engagement quality signals.</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Contributors</dt>
            <dd>Contributor concentration and distribution — whether the project depends on a single maintainer or has a healthy base of repeat contributors.</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Security</dt>
            <dd>
              {'Combines '}
              <a href="https://github.com/ossf/scorecard" className="text-sky-700 underline hover:text-sky-900" target="_blank" rel="noopener noreferrer">OpenSSF Scorecard</a>
              {' results with direct checks for security policy, dependency automation, CI/CD, and branch protection.'}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Documentation</dt>
            <dd>Presence and quality of key project files (README, LICENSE, CONTRIBUTING, CHANGELOG, CODE_OF_CONDUCT), README section coverage, licensing compliance, and inclusive naming.</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-slate-500">
          For full details on calibration data, metrics collected, and percentile thresholds, see{' '}
          <a href="https://github.com/arun-gupta/repo-pulse/blob/main/docs/scoring-and-calibration.md" className="text-sky-700 underline hover:text-sky-900" target="_blank" rel="noopener noreferrer">Scoring and Calibration</a>.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">Cross-Cutting Lenses</h3>
        <p className="mt-1 text-sm text-slate-600">
          <strong>Community</strong> and <strong>Governance</strong> are cross-cutting lenses, not weighted composite buckets. They do not feed the OSS Health Score. Their signals live inside the existing buckets and surface as small pills on individual rows, so you can see how a repo stacks up on each lens without reshaping the composite.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              Community
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{COMMUNITY_SIGNAL_COUNT} signals</span>
            </h4>
            <p className="mt-1 text-xs text-slate-600">Hosted across Documentation, Contributors, and Activity:</p>
            <ul className="mt-2 space-y-0.5 text-xs text-slate-700">
              <li><span className="font-mono">CODE_OF_CONDUCT.md</span> &rarr; Documentation</li>
              <li>Issue templates &rarr; Documentation</li>
              <li>PR template &rarr; Documentation</li>
              <li>CODEOWNERS / maintainer file &rarr; Contributors</li>
              <li><span className="font-mono">GOVERNANCE.md</span> &rarr; Documentation</li>
              <li><span className="font-mono">FUNDING.yml</span> &rarr; Contributors</li>
              <li>Discussions &rarr; Activity</li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              Completeness is <strong>count-based</strong> (signals present / signals known), not a weighted percentile.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              Governance
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{GOVERNANCE_SIGNAL_COUNT} signals</span>
            </h4>
            <p className="mt-1 text-xs text-slate-600">Signals that indicate project stewardship, hosted across Documentation, Security, and Contributors:</p>
            <ul className="mt-2 space-y-0.5 text-xs text-slate-700">
              <li>LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG, GOVERNANCE &rarr; Documentation</li>
              <li>Branch protection, Code review, Security policy, License checks &rarr; Security</li>
              <li>Maintainer count &rarr; Contributors</li>
              <li>Licensing compliance pane &rarr; Documentation</li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              Individual rows tagged as governance show a small pill; there is no separate completeness score.
            </p>
          </div>
        </div>
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
                  const ps = cal[metric.key] as PercentileSet | undefined
                  if (!ps) {
                    return (
                      <tr key={metric.key} className="border-b border-slate-100">
                        <td className="py-2 pr-4 text-slate-700">{metric.label}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400" colSpan={4}>Calibration data pending</td>
                      </tr>
                    )
                  }
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
