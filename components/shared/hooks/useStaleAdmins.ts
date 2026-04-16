'use client'

import { useEffect, useState } from 'react'
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
}

export function useStaleAdmins(options: UseStaleAdminsOptions): UseStaleAdminsState {
  const { org, ownerType, token, elevated } = options
  const fetchFn = options.fetchFn ?? fetch

  const [state, setState] = useState<UseStaleAdminsState>(() => ({
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
    queueMicrotask(() => {
      if (cancelled) return
      setState((prev) => (prev.loading ? prev : { loading: true, section: null, error: null }))
    })

    const params = new URLSearchParams({ org, ownerType })
    if (elevated) params.set('elevated', '1')

    fetchFn(`/api/org/stale-admins?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          setState({ loading: false, section: null, error: `HTTP ${res.status}` })
          return
        }
        const body = (await res.json()) as { section?: StaleAdminsSection }
        setState({ loading: false, section: body.section ?? null, error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState({
          loading: false,
          section: null,
          error: err instanceof Error ? err.message : 'stale-admin fetch failed',
        })
      })

    return () => {
      cancelled = true
    }
  }, [org, ownerType, token, elevated, fetchFn])

  return state
}
