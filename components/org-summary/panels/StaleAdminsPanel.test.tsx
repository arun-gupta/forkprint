import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthProvider } from '@/components/auth/AuthContext'
import { StaleAdminsPanel } from './StaleAdminsPanel'
import type { StaleAdminsSection } from '@/lib/governance/stale-admins'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

function renderWithSession(ui: React.ReactElement, { scopes = ['public_repo'] }: { scopes?: string[] } = {}) {
  return render(
    <AuthProvider initialSession={{ token: 't', username: 'u', scopes }}>
      {ui}
    </AuthProvider>,
  )
}

function makeSection(override: Partial<StaleAdminsSection> = {}): StaleAdminsSection {
  return {
    kind: 'stale-admins',
    applicability: 'applicable',
    mode: 'baseline',
    thresholdDays: 90,
    admins: [],
    resolvedAt: '2026-04-16T00:00:00Z',
    ...override,
  }
}

describe('StaleAdminsPanel — baseline rendering', () => {
  it('renders each admin row with classification and public-activity timestamp', () => {
    const section = makeSection({
      admins: [
        {
          username: 'alice',
          classification: 'active',
          lastActivityAt: '2026-04-10T00:00:00Z',
          lastActivitySource: 'public-events',
          unavailableReason: null,
        },
        {
          username: 'bob',
          classification: 'stale',
          lastActivityAt: '2025-09-01T00:00:00Z',
          lastActivitySource: 'org-commit-search',
          unavailableReason: null,
        },
      ],
    })
    renderWithSession(<StaleAdminsPanel org="acme" ownerType="Organization" sectionOverride={section} />)

    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('bob')).toBeInTheDocument()
    expect(screen.getByText(/2026-04-10/)).toBeInTheDocument()
    expect(screen.getByText(/2025-09-01/)).toBeInTheDocument()

    expect(screen.getByTestId('stale-admin-badge-active')).toBeInTheDocument()
    expect(screen.getByTestId('stale-admin-badge-stale')).toBeInTheDocument()
  })

  it('renders the baseline mode indicator', () => {
    const section = makeSection({ mode: 'baseline' })
    renderWithSession(<StaleAdminsPanel org="acme" ownerType="Organization" sectionOverride={section} />)
    const badge = screen.getByTestId('stale-admins-mode-baseline')
    expect(badge.textContent).toMatch(/baseline/i)
    expect(badge.textContent).toMatch(/public admins only/i)
  })
})

describe('StaleAdminsPanel — distinctness of no-public-activity vs stale (US2)', () => {
  it('uses a distinct badge and distinct aria-label for no-public-activity vs stale', () => {
    const section = makeSection({
      admins: [
        {
          username: 'stale-user',
          classification: 'stale',
          lastActivityAt: '2025-01-01T00:00:00Z',
          lastActivitySource: 'public-events',
          unavailableReason: null,
        },
        {
          username: 'silent-user',
          classification: 'no-public-activity',
          lastActivityAt: null,
          lastActivitySource: null,
          unavailableReason: null,
        },
      ],
    })
    renderWithSession(<StaleAdminsPanel org="acme" ownerType="Organization" sectionOverride={section} />)

    const staleBadge = screen.getByTestId('stale-admin-badge-stale')
    const noActivityBadge = screen.getByTestId('stale-admin-badge-no-public-activity')

    // Distinct accessible labels.
    expect(staleBadge.getAttribute('aria-label')).not.toBe(noActivityBadge.getAttribute('aria-label'))

    // Distinct visible text.
    expect(staleBadge.textContent).not.toBe(noActivityBadge.textContent)
    expect(staleBadge.textContent).toMatch(/stale/i)
    expect(noActivityBadge.textContent).toMatch(/no public activity/i)

    // Distinct CSS class tokens (the critical visual-distinctness check).
    expect(staleBadge.className).not.toBe(noActivityBadge.className)
  })

  it('uses a distinct badge for unavailable too (third distinct treatment)', () => {
    const section = makeSection({
      admins: [
        {
          username: 'broken',
          classification: 'unavailable',
          lastActivityAt: null,
          lastActivitySource: null,
          unavailableReason: 'rate-limited',
        },
      ],
    })
    renderWithSession(<StaleAdminsPanel org="acme" ownerType="Organization" sectionOverride={section} />)

    const badge = screen.getByTestId('stale-admin-badge-unavailable')
    expect(badge.textContent).toMatch(/unavailable/i)
    expect(badge.getAttribute('aria-label')).toMatch(/unavailable/i)
  })
})

describe('StaleAdminsPanel — US4 N/A for non-org targets', () => {
  it('renders an explicit N/A state when applicability is not-applicable-non-org', () => {
    const section = makeSection({ applicability: 'not-applicable-non-org', admins: [] })
    renderWithSession(<StaleAdminsPanel org={null} ownerType="User" sectionOverride={section} />)
    expect(screen.getByTestId('stale-admins-na')).toBeInTheDocument()
    expect(screen.queryByTestId(/stale-admin-badge-/)).not.toBeInTheDocument()
  })
})

describe('StaleAdminsPanel — admin-list-unavailable', () => {
  it('renders a labeled unavailable state with the reason', () => {
    const section = makeSection({
      applicability: 'admin-list-unavailable',
      adminListUnavailableReason: 'rate-limited',
      admins: [],
    })
    renderWithSession(<StaleAdminsPanel org="acme" ownerType="Organization" sectionOverride={section} />)
    const el = screen.getByTestId('stale-admins-unavailable')
    expect(el.textContent).toMatch(/could not be retrieved/i)
    expect(el.textContent).toMatch(/rate-limited/)
  })
})

describe('StaleAdminsPanel — US3 mode indicators', () => {
  it('renders elevated-effective mode indicator', () => {
    const section = makeSection({ mode: 'elevated-effective' })
    renderWithSession(<StaleAdminsPanel org="acme" ownerType="Organization" sectionOverride={section} />, {
      scopes: ['public_repo', 'read:org'],
    })
    const badge = screen.getByTestId('stale-admins-mode-elevated-effective')
    expect(badge.textContent).toMatch(/elevated/i)
    expect(badge.textContent).toMatch(/concealed admins/i)
  })

  it('renders elevated-ineffective mode indicator with honest disclosure', () => {
    const section = makeSection({ mode: 'elevated-ineffective' })
    renderWithSession(<StaleAdminsPanel org="acme" ownerType="Organization" sectionOverride={section} />, {
      scopes: ['public_repo', 'read:org'],
    })
    const badge = screen.getByTestId('stale-admins-mode-elevated-ineffective')
    expect(badge.textContent).toMatch(/did not widen/i)
  })
})

describe('StaleAdminsPanel — US5 freshness disclosure', () => {
  it('reads the threshold value from the config and discloses public-only + eventual consistency', () => {
    const section = makeSection()
    renderWithSession(<StaleAdminsPanel org="acme" ownerType="Organization" sectionOverride={section} />)
    const thresholdEl = screen.getByTestId('stale-admins-threshold-days')
    expect(thresholdEl.textContent).toContain('90')
    expect(screen.getByText(/publicly visible activity/i)).toBeInTheDocument()
    expect(screen.getByText(/eventually consistent/i)).toBeInTheDocument()
  })
})
