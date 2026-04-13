'use client'

import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { getHealthScore } from '@/lib/scoring/health-score'
import { getSecurityScore } from '@/lib/security/score-config'
import type { SecurityRecommendation } from '@/lib/security/analysis-result'
import { CATEGORY_DEFINITIONS } from '@/lib/security/recommendation-catalog'

interface RecommendationsViewProps {
  results: AnalysisResult[]
}

const BUCKET_COLORS: Record<string, string> = {
  Activity: 'bg-blue-100 text-blue-800',
  Responsiveness: 'bg-purple-100 text-purple-800',
  Sustainability: 'bg-emerald-100 text-emerald-800',
  Documentation: 'bg-amber-100 text-amber-800',
  Security: 'bg-red-100 text-red-800',
}

const RISK_COLORS: Record<string, string> = {
  Critical: 'bg-red-100 text-red-800',
  High: 'bg-orange-100 text-orange-800',
  Medium: 'bg-amber-100 text-amber-800',
  Low: 'bg-slate-100 text-slate-700',
}

const SOURCE_LABELS: Record<string, string> = {
  scorecard: 'OpenSSF Scorecard',
  direct_check: 'Direct check',
}

function SecurityRecommendationCard({ rec }: { rec: SecurityRecommendation }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">{rec.title ?? rec.text}</h4>
        <div className="flex shrink-0 gap-1.5">
          {rec.riskLevel ? (
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RISK_COLORS[rec.riskLevel] ?? ''}`}>
              {rec.riskLevel}
            </span>
          ) : null}
          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {SOURCE_LABELS[rec.category] ?? rec.category}
          </span>
        </div>
      </div>
      {rec.evidence ? (
        <p className="mt-1.5 text-xs text-slate-500">{rec.evidence}</p>
      ) : null}
      {rec.explanation ? (
        <p className="mt-2 text-sm text-slate-600">{rec.explanation}</p>
      ) : null}
      {rec.remediationHint ? (
        <div className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">
          {rec.remediationHint}
        </div>
      ) : null}
      {rec.docsUrl ? (
        <a
          href={rec.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-blue-600 underline hover:text-blue-800"
        >
          OpenSSF Scorecard docs
        </a>
      ) : null}
    </div>
  )
}

function SecurityRecommendationsGroup({ recommendations }: { recommendations: SecurityRecommendation[] }) {
  // Group by category
  const groups = new Map<string, SecurityRecommendation[]>()
  for (const rec of recommendations) {
    const key = rec.groupCategory ?? 'best_practices'
    const group = groups.get(key) ?? []
    group.push(rec)
    groups.set(key, group)
  }

  // Sort groups by CATEGORY_DEFINITIONS order
  const sortedGroups = CATEGORY_DEFINITIONS
    .filter((cat) => groups.has(cat.key))
    .map((cat) => ({ category: cat, recs: groups.get(cat.key)! }))

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2">
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${BUCKET_COLORS.Security}`}>
          Security
        </span>
        <span className="text-xs text-slate-400">{recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="mt-3 space-y-4">
        {sortedGroups.map(({ category, recs }) => (
          <div key={category.key}>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{category.label}</h4>
            <div className="space-y-2">
              {recs.map((rec, i) => (
                <SecurityRecommendationCard key={`${rec.item}-${i}`} rec={rec} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RecommendationsView({ results }: RecommendationsViewProps) {
  return (
    <section aria-label="Recommendations view" className="space-y-6">
      {results.map((result) => {
        const healthScore = getHealthScore(result)

        // Get enriched security recommendations directly
        const securityRecs = result.securityResult !== 'unavailable'
          ? getSecurityScore(result.securityResult, result.stars).recommendations
          : []

        // Non-security recommendations from health score
        const nonSecurityRecs = healthScore.recommendations.filter((r) => r.tab !== 'security')

        const totalCount = nonSecurityRecs.length + securityRecs.length
        if (totalCount === 0) {
          return (
            <div key={result.repo} className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">{result.repo}</h2>
              <p className="mt-2 text-sm text-slate-500">No recommendations — this project scores well across all dimensions.</p>
            </div>
          )
        }

        // Group non-security recs by bucket
        const bucketGroups = new Map<string, typeof nonSecurityRecs>()
        for (const rec of nonSecurityRecs) {
          const group = bucketGroups.get(rec.bucket) ?? []
          group.push(rec)
          bucketGroups.set(rec.bucket, group)
        }

        const bucketCount = bucketGroups.size + (securityRecs.length > 0 ? 1 : 0)

        return (
          <div key={result.repo} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{result.repo}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {totalCount} recommendation{totalCount !== 1 ? 's' : ''} across {bucketCount} dimension{bucketCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {Array.from(bucketGroups.entries()).map(([bucket, recs]) => (
                <div key={bucket} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${BUCKET_COLORS[bucket] ?? 'bg-slate-100 text-slate-800'}`}>
                      {bucket}
                    </span>
                    <span className="text-xs text-slate-400">{recs.length} recommendation{recs.length !== 1 ? 's' : ''}</span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {recs.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1 text-xs text-slate-400">&bull;</span>
                        <p className="text-sm text-slate-700">{rec.message}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {securityRecs.length > 0 ? (
                <SecurityRecommendationsGroup recommendations={securityRecs} />
              ) : null}
            </div>
          </div>
        )
      })}
    </section>
  )
}
