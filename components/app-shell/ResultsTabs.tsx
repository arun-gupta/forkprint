'use client'

import { useEffect, useRef, useState } from 'react'
import type { ResultTabDefinition, ResultTabId } from '@/specs/006-results-shell/contracts/results-shell-props'
import type { TabMatchCounts } from '@/lib/search/types'

interface ResultsTabsProps {
  tabs: ResultTabDefinition[]
  activeTab: ResultTabId
  onChange: (tabId: ResultTabId) => void
  matchCounts?: TabMatchCounts
}

const COLLAPSED_COUNT_MOBILE = 3
const COLLAPSED_COUNT_DESKTOP = 6

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia('(max-width: 639px)')
    setIsMobile(mql.matches)
    function onChange(e: MediaQueryListEvent) { setIsMobile(e.matches) }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return isMobile
}

export function ResultsTabs({ tabs, activeTab, onChange, matchCounts }: ResultsTabsProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  const collapsedCount = isMobile ? COLLAPSED_COUNT_MOBILE : COLLAPSED_COUNT_DESKTOP
  const hasOverflow = tabs.length > collapsedCount
  const showAll = expanded || !hasOverflow
  const visibleTabs = showAll ? tabs : tabs.slice(0, collapsedCount)
  const overflowTabs = showAll ? [] : tabs.slice(collapsedCount)
  const activeOverflowTab = overflowTabs.find((t) => t.id === activeTab)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <div role="tablist" aria-label="Result views" className="flex flex-wrap items-center gap-1.5">
      {visibleTabs.map((tab) => (
        <TabButton key={tab.id} tab={tab} active={tab.id === activeTab} onClick={() => onChange(tab.id)} badgeCount={matchCounts?.[tab.id]} />
      ))}

      {expanded && hasOverflow && (
        <button
          type="button"
          className="px-1 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
          onClick={() => setExpanded(false)}
        >
          Show less
        </button>
      )}

      {overflowTabs.length > 0 && (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            title={activeOverflowTab ? activeOverflowTab.description : undefined}
            className={
              activeOverflowTab
                ? 'inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1.5 text-sm font-medium text-white'
                : 'inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700'
            }
            onClick={() => setMenuOpen((o) => !o)}
          >
            {activeOverflowTab ? activeOverflowTab.label : 'More'}
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 min-w-[10rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              {overflowTabs.map((tab) => {
                const count = matchCounts?.[tab.id]
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    type="button"
                    data-tab-id={tab.id}
                    aria-selected={tab.id === activeTab}
                    title={tab.description}
                    className={
                      tab.id === activeTab
                        ? 'block w-full px-4 py-2 text-left text-sm font-medium text-slate-900 bg-slate-100'
                        : 'block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50'
                    }
                    onClick={() => {
                      onChange(tab.id)
                      setMenuOpen(false)
                    }}
                  >
                    {tab.label}
                    {count ? <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-sky-100 px-1 text-xs font-medium text-sky-700">{count}</span> : null}
                  </button>
                )
              })}
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                className="block w-full px-4 py-2 text-left text-xs font-medium text-slate-500 hover:bg-slate-50"
                onClick={() => {
                  setExpanded(true)
                  setMenuOpen(false)
                }}
              >
                Show all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TabButton({ tab, active, onClick, badgeCount }: { tab: ResultTabDefinition; active: boolean; onClick: () => void; badgeCount?: number }) {
  return (
    <button
      role="tab"
      type="button"
      data-tab-id={tab.id}
      aria-selected={active}
      title={tab.description}
      className={
        active
          ? 'whitespace-nowrap rounded-full bg-slate-900 px-2.5 py-1.5 text-sm font-medium text-white'
          : 'whitespace-nowrap rounded-full border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700'
      }
      onClick={onClick}
    >
      {tab.label}
      {badgeCount ? <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-sky-100 px-1 text-xs font-medium text-sky-700">{badgeCount}</span> : null}
    </button>
  )
}
