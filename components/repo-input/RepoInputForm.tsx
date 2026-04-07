'use client'

import { useState } from 'react'
import { normalizeOrgInput } from '@/lib/analyzer/org-inventory'
import { parseRepos } from '@/lib/parse-repos'

interface RepoInputFormProps {
  onSubmitRepos: (repos: string[]) => void
  onSubmitOrg: (org: string) => void
  mode?: 'repos' | 'org'
  onModeChange?: (mode: 'repos' | 'org') => void
  initialRepoValue?: string
}

export function RepoInputForm({
  onSubmitRepos,
  onSubmitOrg,
  mode: controlledMode,
  onModeChange,
  initialRepoValue = '',
}: RepoInputFormProps) {
  const [uncontrolledMode, setUncontrolledMode] = useState<'repos' | 'org'>('repos')
  const [repoValue, setRepoValue] = useState(initialRepoValue)
  const [orgValue, setOrgValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const mode = controlledMode ?? uncontrolledMode

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
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            mode === 'repos' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'
          }`}
          onClick={() => {
            updateMode('repos')
            setError(null)
          }}
        >
          Repositories
        </button>
        <button
          type="button"
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            mode === 'org' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'
          }`}
          onClick={() => {
            updateMode('org')
            setError(null)
          }}
        >
          Organization
        </button>
      </div>
      {mode === 'repos' ? (
        <textarea
          value={repoValue}
          onChange={(e) => setRepoValue(e.target.value)}
          placeholder={'facebook/react ollama/ollama\ngithub.com/kubernetes/kubernetes\nhttps://github.com/pytorch/pytorch'}
          rows={5}
          className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Repository list"
          aria-describedby={error ? 'repo-input-error' : undefined}
        />
      ) : (
        <input
          value={orgValue}
          onChange={(e) => setOrgValue(e.target.value)}
          placeholder="facebook, github.com/facebook, or https://github.com/facebook"
          className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Organization input"
          aria-describedby={error ? 'repo-input-error' : undefined}
        />
      )}
      {error && (
        <p id="repo-input-error" role="alert" data-testid="repo-error" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        title="Run the full repo health dashboard for any valid set of repositories."
        className="mt-3 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Analyze
      </button>
    </form>
  )
}
