'use client'

import { useState } from 'react'
import type { CorporateContributionPanelProps } from '@/specs/493-feat-corporate-contribution-lens-for-rep/contracts/corporate-metrics'
import { computeCorporateMetrics } from '@/lib/corporate/compute-corporate-metrics'

function fmt(value: number | 'unavailable', isPercent = false): string {
  if (value === 'unavailable') return '—'
  return isPercent ? `${value}%` : String(value)
}

export function CorporateContributionPanel({ results, windowDays }: CorporateContributionPanelProps) {
  const [companyName, setCompanyName] = useState('')

  const lens = companyName.trim() ? computeCorporateMetrics(results, companyName, windowDays) : null

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <label htmlFor="corporate-company-input" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Company
        </label>
        <input
          id="corporate-company-input"
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g. microsoft"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {lens && (
        <>
          <p className="mb-3 text-xs text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Experimental</span> — corporate attribution uses two heuristic signals:
            public GitHub org membership and commit email domain. Known limitations: (a) employees using personal
            emails without public org membership may be missed; (b) employees with private org membership may be
            missed; (c) a developer whose commits appear under both a GitHub login and an email address may be
            counted as two separate authors.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-amber-200 dark:border-amber-800">
                  <th className="pb-2 pr-4 font-medium text-slate-600 dark:text-slate-400">Repo</th>
                  <th className="pb-2 pr-4 text-right font-medium text-slate-600 dark:text-slate-400">
                    Corporate commits
                  </th>
                  <th className="pb-2 pr-4 text-right font-medium text-slate-600 dark:text-slate-400">
                    Corporate authors
                  </th>
                  <th className="pb-2 text-right font-medium text-slate-600 dark:text-slate-400">Corporate %</th>
                </tr>
              </thead>
              <tbody>
                {lens.perRepo.map((row) => (
                  <tr key={row.repo} className="border-b border-amber-100 dark:border-amber-900/50">
                    <td className="py-1.5 pr-4 font-mono text-xs text-slate-700 dark:text-slate-300">{row.repo}</td>
                    <td className="py-1.5 pr-4 text-right text-slate-700 dark:text-slate-300">
                      {fmt(row.corporateCommits)}
                    </td>
                    <td className="py-1.5 pr-4 text-right text-slate-700 dark:text-slate-300">
                      {fmt(row.corporateAuthors)}
                    </td>
                    <td className="py-1.5 text-right text-slate-700 dark:text-slate-300">
                      {fmt(row.corporatePct, true)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-amber-300 font-semibold dark:border-amber-700">
                  <td className="py-1.5 pr-4 text-slate-700 dark:text-slate-300">Total</td>
                  <td className="py-1.5 pr-4 text-right text-slate-700 dark:text-slate-300">
                    {fmt(lens.summary.totalCorporateCommits)}
                  </td>
                  <td className="py-1.5 pr-4 text-right text-slate-700 dark:text-slate-300">
                    {fmt(lens.summary.totalCorporateAuthors)}
                  </td>
                  <td className="py-1.5 text-right text-slate-700 dark:text-slate-300">
                    {fmt(lens.summary.overallCorporatePct, true)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
