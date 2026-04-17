import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { AuthProvider } from '@/components/auth/AuthContext'
import { TwoFactorEnforcementPanel } from './TwoFactorEnforcementPanel'
import type { TwoFactorEnforcementSection } from '@/lib/governance/two-factor'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

function renderWithSession(ui: React.ReactElement) {
  return render(
    <AuthProvider initialSession={{ token: 't', username: 'u', scopes: ['public_repo'] }}>
      {ui}
    </AuthProvider>,
  )
}

function makeSection(override: Partial<TwoFactorEnforcementSection> = {}): TwoFactorEnforcementSection {
  return {
    kind: 'two-factor-enforcement',
    applicability: 'applicable',
    status: 'enforced',
    resolvedAt: '2026-04-16T00:00:00Z',
    ...override,
  }
}

describe('TwoFactorEnforcementPanel — applicable states', () => {
  it('renders an "enforced" badge with distinct affirmative styling when status is enforced', () => {
    renderWithSession(
      <TwoFactorEnforcementPanel
        org="acme"
        ownerType="Organization"
        sectionOverride={makeSection({ status: 'enforced' })}
      />,
    )
    const badge = screen.getByTestId('two-factor-status-enforced')
    expect(badge.textContent).toMatch(/enforced/i)
    expect(badge.className).toMatch(/emerald/)
  })

  it('renders a "not enforced" badge with distinct warning styling when status is not-enforced', () => {
    renderWithSession(
      <TwoFactorEnforcementPanel
        org="acme"
        ownerType="Organization"
        sectionOverride={makeSection({ status: 'not-enforced' })}
      />,
    )
    const badge = screen.getByTestId('two-factor-status-not-enforced')
    expect(badge.textContent).toMatch(/not enforced/i)
    expect(badge.className).toMatch(/rose/)
  })

  it('renders an "unknown" badge distinct from "not enforced" and explicitly disambiguates the two', () => {
    renderWithSession(
      <TwoFactorEnforcementPanel
        org="acme"
        ownerType="Organization"
        sectionOverride={makeSection({ status: 'unknown' })}
      />,
    )
    const badge = screen.getByTestId('two-factor-status-unknown')
    expect(badge.textContent).toMatch(/unknown/i)
    expect(badge.textContent).not.toMatch(/not enforced/i)

    // The "unknown" explanation must call out that unknown ≠ not-enforced
    // (acceptance criterion from issue #286).
    const explain = screen.getByTestId('two-factor-unknown-explain')
    expect(explain.textContent).toMatch(/not the same as not enforced/i)
    expect(explain.textContent).toMatch(/organization owner/i)
  })

  it('tells owners how to read the flag — hint at the elevated-scope landing-page checkbox', () => {
    renderWithSession(
      <TwoFactorEnforcementPanel
        org="acme"
        ownerType="Organization"
        sectionOverride={makeSection({ status: 'unknown' })}
      />,
    )
    const explain = screen.getByTestId('two-factor-unknown-explain')
    expect(explain.textContent).toMatch(/read:org/)
    expect(explain.textContent).toMatch(/deeper GitHub permission/i)
    expect(explain.textContent).toMatch(/public_repo/)
  })
})

describe('TwoFactorEnforcementPanel — N/A for non-org targets', () => {
  it('renders an explicit N/A state and no status badge when applicability is not-applicable-non-org', () => {
    renderWithSession(
      <TwoFactorEnforcementPanel
        org={null}
        ownerType="User"
        sectionOverride={makeSection({
          applicability: 'not-applicable-non-org',
          status: null,
        })}
      />,
    )
    expect(screen.getByTestId('two-factor-na')).toBeInTheDocument()
    expect(screen.queryByTestId(/two-factor-status-/)).not.toBeInTheDocument()
  })
})

describe('TwoFactorEnforcementPanel — org-lookup-unavailable', () => {
  it('renders a labeled unavailable state with the reason', () => {
    renderWithSession(
      <TwoFactorEnforcementPanel
        org="acme"
        ownerType="Organization"
        sectionOverride={makeSection({
          applicability: 'org-lookup-unavailable',
          status: null,
          lookupUnavailableReason: 'rate-limited',
        })}
      />,
    )
    const el = screen.getByTestId('two-factor-unavailable')
    expect(el.textContent).toMatch(/could not be retrieved/i)
    expect(el.textContent).toMatch(/rate-limited/)
    expect(screen.queryByTestId(/two-factor-status-/)).not.toBeInTheDocument()
  })
})

describe('TwoFactorEnforcementPanel — collapse/expand', () => {
  it('hides description and body when collapsed, keeps the title and status badge visible', () => {
    renderWithSession(
      <TwoFactorEnforcementPanel
        org="acme"
        ownerType="Organization"
        sectionOverride={makeSection({ status: 'enforced' })}
      />,
    )

    expect(screen.getByText(/whether this organization requires/i)).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('two-factor-panel-toggle'))

    expect(screen.queryByText(/whether this organization requires/i)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /org 2fa enforcement/i })).toBeInTheDocument()
    // Status badge remains visible in collapsed state so the signal is still
    // readable at a glance — matches the pattern in StaleAdminsPanel.
    expect(screen.getByTestId('two-factor-status-enforced')).toBeInTheDocument()
  })
})

describe('TwoFactorEnforcementPanel — scoring help', () => {
  it('discloses that the value is read from GitHub and requires org-owner scope', () => {
    renderWithSession(
      <TwoFactorEnforcementPanel
        org="acme"
        ownerType="Organization"
        sectionOverride={makeSection({ status: 'unknown' })}
      />,
    )
    const help = screen.getByTestId('two-factor-scoring-help')
    expect(help.textContent).toMatch(/two_factor_requirement_enabled/)
    expect(help.textContent).toMatch(/organization owner/i)
    expect(help.textContent).toMatch(/observation-only/i)
  })
})

describe('TwoFactorEnforcementPanel — loading override', () => {
  it('shows a loading hint while override says loading', () => {
    renderWithSession(
      <TwoFactorEnforcementPanel
        org="acme"
        ownerType="Organization"
        sectionOverride={null}
        loadingOverride={true}
      />,
    )
    expect(screen.getByText(/loading 2fa status/i)).toBeInTheDocument()
  })
})
