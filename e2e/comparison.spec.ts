import { expect, test } from '@playwright/test'

test.describe('P1-F06 Repo Comparison', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')

    if ((await page.getByLabel(/github personal access token/i).count()) > 0) {
      await page.getByLabel(/github personal access token/i).fill('ghp_example')
    }

    await page.route('**/api/analyze', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            buildResult('facebook/react', { stars: 200, forks: 40 }),
            buildResult('vercel/next.js', { stars: 120, forks: 12 }),
          ],
          failures: [],
          rateLimit: null,
        }),
      })
    })
  })

  test('Analyze with 2 repos auto-populates the Comparison tab', async ({ page }) => {
    let requestCount = 0
    await page.route('**/api/analyze', async (route) => {
      requestCount += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            buildResult('facebook/react', { stars: 200, forks: 40 }),
            buildResult('vercel/next.js', { stars: 120, forks: 12 }),
          ],
          failures: [],
          rateLimit: null,
        }),
      })
    })

    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react, vercel/next.js')
    await page.getByRole('button', { name: /analyze/i }).click()

    await page.getByRole('tab', { name: 'Comparison' }).click()
    await expect(page.getByRole('region', { name: /comparison view/i })).toBeVisible()
    expect(requestCount).toBe(1)
  })

  test('renders grouped sections and repo columns in the comparison table', async ({ page }) => {
    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react, vercel/next.js')
    await page.getByRole('button', { name: /analyze/i }).click()

    await page.getByRole('tab', { name: 'Comparison' }).click()

    const comparisonView = page.getByRole('region', { name: /comparison view/i })
    await expect(comparisonView).toBeVisible()
    await expect(comparisonView.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(comparisonView.getByRole('heading', { name: 'Activity' })).toBeVisible()
    await expect(comparisonView.getByRole('button', { name: /facebook\/react/i }).first()).toBeVisible()
    await expect(comparisonView.getByRole('button', { name: /vercel\/next\.js/i }).first()).toBeVisible()
  })

  test('changing the anchor repo updates deltas without rerunning analysis', async ({ page }) => {
    let requestCount = 0
    await page.route('**/api/analyze', async (route) => {
      requestCount += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            buildResult('facebook/react', { stars: 200, forks: 40 }),
            buildResult('vercel/next.js', { stars: 120, forks: 12 }),
          ],
          failures: [],
          rateLimit: null,
        }),
      })
    })

    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react, vercel/next.js')
    await page.getByRole('button', { name: /analyze/i }).click()
    await page.getByRole('tab', { name: 'Comparison' }).click()

    const anchorSelect = page.getByLabel(/anchor repo/i)
    await expect(anchorSelect).toHaveValue('facebook/react')

    await anchorSelect.selectOption('vercel/next.js')
    await expect(anchorSelect).toHaveValue('vercel/next.js')

    expect(requestCount).toBe(1)
  })

  test('toggling the median column hides and shows the median header', async ({ page }) => {
    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react, vercel/next.js')
    await page.getByRole('button', { name: /analyze/i }).click()
    await page.getByRole('tab', { name: 'Comparison' }).click()

    const comparisonView = page.getByRole('region', { name: /comparison view/i })
    await expect(comparisonView.getByRole('button', { name: /median/i }).first()).toBeVisible()

    await page.getByRole('checkbox', { name: /show median column/i }).click()
    await expect(comparisonView.getByRole('button', { name: /median/i })).toHaveCount(0)
  })

  test('disabling a section removes its heading from the table', async ({ page }) => {
    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react, vercel/next.js')
    await page.getByRole('button', { name: /analyze/i }).click()
    await page.getByRole('tab', { name: 'Comparison' }).click()

    const comparisonView = page.getByRole('region', { name: /comparison view/i })
    await expect(comparisonView.getByRole('heading', { name: 'Activity' })).toBeVisible()

    await page.getByRole('button', { name: /sections & attributes/i }).click()
    await page.getByRole('checkbox', { name: 'Activity' }).click()
    await expect(comparisonView.getByRole('heading', { name: 'Activity' })).toHaveCount(0)
  })

  test('shows placeholder on Comparison tab when fewer than two repos are analyzed', async ({ page }) => {
    await page.route('**/api/analyze', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [buildResult('facebook/react', {})],
          failures: [],
          rateLimit: null,
        }),
      })
    })

    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react')
    await page.getByRole('button', { name: /analyze/i }).click()

    await page.getByRole('tab', { name: 'Comparison' }).click()
    await expect(page.getByText(/enter 2 or more repositories/i)).toBeVisible()
  })
})

