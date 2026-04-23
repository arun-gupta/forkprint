'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { OrgRepoSummary } from '@/lib/analyzer/org-inventory'
import type { CandidacyRepoResult, LandscapeProjectStatus } from '@/lib/cncf-sandbox/types'
import type { RateLimitState } from '@/lib/analyzer/analysis-result'
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

const HEALTH_CHECK_CRITERIA = [
  'Approved open-source license (Apache-2.0, MIT, etc.)',
  'CONTRIBUTING guide',
  'Code of conduct',
  'MAINTAINERS file',
  'SECURITY policy',
  'Roadmap file or README section',
  'Project website / homepage',
  'Adopters list',
  'Listed in CNCF Landscape',
]

const MATURITY_SIGNAL_CRITERIA = [
  'Has a project description',
  'Roadmap file present',
  'Implements a spec or standard',
  'Integrates with CNCF projects (Kubernetes, Prometheus, etc.)',
  'In an active CNCF landscape category',
  'Has similar projects in the landscape',
  'Mentions TAG review or SIG engagement',
  'Business/product separation (manual check)',
  'LFX Insights enrolled (manual check)',
]

function CriteriaTooltip({ criteria }: { criteria: string[] }) {
  return (
    <span className="group relative ml-1 inline-block align-middle">
      <span className="cursor-default select-none text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
        ⓘ
      </span>
      <span className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-64 rounded-md border border-slate-200 bg-white p-2 shadow-lg group-hover:block dark:border-slate-700 dark:bg-slate-800">
        <ul className="space-y-1">
          {criteria.map((c, i) => (
            <li key={i} className="flex gap-1.5 text-xs text-slate-700 dark:text-slate-300">
              <span className="shrink-0 font-mono text-slate-400">{i + 1}.</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </span>
    </span>
  )
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
  const [activeTierFilter, setActiveTierFilter] = useState<string | null>(null)
  const [scanStarted, setScanStarted] = useState(false)
  const [concurrency, setConcurrency] = useState(5)
  const [repoLimit, setRepoLimit] = useState(25)
  const [rateLimit, setRateLimit] = useState<{ remaining: number; limit: number; resetAt: string | null } | null>(null)
  const [pausedByRateLimit, setPausedByRateLimit] = useState(false)
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

  // Map lowercase repo name → display label for CNCF landscape entries NOT in this org.
  // Handles both repo URLs (github.com/owner/repo) and org-level URLs (github.com/tensorflow).
  const landscapeNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const url of Object.keys(landscapeStatuses)) {
      const path = url.replace('https://github.com/', '')
      const slash = path.indexOf('/')
      if (slash === -1) {
        // Org-level URL: https://github.com/tensorflow
        const orgName = path.toLowerCase()
        if (orgName && orgName !== org.toLowerCase()) {
          map[orgName] = `${orgName} (CNCF landscape org)`
        }
      } else {
        const owner = path.slice(0, slash).toLowerCase()
        const repoName = path.slice(slash + 1).toLowerCase()
        if (owner && repoName && owner !== org.toLowerCase()) {
          map[repoName] = `${owner}/${repoName}`
        }
      }
    }
    return map
  }, [landscapeStatuses, org])

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
          rateLimit?: RateLimitState | null
        }
        if (data.rateLimit &&
          typeof data.rateLimit.remaining === 'number' &&
          typeof data.rateLimit.limit === 'number') {
          const rl = data.rateLimit as { remaining: number; limit: number; resetAt?: string | null }
          setRateLimit((prev) =>
            prev === null || rl.remaining < prev.remaining
              ? { remaining: rl.remaining, limit: rl.limit, resetAt: rl.resetAt ?? null }
              : prev,
          )
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

      await withConcurrency(batch, concurrency, (repo) =>
        fetchRepo(repo, controller.signal),
      )

      // Only mark done if not aborted
      if (!controller.signal.aborted) {
        setFetchStatus('done')
      }
      stopTimer()
    },
    [token, concurrency, fetchRepo, startTimer, stopTimer],
  )

  // Load repos up to repoLimit once scan is started, landscape is ready, and token available
  useEffect(() => {
    if (!scanStarted || landscapeLoading || !token || selectable.length === 0 || batchOffset > 0) return
    const limit = Math.min(repoLimit, selectable.length)
    const initialBatch = selectable.slice(0, limit)
    const newSelected = new Set(initialBatch.map((r) => r.repo))
    setSelected(newSelected)
    setBatchOffset(limit)
    fetchBatch(initialBatch)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanStarted, landscapeLoading, token, selectable.length])

  const stopAndClearLoading = useCallback((byRateLimit = false) => {
    abortRef.current?.abort()
    setFetchStatus('done')
    stopTimer()
    if (byRateLimit) setPausedByRateLimit(true)
    setRepoStates((prev) => {
      const next = new Map(prev)
      for (const [key, val] of next.entries()) {
        if (val.status === 'loading') next.delete(key)
      }
      return next
    })
  }, [stopTimer])

  const handleStop = useCallback(() => stopAndClearLoading(false), [stopAndClearLoading])

  // Auto-stop when rate limit drops below 10%
  useEffect(() => {
    if (!rateLimit || fetchStatus !== 'fetching') return
    const pct = Math.floor((rateLimit.remaining / rateLimit.limit) * 100)
    if (pct <= 10) stopAndClearLoading(true)
  }, [rateLimit, fetchStatus, stopAndClearLoading])

  const handleResumeAnyway = useCallback(() => {
    if (!token) return
    setPausedByRateLimit(false)
    // Refetch any selected repos that have no result yet (were in-flight when we paused)
    const pending = loadedSelectable.filter((r) => selected.has(r.repo) && !repoStates.has(r.repo))
    if (pending.length > 0) fetchBatch(pending)
  }, [token, loadedSelectable, selected, repoStates, fetchBatch])

  const handleShowNext = useCallback(() => {
    if (!token) return
    const nextBatch = selectable.slice(batchOffset, batchOffset + repoLimit)
    if (nextBatch.length === 0) return
    const newSelected = new Set([...selected, ...nextBatch.map((r) => r.repo)])
    setSelected(newSelected)
    setBatchOffset((prev) => prev + repoLimit)
    fetchBatch(nextBatch)
  }, [token, selectable, batchOffset, repoLimit, selected, fetchBatch])

  const handleLoadAll = useCallback(() => {
    if (!token) return
    const remaining = selectable.slice(batchOffset)
    if (remaining.length === 0) return
    const newSelected = new Set([...selected, ...remaining.map((r) => r.repo)])
    setSelected(newSelected)
    setBatchOffset(selectable.length)
    fetchBatch(remaining)
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

  // Dropdown: repos from the full org list that match the query but aren't yet in the scan
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    // Exclude repos already selected or with any fetched state
    const inScanSlugs = new Set([...Array.from(selected), ...Array.from(repoStates.keys())])
    return repos
      .filter(
        (r) =>
          !inScanSlugs.has(r.repo) &&
          (r.name.toLowerCase().includes(q) || r.repo.toLowerCase().includes(q)),
      )
      .slice(0, 10)
  }, [repos, searchQuery, selected, repoStates])

  // Check if all repos in the current batch are CNCF members
  const allBatchAreCncfHosted = useMemo(() => {
    if (loadedSelectable.length === 0) return false
    return loadedSelectable.every((r) => {
      const status = getRepoStatus(r)
      return status && CNCF_HOSTED_STATUSES.has(status)
    })
  }, [loadedSelectable, getRepoStatus])

  // Group priority: Graduated → Incubating → Sandbox → Landscape → other (by candidacy score)
  const groupPriority = useCallback((repo: OrgRepoSummary, rowState: RepoRowState | null): number => {
    const status = getRepoStatus(repo)
    if (rowState === null) {
      if (status === 'graduated') return 0
      if (status === 'incubating') return 1
      if (status === 'sandbox') return 2
    }
    if (status === 'landscape') return 3
    return 4
  }, [getRepoStatus])

  const rankedResults = useMemo(() => {
    const all: Array<{ repo: OrgRepoSummary; rowState: RepoRowState | null }> = []

    for (const repo of loadedSelectable) {
      const rowState = repoStates.get(repo.repo)
      if (rowState) all.push({ repo, rowState })
      else if (selected.has(repo.repo)) all.push({ repo, rowState: { status: 'loading' } })
    }
    for (const repo of cncfHosted) {
      all.push({ repo, rowState: null })
    }

    all.sort((a, b) => {
      const aPriority = groupPriority(a.repo, a.rowState)
      const bPriority = groupPriority(b.repo, b.rowState)
      if (aPriority !== bPriority) return aPriority - bPriority
      // Within group: score desc, then stars
      const aScore = a.rowState?.status === 'loaded' ? a.rowState.result.track1Score : -1
      const bScore = b.rowState?.status === 'loaded' ? b.rowState.result.track1Score : -1
      if (bScore !== aScore) return bScore - aScore
      const aStars = typeof a.repo.stars === 'number' ? a.repo.stars : 0
      const bStars = typeof b.repo.stars === 'number' ? b.repo.stars : 0
      return bStars - aStars
    })

    return all
  }, [loadedSelectable, repoStates, selected, cncfHosted, groupPriority])

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
      if (rowState?.status === 'loaded') tierCounts[rowState.result.tier]++
    }
    const completedCount = rankedResults.filter(r => r.rowState?.status === 'loaded' || r.rowState?.status === 'error').length
    return { statusCounts, tierCounts, loadedCount: rankedResults.filter(r => r.rowState?.status === 'loaded').length, completedCount }
  }, [repos, rankedResults, getRepoStatus])

  const filteredResults = useMemo(() => {
    let results = rankedResults.map((r, i) => ({ ...r, rank: i + 1 }))
    if (activeStatusFilter) results = results.filter(({ repo }) => getRepoStatus(repo) === activeStatusFilter)
    if (activeTierFilter) results = results.filter(({ rowState }) => rowState?.status === 'loaded' && rowState.result.tier === activeTierFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      results = results.filter(({ repo }) => repo.name.toLowerCase().includes(q) || repo.repo.toLowerCase().includes(q))
    }
    return results
  }, [rankedResults, activeStatusFilter, activeTierFilter, getRepoStatus, searchQuery])

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

  if (!scanStarted) {
    const maxRepos = selectable.length
    const effectiveLimit = Math.min(repoLimit, maxRepos)
    const estimatedSeconds = Math.ceil(effectiveLimit / concurrency)
    const estimateLabel = estimatedSeconds < 60
      ? `~${estimatedSeconds}s`
      : `~${Math.ceil(estimatedSeconds / 60)}m`

    return (
      <section aria-label="CNCF Candidacy Scan" className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">CNCF Sandbox Candidacy Scan</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ranks repos in <span className="font-mono">{org}</span> by CNCF Sandbox readiness — health checks, maturity signals, and top gaps.
        </p>

        <div className="mt-5 space-y-5">
          {/* Repos slider */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Repos to scan</p>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{effectiveLimit} <span className="font-normal text-slate-400">of {maxRepos}</span></span>
            </div>
            <input
              type="range"
              min={Math.min(10, maxRepos)}
              max={maxRepos}
              step={maxRepos > 200 ? 10 : maxRepos > 50 ? 5 : 1}
              value={effectiveLimit}
              onChange={(e) => setRepoLimit(Number(e.target.value))}
              className="w-full accent-sky-500"
            />
            <div className="mt-0.5 flex justify-between text-[10px] text-slate-400">
              <span>{Math.min(10, maxRepos)}</span>
              <span>{maxRepos}</span>
            </div>
          </div>

          {/* Concurrency slider */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Concurrency — repos fetched in parallel</p>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{concurrency}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={concurrency}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              className="w-full accent-sky-500"
            />
            <div className="mt-0.5 flex justify-between text-[10px] text-slate-400">
              <span>1</span>
              <span>10{concurrency >= 8 ? <span className="ml-1 text-amber-500"> ⚠ may hit rate limits</span> : ''}</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            Estimated time: <span className="font-medium text-slate-600 dark:text-slate-300">{estimateLabel}</span>
            {' '}for {effectiveLimit} repos at concurrency {concurrency}
          </p>

          <button
            type="button"
            onClick={() => setScanStarted(true)}
            disabled={!token}
            title={!token ? 'Sign in with GitHub to run the scan' : undefined}
            className="rounded-md border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-800 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-700/50 dark:bg-sky-900/20 dark:text-sky-200 dark:hover:bg-sky-900/40"
          >
            Run CNCF Candidacy Scan
          </button>
          {!token ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">Sign in with GitHub to enable.</p>
          ) : null}
        </div>
      </section>
    )
  }

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
          {batchOffset > 0 ? (
            <div className="mt-1">
              {fetchStatus === 'fetching' ? (
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    <span className="font-medium text-slate-600 dark:text-slate-300">{summary.completedCount}</span>
                    {' / '}{batchOffset} scanned
                    {selectable.length > batchOffset ? ` · ${selectable.length - batchOffset} more available` : ''}
                  </p>
                  <div className="h-1.5 w-48 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-sky-500 transition-all duration-300"
                      style={{ width: `${Math.round((summary.completedCount / batchOffset) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {batchOffset} of {selectable.length} repos scanned
                  {(activeStatusFilter || activeTierFilter || searchQuery.trim()) ? ` · ${filteredResults.length} shown` : ''}
                </p>
              )}
            </div>
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
          {summary.tierCounts.strong > 0 ? (
            <button
              type="button"
              onClick={() => setActiveTierFilter(activeTierFilter === 'strong' ? null : 'strong')}
              aria-pressed={activeTierFilter === 'strong'}
              className={`flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 transition-shadow hover:ring-2 hover:ring-emerald-400 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300${activeTierFilter === 'strong' ? ' ring-2 ring-emerald-400' : ''}`}
            >
              <span className="font-semibold">{summary.tierCounts.strong}</span>
              <span>strong</span>
            </button>
          ) : null}
          {summary.tierCounts['needs-work'] > 0 ? (
            <button
              type="button"
              onClick={() => setActiveTierFilter(activeTierFilter === 'needs-work' ? null : 'needs-work')}
              aria-pressed={activeTierFilter === 'needs-work'}
              className={`flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 transition-shadow hover:ring-2 hover:ring-amber-400 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300${activeTierFilter === 'needs-work' ? ' ring-2 ring-amber-400' : ''}`}
            >
              <span className="font-semibold">{summary.tierCounts['needs-work']}</span>
              <span>needs work</span>
            </button>
          ) : null}
          {summary.tierCounts['not-ready'] > 0 ? (
            <button
              type="button"
              onClick={() => setActiveTierFilter(activeTierFilter === 'not-ready' ? null : 'not-ready')}
              aria-pressed={activeTierFilter === 'not-ready'}
              className={`flex items-center gap-1.5 rounded-full border border-red-300 bg-red-100 px-3 py-1 text-xs font-medium text-red-800 transition-shadow hover:ring-2 hover:ring-red-400 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300${activeTierFilter === 'not-ready' ? ' ring-2 ring-red-400' : ''}`}
            >
              <span className="font-semibold">{summary.tierCounts['not-ready']}</span>
              <span>not ready</span>
            </button>
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

      {/* Rate limit banner */}
      {rateLimit && scanStarted ? (() => {
        const pct = Math.floor((rateLimit.remaining / rateLimit.limit) * 100)
        if (pct > 50 && !pausedByRateLimit) return null
        const resetTime = rateLimit.resetAt
          ? new Date(rateLimit.resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : null
        const bgClass = pct <= 10
          ? 'border-red-300 bg-red-50 dark:border-red-700/50 dark:bg-red-900/20'
          : pct <= 30
            ? 'border-orange-300 bg-orange-50 dark:border-orange-700/50 dark:bg-orange-900/20'
            : 'border-amber-200 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-900/20'
        const textClass = pct <= 10
          ? 'text-red-800 dark:text-red-200'
          : pct <= 30
            ? 'text-orange-800 dark:text-orange-200'
            : 'text-amber-800 dark:text-amber-200'
        return (
          <div className={`flex items-center gap-3 rounded-md border px-3 py-2 ${bgClass}`}>
            {pct <= 10 ? (
              <span className={`text-3xl font-bold tabular-nums ${textClass}`}>{pct}</span>
            ) : null}
            <div className="flex-1">
              <span className={`text-sm font-medium ${textClass}`}>
                {pausedByRateLimit
                  ? `Scan paused — rate limit at ${pct}% (${rateLimit.remaining.toLocaleString()} points left)`
                  : pct <= 10
                    ? `% rate limit remaining — scan auto-stopped`
                    : `Rate limit at ${pct}% — ${rateLimit.remaining.toLocaleString()} of ${rateLimit.limit.toLocaleString()} points remaining`}
              </span>
              {resetTime ? (
                <p className={`text-xs ${textClass} opacity-80`}>
                  Resets at {resetTime}
                </p>
              ) : null}
            </div>
            {pausedByRateLimit ? (
              <button
                type="button"
                onClick={handleResumeAnyway}
                className={`rounded border px-3 py-1 text-xs font-medium border-current bg-white/60 hover:bg-white/90 dark:bg-slate-800/60 ${textClass}`}
              >
                Resume anyway
              </button>
            ) : fetchStatus === 'fetching' ? (
              <button
                type="button"
                onClick={handleStop}
                className={`rounded border px-3 py-1 text-xs font-medium ${pct <= 10 ? 'border-red-400 bg-red-100 text-red-800 hover:bg-red-200 dark:border-red-600 dark:bg-red-900/40 dark:text-red-200' : 'border-current bg-white/60 hover:bg-white/90 dark:bg-slate-800/60'} ${textClass}`}
              >
                Stop scan
              </button>
            ) : null}
          </div>
        )
      })() : null}

      {/* All-batch-CNCF-member message */}
      {allBatchAreCncfHosted ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          All repos in this batch are existing CNCF projects. Use &ldquo;Show next 25&rdquo; or search to find candidacy targets.
        </div>
      ) : null}

      {/* Active filter indicator */}
      {activeStatusFilter || activeTierFilter ? (
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span>Showing only:</span>
          {activeStatusFilter ? <LandscapePill status={activeStatusFilter} active /> : null}
          {activeTierFilter ? (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIER_BADGES[activeTierFilter]?.className ?? ''}`}>
              {TIER_BADGES[activeTierFilter]?.label ?? activeTierFilter}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => { setActiveStatusFilter(null); setActiveTierFilter(null) }}
            className="rounded px-1.5 py-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="Clear filter"
          >
            ✕ Clear
          </button>
        </div>
      ) : null}

      {/* Load more — top */}
      {hasMoreRepos && fetchStatus !== 'fetching' ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleShowNext}
            disabled={!token}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Load {Math.min(repoLimit, selectable.length - batchOffset)} more{' '}
            <span className="text-slate-400 dark:text-slate-500">
              ({batchOffset + 1}–{Math.min(batchOffset + repoLimit, selectable.length)} of {selectable.length})
            </span>
          </button>
          <button
            type="button"
            onClick={handleLoadAll}
            disabled={!token}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Load all remaining{' '}
            <span className="text-slate-400 dark:text-slate-500">({selectable.length - batchOffset})</span>
          </button>
        </div>
      ) : null}

      {/* Results table */}
      {rankedResults.length > 0 ? (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Sorted by: CNCF status (Graduated → Incubating → Sandbox → Landscape → other) · health check score ↓ · stars ↓
        </p>
      ) : null}

      {rankedResults.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="pb-2 pr-3 font-semibold text-slate-400 dark:text-slate-500">#</th>
                <th className="pb-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Repo</th>
                <th className="pb-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">
                  Health checks
                  <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">/ 9</span>
                  <CriteriaTooltip criteria={HEALTH_CHECK_CRITERIA} />
                </th>
                <th className="pb-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">
                  Maturity signals
                  <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">/ 9</span>
                  <CriteriaTooltip criteria={MATURITY_SIGNAL_CRITERIA} />
                </th>
                <th className="pb-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Top gaps</th>
                <th className="pb-2 font-semibold text-slate-600 dark:text-slate-300">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    {activeStatusFilter && CNCF_HOSTED_STATUSES.has(activeStatusFilter)
                      ? `These repos are already CNCF projects — they're excluded from candidacy scoring.`
                      : activeTierFilter
                      ? 'No repos match this filter yet.'
                      : 'No results yet.'}
                  </td>
                </tr>
              ) : null}
              {filteredResults.map(({ repo, rowState, rank }) => {
                const status = getRepoStatus(repo)
                const isChecked = selected.has(repo.repo)
                const rowNum = rank

                if (rowState === null) {
                  return (
                    <tr key={repo.repo} className="opacity-60">
                      <td className="py-2 pr-3 text-xs text-slate-400 dark:text-slate-600">{rowNum}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <a href={repo.url} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline dark:text-sky-400">{repo.name}</a>
                          {status ? <LandscapePill status={status} /> : null}
                        </div>
                      </td>
                      <td colSpan={3} className="py-2 pr-4 text-xs italic text-slate-400 dark:text-slate-500">
                        Already a CNCF project — excluded from candidacy scoring
                      </td>
                      <td className="py-2">
                        <span
                          title="Already a CNCF project — no candidacy report available"
                          className="cursor-not-allowed text-xs text-slate-300 dark:text-slate-600"
                        >
                          View full report
                        </span>
                      </td>
                    </tr>
                  )
                }

                if (rowState.status === 'loading') {
                  return (
                    <tr key={repo.repo}>
                      <td className="py-2 pr-3 text-xs text-slate-400 dark:text-slate-600">{rowNum}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelect(repo.repo)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <a href={repo.url} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline dark:text-sky-400">{repo.name}</a>
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
                      <td className="py-2 pr-3 text-xs text-slate-400 dark:text-slate-600">{rowNum}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelect(repo.repo)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <a href={repo.url} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline dark:text-sky-400">{repo.name}</a>
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
                    <td className="py-2 pr-3 text-xs text-slate-400 dark:text-slate-600">{rowNum}</td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(repo.repo)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <div>
                          <a href={repo.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sky-600 hover:underline dark:text-sky-400">
                            {repo.name}
                          </a>
                          {repo.isFork && repo.parentRepo ? (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400">
                              ⚠ fork of {repo.parentRepo}
                            </p>
                          ) : repo.isFork ? (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400">⚠ fork</p>
                          ) : null}
                          {(() => {
                            const collision = landscapeNameMap[repo.name.toLowerCase()]
                            return collision ? (
                              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                                ⚠ name matches {collision} in CNCF landscape
                              </p>
                            ) : null
                          })()}
                          {repo.archived ? (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">archived</p>
                          ) : null}
                        </div>
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
                        href={`/?repos=${encodeURIComponent(result.repo)}&foundationTarget=cncf-sandbox&tab=cncf-readiness`}
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

      {/* Load more — bottom */}
      {hasMoreRepos && fetchStatus !== 'fetching' ? (
        <div className="flex justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleShowNext}
            disabled={!token}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Load {Math.min(repoLimit, selectable.length - batchOffset)} more{' '}
            <span className="text-slate-400 dark:text-slate-500">
              ({batchOffset + 1}–{Math.min(batchOffset + repoLimit, selectable.length)} of {selectable.length})
            </span>
          </button>
          <button
            type="button"
            onClick={handleLoadAll}
            disabled={!token}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Load all remaining{' '}
            <span className="text-slate-400 dark:text-slate-500">({selectable.length - batchOffset})</span>
          </button>
        </div>
      ) : null}
    </section>
  )
}
