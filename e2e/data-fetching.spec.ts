import { test, expect } from '@playwright/test'

test.describe('P1-F04 Data Fetching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')

    if ((await page.getByLabel(/github personal access token/i).count()) > 0) {
      await page.getByLabel(/github personal access token/i).fill('ghp_example')
    }
  })

  test('renders successful analysis results from the API response', async ({ page }) => {
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
              stars: 100,
              forks: 25,
              watchers: 10,
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

    await expect(page.getByRole('region', { name: /analysis results/i })).toContainText('facebook/react')
    await expect(page.getByRole('region', { name: /analysis results/i })).toContainText('Stars: 100')
  })

  test('shows successful results and failed repositories together', async ({ page }) => {
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
              stars: 100,
              forks: 25,
              watchers: 10,
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
          failures: [{ repo: 'facebook/missing-repo', reason: 'Repository could not be analyzed.', code: 'NOT_FOUND' }],
          rateLimit: null,
        }),
      })
    })

    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react\nfacebook/missing-repo')
    await page.getByRole('button', { name: /analyze/i }).click()

    await expect(page.getByRole('region', { name: /analysis results/i })).toContainText('facebook/react')
    await expect(page.getByRole('region', { name: /analysis results/i })).toContainText('Failed repositories')
    await expect(page.getByRole('region', { name: /analysis results/i })).toContainText('facebook/missing-repo')
  })

  test('shows loading state and rate-limit metadata', async ({ page }) => {
    await page.route('**/api/analyze', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 200))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [],
          failures: [],
          rateLimit: {
            remaining: 4999,
            resetAt: '2026-03-31T23:59:59Z',
            retryAfter: 'unavailable',
          },
        }),
      })
    })

    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react')
    await page.getByRole('button', { name: /analyze/i }).click()

    await expect(page.getByRole('region', { name: /analysis loading state/i })).toContainText('facebook/react')
    await expect(page.getByRole('region', { name: /analysis results/i })).toContainText('Remaining API calls: 4,999')
    await expect(page.getByRole('region', { name: /analysis results/i })).not.toContainText('Retry after:')
  })
})
