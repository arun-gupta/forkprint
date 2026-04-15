import { expect, test } from '@playwright/test'

test.describe('P1-F07 Metric Cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#token=gho_test_token&username=test-user')
    await expect(page.getByText('test-user')).toBeVisible()
  })

  test('renders one overview card per successful repository with score badges', async ({ page }) => {
    await page.route('**/api/analyze', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            buildResult({ repo: 'facebook/react', stars: 244295, forks: 50872, watchers: 6660, hasDiscussionsEnabled: true }),
            buildResult({ repo: 'kubernetes/kubernetes', stars: 121419, forks: 42757, watchers: 3181, hasDiscussionsEnabled: true }),
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
    await expect(overview).toContainText('Reach')
    await expect(overview).toContainText('Attention')
    await expect(overview).toContainText('Engagement')
    await expect(overview).toContainText('Activity')
    await expect(overview).toContainText('Contributors')
    await expect(overview).toContainText('Responsiveness')
    await expect(overview).toContainText('Security')
    // Lenses row presence guard (#196).
    await expect(overview).toContainText('Lenses')
  })

  test('keeps overview cards summary-only', async ({ page }) => {
    await page.route('**/api/analyze', async (route) => {
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

    const overview = page.getByRole('region', { name: /metric cards overview/i })
    await expect(overview).not.toContainText('Missing data')
    await expect(overview).not.toContainText('Unavailable fields')
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
    securityResult: 'unavailable',
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
