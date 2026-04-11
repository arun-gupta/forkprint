'use client'

import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { getHealthScore } from '@/lib/scoring/health-score'

interface RecommendationsViewProps {
  results: AnalysisResult[]
}

const BUCKET_COLORS: Record<string, string> = {
  Activity: 'bg-blue-100 text-blue-800',
  Responsiveness: 'bg-purple-100 text-purple-800',
  Sustainability: 'bg-emerald-100 text-emerald-800',
  Documentation: 'bg-amber-100 text-amber-800',
}

export function RecommendationsView({ results }: RecommendationsViewProps) {
  return (
    <section aria-label="Recommendations view" className="space-y-6">
      {results.map((result) => {
        const healthScore = getHealthScore(result)

        if (healthScore.recommendations.length === 0) {
          return (
            <div key={result.repo} className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">{result.repo}</h2>
              <p className="mt-2 text-sm text-slate-500">No recommendations — this project scores well across all dimensions.</p>
            </div>
          )
        }

        // Group by bucket
        const bucketGroups = new Map<string, typeof healthScore.recommendations>()
        for (const rec of healthScore.recommendations) {
          const group = bucketGroups.get(rec.bucket) ?? []
          group.push(rec)
          bucketGroups.set(rec.bucket, group)
        }

        return (
          <div key={result.repo} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{result.repo}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {healthScore.recommendations.length} recommendation{healthScore.recommendations.length !== 1 ? 's' : ''} across {bucketGroups.size} dimension{bucketGroups.size !== 1 ? 's' : ''}
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
                        <span className="mt-1 text-xs text-slate-400">•</span>
                        <p className="text-sm text-slate-700">{rec.message}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}
