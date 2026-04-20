import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthProvider } from '@/components/auth/AuthContext'
import { MemberPermissionDistributionPanel } from './MemberPermissionDistributionPanel'
import type { MemberPermissionDistributionSection, PermissionFlag } from '@/lib/governance/member-permissions'

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

function makeSection(overrides: Partial<MemberPermissionDistributionSection> = {}): MemberPermissionDistributionSection {
  return {
    kind: 'member-permission-distribution',
    applicability: 'applicable',
    memberCount: 8,
    outsideCollaboratorCount: 1,
    unavailableReasons: [],
    resolvedAt: '2026-04-20T00:00:00Z',
    ...overrides,
  }
}

const BASE_PROPS = { org: 'acme', ownerType: 'Organization' as const, adminCount: 2 }

// ── US1: Role distribution display ───────────────────────────────────────────

describe('MemberPermissionDistributionPanel — role distribution (US1)', () => {
  it('renders the panel title', () => {
    renderWithSession(
      <MemberPermissionDistributionPanel
        {...BASE_PROPS}
        sectionOverride={makeSection()}
      />,
    )
    expect(screen.getByText(/member permission distribution/i)).toBeTruthy()
  })

  it('shows admin, member, and outside-collaborator counts', () => {
    // adminCount=2, memberCount=8, outsideCollaboratorCount=1
    renderWithSession(
      <MemberPermissionDistributionPanel
        {...BASE_PROPS}
        sectionOverride={makeSection()}
      />,
    )
    expect(screen.getByTestId('perm-admin-count').textContent).toMatch(/2/)
    expect(screen.getByTestId('perm-member-count').textContent).toMatch(/8/)
    expect(screen.getByTestId('perm-collab-count').textContent).toMatch(/1/)
  })

  it('shows admin percentage', () => {
    // 2 admins in 11 total (2+8+1) = ~18%
    renderWithSession(
      <MemberPermissionDistributionPanel
        {...BASE_PROPS}
        sectionOverride={makeSection()}
      />,
    )
    expect(screen.getByTestId('perm-admin-pct').textContent).toMatch(/18%/)
  })

  it('renders N/A state for non-org input', () => {
    renderWithSession(
      <MemberPermissionDistributionPanel
        {...BASE_PROPS}
        sectionOverride={makeSection({ applicability: 'not-applicable-non-org' })}
      />,
    )
    expect(screen.getByTestId('perm-na')).toBeTruthy()
  })

  it('renders "Unavailable" (not zero) when member list is unavailable', () => {
    renderWithSession(
      <MemberPermissionDistributionPanel
        {...BASE_PROPS}
        adminCount={null}
        sectionOverride={makeSection({ applicability: 'member-list-unavailable', memberCount: null })}
      />,
    )
    expect(screen.getByTestId('perm-unavailable')).toBeTruthy()
    expect(screen.queryByTestId('perm-admin-count')).toBeNull()
  })

  it('shows loading text while loading', () => {
    renderWithSession(
      <MemberPermissionDistributionPanel
        {...BASE_PROPS}
        loadingOverride={true}
      />,
    )
    expect(screen.getByTestId('perm-loading')).toBeTruthy()
  })
})

// ── US2: Admin-heavy flag ─────────────────────────────────────────────────────

describe('MemberPermissionDistributionPanel — admin-heavy flag (US2)', () => {
  function flagSection(flag: PermissionFlag): MemberPermissionDistributionSection {
    return makeSection({ flag })
  }

  it('renders a flag badge when section.flag is present', () => {
    renderWithSession(
      <MemberPermissionDistributionPanel
        {...BASE_PROPS}
        adminCount={15}
        sectionOverride={flagSection({
          kind: 'admin-heavy',
          thresholdBreached: 'ratio',
          message: 'Admin ratio (15%) exceeds 10% threshold',
        })}
      />,
    )
    expect(screen.getByTestId('perm-flag-badge')).toBeTruthy()
    expect(screen.getByTestId('perm-flag-badge').textContent).toMatch(/admin ratio/i)
  })

  it('does not render a flag badge when section.flag is null', () => {
    renderWithSession(
      <MemberPermissionDistributionPanel
        {...BASE_PROPS}
        sectionOverride={makeSection({ flag: null })}
      />,
    )
    expect(screen.queryByTestId('perm-flag-badge')).toBeNull()
  })

  it('shows flag message text', () => {
    renderWithSession(
      <MemberPermissionDistributionPanel
        {...BASE_PROPS}
        sectionOverride={flagSection({
          kind: 'admin-heavy',
          thresholdBreached: 'absolute-count',
          message: '6 admins in an org of 20 exceeds the small-org threshold',
        })}
      />,
    )
    expect(screen.getByTestId('perm-flag-badge').textContent).toMatch(/small-org threshold/i)
  })
})

// ── US3: Links to member lists ────────────────────────────────────────────────

describe('MemberPermissionDistributionPanel — role links (US3)', () => {
  it('renders a link for the admin count pointing to the GitHub admin members page', () => {
    renderWithSession(
      <MemberPermissionDistributionPanel
        {...BASE_PROPS}
        sectionOverride={makeSection()}
      />,
    )
    const link = screen.getByTestId('perm-admin-link') as HTMLAnchorElement
    expect(link.href).toContain('github.com/orgs/acme/people')
    expect(link.target).toBe('_blank')
  })

  it('renders a link for the member count', () => {
    renderWithSession(
      <MemberPermissionDistributionPanel
        {...BASE_PROPS}
        sectionOverride={makeSection()}
      />,
    )
    const link = screen.getByTestId('perm-member-link') as HTMLAnchorElement
    expect(link.href).toContain('github.com/orgs/acme/people')
    expect(link.target).toBe('_blank')
  })

  it('renders no links in N/A state', () => {
    renderWithSession(
      <MemberPermissionDistributionPanel
        {...BASE_PROPS}
        sectionOverride={makeSection({ applicability: 'not-applicable-non-org' })}
      />,
    )
    expect(screen.queryByTestId('perm-admin-link')).toBeNull()
    expect(screen.queryByTestId('perm-member-link')).toBeNull()
  })
})
