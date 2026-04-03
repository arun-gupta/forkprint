import { expect, test } from '@playwright/test'

test.describe('P1-F11 Health Ratios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')

    if ((await page.getByLabel(/github personal access token/i).count()) > 0) {
      await page.getByLabel(/github personal access token/i).fill('ghp_example')
    }
  })

  test('opens Health Ratios and sorts repositories locally', async ({ page }) => {
    let requestCount = 0

    await page.route('**/api/analyze', async (route) => {
      requestCount += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            buildResult('facebook/react', { forks: 25, watchers: 10, stars: 100 }),
            buildResult('vercel/next.js', { forks: 10, watchers: 7, stars: 100 }),
          ],
          failures: [],
          rateLimit: null,
        }),
      })
    })

    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react, vercel/next.js')
    await page.getByRole('button', { name: /analyze/i }).click()

    await page.getByRole('tab', { name: 'Health Ratios' }).click()

    const healthRatiosView = page.getByRole('region', { name: /health ratios view/i })
    await expect(healthRatiosView).toContainText('Overview')
    await expect(healthRatiosView).toContainText('Contributors')
    await expect(healthRatiosView).toContainText('Activity')

    const overviewSection = healthRatiosView.getByRole('heading', { name: 'Overview' }).locator('..').locator('..')
    await expect(overviewSection.getByText('facebook/react')).toBeVisible()
    await expect(overviewSection.getByText('vercel/next.js')).toBeVisible()

    await overviewSection.getByRole('button', { name: /fork rate/i }).click()

    const overviewRows = overviewSection.locator('tbody tr')
    await expect(overviewRows.nth(0)).toContainText('vercel/next.js')
    await expect(overviewRows.nth(1)).toContainText('facebook/react')
    expect(requestCount).toBe(1)
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
    commitCountsByAuthor: {
      'login:alice': 4,
      'login:bob': 3,
      'login:carol': 2,
      'login:dave': 1,
      'login:erin': 1,
    },
    contributorMetricsByWindow: {
      30: {
        uniqueCommitAuthors: 5,
        commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 },
        repeatContributors: 3,
        newContributors: 2,
        commitCountsByExperimentalOrg: 'unavailable',
        experimentalAttributedAuthors: 'unavailable',
        experimentalUnattributedAuthors: 'unavailable',
      },
      60: {
        uniqueCommitAuthors: 5,
        commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 },
        repeatContributors: 3,
        newContributors: 2,
        commitCountsByExperimentalOrg: 'unavailable',
        experimentalAttributedAuthors: 'unavailable',
        experimentalUnattributedAuthors: 'unavailable',
      },
      90: {
        uniqueCommitAuthors: 5,
        commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 },
        repeatContributors: 3,
        newContributors: 2,
        commitCountsByExperimentalOrg: 'unavailable',
        experimentalAttributedAuthors: 'unavailable',
        experimentalUnattributedAuthors: 'unavailable',
      },
      180: {
        uniqueCommitAuthors: 5,
        commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 },
        repeatContributors: 3,
        newContributors: 2,
        commitCountsByExperimentalOrg: 'unavailable',
        experimentalAttributedAuthors: 'unavailable',
        experimentalUnattributedAuthors: 'unavailable',
      },
      365: {
        uniqueCommitAuthors: 5,
        commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 },
        repeatContributors: 3,
        newContributors: 2,
        commitCountsByExperimentalOrg: 'unavailable',
        experimentalAttributedAuthors: 'unavailable',
        experimentalUnattributedAuthors: 'unavailable',
      },
    },
    activityMetricsByWindow: {
      30: { commits: 7, prsOpened: 2, prsMerged: 1, issuesOpened: 4, issuesClosed: 3, releases: 1, staleIssueRatio: 0.1, medianTimeToMergeHours: 12, medianTimeToCloseHours: 24 },
      60: { commits: 12, prsOpened: 3, prsMerged: 2, issuesOpened: 6, issuesClosed: 5, releases: 2, staleIssueRatio: 0.15, medianTimeToMergeHours: 18, medianTimeToCloseHours: 30 },
      90: { commits: 18, prsOpened: 4, prsMerged: 3, issuesOpened: 8, issuesClosed: 6, releases: 3, staleIssueRatio: 0.2, medianTimeToMergeHours: 24, medianTimeToCloseHours: 36 },
      180: { commits: 30, prsOpened: 7, prsMerged: 5, issuesOpened: 10, issuesClosed: 8, releases: 4, staleIssueRatio: 0.3, medianTimeToMergeHours: 48, medianTimeToCloseHours: 72 },
      365: { commits: 55, prsOpened: 12, prsMerged: 9, issuesOpened: 16, issuesClosed: 13, releases: 6, staleIssueRatio: 0.4, medianTimeToMergeHours: 96, medianTimeToCloseHours: 144 },
    },
    commitCountsByExperimentalOrg: 'unavailable',
    experimentalAttributedAuthors90d: 'unavailable',
    experimentalUnattributedAuthors90d: 'unavailable',
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    missingFields: [],
    ...overrides,
  }
}
