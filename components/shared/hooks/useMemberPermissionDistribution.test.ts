import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMemberPermissionDistribution } from './useMemberPermissionDistribution'
import type { MemberPermissionDistributionSection } from '@/lib/governance/member-permissions'

function makeSection(overrides: Partial<MemberPermissionDistributionSection> = {}): MemberPermissionDistributionSection {
  return {
    kind: 'member-permission-distribution',
    applicability: 'applicable',
    adminCount: 2,
    memberCount: 8,
    publicMemberCount: 5,
    publicMembers: [
      { login: 'alice', avatarUrl: 'https://github.com/alice.png' },
      { login: 'bob', avatarUrl: 'https://github.com/bob.png' },
      { login: 'carol', avatarUrl: 'https://github.com/carol.png' },
      { login: 'dave', avatarUrl: 'https://github.com/dave.png' },
      { login: 'eve', avatarUrl: 'https://github.com/eve.png' },
    ],
    outsideCollaboratorCount: 1,
    unavailableReasons: [],
    resolvedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('useMemberPermissionDistribution', () => {
  afterEach(() => vi.restoreAllMocks())

  it('starts in loading state when org and token are provided', () => {
    const fetchFn = vi.fn(() => new Promise<Response>(() => {}))
    const { result } = renderHook(() =>
      useMemberPermissionDistribution({ org: 'acme', ownerType: 'Organization', token: 'ghp_t', fetchFn }),
    )
    expect(result.current.loading).toBe(true)
    expect(result.current.section).toBeNull()
  })

  it('resolves with the section on success', async () => {
    const section = makeSection()
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ section }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const { result } = renderHook(() =>
      useMemberPermissionDistribution({ org: 'acme', ownerType: 'Organization', token: 'ghp_t', fetchFn }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.section).toMatchObject({ kind: 'member-permission-distribution', applicability: 'applicable' })
    expect(result.current.error).toBeNull()
  })

  it('sets error on non-OK HTTP response', async () => {
    const fetchFn = vi.fn(async () => new Response('', { status: 503 }))

    const { result } = renderHook(() =>
      useMemberPermissionDistribution({ org: 'acme', ownerType: 'Organization', token: 'ghp_t', fetchFn }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toMatch(/503/)
    expect(result.current.section).toBeNull()
  })

  it('skips fetch and stays idle when org is null', () => {
    const fetchFn = vi.fn()
    const { result } = renderHook(() =>
      useMemberPermissionDistribution({ org: null, ownerType: 'Organization', token: 'ghp_t', fetchFn }),
    )
    expect(result.current.loading).toBe(false)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('skips fetch and stays idle when token is null', () => {
    const fetchFn = vi.fn()
    const { result } = renderHook(() =>
      useMemberPermissionDistribution({ org: 'acme', ownerType: 'Organization', token: null, fetchFn }),
    )
    expect(result.current.loading).toBe(false)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('passes Authorization header with Bearer token', async () => {
    const section = makeSection()
    const fetchFn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const auth = (init?.headers as Record<string, string>)?.['Authorization']
      expect(auth).toBe('Bearer ghp_test')
      return new Response(JSON.stringify({ section }), { status: 200 })
    })

    const { result } = renderHook(() =>
      useMemberPermissionDistribution({ org: 'acme', ownerType: 'Organization', token: 'ghp_test', fetchFn }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
  })
})
