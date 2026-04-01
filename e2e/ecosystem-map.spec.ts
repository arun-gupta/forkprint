import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

test.describe('P1-F05 Ecosystem Map', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')

    if ((await page.getByLabel(/github personal access token/i).count()) > 0) {
      await page.getByLabel(/github personal access token/i).fill('ghp_example')
    }
  })

  test('shows the shared ecosystem spectrum guidance in the overview', async ({ page }) => {
    await mockAnalyze(page, [
      buildResult({
        repo: 'facebook/react',
        stars: 244295,
        forks: 50872,
        watchers: 6660,
      }),
    ])

    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react')
    await page.getByRole('button', { name: /analyze/i }).click()

    const ecosystemMap = page.getByRole('region', { name: /ecosystem map/i })
    await expect(ecosystemMap).toContainText('Ecosystem spectrum')
    await expect(ecosystemMap).toContainText('Reach bands')
    await expect(ecosystemMap).not.toContainText('facebook/react')
  })

  test('renders the ecosystem spectrum and legend for multiple repos', async ({ page }) => {
    await mockAnalyze(page, [
      buildResult({ repo: 'facebook/react', stars: 244295, forks: 50872, watchers: 6660 }),
      buildResult({ repo: 'kubernetes/kubernetes', stars: 121419, forks: 42757, watchers: 3181 }),
    ])

    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react\nkubernetes/kubernetes')
    await page.getByRole('button', { name: /analyze/i }).click()

    const ecosystemMap = page.getByRole('region', { name: /ecosystem map/i })
    await expect(ecosystemMap).toContainText('Ecosystem spectrum')
    await expect(ecosystemMap).toContainText('Reach bands')
    await expect(ecosystemMap).toContainText('Builder engagement')
    await expect(ecosystemMap).toContainText('Attention')
    await expect(ecosystemMap).toContainText('Reach')
    await expect(ecosystemMap).toContainText('Builder engagement')
    await expect(ecosystemMap).toContainText('Attention')
  })

  test('shows only the band legend rather than duplicated per-repo spectrum profiles', async ({ page }) => {
    await mockAnalyze(page, [
      buildResult({ repo: 'kubernetes/kubernetes', stars: 121419, forks: 42757, watchers: 3181 }),
    ])

    await page.getByRole('textbox', { name: /repository list/i }).fill('kubernetes/kubernetes')
    await page.getByRole('button', { name: /analyze/i }).click()

    const ecosystemMap = page.getByRole('region', { name: /ecosystem map/i })
    await expect(ecosystemMap).toContainText('Exceptional 25%+')
    await expect(ecosystemMap).toContainText('Exceptional 2.5%+')
    await expect(ecosystemMap).not.toContainText('kubernetes/kubernetes')
    await expect(ecosystemMap).not.toContainText('Spectrum profile')
  })
})

async function mockAnalyze(page: Page, results: unknown[]) {
  await page.route('**/api/analyze', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results,
        failures: [],
        rateLimit: null,
      }),
    })
  })
}

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
