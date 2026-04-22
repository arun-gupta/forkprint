import { expect, test } from '@playwright/test'

/**
 * CNCF Aspirant Guidance E2E tests.
 *
 * All tests mock /api/analyze so no real network calls are made.
 * Auth is bypassed via the URL fragment shortcut (/#token=…&username=…)
 * used throughout the existing e2e suite.
 */

// ---------------------------------------------------------------------------
// Shared fixture helpers
// ---------------------------------------------------------------------------

/** Minimal base repo result shape expected by the analysis response. */
function baseResult(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    repo: 'kubernetes/kubernetes',
    name: 'kubernetes',
    description: 'Production-Grade Container Scheduling and Management',
    createdAt: '2014-06-06T22:56:04Z',
    primaryLanguage: 'Go',
    stars: 110000,
    forks: 39000,
    watchers: 3200,
    commits30d: 120,
    commits90d: 400,
    releases12mo: 12,
    prsOpened90d: 600,
    prsMerged90d: 500,
    issuesOpen: 2500,
    issuesClosed90d: 800,
    activityMetricsByWindow: {
      30: { commits: 120, prsOpened: 200, prsMerged: 180, issuesOpened: 300, issuesClosed: 250, releases: 1, staleIssueRatio: 0.1, medianTimeToMergeHours: 24, medianTimeToCloseHours: 48 },
      60: { commits: 250, prsOpened: 400, prsMerged: 360, issuesOpened: 600, issuesClosed: 500, releases: 2, staleIssueRatio: 0.1, medianTimeToMergeHours: 24, medianTimeToCloseHours: 48 },
      90: { commits: 400, prsOpened: 600, prsMerged: 500, issuesOpened: 900, issuesClosed: 800, releases: 3, staleIssueRatio: 0.1, medianTimeToMergeHours: 24, medianTimeToCloseHours: 48 },
      180: { commits: 700, prsOpened: 1100, prsMerged: 900, issuesOpened: 1600, issuesClosed: 1400, releases: 6, staleIssueRatio: 0.1, medianTimeToMergeHours: 24, medianTimeToCloseHours: 48 },
      365: { commits: 1400, prsOpened: 2000, prsMerged: 1800, issuesOpened: 3000, issuesClosed: 2600, releases: 12, staleIssueRatio: 0.1, medianTimeToMergeHours: 24, medianTimeToCloseHours: 48 },
    },
    uniqueCommitAuthors90d: 180,
    totalContributors: 3700,
    maintainerCount: 12,
    commitCountsByAuthor: 'unavailable',
    commitCountsByExperimentalOrg: 'unavailable',
    experimentalAttributedAuthors90d: 'unavailable',
    experimentalUnattributedAuthors90d: 'unavailable',
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    topics: ['kubernetes', 'containers', 'go'],
    defaultBranchName: 'main',
    documentationResult: {
      fileChecks: [
        { name: 'readme', found: true, path: 'README.md' },
        { name: 'license', found: true, path: 'LICENSE' },
        { name: 'contributing', found: true, path: 'CONTRIBUTING.md' },
        { name: 'code_of_conduct', found: true, path: 'code-of-conduct.md' },
        { name: 'security', found: true, path: 'SECURITY_CONTACTS' },
        { name: 'changelog', found: false, path: null },
        { name: 'governance', found: true, path: 'GOVERNANCE.md' },
        { name: 'issue_templates', found: true, path: '.github/ISSUE_TEMPLATE/' },
        { name: 'pull_request_template', found: true, path: '.github/PULL_REQUEST_TEMPLATE.md' },
      ],
      readmeSections: [],
      readmeContent: null,
    },
    licensingResult: 'unavailable',
    inclusiveNamingResult: {
      defaultBranchName: 'main',
      branchCheck: { checkType: 'branch', term: 'main', passed: true, tier: null, severity: null, replacements: [], context: null },
      metadataChecks: [],
    },
    securityResult: {
      scorecard: {
        overallScore: 8,
        checks: [
          { name: 'Code-Review', score: 9, reason: 'reviews enforced' },
          { name: 'Branch-Protection', score: 8, reason: 'main protected' },
        ],
        scorecardVersion: 'v4',
      },
      directChecks: [
        { name: 'branch_protection', detected: true, details: 'main is protected' },
        { name: 'security_policy', detected: true, details: null },
      ],
      branchProtectionEnabled: true,
    },
    missingFields: [],
    ...overrides,
  }
}