function buildResult(repo: string, overrides: Record<string, unknown>) {
  return {
    repo,
    name: repo.split('/')[1] ?? repo,
    description: 'Repo description',
    createdAt: '2013-05-24T16:15:54Z',
    primaryLanguage: 'TypeScript',
    stars: 100,
    forks: 25,
    watchers: 10,
    commits30d: 7,
    commits90d: 18,
    releases12mo: 6,
    prsOpened90d: 4,
    prsMerged90d: 3,
    issuesOpen: 5,
    issuesClosed90d: 6,
    uniqueCommitAuthors90d: 5,
    totalContributors: 12,
    maintainerCount: 'unavailable',
    commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3 },
    contributorMetricsByWindow: {
      30: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      60: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      90: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      180: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      365: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
    },
    activityMetricsByWindow: {
      30: { commits: 7, prsOpened: 2, prsMerged: 1, issuesOpened: 4, issuesClosed: 3, releases: 1, staleIssueRatio: 0.1, medianTimeToMergeHours: 12, medianTimeToCloseHours: 24 },
      60: { commits: 12, prsOpened: 3, prsMerged: 2, issuesOpened: 6, issuesClosed: 5, releases: 2, staleIssueRatio: 0.15, medianTimeToMergeHours: 18, medianTimeToCloseHours: 30 },
      90: { commits: 18, prsOpened: 4, prsMerged: 3, issuesOpened: 8, issuesClosed: 6, releases: 3, staleIssueRatio: 0.2, medianTimeToMergeHours: 24, medianTimeToCloseHours: 36 },
      180: { commits: 30, prsOpened: 7, prsMerged: 5, issuesOpened: 10, issuesClosed: 8, releases: 4, staleIssueRatio: 0.3, medianTimeToMergeHours: 48, medianTimeToCloseHours: 72 },
      365: { commits: 55, prsOpened: 12, prsMerged: 9, issuesOpened: 16, issuesClosed: 13, releases: 6, staleIssueRatio: 0.4, medianTimeToMergeHours: 96, medianTimeToCloseHours: 144 },
    },
    responsivenessMetricsByWindow: {
      30: { issueFirstResponseMedianHours: 12, issueFirstResponseP90Hours: 48, prFirstReviewMedianHours: 24, prFirstReviewP90Hours: 72, issueResolutionMedianHours: 36, issueResolutionP90Hours: 96, prMergeMedianHours: 24, prMergeP90Hours: 72, issueResolutionRate: 0.8, contributorResponseRate: 0.7, botResponseRatio: 0.1, humanResponseRatio: 0.8, staleIssueRatio: 0.1, stalePrRatio: 0.05, prReviewDepth: 3, issuesClosedWithoutCommentRatio: 0.2, openIssueCount: 10, openPullRequestCount: 5 },
      60: { issueFirstResponseMedianHours: 14, issueFirstResponseP90Hours: 50, prFirstReviewMedianHours: 28, prFirstReviewP90Hours: 78, issueResolutionMedianHours: 40, issueResolutionP90Hours: 102, prMergeMedianHours: 28, prMergeP90Hours: 78, issueResolutionRate: 0.82, contributorResponseRate: 0.72, botResponseRatio: 0.12, humanResponseRatio: 0.78, staleIssueRatio: 0.12, stalePrRatio: 0.07, prReviewDepth: 3.2, issuesClosedWithoutCommentRatio: 0.22, openIssueCount: 11, openPullRequestCount: 6 },
      90: { issueFirstResponseMedianHours: 16, issueFirstResponseP90Hours: 52, prFirstReviewMedianHours: 30, prFirstReviewP90Hours: 80, issueResolutionMedianHours: 44, issueResolutionP90Hours: 108, prMergeMedianHours: 30, prMergeP90Hours: 80, issueResolutionRate: 0.84, contributorResponseRate: 0.74, botResponseRatio: 0.15, humanResponseRatio: 0.75, staleIssueRatio: 0.14, stalePrRatio: 0.08, prReviewDepth: 3.4, issuesClosedWithoutCommentRatio: 0.24, openIssueCount: 12, openPullRequestCount: 7 },
      180: { issueFirstResponseMedianHours: 18, issueFirstResponseP90Hours: 56, prFirstReviewMedianHours: 34, prFirstReviewP90Hours: 84, issueResolutionMedianHours: 48, issueResolutionP90Hours: 114, prMergeMedianHours: 34, prMergeP90Hours: 84, issueResolutionRate: 0.86, contributorResponseRate: 0.76, botResponseRatio: 0.16, humanResponseRatio: 0.74, staleIssueRatio: 0.16, stalePrRatio: 0.09, prReviewDepth: 3.6, issuesClosedWithoutCommentRatio: 0.26, openIssueCount: 13, openPullRequestCount: 8 },
      365: { issueFirstResponseMedianHours: 20, issueFirstResponseP90Hours: 60, prFirstReviewMedianHours: 36, prFirstReviewP90Hours: 90, issueResolutionMedianHours: 52, issueResolutionP90Hours: 120, prMergeMedianHours: 36, prMergeP90Hours: 90, issueResolutionRate: 0.88, contributorResponseRate: 0.78, botResponseRatio: 0.18, humanResponseRatio: 0.72, staleIssueRatio: 0.18, stalePrRatio: 0.1, prReviewDepth: 3.8, issuesClosedWithoutCommentRatio: 0.28, openIssueCount: 14, openPullRequestCount: 9 },
    },
    responsivenessMetrics: undefined,
    commitCountsByExperimentalOrg: 'unavailable',
    experimentalAttributedAuthors90d: 'unavailable',
    experimentalUnattributedAuthors90d: 'unavailable',
    staleIssueRatio: 0.2,
    medianTimeToMergeHours: 24,
    medianTimeToCloseHours: 36,
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    documentationResult: 'unavailable',
    defaultBranchName: 'main',
    topics: [],
    inclusiveNamingResult: {
      defaultBranchName: 'main',
      branchCheck: { checkType: 'branch', term: 'main', passed: true, tier: null, severity: null, replacements: [], context: null },
      metadataChecks: [],
    },
    missingFields: [],
    ...overrides,
  }
}
