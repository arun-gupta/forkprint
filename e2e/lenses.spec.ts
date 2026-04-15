import { expect, test } from '@playwright/test'

/**
 * Lenses: Community + Governance + click-to-filter (#196).
 *
 * Drives the full Lenses surface end-to-end against mocked /api/analyze
 * fixtures. Covers behaviors shipped in #70 (Community lens), #191
 * (Governance lens), and #200 (lens click-to-filter).
 */
test.describe('Lenses (Community + Governance + click-to-filter)', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass GitHub OAuth via the URL fragment shortcut used by other e2e specs.
    await page.goto('/#token=gho_test_token&username=test-user')
    await expect(page.getByText('test-user')).toBeVisible()
  })

  test('signal-rich repo: Lenses row + Community pill + tag pills across tabs', async ({ page }) => {
    await mockAnalyze(page, signalRichResult())
    await analyze(page, 'foo/rich')

    const overview = page.getByRole('region', { name: /metric cards overview/i })
    await expect(overview).toContainText('Lenses')
    await expect(overview.getByRole('button', { name: /community/i })).toBeVisible()
    await expect(overview.getByRole('button', { name: /community.*signals/i })).toBeVisible()

    await page.getByRole('tab', { name: 'Documentation' }).click()
    const docs = page.getByRole('region', { name: /documentation view/i })
    // Community-tagged rows: code_of_conduct, issue_templates, pull_request_template, governance
    await expect(docs).toContainText('CODE_OF_CONDUCT')
    await expect(docs).toContainText('Issue templates')
    await expect(docs).toContainText('PR template')
    await expect(docs).toContainText('GOVERNANCE')

    await page.getByRole('tab', { name: 'Contributors' }).click()
    const contributors = page.getByRole('region', { name: /contributors view/i })
    await expect(contributors).toContainText('Maintainer count')
    await expect(contributors).toContainText('Funding disclosure')

    await page.getByRole('tab', { name: 'Activity' }).click()
    const activity = page.getByRole('region', { name: /activity view/i })
    await expect(activity).toContainText('Discussions')
    await expect(activity).toContainText(/Enabled/)
  })

  test('signal-poor repo: lower percentile + Discussions Not enabled', async ({ page }) => {
    await mockAnalyze(page, signalPoorResult())
    await analyze(page, 'foo/poor')

    const overview = page.getByRole('region', { name: /metric cards overview/i })
    const communityPill = overview.getByRole('button', { name: /community/i })
    await expect(communityPill).toBeVisible()
    // Signal-poor: at most 1 of 6 signals → ratio low → 0th percentile expected
    await expect(communityPill).toContainText(/0th percentile/)

    await page.getByRole('tab', { name: 'Activity' }).click()
    const activity = page.getByRole('region', { name: /activity view/i })
    await expect(activity).toContainText('Not enabled')
  })

  test('Governance lens renders + governance tag pills appear across tabs', async ({ page }) => {
    await mockAnalyze(page, signalRichResult())
    await analyze(page, 'foo/rich')

    const overview = page.getByRole('region', { name: /metric cards overview/i })
    await expect(overview.getByRole('button', { name: /governance/i })).toBeVisible()
    await expect(overview.getByRole('button', { name: /governance.*signals/i })).toBeVisible()

    await page.getByRole('tab', { name: 'Documentation' }).click()
    const docs = page.getByRole('region', { name: /documentation view/i })
    await expect(docs).toContainText('LICENSE')
    await expect(docs).toContainText('CONTRIBUTING')
    await expect(docs).toContainText('SECURITY')
    await expect(docs).toContainText('CHANGELOG')

    await page.getByRole('tab', { name: 'Security' }).click()
    // Security view doesn't expose a region role — scope to the scorecard section.
    const scorecard = page.getByLabel('OpenSSF Scorecard Checks')
    await expect(scorecard).toContainText('Code-Review')
    await expect(scorecard).toContainText('Branch-Protection')
    await expect(page.getByLabel('Direct Security Checks')).toContainText('Branch Protection')
  })

  test('click-to-filter: clicking Community lens filters Documentation, click again clears', async ({ page }) => {
    await mockAnalyze(page, signalRichResult())
    await analyze(page, 'foo/rich')

    const overview = page.getByRole('region', { name: /metric cards overview/i })
    const communityPill = overview.getByRole('button', { name: /community/i })

    await communityPill.click()
    await expect(communityPill).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('tab', { name: 'Documentation' }).click()
    const docs = page.getByRole('region', { name: /documentation view/i })
    await expect(docs).toContainText(/Filtering by/i)
    await expect(docs).toContainText('community')
    // Governance-only rows should be hidden by the filter
    await expect(docs).not.toContainText('LICENSE')
    await expect(docs).not.toContainText('CHANGELOG')
    // Community-tagged rows still visible
    await expect(docs).toContainText('CODE_OF_CONDUCT')

    await page.getByRole('tab', { name: 'Overview' }).click()
    await communityPill.click()
    await expect(communityPill).toHaveAttribute('aria-pressed', 'false')

    await page.getByRole('tab', { name: 'Documentation' }).click()
    await expect(docs).not.toContainText(/Filtering by/i)
    await expect(docs).toContainText('LICENSE')
  })

  test('click-to-filter: Governance lens parity with in-tab governance TagPill', async ({ page }) => {
    await mockAnalyze(page, signalRichResult())
    await analyze(page, 'foo/rich')

    const overview = page.getByRole('region', { name: /metric cards overview/i })
    const govPill = overview.getByRole('button', { name: /governance/i })

    await govPill.click()
    await expect(govPill).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('tab', { name: 'Documentation' }).click()
    const docs = page.getByRole('region', { name: /documentation view/i })
    await expect(docs).toContainText(/Filtering by/i)
    // Governance-tagged rows visible
    await expect(docs).toContainText('LICENSE')
    await expect(docs).toContainText('CONTRIBUTING')
    // Issue templates is community-only, should be filtered out
    await expect(docs).not.toContainText('Issue templates')

    // Click an in-tab governance TagPill — should keep the same filter (toggle off
    // when matching) — verifies parity between lens-pill and TagPill drivers.
    await page.getByRole('tab', { name: 'Overview' }).click()
    await govPill.click()
    await expect(govPill).toHaveAttribute('aria-pressed', 'false')
  })
})

