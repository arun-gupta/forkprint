import { expect, test } from '@playwright/test'

test.describe('P1-F08 Activity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')

    if ((await page.getByLabel(/github personal access token/i).count()) > 0) {
      await page.getByLabel(/github personal access token/i).fill('ghp_example')
    }
  })

  test('opens Activity and switches recent activity windows locally', async ({ page }) => {
    let requestCount = 0

    await page.route('**/api/analyze', async (route) => {
      requestCount += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            buildResult({
              activityMetricsByWindow: {
                30: { commits: 7, prsOpened: 2, prsMerged: 1, issuesOpened: 4, issuesClosed: 3, releases: 1 },
                60: { commits: 12, prsOpened: 3, prsMerged: 2, issuesOpened: 6, issuesClosed: 5, releases: 2 },
                90: { commits: 18, prsOpened: 4, prsMerged: 3, issuesOpened: 8, issuesClosed: 6, releases: 3 },
                180: { commits: 30, prsOpened: 7, prsMerged: 5, issuesOpened: 10, issuesClosed: 8, releases: 4 },
                365: { commits: 55, prsOpened: 12, prsMerged: 9, issuesOpened: 16, issuesClosed: 13, releases: 6 },
              },
            }),
          ],
          failures: [],
          rateLimit: null,
        }),
      })
    })

    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react')
    await page.getByRole('button', { name: /analyze/i }).click()

    await page.getByRole('tab', { name: 'Activity' }).click()
    const activityView = page.getByRole('region', { name: /activity view/i })
    await expect(activityView).toContainText('Commits (90d)')
    await expect(activityView).toContainText('18')

    await page.getByRole('button', { name: '30d' }).click()
    await expect(activityView).toContainText('Commits (30d)')
    await expect(activityView).toContainText('7')

    await page.getByRole('button', { name: '12 months' }).click()
    await expect(activityView).toContainText('Releases (12mo)')
    await expect(activityView).toContainText('6')
    expect(requestCount).toBe(1)
  })
})

function buildResult(overrides: Record<string, unknown>) {
  return {
    repo: 'facebook/react',
    name: 'react',
    description: 'A UI library',
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
    uniqueCommitAuthors90d: 'unavailable',
    totalContributors: 'unavailable',
    commitCountsByAuthor: 'unavailable',
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    missingFields: [],
    ...overrides,
  }
}
