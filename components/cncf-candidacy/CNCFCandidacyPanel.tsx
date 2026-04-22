'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { OrgRepoSummary } from '@/lib/analyzer/org-inventory'
import type { CandidacyRepoResult, LandscapeProjectStatus } from '@/lib/cncf-sandbox/types'
import { useAuth } from '@/components/auth/AuthContext'

interface CNCFCandidacyPanelProps {
  org: string
  repos: OrgRepoSummary[]
}

const BATCH_SIZE = 25
const FETCH_CONCURRENCY = 5
const CNCF_HOSTED_STATUSES = new Set<LandscapeProjectStatus>(['sandbox', 'incubating', 'graduated'])

type RepoRowState =
  | { status: 'loading' }
  | { status: 'loaded'; result: CandidacyRepoResult }
  | { status: 'error'; error: string }

const PILL_LABELS: Record<NonNullable<LandscapeProjectStatus>, string> = {
  graduated: 'Graduated',
  incubating: 'Incubating',
  sandbox: 'Sandbox',
  landscape: 'Landscape',
}

const PILL_CLASSES: Record<NonNullable<LandscapeProjectStatus>, string> = {
  graduated:
    'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700',
  incubating:
    'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700',
  sandbox:
    'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700',
  landscape:
    'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600',
}

