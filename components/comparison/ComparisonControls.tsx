'use client'

import { useState } from 'react'
import { COMPARISON_SECTIONS, type ComparisonAttributeId, type ComparisonSectionId } from '@/lib/comparison/sections'

interface ComparisonControlsProps {
  repos: string[]
  anchorRepo: string
  expandedRepos: string[]
  enabledSections: ComparisonSectionId[]
  enabledAttributes: ComparisonAttributeId[]
  showMedianColumn: boolean
  onAnchorChange: (repo: string) => void
  onToggleRepo: (repo: string) => void
  onToggleSection: (sectionId: ComparisonSectionId) => void
  onToggleAttribute: (attributeId: ComparisonAttributeId) => void
  onToggleAllSectionAttributes: (sectionId: ComparisonSectionId, select: boolean) => void
  onToggleMedianColumn: () => void
}

export function ComparisonControls({
  repos,
  anchorRepo,
  expandedRepos,
  enabledSections,
  enabledAttributes,
  showMedianColumn,
  onAnchorChange,
  onToggleRepo,
  onToggleSection,
  onToggleAttribute,
  onToggleAllSectionAttributes,
  onToggleMedianColumn,
}: ComparisonControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const nonAnchorRepos = repos.filter((repo) => repo !== anchorRepo)

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:bg-slate-800/60 dark:border-slate-700">
      <div className="flex flex-wrap items-end gap-4">
        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Anchor repo</span>
          <select
            aria-label="Anchor repo"
            value={anchorRepo}
            onChange={(event) => onAnchorChange(event.target.value)}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
          >
            {repos.map((repo) => (
              <option key={repo} value={repo}>
                {repo}
              </option>
            ))}
          </select>
        </label>
        {nonAnchorRepos.length > 0 ? (
          <div className="space-y-1">
            <span className="block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Compare with</span>
            <div className="flex flex-wrap gap-2">
              {nonAnchorRepos.map((repo) => (
                <label key={repo} className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
                  <input
                    aria-label={repo}
                    type="checkbox"
                    checked={expandedRepos.includes(repo)}
                    onChange={() => onToggleRepo(repo)}
                  />
                  {repo}
                </label>
              ))}
            </div>
          </div>
        ) : null}
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input aria-label="Show median column" type="checkbox" checked={showMedianColumn} onChange={onToggleMedianColumn} />
          Show median column
        </label>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="ml-auto text-xs text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline dark:text-slate-400"
        >
          {showAdvanced ? 'Hide options' : 'Sections & attributes'}
        </button>
      </div>

      {showAdvanced ? (
        <div className="grid gap-4 border-t border-slate-200 pt-3 md:grid-cols-2 dark:border-slate-700">
          <div className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Sections</h3>
            <div className="space-y-2">
              {COMPARISON_SECTIONS.map((section) => (
                <label key={section.id} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input
                    aria-label={section.label}
                    type="checkbox"
                    checked={enabledSections.includes(section.id)}
                    onChange={() => onToggleSection(section.id)}
                  />
                  <span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{section.label}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{section.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Attributes</h3>
            <div className="space-y-3">
              {COMPARISON_SECTIONS.filter((section) => enabledSections.includes(section.id)).map((section) => {
                const allSelected = section.attributes.every((a) => enabledAttributes.includes(a.id))
                return (
                <div key={section.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{section.label}</p>
                    <button
                      type="button"
                      onClick={() => onToggleAllSectionAttributes(section.id, !allSelected)}
                      className="text-[10px] text-slate-400 underline-offset-1 hover:text-slate-600 hover:underline dark:text-slate-500"
                    >
                      {allSelected ? 'None' : 'All'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {section.attributes.map((attribute) => (
                      <label key={attribute.id} className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <input
                          aria-label={attribute.label}
                          type="checkbox"
                          checked={enabledAttributes.includes(attribute.id)}
                          onChange={() => onToggleAttribute(attribute.id)}
                        />
                        {attribute.label}
                      </label>
                    ))}
                  </div>
                </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
