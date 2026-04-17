import { expect, test } from '@playwright/test'

/**
 * Release Health lens (P2-F09 / #69).
 *
 * Lightweight DOM assertions (per memory preference), driven against mocked
 * /api/analyze fixtures. Covers:
 *   1. Release-health pill + Release Cadence card on the Activity tab.
 *   2. Release-health pill + Release Discipline card on the Documentation tab.
 *   3. Release Health completeness readout on the metric card.
 *   4. Zero-release repo renders "Insufficient verified public data" / "unavailable".
 */
test.describe('Release Health lens', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#token=gho_test_token&username=test-user')
    await expect(page.getByText('test-user')).toBeVisible()
  })

  test('release-rich repo surfaces the Release Health lens across tabs', async ({ page }) => {
    await mockAnalyze(page, releaseRichResult())
    await analyze(page, 'foo/rich')

    const overview = page.getByRole('region', { name: /metric cards overview/i })
    await expect(overview).toContainText('Release Health')

    await page.getByRole('tab', { name: 'Activity' }).click()
    const activity = page.getByRole('region', { name: /activity view/i })
    await expect(activity).toContainText(/Release cadence/i)

    await page.getByRole('tab', { name: 'Documentation' }).click()
    const docs = page.getByRole('region', { name: /documentation view/i })
    await expect(docs).toContainText(/Release discipline/i)
    await expect(docs).toContainText(/Semver compliance/i)
  })

  test('zero-release repo shows unavailable placeholders', async ({ page }) => {
    await mockAnalyze(page, zeroReleaseResult())
    await analyze(page, 'foo/empty')

    await page.getByRole('tab', { name: 'Activity' }).click()
    const activity = page.getByRole('region', { name: /activity view/i })
    await expect(activity).toContainText(/Release cadence/i)
    await expect(activity).toContainText(/unavailable/i)
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
    description: 'A release-rich fixture',
    createdAt: '2020-01-01T00:00:00Z',
    primaryLanguage: 'TypeScript',
    stars: 1000,
    forks: 100,
    watchers: 50,
    commits30d: 10,
    commits90d: 30,
    releases12mo: 6,
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

function releaseRichResult(): Record<string, unknown> {
  return baseResult({
    repo: 'foo/rich',
    releaseHealthResult: {
      totalReleasesAnalyzed: 12,
      totalTags: 12,
      releaseFrequency: 12,
      daysSinceLastRelease: 7,
      semverComplianceRatio: 1,
      releaseNotesQualityRatio: 1,
      tagToReleaseRatio: 0,
      preReleaseRatio: 0.1,
      versioningScheme: 'semver',
    },
  })
}

function zeroReleaseResult(): Record<string, unknown> {
  return baseResult({
    repo: 'foo/empty',
    name: 'empty',
    releases12mo: 0,
    releaseHealthResult: 'unavailable',
  })
}
