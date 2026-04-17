import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthProvider } from '@/components/auth/AuthContext'
import { OrgBucketContent } from './OrgBucketContent'
import type { OrgSummaryViewModel } from '@/lib/org-aggregation/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

// Mock the registry's renderPanel + isRealPanel so we don't depend on
// every aggregator's data shape — this test isolates OrgBucketContent's
// extra-panel injection + render-order logic, not panel internals.
vi.mock('./panels/registry', async () => {
  const actual = await vi.importActual<typeof import('./panels/registry')>('./panels/registry')
  return {
    ...actual,
    isRealPanel: () => true,
    renderPanel: (panelId: string) => (
      <div data-testid={`mock-panel-${panelId}`}>{panelId}</div>
    ),
  }
})

function emptyView(): OrgSummaryViewModel {
  return {
    status: {
      status: 'complete',
      total: 0,
      succeeded: 0,
      failed: 0,
      inProgress: 0,
      queued: 0,
      pause: null,
      etaMs: null,
      elapsedMs: 0,
      concurrency: { chosen: 1, max: 1 },
    },
    flagshipRepos: [],
    panels: {},
    missingData: [],
    perRepoStatusList: [],
  }
}

function viewWithGovernancePanels(): OrgSummaryViewModel {
  // Three minimal panel records — keys are what registry's `governance`
  // bucket lists. The mocked renderPanel ignores the value, so we only
  // need the keys to be present on `view.panels`.
  return {
    ...emptyView(),
    panels: {
      maintainers: { panelId: 'maintainers', contributingReposCount: 1, totalReposInRun: 1, status: 'final', value: null },
      governance: { panelId: 'governance', contributingReposCount: 1, totalReposInRun: 1, status: 'final', value: null },
      'license-consistency': { panelId: 'license-consistency', contributingReposCount: 1, totalReposInRun: 1, status: 'final', value: null },
    },
  }
}

function renderWithSession(ui: React.ReactElement) {
  return render(
    <AuthProvider initialSession={{ token: 't', username: 'u', scopes: ['public_repo'] }}>
      {ui}
    </AuthProvider>,
  )
}

describe('OrgBucketContent — StaleAdminsPanel migration (#303)', () => {
  it('does NOT render StaleAdminsPanel when bucketId is documentation', () => {
    renderWithSession(<OrgBucketContent bucketId="documentation" view={emptyView()} org="acme" />)
    expect(screen.queryByTestId('stale-admins-panel')).not.toBeInTheDocument()
  })

  it('renders StaleAdminsPanel when bucketId is governance and ownerType is Organization', () => {
    renderWithSession(<OrgBucketContent bucketId="governance" view={emptyView()} org="acme" />)
    expect(screen.getByTestId('stale-admins-panel')).toBeInTheDocument()
  })

  it('renders StaleAdminsPanel even when ownerType is User (org=null) — its own N/A rendering is its responsibility', () => {
    renderWithSession(<OrgBucketContent bucketId="governance" view={emptyView()} org={null} />)
    expect(screen.getByTestId('stale-admins-panel')).toBeInTheDocument()
  })

  it('does NOT render StaleAdminsPanel under any non-governance bucket', () => {
    for (const bucketId of ['contributors', 'activity', 'responsiveness', 'documentation', 'security'] as const) {
      const { unmount } = renderWithSession(<OrgBucketContent bucketId={bucketId} view={emptyView()} org="acme" />)
      expect(screen.queryByTestId('stale-admins-panel')).not.toBeInTheDocument()
      unmount()
    }
  })
})

