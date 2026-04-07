'use client'

import { useMemo, useState } from 'react'
import { HelpLabel } from '@/components/shared/HelpLabel'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildHealthRatioRows } from '@/lib/health-ratios/view-model'

interface HealthRatiosViewProps {
  results: AnalysisResult[]
}

const CATEGORY_LABELS = {
  ecosystem: 'Overview',
  contributors: 'Contributors',
  activity: 'Activity',
} as const

const CATEGORY_DESCRIPTIONS = {
  ecosystem: 'Compare overview-level reach and attention ratios like forks and watchers relative to stars.',
  contributors: 'Compare contributor mix ratios like repeat and new contributors across analyzed repositories.',
  activity: 'Compare delivery-flow ratios like PR merge rate and stale issue ratio across analyzed repositories.',
} as const

export function HealthRatiosView({ results }: HealthRatiosViewProps) {
  const ratioRows = useMemo(() => buildHealthRatioRows(results), [results])
  const [sortBy, setSortBy] = useState<string>('fork-rate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const rowsByCategory = useMemo(() => {
    return {
      ecosystem: ratioRows.filter((row) => row.category === 'ecosystem'),
      contributors: ratioRows.filter((row) => row.category === 'contributors'),
      activity: ratioRows.filter((row) => row.category === 'activity'),
    }
  }, [ratioRows])

  return (
    <section aria-label="Health ratios view" className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-600">
          Compare overview, contributor, and activity ratios across successful repositories without rerunning analysis.
        </p>
      </div>

      {(Object.keys(rowsByCategory) as Array<keyof typeof rowsByCategory>).map((category) => {
        const categoryRows = rowsByCategory[category]
        const sortedRepos = getSortedRepos(results, categoryRows, sortBy, sortDirection)

        return (
          <section key={category} className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{CATEGORY_LABELS[category]}</h2>
              <p className="mt-1 text-sm text-slate-600">{CATEGORY_DESCRIPTIONS[category]}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Repository</th>
                    {categoryRows.map((row) => (
                      <th key={row.id} className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 text-left text-slate-500 transition hover:text-slate-700"
                          onClick={() => {
                            if (sortBy === row.id) {
                              setSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'))
                              return
                            }

                            setSortBy(row.id)
                            setSortDirection('desc')
                          }}
                        >
                          <HelpLabel label={row.label} helpText={`${row.formula}. ${row.description}`} />
                          {sortBy === row.id ? <span className="text-[10px] text-slate-400">{sortDirection === 'desc' ? '↓' : '↑'}</span> : null}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRepos.map((result) => (
                    <tr key={`${category}-${result.repo}`} className="rounded-xl border border-slate-200 bg-slate-50">
                      <th className="rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-medium text-slate-900">
                        {result.repo}
                      </th>
                      {categoryRows.map((row, index) => {
                        const cell = row.cells.find((entry) => entry.repo === result.repo)
                        return (
                          <td
                            key={`${row.id}-${result.repo}`}
                            className={`border border-slate-200 bg-slate-50 px-3 py-3 text-sm ${
                              index === categoryRows.length - 1 ? 'rounded-r-xl' : 'border-r-0'
                            } ${(cell?.displayValue ?? '—') === '—' ? 'text-slate-400' : 'text-slate-700'}`}
                          >
                            {cell?.displayValue ?? '—'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </section>
  )
}

function getSortedRepos(
  results: AnalysisResult[],
  rows: ReturnType<typeof buildHealthRatioRows>,
  sortBy: string,
  direction: 'asc' | 'desc',
) {
  const activeRow = rows.find((row) => row.id === sortBy)
  if (!activeRow) {
    return results
  }

  const valuesByRepo = new Map(activeRow.cells.map((cell) => [cell.repo, cell.value]))

  return [...results].sort((left, right) => {
    const leftValue = valuesByRepo.get(left.repo) ?? 'unavailable'
    const rightValue = valuesByRepo.get(right.repo) ?? 'unavailable'

    if (leftValue === 'unavailable' && rightValue === 'unavailable') {
      return left.repo.localeCompare(right.repo)
    }

    if (leftValue === 'unavailable') {
      return 1
    }

    if (rightValue === 'unavailable') {
      return -1
    }

    const difference = direction === 'asc' ? leftValue - rightValue : rightValue - leftValue
    if (difference !== 0) {
      return difference
    }

    return left.repo.localeCompare(right.repo)
  })
}
