'use client'

import type { ResultTabDefinition, ResultTabId } from '@/specs/006-results-shell/contracts/results-shell-props'

interface ResultsTabsProps {
  tabs: ResultTabDefinition[]
  activeTab: ResultTabId
  onChange: (tabId: ResultTabId) => void
}

export function ResultsTabs({ tabs, activeTab, onChange }: ResultsTabsProps) {
  return (
    <div role="tablist" aria-label="Result views" className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          type="button"
          data-tab-id={tab.id}
          aria-selected={tab.id === activeTab}
          className={
            tab.id === activeTab
              ? 'rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white'
              : 'rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700'
          }
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
