'use client'

import { HelpLabel } from '@/components/shared/HelpLabel'
import type { ComparisonSectionViewModel, ComparisonSortColumn } from '@/lib/comparison/view-model'

interface ComparisonTableProps {
  repos: string[]
  sections: ComparisonSectionViewModel[]
  anchorRepo: string
  showMedianColumn: boolean
  sortColumn: ComparisonSortColumn | null
  sortDirection: 'asc' | 'desc'
  onSortRepo: (repo: string) => void
  onSortMedian: () => void
}

export function ComparisonTable({
  repos,
  sections,
  anchorRepo,
  showMedianColumn,
  sortColumn,
  sortDirection,
  onSortRepo,
  onSortMedian,
}: ComparisonTableProps) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.id} className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{section.label}</h2>
            <p className="mt-1 text-sm text-slate-600">{section.description}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Metric</th>
                  {repos.map((repo) => (
                    <th key={repo} className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-left text-slate-600 transition hover:text-slate-800"
                        onClick={() => onSortRepo(repo)}
                      >
                        <span>{repo}</span>
                        {repo === anchorRepo ? (
                          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-700">
                            Anchor
                          </span>
                        ) : null}
                        {sortColumn?.type === 'repo' && sortColumn.repo === repo ? (
                          <span className="text-[10px] text-slate-400">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                        ) : null}
                      </button>
                    </th>
                  ))}
                  {showMedianColumn ? (
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-left text-slate-600 transition hover:text-slate-800"
                        onClick={onSortMedian}
                      >
                        <span>Median</span>
                        {sortColumn?.type === 'median' ? (
                          <span className="text-[10px] text-slate-400">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                        ) : null}
                      </button>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row) => (
                  <tr key={`${section.id}-${row.attributeId}`} className="rounded-xl border border-slate-200 bg-slate-50 align-top">
                    <th className="rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-medium text-slate-900">
                      <HelpLabel label={row.label} helpText={row.helpText} />
                    </th>
                    {row.cells
                      .filter((cell) => repos.includes(cell.repo))
                      .map((cell) => (
                        <td key={`${row.attributeId}-${cell.repo}`} className="border border-r-0 border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                          <div className="space-y-1">
                            {cell.deltaDisplay ? (
                              <p
                                className={`text-sm font-medium ${
                                  cell.status === 'better'
                                    ? 'text-emerald-700'
                                    : cell.status === 'worse'
                                    ? 'text-amber-700'
                                    : 'text-slate-500'
                                }`}
                              >
                                {cell.deltaDisplay}
                              </p>
                            ) : cell.status === 'neutral' && cell.repo === anchorRepo ? (
                              <p className="text-sm font-medium text-sky-700">Anchor baseline</p>
                            ) : null}
                            <p className={`text-xs uppercase tracking-wide ${cell.displayValue === '—' ? 'text-slate-400' : 'text-slate-500'}`}>{cell.displayValue}</p>
                          </div>
                        </td>
                      ))}
                    {showMedianColumn ? (
                      <td className="rounded-r-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                        {row.medianDisplay}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}