describe('OrgBucketContent — pre-analysis governance rendering (#286)', () => {
  it('renders TwoFactorEnforcementPanel and StaleAdminsPanel when view is null — org-level panels self-fetch', () => {
    renderWithSession(<OrgBucketContent bucketId="governance" view={null} org="acme" />)
    expect(screen.getByTestId('two-factor-panel')).toBeInTheDocument()
    expect(screen.getByTestId('stale-admins-panel')).toBeInTheDocument()
  })

  it('renders no rollup panels when view is null (nothing to aggregate yet)', () => {
    renderWithSession(<OrgBucketContent bucketId="governance" view={null} org="acme" />)
    // Registry-driven rollup panels rely on view.panels — none should appear.
    expect(screen.queryByTestId('mock-panel-maintainers')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mock-panel-license-consistency')).not.toBeInTheDocument()
  })

  it('renders the empty-state hint when view is null and bucket has no extra panels (e.g. activity)', () => {
    renderWithSession(<OrgBucketContent bucketId="activity" view={null} org="acme" />)
    expect(screen.getByText(/no data available/i)).toBeInTheDocument()
  })
})

describe('OrgBucketContent — TwoFactorEnforcementPanel wiring (#286)', () => {
  it('does NOT render TwoFactorEnforcementPanel when bucketId is documentation', () => {
    renderWithSession(<OrgBucketContent bucketId="documentation" view={emptyView()} org="acme" />)
    expect(screen.queryByTestId('two-factor-panel')).not.toBeInTheDocument()
  })

  it('renders TwoFactorEnforcementPanel when bucketId is governance and ownerType is Organization', () => {
    renderWithSession(<OrgBucketContent bucketId="governance" view={emptyView()} org="acme" />)
    expect(screen.getByTestId('two-factor-panel')).toBeInTheDocument()
  })

  it('renders TwoFactorEnforcementPanel even when ownerType is User (org=null) — its own N/A rendering is its responsibility', () => {
    renderWithSession(<OrgBucketContent bucketId="governance" view={emptyView()} org={null} />)
    expect(screen.getByTestId('two-factor-panel')).toBeInTheDocument()
  })

  it('does NOT render TwoFactorEnforcementPanel under any non-governance bucket', () => {
    for (const bucketId of ['contributors', 'activity', 'responsiveness', 'documentation', 'security'] as const) {
      const { unmount } = renderWithSession(<OrgBucketContent bucketId={bucketId} view={emptyView()} org="acme" />)
      expect(screen.queryByTestId('two-factor-panel')).not.toBeInTheDocument()
      unmount()
    }
  })

  it('renders TwoFactorEnforcementPanel BEFORE StaleAdminsPanel so both org-level signals sit at the top of Governance', () => {
    renderWithSession(<OrgBucketContent bucketId="governance" view={emptyView()} org="acme" />)

    const twoFactorNode = screen.getByTestId('two-factor-panel')
    const staleAdminsNode = screen.getByTestId('stale-admins-panel')

    const positionRelation = twoFactorNode.compareDocumentPosition(staleAdminsNode)
    expect(positionRelation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('OrgBucketContent — risk-first panel order in Governance (#303 US3)', () => {
  it('renders StaleAdminsPanel BEFORE registry-driven panels', () => {
    renderWithSession(<OrgBucketContent bucketId="governance" view={viewWithGovernancePanels()} org="acme" />)

    const staleAdminsNode = screen.getByTestId('stale-admins-panel')
    const maintainersNode = screen.getByTestId('mock-panel-maintainers')

    // compareDocumentPosition returns DOCUMENT_POSITION_FOLLOWING (4) when
    // the second arg comes after the first in document order.
    const positionRelation = staleAdminsNode.compareDocumentPosition(maintainersNode)
    expect(positionRelation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders the three registry-driven panels in the documented risk-first order', () => {
    renderWithSession(<OrgBucketContent bucketId="governance" view={viewWithGovernancePanels()} org="acme" />)

    const maintainers = screen.getByTestId('mock-panel-maintainers')
    const governance = screen.getByTestId('mock-panel-governance')
    const license = screen.getByTestId('mock-panel-license-consistency')

    expect(maintainers.compareDocumentPosition(governance) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(governance.compareDocumentPosition(license) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('preserves relative panel order when ownerType is User (StaleAdminsPanel still slot-first)', () => {
    renderWithSession(<OrgBucketContent bucketId="governance" view={viewWithGovernancePanels()} org={null} />)

    const staleAdminsNode = screen.getByTestId('stale-admins-panel')
    const maintainers = screen.getByTestId('mock-panel-maintainers')
    const governance = screen.getByTestId('mock-panel-governance')
    const license = screen.getByTestId('mock-panel-license-consistency')

    expect(staleAdminsNode.compareDocumentPosition(maintainers) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(maintainers.compareDocumentPosition(governance) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(governance.compareDocumentPosition(license) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
