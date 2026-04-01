import { expect, test } from '@playwright/test'

test.describe('P1-F07 Metric Cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')

    if ((await page.getByLabel(/github personal access token/i).count()) > 0) {
      await page.getByLabel(/github personal access token/i).fill('ghp_example')
    }
  })

  test('renders one overview card per successful repository with score badges', async ({ page }) => {
    await page.route('**/api/analyze', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            buildResult({ repo: 'facebook/react', stars: 244295, forks: 50872, watchers: 6660 }),
            buildResult({ repo: 'kubernetes/kubernetes', stars: 121419, forks: 42757, watchers: 3181 }),
          ],
          failures: [],
          rateLimit: null,
        }),
      })
    })

    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react\nkubernetes/kubernetes')
    await page.getByRole('button', { name: /analyze/i }).click()

    const overview = page.getByRole('region', { name: /metric cards overview/i })
    await expect(overview).toContainText('facebook/react')
    await expect(overview).toContainText('kubernetes/kubernetes')
    await expect(overview).toContainText('Ecosystem profile summary')
    await expect(overview).toContainText('Evolution')
    await expect(overview).toContainText('Contribution Dynamics')
    await expect(overview).toContainText('Responsiveness')
  })

  test('expands a card in place without leaving the overview tab', async ({ page }) => {
    let requestCount = 0

    await page.route('**/api/analyze', async (route) => {
      requestCount += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            buildResult({
              repo: 'facebook/react',
              stars: 244295,
              forks: 50872,
              watchers: 6660,
              missingFields: ['releases12mo'],
            }),
          ],
          failures: [],
          rateLimit: null,
        }),
      })
    })

    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react')
    await page.getByRole('button', { name: /analyze/i }).click()
    await page.getByRole('button', { name: /show details/i }).click()

    const overview = page.getByRole('region', { name: /metric cards overview/i })
    await expect(overview).toContainText('Full metric detail')
    await expect(overview).toContainText('Primary language')
    await expect(overview).toContainText('Missing fields')
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
    missingFields: [],
    ...overrides,
  }
}