async function analyze(page: import('@playwright/test').Page, repo: string) {
  await page.getByRole('textbox', { name: /repository list/i }).fill(repo)
  await page.getByRole('button', { name: /analyze/i }).click()
  await expect(page.getByRole('region', { name: /metric cards overview/i })).toBeVisible()
}

async function mockAnalyze(page: import('@playwright/test').Page, result: Record<string, unknown>) {
  await page.route('**/api/analyze', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ results: [result], failures: [], rateLimit: null }),
    })
  })
}

function baseResult(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    repo: 'foo/rich',
    name: 'rich',
    description: 'A rich fixture',
    createdAt: '2020-01-01T00:00:00Z',
    primaryLanguage: 'TypeScript',
    stars: 1000,
    forks: 100,
    watchers: 50,
    commits30d: 10,
    commits90d: 30,
    releases12mo: 4,
    prsOpened90d: 8,
    prsMerged90d: 6,
    issuesOpen: 5,
    issuesClosed90d: 10,
    uniqueCommitAuthors90d: 'unavailable',
    totalContributors: 10,
    maintainerCount: 'unavailable',
    commitCountsByAuthor: 'unavailable',
    commitCountsByExperimentalOrg: 'unavailable',
    experimentalAttributedAuthors90d: 'unavailable',
    experimentalUnattributedAuthors90d: 'unavailable',
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    documentationResult: 'unavailable',
    licensingResult: 'unavailable',
    defaultBranchName: 'main',
    topics: [],
    inclusiveNamingResult: {
      defaultBranchName: 'main',
      branchCheck: { checkType: 'branch', term: 'main', passed: true, tier: null, severity: null, replacements: [], context: null },
      metadataChecks: [],
    },
    securityResult: 'unavailable',
    missingFields: [],
    ...overrides,
  }
}

function signalRichResult(): Record<string, unknown> {
  return baseResult({
    repo: 'foo/rich',
    maintainerCount: 3,
    hasIssueTemplates: true,
    hasPullRequestTemplate: true,
    hasFundingConfig: true,
    hasDiscussionsEnabled: true,
    discussionsCountWindow: 12,
    discussionsWindowDays: 90,
    documentationResult: {
      fileChecks: [
        { name: 'readme', found: true, path: 'README.md' },
        { name: 'license', found: true, path: 'LICENSE' },
        { name: 'contributing', found: true, path: 'CONTRIBUTING.md' },
        { name: 'code_of_conduct', found: true, path: 'CODE_OF_CONDUCT.md' },
        { name: 'security', found: true, path: 'SECURITY.md' },
        { name: 'changelog', found: true, path: 'CHANGELOG.md' },
        { name: 'issue_templates', found: true, path: '.github/ISSUE_TEMPLATE/' },
        { name: 'pull_request_template', found: true, path: '.github/PULL_REQUEST_TEMPLATE.md' },
        { name: 'governance', found: true, path: 'GOVERNANCE.md' },
      ],
      readmeSections: [],
      readmeContent: null,
    },
    securityResult: {
      scorecard: {
        overallScore: 8,
        checks: [
          { name: 'Code-Review', score: 9, reason: 'reviews enforced' },
          { name: 'Branch-Protection', score: 9, reason: 'protected' },
        ],
        scorecardVersion: 'v4',
      },
      directChecks: [
        { name: 'branch_protection', detected: true, details: 'main protected' },
        { name: 'security_policy', detected: true, details: null },
      ],
      branchProtectionEnabled: true,
    },
  })
}

function signalPoorResult(): Record<string, unknown> {
  return baseResult({
    repo: 'foo/poor',
    maintainerCount: 0,
    hasIssueTemplates: false,
    hasPullRequestTemplate: false,
    hasFundingConfig: false,
    hasDiscussionsEnabled: false,
    documentationResult: {
      fileChecks: [
        { name: 'readme', found: true, path: 'README.md' },
        { name: 'license', found: false, path: null },
        { name: 'contributing', found: false, path: null },
        { name: 'code_of_conduct', found: false, path: null },
        { name: 'security', found: false, path: null },
        { name: 'changelog', found: false, path: null },
        { name: 'governance', found: false, path: null },
      ],
      readmeSections: [],
      readmeContent: null,
    },
  })
}
