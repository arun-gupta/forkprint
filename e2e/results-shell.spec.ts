import { test, expect } from '@playwright/test'

test.describe('P1-F15 Results Shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')

    if ((await page.getByLabel(/github personal access token/i).count()) > 0) {
      await page.getByLabel(/github personal access token/i).fill('ghp_example')
    }
  })

  test('submits once and switches tabs without rerunning analysis', async ({ page }) => {
    let requestCount = 0

    await page.route('**/api/analyze', async (route) => {
      requestCount += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              repo: 'facebook/react',
              name: 'react',
              description: 'A UI library',
              createdAt: '2013-05-24T16:15:54Z',
              primaryLanguage: 'TypeScript',
              stars: 244295,
              forks: 50872,
              watchers: 6660,
              commits30d: 7,
              commits90d: 18,
              releases12mo: 'unavailable',
              prsOpened90d: 4,
              prsMerged90d: 3,
              issuesOpen: 5,
              issuesClosed90d: 6,
              activityMetricsByWindow: {
                30: { commits: 7, prsOpened: 2, prsMerged: 1, issuesOpened: 4, issuesClosed: 3, releases: 'unavailable', staleIssueRatio: 'unavailable', medianTimeToMergeHours: 'unavailable', medianTimeToCloseHours: 'unavailable' },
                60: { commits: 12, prsOpened: 3, prsMerged: 2, issuesOpened: 6, issuesClosed: 5, releases: 'unavailable', staleIssueRatio: 'unavailable', medianTimeToMergeHours: 'unavailable', medianTimeToCloseHours: 'unavailable' },
                90: { commits: 18, prsOpened: 4, prsMerged: 3, issuesOpened: 8, issuesClosed: 6, releases: 'unavailable', staleIssueRatio: 'unavailable', medianTimeToMergeHours: 'unavailable', medianTimeToCloseHours: 'unavailable' },
                180: { commits: 30, prsOpened: 7, prsMerged: 5, issuesOpened: 10, issuesClosed: 8, releases: 'unavailable', staleIssueRatio: 'unavailable', medianTimeToMergeHours: 'unavailable', medianTimeToCloseHours: 'unavailable' },
                365: { commits: 55, prsOpened: 12, prsMerged: 9, issuesOpened: 16, issuesClosed: 13, releases: 'unavailable', staleIssueRatio: 'unavailable', medianTimeToMergeHours: 'unavailable', medianTimeToCloseHours: 'unavailable' },
              },
              uniqueCommitAuthors90d: 'unavailable',
              totalContributors: 'unavailable',
              commitCountsByAuthor: 'unavailable',
              issueFirstResponseTimestamps: 'unavailable',
              issueCloseTimestamps: 'unavailable',
              prMergeTimestamps: 'unavailable',
              missingFields: ['releases12mo'],
            },
          ],
          failures: [],
          rateLimit: null,
        }),
      })
    })

    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react')
    await page.getByRole('button', { name: /analyze/i }).click()

    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible()
    await expect(page.getByRole('region', { name: /ecosystem map/i })).toBeVisible()
    await expect(page.getByText(/ecosystem spectrum/i)).toBeVisible()
    await page.getByRole('tab', { name: 'Activity' }).click()
    await expect(page.getByRole('region', { name: /activity view/i })).toContainText('facebook/react')
    await expect(page.getByRole('region', { name: /activity view/i })).toContainText('Commits')
    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /repository list/i })).toBeVisible()
    expect(requestCount).toBe(1)
  })
})
