'use client'

import { useEffect, useRef, useState } from 'react'
import { FOUNDATION_REGISTRY } from '@/lib/foundation/types'
import type { FoundationTarget } from '@/lib/cncf-sandbox/types'

const CNCF_BOARD_URL = 'https://github.com/orgs/cncf/projects/14'

interface FoundationInputSectionProps {
  foundationTarget: FoundationTarget
  onFoundationTargetChange: (target: FoundationTarget) => void
  inputValue: string
  onInputChange: (value: string) => void
  error: string | null
  verifyRepos?: boolean
  onVerifyReposChange?: (v: boolean) => void
}

export function FoundationInputSection({
  foundationTarget,
  onFoundationTargetChange,
  inputValue,
  onInputChange,
  error,
  verifyRepos = false,
  onVerifyReposChange,
}: FoundationInputSectionProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const [boardFilled, setBoardFilled] = useState(false)
  const boardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleUseBoardUrl() {
    onInputChange(CNCF_BOARD_URL)
    setBoardFilled(true)
    if (boardTimeoutRef.current !== null) {
      clearTimeout(boardTimeoutRef.current)
    }
    boardTimeoutRef.current = setTimeout(() => {
      setBoardFilled(false)
      boardTimeoutRef.current = null
    }, 1500)
  }

  useEffect(() => {
    return () => {
      if (boardTimeoutRef.current !== null) {
        clearTimeout(boardTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!tooltipOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setTooltipOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [tooltipOpen])

  return (
    <div className="space-y-3">
      {/* Foundation picker — rendered from FOUNDATION_REGISTRY */}
      <div className="flex flex-wrap gap-2">
        {FOUNDATION_REGISTRY.map((entry) => (
          <div key={entry.target} className="group relative">
            <button
              type="button"
              disabled={!entry.active}
              aria-pressed={entry.target === foundationTarget}
              aria-label={entry.active ? entry.label : `${entry.label} (coming soon)`}
              onClick={() => {
                if (entry.active) onFoundationTargetChange(entry.target)
              }}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                entry.target === foundationTarget && entry.active
                  ? 'border-emerald-700 bg-emerald-700 text-white dark:border-emerald-500 dark:bg-emerald-600'
                  : entry.active
                    ? 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-600'
              }`}
            >
              {entry.label}
              {!entry.active ? <span className="ml-1 text-xs opacity-70">(soon)</span> : null}
            </button>
            <div
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 opacity-0 shadow-md transition-opacity group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              {entry.tooltip}
              <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-200 dark:border-t-slate-700" />
            </div>
          </div>
        ))}
      </div>

      {/* Smart input field */}
      <div className="relative">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            <span className="font-medium text-slate-700 dark:text-slate-300">Repos:</span>{' '}
            <span className="font-mono">owner/repo</span>
            <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">Org:</span>{' '}
            <span className="font-mono">org-slug</span>
            <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">Board:</span>{' '}
            <a
              href={CNCF_BOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono underline decoration-dotted hover:decoration-solid"
            >
              github.com/orgs/cncf/projects/14
            </a>
            <button
              type="button"
              onClick={handleUseBoardUrl}
              aria-label="Use this board URL"
              title="Use this board URL"
              className="ml-1 inline-flex items-center rounded px-1 py-0.5 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:text-slate-500 dark:hover:text-slate-300 dark:focus-visible:ring-offset-slate-900"
            >
              {boardFilled ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-emerald-500" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden="true">
                  <path d="M7.25 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8v4.25a.75.75 0 0 1-1.5 0V8.5H2.25a.75.75 0 0 1 0-1.5H6.5V2.75A.75.75 0 0 1 7.25 2Z" />
                </svg>
              )}
              <span className="ml-0.5 text-xs">{boardFilled ? 'Used' : ''}</span>
            </button>
          </p>
          <div ref={tooltipRef} className="relative">
            <button
              type="button"
              aria-label="Accepted input formats"
              className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-500 dark:hover:text-slate-300"
              onMouseEnter={() => setTooltipOpen(true)}
              onMouseLeave={() => setTooltipOpen(false)}
              onTouchStart={() => setTooltipOpen((prev) => !prev)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM8.94 6.94a.75.75 0 1 1-1.061-1.061 2.75 2.75 0 1 1 3.871 3.871.75.75 0 0 1-.25.177.75.75 0 0 0-.45.688v.19a.75.75 0 0 1-1.5 0v-.19a2.25 2.25 0 0 1 1.35-2.064A1.25 1.25 0 0 0 8.94 6.94ZM10 15a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
            </button>
            {tooltipOpen && (
              <div
                role="tooltip"
                data-testid="format-tooltip"
                className="absolute right-0 top-full z-10 mt-1 w-80 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <p className="mb-2 font-medium text-slate-900 dark:text-slate-100">Accepted formats</p>
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-300">Multiple repos:</p>
                    <ul className="mt-1 space-y-0.5 font-mono text-slate-600 dark:text-slate-400">
                      <li>owner/repo</li>
                      <li>https://github.com/owner/repo</li>
                      <li className="not-italic text-slate-500 dark:text-slate-500">Separate with spaces, commas, or newlines</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-300">One org:</p>
                    <ul className="mt-1 space-y-0.5 font-mono text-slate-600 dark:text-slate-400">
                      <li>org-slug</li>
                      <li>github.com/org-slug</li>
                      <li>https://github.com/org-slug</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-300">Projects board:</p>
                    <ul className="mt-1 space-y-0.5 font-mono text-slate-600 dark:text-slate-400">
                      <li>https://github.com/orgs/org/projects/14</li>
                    </ul>
                    <p className="mt-1 not-italic text-slate-500 dark:text-slate-500">Scans repos from New &amp; Upcoming columns</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <textarea
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={'owner1/repo1 owner2/repo2\n— or — org-slug\n— or — https://github.com/orgs/org/projects/14'}
          rows={3}
          className="w-full resize-none overflow-hidden rounded border border-slate-300 bg-white p-2 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          aria-label="Foundation input"
          aria-describedby={error ? 'foundation-input-error' : undefined}
        />
      </div>

      <label className={`flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 ${onVerifyReposChange ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
        <input
          type="checkbox"
          checked={verifyRepos}
          onChange={(e) => onVerifyReposChange?.(e.target.checked)}
          disabled={!onVerifyReposChange}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600"
        />
        Verify repos before analyzing
      </label>

      {error ? (
        <p id="foundation-input-error" role="alert" data-testid="foundation-error" className="mt-1 text-sm text-red-600 dark:text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  )
}
