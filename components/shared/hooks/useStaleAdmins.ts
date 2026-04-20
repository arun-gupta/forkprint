'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { StaleAdminsSection } from '@/lib/governance/stale-admins'

export type OwnerType = 'Organization' | 'User'

export interface UseStaleAdminsOptions {
  org: string | null
  ownerType: OwnerType
  token: string | null
  elevated: boolean
  fetchFn?: typeof fetch
}

export interface UseStaleAdminsState {
  loading: boolean
  section: StaleAdminsSection | null
  error: string | null
  refetch: () => void
}

// Bounded background auto-retry ladder. Hybrid strategy:
//   - If the section carries `earliestRetryAvailableAt`, schedule the next
//     retry right after that timestamp (header-driven, accurate).
//   - Otherwise, fall back to this fixed ladder for cases where GitHub did
//     not disclose a reset time (secondary rate limits, 5xx, etc).
// Capped at 3 attempts. A manual `refetch()` resets the ladder so the user
// can always trigger a fresh cycle.
const BG_RETRY_LADDER_MS = [10_000, 30_000, 60_000]
const BG_RETRY_MAX_DELAY_MS = 60_000
const BG_RETRY_JITTER_MS = 500

export function useStaleAdmins(options: UseStaleAdminsOptions): UseStaleAdminsState {
  const { org, ownerType, token, elevated } = options
  const fetchFn = options.fetchFn ?? fetch

  const [retryCount, setRetryCount] = useState(0)
  const [ladderStep, setLadderStep] = useState(0)
  const refetch = useCallback(() => {
    setLadderStep(0)
    setRetryCount((n) => n + 1)
  }, [])
  const [state, setState] = useState<Omit<UseStaleAdminsState, 'refetch'>>(() => ({
    loading: Boolean(org && token),
    section: null,
    error: null,
  }))

  useEffect(() => {
    if (!org || !token) {
      // Schedule the reset in a microtask so this effect body does not call
      // setState synchronously (react-hooks/set-state-in-effect).
      let cancelled = false
      queueMicrotask(() => {
        if (cancelled) return
        setState((prev) =>
          prev.loading || prev.section || prev.error
            ? { loading: false, section: null, error: null }
            : prev,
        )
      })
      return () => {
        cancelled = true
      }
    }

    let cancelled = false
    // Stale-while-revalidate: keep any previous `section` in place during a
    // refetch so the panel does not blank out. Only `loading` and `error`
    // flip; `section` is cleared only on options change (caller-driven).
    queueMicrotask(() => {
      if (cancelled) return
      setState((prev) => (prev.loading ? prev : { ...prev, loading: true, error: null }))
    })

    const params = new URLSearchParams({ org, ownerType })
    if (elevated) params.set('elevated', '1')

    fetchFn(`/api/org/stale-admins?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          setState((prev) => ({ ...prev, loading: false, error: `HTTP ${res.status}` }))
          return
        }
        const body = (await res.json()) as { section?: StaleAdminsSection }
        setState({ loading: false, section: body.section ?? null, error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'stale-admin fetch failed',
        }))
      })

    return () => {
      cancelled = true
    }
  }, [org, ownerType, token, elevated, fetchFn, retryCount])

  // Reset the ladder whenever the caller options change (nav, sign-out, etc).
  const ladderResetKey = `${org}|${ownerType}|${token}|${elevated}`
  const lastResetKeyRef = useRef(ladderResetKey)
  useEffect(() => {
    if (lastResetKeyRef.current === ladderResetKey) return
    lastResetKeyRef.current = ladderResetKey
    // Defer the state update out of the effect body to avoid cascading renders
    // (eslint react-hooks/set-state-in-effect).
    queueMicrotask(() => setLadderStep(0))
  }, [ladderResetKey])

  // Schedule a background auto-retry after each fetch completes, when there
  // are still retryable-unavailable admins. Cancelled on new fetch / option
  // change / unmount. The ladder advances per fire; once exhausted, the
  // user's Retry button is the fallback.
  useEffect(() => {
    if (state.loading) return
    if (!state.section) return
    if (ladderStep >= BG_RETRY_LADDER_MS.length) return
    if (!sectionHasRetryableUnavailable(state.section)) return

    const fallbackDelay = BG_RETRY_LADDER_MS[ladderStep]!
    const earliestAt = state.section.earliestRetryAvailableAt
    let delay = fallbackDelay
    if (earliestAt) {
      const untilReset = Date.parse(earliestAt) - Date.now()
      if (Number.isFinite(untilReset)) {
        delay = Math.min(
          Math.max(untilReset + BG_RETRY_JITTER_MS, 1000),
          BG_RETRY_MAX_DELAY_MS,
        )
      }
    }

    const id = setTimeout(() => {
      setLadderStep((s) => s + 1)
      setRetryCount((n) => n + 1)
    }, delay)
    return () => clearTimeout(id)
  }, [state.loading, state.section, ladderStep])

  return { ...state, refetch }
}

function sectionHasRetryableUnavailable(section: StaleAdminsSection): boolean {
  if (section.applicability !== 'applicable') return false
  return section.admins.some(
    (admin) =>
      admin.classification === 'unavailable' &&
      admin.unavailableReason !== null &&
      admin.unavailableReason !== 'admin-account-404',
  )
}