/** aspirantResult fixture for SC-001 / SC-012 — score 72, mix of statuses. */
function aspirantResultFixture(): Record<string, unknown> {
  return {
    foundationTarget: 'cncf-sandbox',
    readinessScore: 72,
    readyCount: 6,
    totalAutoCheckable: 11,
    alreadyInLandscape: false,
    autoFields: [
      { id: 'readme',             label: 'README',             status: 'ready',   weight: 8,  pointsEarned: 8,  homeTab: 'documentation' },
      { id: 'license',            label: 'License (OSI)',       status: 'ready',   weight: 10, pointsEarned: 10, homeTab: 'documentation' },
      { id: 'contributing',       label: 'CONTRIBUTING',        status: 'ready',   weight: 7,  pointsEarned: 7,  homeTab: 'documentation' },
      { id: 'code_of_conduct',    label: 'Code of Conduct',     status: 'ready',   weight: 7,  pointsEarned: 7,  homeTab: 'documentation' },
      { id: 'security',           label: 'Security Policy',     status: 'ready',   weight: 8,  pointsEarned: 8,  homeTab: 'security' },
      { id: 'governance',         label: 'GOVERNANCE',          status: 'ready',   weight: 8,  pointsEarned: 8,  homeTab: 'documentation' },
      { id: 'changelog',          label: 'CHANGELOG',           status: 'missing', weight: 5,  pointsEarned: 0,  homeTab: 'documentation', remediationHint: 'Add a CHANGELOG.md to track releases.' },
      { id: 'scorecard',          label: 'OpenSSF Scorecard ≥ 5', status: 'partial', weight: 10, pointsEarned: 5, homeTab: 'security', evidence: 'Score: 8 / 10' },
      { id: 'branch_protection',  label: 'Branch Protection',   status: 'ready',   weight: 7,  pointsEarned: 7,  homeTab: 'security' },
      { id: 'stars',              label: 'Stars ≥ 300',         status: 'missing', weight: 5,  pointsEarned: 0 },
      { id: 'adopters',           label: 'ADOPTERS / case studies', status: 'missing', weight: 5, pointsEarned: 0, homeTab: 'documentation', remediationHint: 'Add an ADOPTERS.md file.' },
    ],
    humanOnlyFields: [
      { id: 'production_usage',   label: 'Production Usage',  status: 'human-only', weight: 0, pointsEarned: 0, explanatoryNote: 'Describe real-world production deployments.' },
      { id: 'due_diligence',      label: 'Due Diligence Doc', status: 'human-only', weight: 0, pointsEarned: 0, explanatoryNote: 'Prepare the DD document per CNCF template.' },
    ],
    tagRecommendation: {
      primaryTag: 'tag-operational-resilience',
      matchedSignals: ['containers', 'kubernetes'],
      fallbackNote: null,
    },
    sandboxApplication: null,
  }
}

/** Full mocked analyze response for SC-001 / SC-012. */
function aspirantAnalyzeResponse(): Record<string, unknown> {
  return {
    results: [
      baseResult({ aspirantResult: aspirantResultFixture() }),
    ],
    failures: [],
    rateLimit: null,
  }
}

/** Mocked analyze response for SC-008 — landscape override, no aspirantResult. */
function landscapeAnalyzeResponse(): Record<string, unknown> {
  return {
    results: [
      baseResult({ landscapeOverride: true, aspirantResult: null }),
    ],
    failures: [],
    rateLimit: null,
  }
}