function LandscapePill({
  status,
  onClick,
  active,
}: {
  status: NonNullable<LandscapeProjectStatus>
  onClick?: () => void
  active?: boolean
}) {
  const base = `rounded-full px-2 py-0.5 text-xs font-medium ${PILL_CLASSES[status]}`
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} cursor-pointer ring-offset-0 transition-shadow hover:ring-2 hover:ring-current${active ? ' ring-2 ring-current' : ''}`}
        aria-pressed={active}
        title={`Filter by ${PILL_LABELS[status]}`}
      >
        {PILL_LABELS[status]}
      </button>
    )
  }
  return <span className={base}>{PILL_LABELS[status]}</span>
}

const TIER_BADGES: Record<string, { label: string; className: string }> = {
  strong: {
    label: 'Strong candidate',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  'needs-work': {
    label: 'Needs work',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  },
  'not-ready': {
    label: 'Not ready',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
}

function normalizeRepoUrl(url: string): string {
  return url.toLowerCase().replace(/\.git$/, '').replace(/\/$/, '')
}

async function withConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items]
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()
      if (item !== undefined) await fn(item)
    }
  })
  await Promise.all(workers)
}

export function CNCFCandidacyPanel({ org, repos }: CNCFCandidacyPanelProps) {
  const { session } = useAuth()
  const token = session?.token ?? null

  const [landscapeLoading, setLandscapeLoading] = useState(true)
  const [landscapeStatuses, setLandscapeStatuses] = useState<Record<string, LandscapeProjectStatus>>({})
  const [repoStates, setRepoStates] = useState<Map<string, RepoRowState>>(new Map())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [batchOffset, setBatchOffset] = useState(0)
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'fetching' | 'done'>('idle')
  const [fetchTimer, setFetchTimer] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeStatusFilter, setActiveStatusFilter] = useState<LandscapeProjectStatus>(null)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fetchStartRef = useRef<number>(0)

  // Load landscape statuses on mount
  useEffect(() => {
    fetch('/api/cncf-landscape')
      .then((r) => r.json())
      .then((data: { repoStatuses: Record<string, LandscapeProjectStatus> }) => {
        setLandscapeStatuses(data.repoStatuses ?? {})
      })
      .catch(() => {})
      .finally(() => setLandscapeLoading(false))
  }, [])

  // Resolve landscape status for a single repo (by its GitHub URL)
  const getRepoStatus = useCallback(
    (repo: OrgRepoSummary): LandscapeProjectStatus => {
      const normalized = normalizeRepoUrl(repo.url)
      return landscapeStatuses[normalized] ?? null
    },
    [landscapeStatuses],
  )

  // Partition repos into CNCF-hosted and selectable, sorted by stars
  const { cncfHosted, selectable } = useMemo(() => {
    const cncfHosted: OrgRepoSummary[] = []
    const selectable: OrgRepoSummary[] = []
    for (const repo of repos) {
      const status = getRepoStatus(repo)
      if (status && CNCF_HOSTED_STATUSES.has(status)) {
        cncfHosted.push(repo)
      } else {
        selectable.push(repo)
      }
    }
    selectable.sort((a, b) => {
      const aStars = typeof a.stars === 'number' ? a.stars : 0
      const bStars = typeof b.stars === 'number' ? b.stars : 0
      return bStars - aStars
    })
    return { cncfHosted, selectable }
  }, [repos, getRepoStatus])

  // Which repos are currently shown in the picker (loaded batches)
  const loadedSelectable = useMemo(
    () => selectable.slice(0, batchOffset),
    [selectable, batchOffset],
  )

  // Stars map for passing to the API
  const starsMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of repos) {
      m[r.repo] = typeof r.stars === 'number' ? r.stars : 0
    }
    return m
  }, [repos])

  const startTimer = useCallback(() => {
    fetchStartRef.current = Date.now()
    setFetchTimer(0)
    timerRef.current = setInterval(() => {
      setFetchTimer(Math.floor((Date.now() - fetchStartRef.current) / 1000))
    }, 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const updateRepoState = useCallback((repoSlug: string, state: RepoRowState) => {
    setRepoStates((prev) => new Map(prev).set(repoSlug, state))
  }, [])

  const fetchRepo = useCallback(
    async (repoSummary: OrgRepoSummary, signal: AbortSignal) => {
      const slug = repoSummary.repo
      updateRepoState(slug, { status: 'loading' })
      try {
        const res = await fetch('/api/cncf-candidacy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repos: [slug],
            token,
            stars: { [slug]: starsMap[slug] ?? 0 },
          }),
          signal,
        })
        if (!res.ok) {
          updateRepoState(slug, { status: 'error', error: `HTTP ${res.status}` })
          return
        }
        const data = (await res.json()) as {
          results: Array<
            | { repo: string; success: true; result: CandidacyRepoResult }
            | { repo: string; success: false; error: string }
          >
        }
        const item = data.results[0]
        if (item?.success) {
          updateRepoState(slug, { status: 'loaded', result: item.result })
        } else {
          updateRepoState(slug, {
            status: 'error',
            error: (item as { success: false; error: string })?.error ?? 'Unknown error',
          })
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        updateRepoState(slug, { status: 'error', error: 'Fetch failed' })
      }
    },
    [token, starsMap, updateRepoState],
  )

  const fetchBatch = useCallback(
    async (batch: OrgRepoSummary[]) => {
      if (!token) return
      const controller = new AbortController()
      abortRef.current = controller
      setFetchStatus('fetching')
      startTimer()

      await withConcurrency(batch, FETCH_CONCURRENCY, (repo) =>
        fetchRepo(repo, controller.signal),
      )

      // Only mark done if not aborted
      if (!controller.signal.aborted) {
        setFetchStatus('done')
      }
      stopTimer()
    },
    [token, fetchRepo, startTimer, stopTimer],
  )

  // Load first batch once landscape is ready and token available
  useEffect(() => {
    if (landscapeLoading || !token || selectable.length === 0 || batchOffset > 0) return
    const firstBatch = selectable.slice(0, BATCH_SIZE)
    const newSelected = new Set(firstBatch.map((r) => r.repo))
    setSelected(newSelected)
    setBatchOffset(BATCH_SIZE)
    fetchBatch(firstBatch)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landscapeLoading, token, selectable.length])

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    setFetchStatus('done')
    stopTimer()
    // Discard repos that are still loading
    setRepoStates((prev) => {
      const next = new Map(prev)
      for (const [key, val] of next.entries()) {
        if (val.status === 'loading') next.delete(key)
      }
      return next
    })
  }, [stopTimer])

  const handleShowNext = useCallback(() => {
    if (!token) return
    const nextBatch = selectable.slice(batchOffset, batchOffset + BATCH_SIZE)
    if (nextBatch.length === 0) return
    const newSelected = new Set([...selected, ...nextBatch.map((r) => r.repo)])
    setSelected(newSelected)
    setBatchOffset((prev) => prev + BATCH_SIZE)
    fetchBatch(nextBatch)
  }, [token, selectable, batchOffset, selected, fetchBatch])

  const handleToggleSelect = useCallback(
    (repoSlug: string) => {
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(repoSlug)) {
          next.delete(repoSlug)
        } else {
          next.add(repoSlug)
        }
        return next
      })
    },
    [],
  )

  const handleSearchSelect = useCallback(
    (repo: OrgRepoSummary) => {
      const slug = repo.repo
      if (selected.has(slug)) return
      setSelected((prev) => new Set([...prev, slug]))
      // If not yet loaded, trigger immediate single fetch
      if (!repoStates.has(slug) && token) {
        fetchBatch([repo])
      }
    },
    [selected, repoStates, token, fetchBatch],
  )

  // Search across ALL org repos
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) || r.repo.toLowerCase().includes(q),
    ).slice(0, 10)
  }, [repos, searchQuery])

  // Check if all repos in the current batch are CNCF members
  const allBatchAreCncfHosted = useMemo(() => {
    if (loadedSelectable.length === 0) return false
    return loadedSelectable.every((r) => {
      const status = getRepoStatus(r)
      return status && CNCF_HOSTED_STATUSES.has(status)
    })
  }, [loadedSelectable, getRepoStatus])

  // Build ranked results from loaded repos
  const rankedResults = useMemo(() => {
    const results: Array<{ repo: OrgRepoSummary; rowState: RepoRowState }> = []

    for (const repo of loadedSelectable) {
      const rowState = repoStates.get(repo.repo)
      if (rowState) {
        results.push({ repo, rowState })
      } else if (selected.has(repo.repo)) {
        // Auto-selected but not yet fetched (edge case)
        results.push({ repo, rowState: { status: 'loading' } })
      }
    }

    // Sort loaded rows by Track 1 score desc, stars as tiebreaker
    results.sort((a, b) => {
      const aLoaded = a.rowState.status === 'loaded' ? a.rowState.result.track1Score : -1
      const bLoaded = b.rowState.status === 'loaded' ? b.rowState.result.track1Score : -1
      if (bLoaded !== aLoaded) return bLoaded - aLoaded
      const aStars = typeof a.repo.stars === 'number' ? a.repo.stars : 0
      const bStars = typeof b.repo.stars === 'number' ? b.repo.stars : 0
      return bStars - aStars
    })

    return results
  }, [loadedSelectable, repoStates, selected])

  const hasMoreRepos = batchOffset < selectable.length

  // Summary counts derived from all repos + loaded results
  const summary = useMemo(() => {
    const statusCounts: Partial<Record<NonNullable<LandscapeProjectStatus>, number>> = {}
    for (const repo of repos) {
      const s = getRepoStatus(repo)
      if (s) statusCounts[s] = (statusCounts[s] ?? 0) + 1
    }
    const tierCounts = { strong: 0, 'needs-work': 0, 'not-ready': 0 }
    for (const { rowState } of rankedResults) {
      if (rowState.status === 'loaded') tierCounts[rowState.result.tier]++
    }
    return { statusCounts, tierCounts, loadedCount: rankedResults.filter(r => r.rowState.status === 'loaded').length }
  }, [repos, rankedResults, getRepoStatus])

  const filteredResults = useMemo(() => {
    if (!activeStatusFilter) return rankedResults
    return rankedResults.filter(({ repo }) => getRepoStatus(repo) === activeStatusFilter)
  }, [rankedResults, activeStatusFilter, getRepoStatus])

  if (landscapeLoading) {
    return (
      <section aria-label="CNCF Candidacy Scan" className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
          CNCF Candidacy Scan
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading landscape data…</p>
      </section>
    )
  }

  if (repos.length === 0) return null

  return (
    <section aria-label="CNCF Candidacy Scan" className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            CNCF Sandbox Candidacy Scan
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Ranks repos in <span className="font-mono">{org}</span> by CNCF Sandbox readiness.
            Graduated / Incubating / Sandbox repos are greyed out.
          </p>
          {selectable.length > 0 ? (
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              {rankedResults.length} of {selectable.length} repos scanned
              {activeStatusFilter ? ` · ${filteredResults.length} shown` : ''}
              {cncfHosted.length > 0 ? ` · ${cncfHosted.length} existing CNCF projects` : ''}
            </p>
          ) : null}
        </div>
      </div>

      {/* Summary chips */}
      {(summary.statusCounts.graduated ?? 0) + (summary.statusCounts.incubating ?? 0) + (summary.statusCounts.sandbox ?? 0) + (summary.statusCounts.landscape ?? 0) + summary.loadedCount > 0 ? (
        <div className="flex flex-wrap gap-2 text-xs">
          {(['graduated', 'incubating', 'sandbox', 'landscape'] as const).map((s) => {
            const count = summary.statusCounts[s]
            if (!count) return null
            return (
              <button
                key={s}
                type="button"
                onClick={() => setActiveStatusFilter(activeStatusFilter === s ? null : s)}
                aria-pressed={activeStatusFilter === s}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-shadow hover:ring-2 hover:ring-current ${PILL_CLASSES[s]}${activeStatusFilter === s ? ' ring-2 ring-current' : ''}`}
              >
                <span>{count}</span>
                <span>{PILL_LABELS[s]}</span>
              </button>
            )
          })}
          {summary.loadedCount > 0 ? (
            <span className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {summary.tierCounts.strong > 0 ? <span className="text-emerald-700 dark:text-emerald-400"><span className="font-semibold">{summary.tierCounts.strong}</span> strong</span> : null}
              {summary.tierCounts['needs-work'] > 0 ? <span className="text-amber-700 dark:text-amber-400"><span className="font-semibold">{summary.tierCounts['needs-work']}</span> needs work</span> : null}
              {summary.tierCounts['not-ready'] > 0 ? <span className="text-red-700 dark:text-red-400"><span className="font-semibold">{summary.tierCounts['not-ready']}</span> not ready</span> : null}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Search */}
      <div className="relative">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search repos…"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
        />
        {searchResults.length > 0 ? (
          <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
            {searchResults.map((repo) => {
              const status = getRepoStatus(repo)
              const isHosted = status && CNCF_HOSTED_STATUSES.has(status)
              return (
                <li key={repo.repo}>
                  <button
                    type="button"
                    disabled={!!isHosted}
                    onClick={() => {
                      handleSearchSelect(repo)
                      setSearchQuery('')
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                      isHosted
                        ? 'cursor-not-allowed text-slate-400 dark:text-slate-600'
                        : 'text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="truncate">{repo.repo}</span>
                    {status ? <span className="ml-2 shrink-0"><LandscapePill status={status} /></span> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>

      {/* Auth gate */}
      {!token ? (
        <div className="rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800 dark:border-sky-700/50 dark:bg-sky-900/20 dark:text-sky-200">
          Sign in with GitHub to fetch criteria data and run the candidacy scan.
        </div>
      ) : null}

      {/* Fetch status bar */}
      {fetchStatus === 'fetching' ? (
        <div className="flex items-center gap-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 dark:border-sky-700/50 dark:bg-sky-900/20">
          <span className="text-sm text-sky-800 dark:text-sky-200">
            Fetching repos… {fetchTimer}s
          </span>
          <button
            type="button"
            onClick={handleStop}
            aria-label="Stop"
            title="Stop"
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-600 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-slate-700"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
              <rect x="3.5" y="3.5" width="9" height="9" rx="1" />
            </svg>
          </button>
        </div>
      ) : null}

      {/* All-batch-CNCF-member message */}
      {allBatchAreCncfHosted ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          All repos in this batch are existing CNCF projects. Use &ldquo;Show next 25&rdquo; or search to find candidacy targets.
        </div>
      ) : null}

      {/* Active filter indicator */}
      {activeStatusFilter ? (
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span>Showing only:</span>
          <LandscapePill status={activeStatusFilter} active />
          <button
            type="button"
            onClick={() => setActiveStatusFilter(null)}
            className="rounded px-1.5 py-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="Clear filter"
          >
            ✕ Clear
          </button>
        </div>
      ) : null}

      {/* Results table */}
      {rankedResults.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="pb-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Repo</th>
                <th className="pb-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">
                  Sandbox criteria
                  <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">/ 9</span>
                </th>
                <th className="pb-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">
                  Context signals
                  <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">/ 9</span>
                </th>
                <th className="pb-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Top gaps</th>
                <th className="pb-2 font-semibold text-slate-600 dark:text-slate-300">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredResults.map(({ repo, rowState }) => {
                const status = getRepoStatus(repo)
                const isHosted = status && CNCF_HOSTED_STATUSES.has(status)
                const isChecked = selected.has(repo.repo)

                if (isHosted) {
                  return (
                    <tr key={repo.repo} className="opacity-50">
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 dark:text-slate-400">{repo.name}</span>
                          {status ? <LandscapePill status={status} onClick={() => setActiveStatusFilter(activeStatusFilter === status ? null : status)} active={activeStatusFilter === status} /> : null}
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-slate-400">—</td>
                      <td className="py-2 pr-4 text-slate-400">—</td>
                      <td className="py-2 pr-4 text-slate-400">—</td>
                      <td className="py-2 text-slate-400">—</td>
                    </tr>
                  )
                }

                if (rowState.status === 'loading') {
                  return (
                    <tr key={repo.repo}>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelect(repo.repo)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <span className="text-slate-700 dark:text-slate-300">{repo.name}</span>
                          {status ? <LandscapePill status={status} onClick={() => setActiveStatusFilter(activeStatusFilter === status ? null : status)} active={activeStatusFilter === status} /> : null}
                        </div>
                      </td>
                      <td colSpan={4} className="py-2">
                        <div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                      </td>
                    </tr>
                  )
                }

                if (rowState.status === 'error') {
                  return (
                    <tr key={repo.repo}>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelect(repo.repo)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <span className="text-slate-700 dark:text-slate-300">{repo.name}</span>
                        </div>
                      </td>
                      <td colSpan={4} className="py-2 text-xs text-rose-600 dark:text-rose-400">
                        Error: {rowState.error}
                      </td>
                    </tr>
                  )
                }

                const { result } = rowState
                const tierBadge = TIER_BADGES[result.tier]

                return (
                  <tr key={repo.repo}>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(repo.repo)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {repo.name}
                        </span>
                        {status ? <LandscapePill status={status} onClick={() => setActiveStatusFilter(activeStatusFilter === status ? null : status)} active={activeStatusFilter === status} /> : null}
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {result.track1Score}
                        </span>
                        {tierBadge ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tierBadge.className}`}>
                            {tierBadge.label}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">
                      {result.track2Score}
                    </td>
                    <td className="py-2 pr-4">
                      {result.topGaps.length > 0 ? (
                        <ul className="space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                          {result.topGaps.map((gap) => (
                            <li key={gap.catalogId}>
                              <span className="font-mono text-slate-500">{gap.catalogId}</span>{' '}
                              {gap.title}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">No gaps</span>
                      )}
                    </td>
                    <td className="py-2">
                      <a
                        href={`/?repos=${encodeURIComponent(result.repo)}&foundationTarget=cncf-sandbox`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-sky-600 underline hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-200"
                      >
                        View full report
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* CNCF-hosted repos (always shown, greyed out) */}
      {cncfHosted.length > 0 && rankedResults.length > 0 ? (
        <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            Existing CNCF projects ({cncfHosted.length})
          </p>
          <ul className="flex flex-wrap gap-2">
            {cncfHosted.map((repo) => {
              const status = getRepoStatus(repo)
              return (
                <li key={repo.repo} className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 opacity-60 dark:border-slate-700 dark:bg-slate-800">
                  <span className="text-xs text-slate-600 dark:text-slate-300">{repo.name}</span>
                  {status ? <LandscapePill status={status} onClick={() => setActiveStatusFilter(activeStatusFilter === status ? null : status)} active={activeStatusFilter === status} /> : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {/* Show next 25 */}
      {hasMoreRepos && fetchStatus !== 'fetching' ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleShowNext}
            disabled={!token}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Show next 25
          </button>
        </div>
      ) : null}
    </section>
  )
}
