'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { ORG_AGGREGATION_CONFIG, clampConcurrency } from '@/lib/config/org-aggregation'
import type { DispatchResult, QueueDispatcher } from '@/lib/org-aggregation/queue'
import { OrgAggregationQueue } from '@/lib/org-aggregation/queue'
import { selectFlagshipRepos, type PinnedRepoApiEntry } from '@/lib/org-aggregation/flagship'
import { classifyRateLimitResponse } from '@/lib/org-aggregation/rate-limit'
import { buildOrgSummaryViewModel } from '@/lib/org-aggregation/view-model'
import type {
  OrgAggregationRun,
  OrgSummaryViewModel,
  QueueEvent,
  RepoRunState,
  UpdateCadence,
} from '@/lib/org-aggregation/types'

export interface UseOrgAggregationOptions {
  /** Injected dispatcher for tests; defaults to POST /api/analyze. */
  dispatch?: QueueDispatcher
  /** Injected pinned-repos fetch for tests; defaults to GET /api/org/pinned. */
  fetchPinned?: (org: string) => Promise<PinnedRepoApiEntry[]>
  /** Injected star lookup for fallback-most-stars. */
  starsForRepo?: (repo: string) => number | 'unavailable'
  /** Override config cadence. */
  updateCadence?: UpdateCadence
}

export interface StartRunInput {
  org: string
  repos: string[]
  concurrency?: number
  notificationOptIn?: boolean
}

export interface UseOrgAggregationReturn {
  run: OrgAggregationRun | null
  view: OrgSummaryViewModel | null
  start: (input: StartRunInput) => Promise<void>
  cancel: () => void
  pause: () => void
  resume: () => void
  retry: (repo: string) => Promise<void>
  reset: () => void
}

async function defaultDispatch(repo: string): Promise<DispatchResult> {
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ repos: [repo] }),
    })
    const classification = classifyRateLimitResponse(res)
    if (classification.kind !== 'none') {
      return { kind: 'rate-limited', classification }
    }
    if (!res.ok) {
      if (res.status === 404) {
        return { kind: 'error', error: { reason: 'not found', kind: 'not-found' } }
      }
      if (res.status === 403) {
        return { kind: 'error', error: { reason: 'insufficient scope', kind: 'scope' } }
      }
      if (res.status >= 500) {
        return { kind: 'error', error: { reason: `upstream ${res.status}`, kind: 'transient' } }
      }
      return { kind: 'error', error: { reason: `http ${res.status}`, kind: 'other' } }
    }
    const body = (await res.json()) as { results?: AnalysisResult[] }
    const first = body.results?.[0]
    if (!first) {
      return { kind: 'error', error: { reason: 'empty result', kind: 'other' } }
    }
    return { kind: 'ok', result: first }
  } catch (err) {
    return {
      kind: 'error',
      error: {
        reason: err instanceof Error ? err.message : String(err),
        kind: 'transient',
      },
    }
  }
}

async function defaultFetchPinned(org: string): Promise<PinnedRepoApiEntry[]> {
  const res = await fetch(`/api/org/pinned?org=${encodeURIComponent(org)}`)
  if (!res.ok) return []
  const body = (await res.json()) as { pinned?: PinnedRepoApiEntry[] }
  return body.pinned ?? []
}

type RunAction =
  | { type: 'init'; run: OrgAggregationRun }
  | { type: 'reset' }
  | { type: 'apply'; mutate: (r: OrgAggregationRun) => OrgAggregationRun }

function runReducer(state: OrgAggregationRun | null, action: RunAction): OrgAggregationRun | null {
  if (action.type === 'reset') return null
  if (action.type === 'init') return action.run
  if (!state) return state
  return action.mutate(state)
}

function mutateRepoState(run: OrgAggregationRun, repo: string, update: Partial<RepoRunState>): OrgAggregationRun {
  const next = new Map(run.perRepo)
  const prev = next.get(repo) ?? { repo, status: 'queued' as const }
  next.set(repo, { ...prev, ...update })
  return { ...run, perRepo: next }
}