async function mockAnalyze(page: import('@playwright/test').Page, body: Record<string, unknown>) {
  await page.route('**/api/analyze', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

async function analyze(page: import('@playwright/test').Page, repo: string) {
  await page.getByRole('textbox', { name: /repository list/i }).fill(repo)
  await page.getByRole('button', { name: /analyze/i }).click()
  // Wait for the overview metric cards to appear as a signal that analysis completed.
  await expect(page.getByRole('region', { name: /metric cards overview/i })).toBeVisible()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('CNCF Aspirant Guidance', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass GitHub OAuth via the URL fragment shortcut used by the rest of the e2e suite.
    await page.goto('/#token=gho_test_token&username=test-user')
    await expect(page.getByText('test-user')).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // SC-001 — Selector → pill + tab appear after analysis
  // -------------------------------------------------------------------------
  test('SC-001: CNCF Readiness pill and tab appear after selecting CNCF Sandbox and analyzing', async ({ page }) => {
    await mockAnalyze(page, aspirantAnalyzeResponse())

    // Select foundation target
    await page.selectOption('#foundation-target', 'cncf-sandbox')

    await analyze(page, 'kubernetes/kubernetes')

    // Pill visible in Overview tab area
    const readinessPill = page.getByRole('button', { name: /CNCF Sandbox Readiness/i })
    await expect(readinessPill).toBeVisible()
    // Pill contains the score
    await expect(readinessPill).toContainText('72')

    // CNCF Readiness tab exists somewhere in the tab strip (may be in overflow "More" dropdown).
    // The tab is rendered with role="tab" inside the tablist — including those inside the overflow menu.
    // Open the "More" overflow menu if it is present so the tab button becomes accessible.
    const moreButton = page.getByRole('tablist').getByRole('button', { name: /More/i })
    if (await moreButton.count() > 0) {
      await moreButton.click()
    }
    const cncfTab = page.getByRole('tab', { name: /CNCF Readiness/i })
    await expect(cncfTab).toBeVisible()

    // Clicking the CNCF Readiness pill also navigates to the tab — use it to switch.
    // (Close the overflow menu first by pressing Escape, if open.)
    await page.keyboard.press('Escape')
    await readinessPill.click()

    // Heading and score present in the tab content.
    // The tab renders inside a div with data-tab-content="cncf-readiness".
    const cncfTabContent = page.locator('[data-tab-content="cncf-readiness"]')
    await expect(cncfTabContent.getByText(/Targeting: CNCF Sandbox/i)).toBeVisible()
    await expect(cncfTabContent.getByText(/72 \/ 100/)).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // SC-008 — Landscape repo does NOT enter aspirant mode
  // -------------------------------------------------------------------------
  test('SC-008: Already-in-landscape repo does not show CNCF Readiness tab and shows override message', async ({ page }) => {
    await mockAnalyze(page, landscapeAnalyzeResponse())

    await page.selectOption('#foundation-target', 'cncf-sandbox')
    await analyze(page, 'kubernetes/kubernetes')

    // CNCF Readiness tab must NOT appear
    await expect(page.getByRole('tab', { name: /CNCF Readiness/i })).toHaveCount(0)

    // Landscape override message visible in Overview
    await expect(page.getByText(/already a CNCF Sandbox/i)).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // SC-012 — CNCF field pills present in domain tabs when active
  // -------------------------------------------------------------------------
  test('SC-012: CNCF field pills appear in Documentation and Security tabs when aspirantResult is active', async ({ page }) => {
    await mockAnalyze(page, aspirantAnalyzeResponse())

    await page.selectOption('#foundation-target', 'cncf-sandbox')
    await analyze(page, 'kubernetes/kubernetes')

    // Navigate to Documentation tab (visible within first 6 tabs — no overflow needed)
    await page.getByRole('tab', { name: 'Documentation' }).click()
    const docsRegion = page.getByRole('region', { name: /documentation view/i })
    // At least one CNCFFieldPill span (text "CNCF") must appear in the documentation view.
    const docsCncfPills = docsRegion.locator('span').filter({ hasText: /CNCF/ })
    await expect(docsCncfPills.first()).toBeVisible()

    // Navigate to Security tab (also within first 6)
    await page.getByRole('tab', { name: 'Security' }).click()
    // The Security view renders CNCF pills next to direct checks (e.g. security_policy → 'security' field).
    // Wait for the direct checks section to be visible, then check for a CNCF pill.
    await expect(page.getByLabel('Direct Security Checks')).toBeVisible()
    const securityCncfPills = page.getByLabel('Direct Security Checks').locator('span').filter({ hasText: /CNCF/ })
    await expect(securityCncfPills.first()).toBeVisible()
  })
})
