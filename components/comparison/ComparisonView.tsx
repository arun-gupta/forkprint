'use client'

import { useMemo, useState } from 'react'
import { isRateLimitLow, type AnalysisResult, type RateLimitState } from '@/lib/analyzer/analysis-result'
import {
  buildComparisonSections,
  getComparisonLimitMessage,
  getDefaultAnchorRepo,
  limitComparedResults,
  sortComparisonRows,
  type ComparisonSortColumn,
} from '@/lib/comparison/view-model'
import {
  COMPARISON_MAX_REPOS,
  COMPARISON_SECTIONS,
  DEFAULT_ENABLED_ATTRIBUTES,
  DEFAULT_ENABLED_SECTIONS,
  type ComparisonAttributeId,
  type ComparisonSectionId,
} from '@/lib/comparison/sections'
import { ComparisonControls } from './ComparisonControls'
import { ComparisonTable } from './ComparisonTable'

interface ComparisonViewProps {
  results: AnalysisResult[]
  rateLimit?: RateLimitState | null
}

export function ComparisonView({ results, rateLimit }: ComparisonViewProps) {
  const comparedResults = useMemo(() => limitComparedResults(results), [results])
  const nonAnchorRepos = useMemo(
    () => comparedResults.slice(1).map((r) => r.repo),
    [comparedResults],
  )
  const [anchorRepo, setAnchorRepo] = useState(() => getDefaultAnchorRepo(comparedResults))
  const [enabledSections, setEnabledSections] = useState<ComparisonSectionId[]>(DEFAULT_ENABLED_SECTIONS)
  const [enabledAttributes, setEnabledAttributes] = useState<ComparisonAttributeId[]>(DEFAULT_ENABLED_ATTRIBUTES)
  const [showMedianColumn, setShowMedianColumn] = useState(true)
  const [expandedRepos, setExpandedRepos] = useState<string[]>(nonAnchorRepos)
  const [sortColumn, setSortColumn] = useState<ComparisonSortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const visibleRepos = useMemo(
    () => comparedResults.map((r) => r.repo).filter((repo) => repo === anchorRepo || expandedRepos.includes(repo)),
    [anchorRepo, comparedResults, expandedRepos],
  )

  const sections = useMemo(() => {
    const builtSections = buildComparisonSections(comparedResults, {
      anchorRepo,
      enabledSections,
      enabledAttributes,
    })

    if (!sortColumn) {
      return builtSections
    }

    return builtSections.map((section) => ({
      ...section,
      rows: sortComparisonRows(section.rows, sortColumn, sortDirection),
    }))
  }, [anchorRepo, comparedResults, enabledAttributes, enabledSections, sortColumn, sortDirection])

  if (results.length < 2) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">Compare two to four repositories to open the side-by-side comparison view.</p>
  }

  return (
    <section aria-label="Comparison view" className="space-y-6">
      {results.length > COMPARISON_MAX_REPOS ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">{getComparisonLimitMessage(results.length)}</p>
      ) : null}

      <ComparisonControls
        repos={comparedResults.map((result) => result.repo)}
        anchorRepo={anchorRepo}
        expandedRepos={expandedRepos}
        enabledSections={enabledSections}
        enabledAttributes={enabledAttributes}
        showMedianColumn={showMedianColumn}
        onAnchorChange={(repo) => {
          setExpandedRepos((current) => {
            // Keep the old anchor visible and ensure the new anchor is included
            const withOldAnchor = current.includes(anchorRepo) ? current : [...current, anchorRepo]
            return withOldAnchor.includes(repo) ? withOldAnchor : [...withOldAnchor, repo]
          })
          setAnchorRepo(repo)
        }}
        onToggleRepo={(repo) => {
          setExpandedRepos((current) =>
            current.includes(repo) ? current.filter((r) => r !== repo) : [...current, repo],
          )
        }}
        onToggleSection={(sectionId) => {
          setEnabledSections((current) =>
            current.includes(sectionId) ? current.filter((value) => value !== sectionId) : [...current, sectionId],
          )
        }}
        onToggleAllSectionAttributes={(sectionId, select) => {
          const section = COMPARISON_SECTIONS.find((s) => s.id === sectionId)
          if (!section) return
          const ids = section.attributes.map((a) => a.id)
          setEnabledAttributes((current) =>
            select
              ? [...new Set([...current, ...ids])]
              : current.filter((id) => !ids.includes(id)),
          )
        }}
        onToggleAttribute={(attributeId) => {
          setEnabledAttributes((current) =>
            current.includes(attributeId) ? current.filter((value) => value !== attributeId) : [...current, attributeId],
          )
        }}
        onToggleMedianColumn={() => setShowMedianColumn((current) => !current)}
      />

      {sections.length > 0 ? (
        <ComparisonTable
          repos={visibleRepos}
          sections={sections}
          anchorRepo={anchorRepo}
          showMedianColumn={showMedianColumn}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSortRepo={(repo) => {
            if (sortColumn?.type === 'repo' && sortColumn.repo === repo) {
              setSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'))
              return
            }

            setSortColumn({ type: 'repo', repo })
            setSortDirection('desc')
          }}
          onSortMedian={() => {
            if (sortColumn?.type === 'median') {
              setSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'))
              return
            }

            setSortColumn({ type: 'median' })
            setSortDirection('desc')
          }}
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
          No comparison rows are currently visible. Re-enable a section or attribute to continue.
        </div>
      )}

      {rateLimit && isRateLimitLow(rateLimit) ? (
        <section className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-200">
          <p>Remaining API calls: {rateLimit.remaining.toLocaleString('en-US')}</p>
          <p>Rate limit resets at: {new Date(rateLimit.resetAt).toLocaleTimeString()}</p>
        </section>
      ) : null}
    </section>
  )
}
