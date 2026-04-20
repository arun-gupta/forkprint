'use client'

import { useEffect, useMemo, useState } from 'react'
import { isRateLimitLow, type AnalysisResult, type RateLimitState } from '@/lib/analyzer/analysis-result'
import {
  buildComparisonSections,
  getDefaultAnchorRepo,
  selectComparedResults,
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

const MIN_COMPARISON_PARTICIPANTS = 2

export function ComparisonView({ results, rateLimit }: ComparisonViewProps) {
  const repoOrder = useMemo(() => results.map((r) => r.repo), [results])
  const [participants, setParticipants] = useState<string[]>(() => repoOrder.slice(0, COMPARISON_MAX_REPOS))

  useEffect(() => {
    setParticipants((current) => {
      const valid = current.filter((repo) => repoOrder.includes(repo))
      if (valid.length === 0) return repoOrder.slice(0, COMPARISON_MAX_REPOS)
      return valid
    })
  }, [repoOrder])

  const comparedResults = useMemo(
    () => selectComparedResults(results, participants),
    [results, participants],
  )
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

  useEffect(() => {
    if (!comparedResults.some((r) => r.repo === anchorRepo)) {
      setAnchorRepo(getDefaultAnchorRepo(comparedResults))
    }
  }, [comparedResults, anchorRepo])

  useEffect(() => {
    setExpandedRepos(nonAnchorRepos)
  }, [nonAnchorRepos])

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

  const pickerVisible = results.length > COMPARISON_MAX_REPOS

  return (
    <section aria-label="Comparison view" className="space-y-6">
      {pickerVisible ? (
        <fieldset
          aria-label="Comparison participants"
          className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
        >
          <legend className="px-1 text-xs font-medium text-slate-700 dark:text-slate-200">
            Pick up to {COMPARISON_MAX_REPOS} of {results.length} analyzed repos to compare
            {' '}
            <span className="text-slate-500 dark:text-slate-400">({participants.length}/{COMPARISON_MAX_REPOS})</span>
          </legend>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700 dark:text-slate-200">
            {results.map((result) => {
              const checked = participants.includes(result.repo)
              const atMax = !checked && participants.length >= COMPARISON_MAX_REPOS
              const atMin = checked && participants.length <= MIN_COMPARISON_PARTICIPANTS
              return (
                <label key={result.repo} className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={atMax || atMin}
                    aria-label={`Include ${result.repo} in comparison`}
                    onChange={(event) => {
                      setParticipants((current) => {
                        if (event.target.checked) {
                          return current.includes(result.repo) ? current : [...current, result.repo]
                        }
                        return current.filter((repo) => repo !== result.repo)
                      })
                    }}
                  />
                  <span>{result.repo}</span>
                </label>
              )
            })}
          </div>
        </fieldset>
      ) : null}

      <ComparisonControls
        repos={comparedResults.map((result) => result.repo)}
        anchorRepo={anchorRepo}
        expandedRepos={expandedRepos}
        enabledSections={enabledSections}
        enabledAttributes={enabledAttributes}
        showMedianColumn={showMedianColumn}
        onAnchorChange={(repo) => {
          setParticipants((current) => (current.includes(repo) ? current : [...current, repo].slice(0, COMPARISON_MAX_REPOS)))
          setExpandedRepos((current) => {
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
