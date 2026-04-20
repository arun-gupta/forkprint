'use client'

import { useEffect, useState } from 'react'
import type { MemberPermissionDistributionSection } from '@/lib/governance/member-permissions'

export type OwnerType = 'Organization' | 'User'

export interface UseMemberPermissionDistributionOptions {
  org: string | null
  ownerType: OwnerType
  token: string | null
  fetchFn?: typeof fetch
}

export interface UseMemberPermissionDistributionState {
  loading: boolean
  section: MemberPermissionDistributionSection | null
  error: string | null
}

export function useMemberPermissionDistribution(
  options: UseMemberPermissionDistributionOptions,
): UseMemberPermissionDistributionState {
  const { org, ownerType, token } = options
  const fetchFn = options.fetchFn ?? fetch

  const [state, setState] = useState<UseMemberPermissionDistributionState>(() => ({
    loading: Boolean(org && token),
    section: null,
    error: null,
  }))

  useEffect(() => {
    if (!org || !token) {
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

    fetchFn(`/api/org/member-permissions?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          setState({ loading: false, section: null, error: `HTTP ${res.status}` })
          return
        }
        const body = (await res.json()) as { section?: MemberPermissionDistributionSection }
        setState({ loading: false, section: body.section ?? null, error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState({
          loading: false,
          section: null,
          error: err instanceof Error ? err.message : 'member-permissions fetch failed',
        })
      })

    return () => {
      cancelled = true
    }
  }, [org, ownerType, token, fetchFn])

  return state
}
