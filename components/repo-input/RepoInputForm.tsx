'use client'

import { useEffect, useRef, useState } from 'react'
import { normalizeOrgInput } from '@/lib/analyzer/org-inventory'
import { parseRepos } from '@/lib/parse-repos'
import type { FoundationTarget } from '@/lib/cncf-sandbox/types'

interface RepoInputFormProps {
  onSubmitRepos: (repos: string[]) => void
  onSubmitOrg: (org: string) => void
  mode?: 'repos' | 'org'
  onModeChange?: (mode: 'repos' | 'org') => void
  initialRepoValue?: string
  foundationTarget?: FoundationTarget
  onFoundationTargetChange?: (target: FoundationTarget) => void
}

export function RepoInputForm({
  onSubmitRepos,
  onSubmitOrg,
  mode: controlledMode,
  onModeChange,
  initialRepoValue = '',
  foundationTarget = 'none',
  onFoundationTargetChange,
}: RepoInputFormProps) {
  const [uncontrolledMode, setUncontrolledMode] = useState<'repos' | 'org'>('repos')
  const [repoValue, setRepoValue] = useState(initialRepoValue)
  const [orgValue, setOrgValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const repoTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const mode = controlledMode ?? uncontrolledMode

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

  useEffect(() => {
    if (mode !== 'repos' || !repoTextareaRef.current) return

    const textarea = repoTextareaRef.current
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [mode, repoValue])

  function updateMode(nextMode: 'repos' | 'org') {
    onModeChange?.(nextMode)
    if (controlledMode === undefined) {
      setUncontrolledMode(nextMode)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (mode === 'repos') {
      const result = parseRepos(repoValue)
      if (!result.valid) {
        setError(result.error)
        return
      }

      setError(null)
      onSubmitRepos(result.repos)
      return
    }

    const result = normalizeOrgInput(orgValue)
    if (!result.valid) {
      setError(result.error)
      return
    }

    setError(null)
    onSubmitOrg(result.org)
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${ mode === 'repos' ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900' : 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200' }`}
          onClick={() => {
            updateMode('repos')
            setError(null)
          }}
        >
          Repositories
        </button>
        <button
          type="button"
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${ mode === 'org' ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900' : 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200' }`}
          onClick={() => {
            updateMode('org')
            setError(null)
          }}
        >
          Organization
        </button>
      </div>
      {mode === 'repos' ? (
        <div className="relative">
          <div className="mb-1 flex items-center justify-end">
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
                  className="absolute right-0 top-full z-10 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <p className="mb-2 font-medium text-slate-900 dark:text-slate-100">Accepted formats</p>
                  <ul className="space-y-1 font-mono text-xs">
                    <li><span className="text-slate-500 dark:text-slate-400">Slug:</span> owner/repo</li>
                    <li><span className="text-slate-500 dark:text-slate-400">URL:</span> https://github.com/owner/repo</li>
                    <li><span className="text-slate-500 dark:text-slate-400">URL (.git):</span> https://github.com/owner/repo.git</li>
                  </ul>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Separate multiple repos with spaces, commas, or newlines.</p>
                </div>
              )}
            </div>
          </div>
        <textarea
          ref={repoTextareaRef}
          value={repoValue}
          onChange={(e) => setRepoValue(e.target.value)}
          placeholder={'facebook/react ollama/ollama\ngithub.com/kubernetes/kubernetes\nhttps://github.com/pytorch/pytorch'}
          rows={3}
          className="w-full resize-none overflow-hidden rounded border border-slate-300 bg-white p-2 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          aria-label="Repository list"
          aria-describedby={error ? 'repo-input-error' : undefined}
        />
        <div className="mt-2 flex items-center gap-2">
          <label htmlFor="foundation-target" className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
            Foundation target:
          </label>
          <select
            id="foundation-target"
            value={foundationTarget}
            onChange={(e) => onFoundationTargetChange?.(e.target.value as FoundationTarget)}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="none">None</option>
            <option value="cncf-sandbox">CNCF Sandbox</option>
            <option value="cncf-incubating" disabled>CNCF Incubating (coming soon)</option>
            <option value="cncf-graduated" disabled>CNCF Graduated (coming soon)</option>
          </select>
        </div>
        </div>
      ) : (
        <input
          value={orgValue}
          onChange={(e) => setOrgValue(e.target.value)}
          placeholder="facebook, github.com/facebook, or https://github.com/facebook"
          className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          aria-label="Organization input"
          aria-describedby={error ? 'repo-input-error' : undefined}
        />
      )}
      {error && (
        <p id="repo-input-error" role="alert" data-testid="repo-error" className="mt-1 text-sm text-red-600 dark:text-red-300">
          {error}
        </p>
      )}
      <button
        type="submit"
        title="Run the full repo health dashboard for any valid set of repositories."
        className="mt-3 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus:ring-offset-2 dark:focus:ring-offset-slate-900"
      >
        Analyze
      </button>
    </form>
  )
}
