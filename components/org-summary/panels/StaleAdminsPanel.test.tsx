import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
  it('renders admins grouped by classification, with username and last-activity date inside the row', () => {
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

    // Each row present somewhere in the doc.
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('bob')).toBeInTheDocument()

    // Stale group is the one that contains bob.
    const staleGroup = screen.getByTestId('stale-admins-group-stale')
    expect(within(staleGroup).getByText('bob')).toBeInTheDocument()
    expect(within(staleGroup).getByText(/2025-09-01/)).toBeInTheDocument()

    // Active group is the one that contains alice.
    const activeGroup = screen.getByTestId('stale-admins-group-active')
    expect(within(activeGroup).getByText('alice')).toBeInTheDocument()
    expect(within(activeGroup).getByText(/2026-04-10/)).toBeInTheDocument()
  })

  it('renders the baseline mode indicator', () => {
    const section = makeSection({ mode: 'baseline' })
    renderWithSession(<StaleAdminsPanel org="acme" ownerType="Organization" sectionOverride={section} />)
    const badge = screen.getByTestId('stale-admins-mode-baseline')
    expect(badge.textContent).toMatch(/baseline/i)
    expect(badge.textContent).toMatch(/public admins only/i)
  })

  it('shows per-group count pills matching the number of admins in each group', () => {
    const section = makeSection({
      admins: [
        mkAdmin('a1', 'active'),
        mkAdmin('a2', 'active'),
        mkAdmin('s1', 'stale'),
        mkAdmin('n1', 'no-public-activity'),
        mkAdmin('u1', 'unavailable'),
      ],
    })
    renderWithSession(<StaleAdminsPanel org="acme" ownerType="Organization" sectionOverride={section} />)

    // Standalone count strip is removed; per-group pills carry the counts.
    expect(screen.queryByTestId('stale-admins-count-strip')).not.toBeInTheDocument()

    const staleSummary = screen.getByTestId('stale-admins-group-stale').querySelector('summary')!
    const activeSummary = screen.getByTestId('stale-admins-group-active').querySelector('summary')!
    const noActivitySummary = screen
      .getByTestId('stale-admins-group-no-public-activity')
      .querySelector('summary')!
    const unavailableSummary = screen
      .getByTestId('stale-admins-group-unavailable')
      .querySelector('summary')!

    expect(within(staleSummary).getByText('1')).toBeInTheDocument()
    expect(within(activeSummary).getByText('2')).toBeInTheDocument()
    expect(within(noActivitySummary).getByText('1')).toBeInTheDocument()
    expect(within(unavailableSummary).getByText('1')).toBeInTheDocument()
  })

  it('renders a chevron inside each group header summary', () => {
    const section = makeSection({
      admins: [mkAdmin('s1', 'stale'), mkAdmin('a1', 'active')],
    })
    renderWithSession(<StaleAdminsPanel org="acme" ownerType="Organization" sectionOverride={section} />)

    const staleSummary = screen.getByTestId('stale-admins-group-stale').querySelector('summary')!
    const activeSummary = screen.getByTestId('stale-admins-group-active').querySelector('summary')!
    expect(staleSummary.querySelector('[data-testid="group-chevron"]')).not.toBeNull()
    expect(activeSummary.querySelector('[data-testid="group-chevron"]')).not.toBeNull()
  })

  it('renders Stale and Unavailable groups open by default, No-public-activity and Active closed', () => {
    const section = makeSection({
      admins: [
        mkAdmin('s1', 'stale'),
        mkAdmin('u1', 'unavailable'),
        mkAdmin('n1', 'no-public-activity'),
        mkAdmin('a1', 'active'),
      ],
    })
    renderWithSession(<StaleAdminsPanel org="acme" ownerType="Organization" sectionOverride={section} />)

    expect(screen.getByTestId('stale-admins-group-stale')).toHaveAttribute('open')
    expect(screen.getByTestId('stale-admins-group-unavailable')).toHaveAttribute('open')
    expect(screen.getByTestId('stale-admins-group-no-public-activity')).not.toHaveAttribute('open')
    expect(screen.getByTestId('stale-admins-group-active')).not.toHaveAttribute('open')
  })

  it('omits a group entirely when that classification has zero admins', () => {
    const section = makeSection({
      admins: [mkAdmin('a1', 'active')],
    })
    renderWithSession(<StaleAdminsPanel org="acme" ownerType="Organization" sectionOverride={section} />)

    expect(screen.queryByTestId('stale-admins-group-stale')).not.toBeInTheDocument()
    expect(screen.queryByTestId('stale-admins-group-unavailable')).not.toBeInTheDocument()
    expect(screen.queryByTestId('stale-admins-group-no-public-activity')).not.toBeInTheDocument()
    expect(screen.getByTestId('stale-admins-group-active')).toBeInTheDocument()
  })
})

describe('StaleAdminsPanel — distinctness of no-public-activity vs stale (US2)', () => {
  it('renders Stale and No-public-activity groups with distinct headers and distinct aria-labels', () => {
    const section = makeSection({
      admins: [mkAdmin('s', 'stale'), mkAdmin('n', 'no-public-activity')],
    })
    renderWithSession(<StaleAdminsPanel org="acme" ownerType="Organization" sectionOverride={section} />)

    const staleGroup = screen.getByTestId('stale-admins-group-stale')
    const noActivityGroup = screen.getByTestId('stale-admins-group-no-public-activity')

    // Distinct visual treatment — different left-border color class.
    expect(staleGroup.className).not.toBe(noActivityGroup.className)

    // Distinct group header text.
    const staleSummary = staleGroup.querySelector('summary')!
    const noActivitySummary = noActivityGroup.querySelector('summary')!
    expect(staleSummary.textContent).toMatch(/stale/i)
    expect(noActivitySummary.textContent).toMatch(/no public activity/i)
    expect(staleSummary.getAttribute('aria-label')).not.toBe(
      noActivitySummary.getAttribute('aria-label'),
    )
  })
})

describe('StaleAdminsPanel — US4 N/A for non-org targets', () => {
  it('renders an explicit N/A state when applicability is not-applicable-non-org', () => {
    const section = makeSection({ applicability: 'not-applicable-non-org', admins: [] })
    renderWithSession(<StaleAdminsPanel org={null} ownerType="User" sectionOverride={section} />)
    expect(screen.getByTestId('stale-admins-na')).toBeInTheDocument()
    expect(screen.queryByTestId(/stale-admins-group-/)).not.toBeInTheDocument()
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

function mkAdmin(
  username: string,
  classification: 'active' | 'stale' | 'no-public-activity' | 'unavailable',
) {
  if (classification === 'no-public-activity') {
    return { username, classification, lastActivityAt: null, lastActivitySource: null, unavailableReason: null }
  }
  if (classification === 'unavailable') {
    return {
      username,
      classification,
      lastActivityAt: null,
      lastActivitySource: null,
      unavailableReason: 'rate-limited' as const,
    }
  }
  return {
    username,
    classification,
    lastActivityAt: classification === 'stale' ? '2025-09-01T00:00:00Z' : '2026-04-10T00:00:00Z',
    lastActivitySource: 'public-events' as const,
    unavailableReason: null,
  }
}
