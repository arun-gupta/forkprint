import { test, expect } from '@playwright/test'

test.describe('P1-F05 Ecosystem Map', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')

    if ((await page.getByLabel(/github personal access token/i).count()) > 0) {
      await page.getByLabel(/github personal access token/i).fill('ghp_example')
    }
  })

  test('shows visible stars, forks, and watchers for successful repositories', async ({ page }) => {
    await page.route('**/api/analyze', async (route) => {
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

    const ecosystemMap = page.getByRole('region', { name: /ecosystem map/i })
    await expect(ecosystemMap).toContainText('facebook/react')
    await expect(ecosystemMap).toContainText('Stars: 244,295')
    await expect(ecosystemMap).toContainText('Forks: 50,872')
    await expect(ecosystemMap).toContainText('Watchers: 6,660')
  })

  test('renders a bubble-chart summary for plot-eligible repositories', async ({ page }) => {
    await page.route('**/api/analyze', async (route) => {
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
              uniqueCommitAuthors90d: 'unavailable',
              totalContributors: 'unavailable',
              commitCountsByAuthor: 'unavailable',
              issueFirstResponseTimestamps: 'unavailable',
              issueCloseTimestamps: 'unavailable',
              prMergeTimestamps: 'unavailable',
              missingFields: ['releases12mo'],
            },
            {
              repo: 'vercel/next.js',
              name: 'next.js',
              description: 'The React Framework',
              createdAt: '2016-10-05T23:32:51Z',
              primaryLanguage: 'TypeScript',
              stars: 132000,
              forks: 28700,
              watchers: 2400,
              commits30d: 9,
              commits90d: 34,
              releases12mo: 'unavailable',
              prsOpened90d: 8,
              prsMerged90d: 5,
              issuesOpen: 12,
              issuesClosed90d: 10,
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

    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react\nvercel/next.js')
    await page.getByRole('button', { name: /analyze/i }).click()

    await expect(page.getByRole('img', { name: /ecosystem bubble chart/i })).toBeVisible()
    await expect(page.getByText(/stars \(x-axis\)/i)).toBeVisible()
    await expect(page.getByText(/forks \(y-axis\)/i)).toBeVisible()
    await expect(page.getByText(/watchers \(bubble size\)/i)).toBeVisible()
  })
})
