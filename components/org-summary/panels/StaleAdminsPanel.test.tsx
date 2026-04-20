import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
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
    earliestRetryAvailableAt: null,
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
          retryAvailableAt: null,
        },
        {
          username: 'bob',
          classification: 'stale',
          lastActivityAt: '2025-09-01T00:00:00Z',
          lastActivitySource: 'org-commit-search',
          unavailableReason: null,
          retryAvailableAt: null,
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

  it('renders a header summary strip with totals across all classifications', () => {
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

    const strip = screen.getByTestId('stale-admins-count-strip')
    expect(strip).toHaveAttribute('aria-label', 'Admin summary — 5 admins')
    expect(within(strip).getByText('5 admins')).toBeInTheDocument()
    expect(within(strip).getByTestId('stale-admins-count-stale').textContent).toMatch(/1 stale/i)
    expect(within(strip).getByTestId('stale-admins-count-unavailable').textContent).toMatch(/1 unavailable/i)
    expect(
      within(strip).getByTestId('stale-admins-count-no-public-activity').textContent,
    ).toMatch(/1 no public activity/i)
    expect(within(strip).getByTestId('stale-admins-count-active').textContent).toMatch(/2 active/i)
  })

  it('hides the description and group list when the panel is collapsed, keeps the summary count strip visible', () => {
    const section = makeSection({
      admins: [mkAdmin('s1', 'stale'), mkAdmin('a1', 'active')],
    })
    renderWithSession(<StaleAdminsPanel org="acme" ownerType="Organization" sectionOverride={section} />)

    // Expanded by default — strip and description are visible.
    expect(screen.getByTestId('stale-admins-count-strip')).toBeInTheDocument()
    expect(screen.getByText(/stale admin detection/i)).toBeInTheDocument()

    const toggle = screen.getByTestId('stale-admins-panel-toggle')
    fireEvent.click(toggle)

    expect(screen.queryByTestId('stale-admins-group-stale')).not.toBeInTheDocument()
    expect(screen.queryByText(/stale admin detection/i)).not.toBeInTheDocument()
    // Summary strip and title stay visible so the signal is still readable at a glance.
    expect(screen.getByTestId('stale-admins-count-strip')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /org admin activity/i })).toBeInTheDocument()
  })

  it('omits the header summary strip when applicability is not applicable', () => {
    const section = makeSection({ applicability: 'not-applicable-non-org', admins: [] })
    renderWithSession(<StaleAdminsPanel org={null} ownerType="User" sectionOverride={section} />)
    expect(screen.queryByTestId('stale-admins-count-strip')).not.toBeInTheDocument()
  })

  it('renders a commit-search badge with an explanatory tooltip on admins whose activity was inferred from org commit search', () => {
    const section = makeSection({
      admins: [
        {
          username: 'alice',
          classification: 'active',
          lastActivityAt: '2026-04-10T00:00:00Z',
          lastActivitySource: 'public-events',
          unavailableReason: null,
          retryAvailableAt: null,
        },
        {
          username: 'bob',
          classification: 'stale',
          lastActivityAt: '2025-09-01T00:00:00Z',
          lastActivitySource: 'org-commit-search',
          unavailableReason: null,
          retryAvailableAt: null,
        },
      ],
    })
    renderWithSession(<StaleAdminsPanel org="acme" ownerType="Organization" sectionOverride={section} />)

    // The stale group (bob) has a commit-search badge; the active group (alice) does not.
    const staleGroup = screen.getByTestId('stale-admins-group-stale')
    const activeGroup = screen.getByTestId('stale-admins-group-active')

    const badge = within(staleGroup).getByTestId('stale-admin-commit-search-badge')
    expect(badge.getAttribute('title')).toBe('Activity inferred from org commit search')
    expect(badge.getAttribute('aria-label')).toBe('Activity inferred from org commit search')

    expect(
      within(activeGroup).queryByTestId('stale-admin-commit-search-badge'),
    ).not.toBeInTheDocument()
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

describe('StaleAdminsPanel — Unavailable bucket split (issue #364)', () => {
  it('renders sub-breakdown pills for rate-limited vs commit-search-failed inside the Unavailable group', () => {
    const section = makeSection({
      admins: [
        mkUnavailable('u1', 'rate-limited'),
        mkUnavailable('u2', 'rate-limited'),
        mkUnavailable('u3', 'commit-search-failed'),
      ],
    })
    renderWithSession(<StaleAdminsPanel org="acme" ownerType="Organization" sectionOverride={section} />)

    const unavailable = screen.getByTestId('stale-admins-group-unavailable')
    const strip = within(unavailable).getByTestId('stale-admins-unavailable-reasons')
    expect(
      within(strip).getByTestId('stale-admins-unavailable-reason-rate-limited').textContent,
    ).toMatch(/2 rate-limited/i)
    expect(
      within(strip).getByTestId('stale-admins-unavailable-reason-commit-search-failed').textContent,
    ).toMatch(/1 search unavailable/i)
  })

  it('shows a Retry button for any retryable unavailable reason, hidden when only terminal reasons remain', () => {
    const onRetry = vi.fn()
    const retryable = makeSection({
      admins: [mkUnavailable('u1', 'commit-search-failed')],
    })
    const { rerender } = renderWithSession(
      <StaleAdminsPanel
        org="acme"
        ownerType="Organization"
        sectionOverride={retryable}
        onRetryOverride={onRetry}
      />,
    )

    const retry = screen.getByTestId('stale-admins-unavailable-retry')
    fireEvent.click(retry)
    expect(onRetry).toHaveBeenCalledTimes(1)

    rerender(
      <AuthProvider initialSession={{ token: 't', username: 'u', scopes: ['public_repo'] }}>
        <StaleAdminsPanel
          org="acme"
          ownerType="Organization"
          sectionOverride={makeSection({
            admins: [mkUnavailable('u1', 'admin-account-404')],
          })}
          onRetryOverride={onRetry}
        />
      </AuthProvider>,
    )
    expect(screen.queryByTestId('stale-admins-unavailable-retry')).not.toBeInTheDocument()
  })

  it('renders a unified retryable-row message — rate-limit and search-unavailable share the same copy', () => {
    const section = makeSection({
      admins: [
        mkUnavailable('u1', 'rate-limited'),
        mkUnavailable('u2', 'commit-search-failed'),
        mkUnavailable('u3', 'admin-account-404'),
      ],
    })
    // nextAutoRetryAtOverride=null simulates the ladder-paused state.
    renderWithSession(
      <StaleAdminsPanel
        org="acme"
        ownerType="Organization"
        sectionOverride={section}
        nextAutoRetryAtOverride={null}
      />,
    )

    const unavailable = screen.getByTestId('stale-admins-group-unavailable')
    // Retryable rows (both rate-limited and commit-search-failed) share one message.
    const retryableRows = within(unavailable).getAllByText(
      /GitHub didn’t return activity data — click Retry to try again/i,
    )
    expect(retryableRows.length).toBe(2)
    // Terminal reason keeps its distinct (non-retryable) copy.
    expect(within(unavailable).getByText(/GitHub account not found/i)).toBeInTheDocument()
    // Our implementation names, debug asides, and lying time-promises must not appear.
    expect(within(unavailable).queryByText(/commit search/i)).not.toBeInTheDocument()
    expect(within(unavailable).queryByText(/events feed/i)).not.toBeInTheDocument()
    expect(within(unavailable).queryByText(/\(often a burst rate-limit\)/i)).not.toBeInTheDocument()
    expect(within(unavailable).queryByText(/about a minute/i)).not.toBeInTheDocument()
    // No per-reason rate-limit lead leaking into a row — the distinction
    // lives in the sub-pill strip above the rows, not in each row's copy.
    expect(within(unavailable).queryByText(/^GitHub rate limit/i)).not.toBeInTheDocument()
  })

  it('every unavailable row shows a countdown when a background retry is scheduled, regardless of whether GitHub disclosed a reset', () => {
    vi.setSystemTime(new Date('2026-04-20T12:00:00Z'))
    const section = makeSection({
      admins: [
        // u1 has its own GitHub-disclosed reset (should win over nextAutoRetryAt).
        mkUnavailable('u1', 'rate-limited', '2026-04-20T12:00:15Z'),
        // u2 has none — should fall back to the hook's nextAutoRetryAt.
        mkUnavailable('u2', 'commit-search-failed'),
      ],
    })
    renderWithSession(
      <StaleAdminsPanel
        org="acme"
        ownerType="Organization"
        sectionOverride={section}
        nextAutoRetryAtOverride={'2026-04-20T12:00:30Z'}
      />,
    )

    const countdowns = screen.getAllByTestId('retry-countdown')
    expect(countdowns).toHaveLength(2)
    // u1 uses its own reset (≈15s), u2 falls back to nextAutoRetryAt (≈30s).
    expect(countdowns[0]!.textContent).toMatch(/15s/)
    expect(countdowns[1]!.textContent).toMatch(/30s/)
    vi.useRealTimers()
  })

  it('section-level Retry button shows the auto-retry countdown and disables while waiting', () => {
    vi.setSystemTime(new Date('2026-04-20T12:00:00Z'))
    const onRetry = vi.fn()
    const section = makeSection({
      admins: [mkUnavailable('u1', 'commit-search-failed')],
    })
    renderWithSession(
      <StaleAdminsPanel
        org="acme"
        ownerType="Organization"
        sectionOverride={section}
        onRetryOverride={onRetry}
        nextAutoRetryAtOverride={'2026-04-20T12:00:25Z'}
      />,
    )
    const retry = screen.getByTestId('stale-admins-unavailable-retry')
    expect(retry.textContent).toMatch(/Auto-retry in \d+s/)
    expect(retry).toBeDisabled()
    vi.useRealTimers()
  })

  it('omits the sub-breakdown strip on non-unavailable groups', () => {
    const section = makeSection({
      admins: [mkAdmin('s', 'stale'), mkAdmin('a', 'active')],
    })
    renderWithSession(<StaleAdminsPanel org="acme" ownerType="Organization" sectionOverride={section} />)
    expect(screen.queryByTestId('stale-admins-unavailable-reasons')).not.toBeInTheDocument()
  })

  it('renders a countdown for rate-limited rows with a known retryAvailableAt', () => {
    vi.setSystemTime(new Date('2026-04-20T12:00:00Z'))
    const availableAt = new Date('2026-04-20T12:00:37Z').toISOString()
    const section = makeSection({
      admins: [mkUnavailable('u1', 'rate-limited', availableAt)],
    })
    renderWithSession(<StaleAdminsPanel org="acme" ownerType="Organization" sectionOverride={section} />)

    const countdown = screen.getByTestId('retry-countdown')
    expect(countdown.textContent).toMatch(/37s/)
    vi.useRealTimers()
  })

  it('shows "click Retry" copy (not a stale countdown) when retryAvailableAt is in the past and ladder is exhausted', () => {
    vi.setSystemTime(new Date('2026-04-20T12:01:00Z'))
    const elapsed = new Date('2026-04-20T12:00:00Z').toISOString()
    const section = makeSection({
      admins: [mkUnavailable('u1', 'rate-limited', elapsed)],
    })
    renderWithSession(<StaleAdminsPanel org="acme" ownerType="Organization" sectionOverride={section} />)
    // Past retryAvailableAt with no nextAutoRetryAt: ladder exhausted, no countdown pinned.
    expect(screen.queryByTestId('retry-countdown-ready')).not.toBeInTheDocument()
    expect(screen.queryByTestId('retry-countdown')).not.toBeInTheDocument()
    expect(screen.getByText(/click Retry to try again/)).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('keeps the section visible during refresh (stale-while-revalidate) and swaps the Retry button to Retrying…', () => {
    const section = makeSection({
      admins: [mkAdmin('a', 'active'), mkUnavailable('u', 'rate-limited')],
    })
    renderWithSession(
      <StaleAdminsPanel
        org="acme"
        ownerType="Organization"
        sectionOverride={section}
        loadingOverride={true}
      />,
    )
    // Section content is still rendered (no blank "Loading admin activity..." takeover).
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('u')).toBeInTheDocument()
    expect(screen.queryByText(/Loading admin activity/i)).not.toBeInTheDocument()

    const retry = screen.getByTestId('stale-admins-unavailable-retry')
    expect(retry.textContent).toMatch(/Retrying/i)
    expect(retry).toBeDisabled()
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
    return {
      username,
      classification,
      lastActivityAt: null,
      lastActivitySource: null,
      unavailableReason: null,
      retryAvailableAt: null,
    }
  }
  if (classification === 'unavailable') {
    return {
      username,
      classification,
      lastActivityAt: null,
      lastActivitySource: null,
      unavailableReason: 'rate-limited' as const,
      retryAvailableAt: null,
    }
  }
  return {
    username,
    classification,
    lastActivityAt: classification === 'stale' ? '2025-09-01T00:00:00Z' : '2026-04-10T00:00:00Z',
    lastActivitySource: 'public-events' as const,
    unavailableReason: null,
    retryAvailableAt: null,
  }
}

function mkUnavailable(
  username: string,
  reason: 'rate-limited' | 'commit-search-failed' | 'events-fetch-failed' | 'admin-account-404',
  retryAvailableAt: string | null = null,
) {
  return {
    username,
    classification: 'unavailable' as const,
    lastActivityAt: null,
    lastActivitySource: null,
    unavailableReason: reason,
    retryAvailableAt,
  }
}