export function useOrgAggregation(options: UseOrgAggregationOptions = {}): UseOrgAggregationReturn {
  const dispatch = options.dispatch ?? defaultDispatch
  const fetchPinned = options.fetchPinned ?? defaultFetchPinned
  const starsForRepo = options.starsForRepo ?? (() => 'unavailable' as const)
  const cadence = options.updateCadence ?? ORG_AGGREGATION_CONFIG.updateCadenceDefault

  const [run, dispatchReducer] = useReducer(runReducer, null)
  const queueRef = useRef<OrgAggregationQueue | null>(null)
  const completedSinceRerenderRef = useRef(0)
  const completedCountRef = useRef(0)
  const totalReposRef = useRef(0)
  const lastTickBucketRef = useRef(-1)
  const [now, setNow] = useState<number>(() => Date.now())

  // Wall-clock tick so elapsed/remaining keep updating between completions (FR-017d).
  useEffect(() => {
    if (!run || run.status !== 'in-progress') return
    const id = setInterval(() => setNow(Date.now()), ORG_AGGREGATION_CONFIG.wallClockTickIntervalMs)
    return () => clearInterval(id)
  }, [run?.status, run])

  const maybeFireCompletionNotification = useCallback(() => {
    dispatchReducer({
      type: 'apply',
      mutate: (r) => {
        if (!r.notificationOptIn) return r
        if (typeof window === 'undefined' || !('Notification' in window)) return r
        if (Notification.permission !== 'granted') return r
        const done = Array.from(r.perRepo.values()).filter((s) => s.status === 'done').length
        const total = r.repos.length
        try {
          new Notification('RepoPulse — org analysis complete', {
            body: `${done} of ${total} repos succeeded for ${r.org}`,
          })
        } catch {
          // Notifications can throw in service-worker-only contexts; ignore.
        }
        return r
      },
    })
  }, [])

  const applyEvent = useCallback(
    (event: QueueEvent) => {
      dispatchReducer({
        type: 'apply',
        mutate: (r) => {
          switch (event.type) {
            case 'started':
              return mutateRepoState(r, event.repo, { status: 'in-progress', startedAt: event.startedAt })
            case 'done':
              return mutateRepoState(r, event.repo, {
                status: 'done',
                result: event.result,
                finishedAt: event.finishedAt,
                error: undefined,
              })
            case 'failed':
              return mutateRepoState(r, event.repo, {
                status: 'failed',
                error: event.error,
                finishedAt: event.finishedAt,
              })
            case 'queued':
              return mutateRepoState(r, event.repo, { status: 'queued', error: undefined })
            case 'paused':
              return { ...r, status: 'paused', pauseHistory: [...r.pauseHistory, event.pause] }
            case 'resumed':
              return {
                ...r,
                status: 'in-progress',
                effectiveConcurrency: event.effectiveConcurrency,
              }
            case 'cancelled':
              return { ...r, status: 'cancelled' }
            case 'complete':
              return { ...r, status: 'complete' }
          }
        },
      })

      // Configurable re-aggregation cadence (FR-016a). Per-repo status list
      // updates live regardless — that's implicit since each event triggers a
      // reducer update.
      if (event.type === 'done' || event.type === 'failed') {
        completedSinceRerenderRef.current++
        completedCountRef.current++
        if (cadence.kind === 'per-completion') {
          setNow(Date.now())
        } else if (cadence.kind === 'every-n-completions') {
          if (completedSinceRerenderRef.current >= cadence.n) {
            completedSinceRerenderRef.current = 0
            setNow(Date.now())
          }
        } else if (cadence.kind === 'every-n-percent' && totalReposRef.current > 0) {
          const percentComplete = (completedCountRef.current / totalReposRef.current) * 100
          const bucket = Math.floor(percentComplete / cadence.percentStep)
          if (bucket > lastTickBucketRef.current) {
            lastTickBucketRef.current = bucket
            setNow(Date.now())
          }
        }
        // 'on-completion-only' deliberately omits mid-run ticks.
      }
      if (event.type === 'complete' || event.type === 'cancelled') {
        setNow(Date.now())
      }

      // Completion notification (FR-018) — fire exactly once on terminal.
      if (event.type === 'complete' || event.type === 'cancelled') {
        maybeFireCompletionNotification()
      }
    },
    [cadence, maybeFireCompletionNotification],
  )

  const start = useCallback(
    async (input: StartRunInput) => {
      const concurrency = clampConcurrency(input.concurrency ?? ORG_AGGREGATION_CONFIG.concurrency.default)
      // Reset cadence gate counters for this run.
      completedSinceRerenderRef.current = 0
      completedCountRef.current = 0
      totalReposRef.current = input.repos.length
      lastTickBucketRef.current = -1

      const pinned = await fetchPinned(input.org).catch(() => [])
      const starsMap = new Map<string, number | 'unavailable'>()
      for (const repo of input.repos) starsMap.set(repo, starsForRepo(repo))
      const flagshipRepos = selectFlagshipRepos(pinned, input.repos, starsMap)

      const initial: OrgAggregationRun = {
        org: input.org,
        repos: input.repos,
        concurrency,
        effectiveConcurrency: concurrency,
        updateCadence: cadence,
        startedAt: new Date(),
        status: 'in-progress',
        perRepo: new Map(input.repos.map((r) => [r, { repo: r, status: 'queued' as const }])),
        pauseHistory: [],
        notificationOptIn: input.notificationOptIn ?? false,
        flagshipRepos,
      }

      if (initial.notificationOptIn && typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          try {
            await Notification.requestPermission()
          } catch {
            // Ignore; toggle state will reflect denial next render.
          }
        }
      }

      dispatchReducer({ type: 'init', run: initial })

      const queue = new OrgAggregationQueue({
        repos: input.repos,
        concurrency,
        dispatch,
        onEvent: applyEvent,
      })
      queueRef.current = queue
      await queue.run()
    },
    [applyEvent, cadence, dispatch, fetchPinned, starsForRepo],
  )

  const cancel = useCallback(() => {
    queueRef.current?.cancel()
  }, [])

  const pause = useCallback(() => {
    queueRef.current?.pause()
  }, [])

  const resume = useCallback(() => {
    queueRef.current?.resume()
  }, [])

  const retry = useCallback(async (repo: string) => {
    await queueRef.current?.retry(repo)
  }, [])

  const view = useMemo(() => {
    if (!run) return null
    return buildOrgSummaryViewModel(run, now)
  }, [run, now])

  const reset = useCallback(() => {
    queueRef.current?.cancel()
    queueRef.current = null
    dispatchReducer({ type: 'reset' })
  }, [])

  return { run, view, start, cancel, pause, resume, retry, reset }
}
