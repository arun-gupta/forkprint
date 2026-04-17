import { test, expect, type Locator, type Page } from '@playwright/test'

// Regression guard for #326. Light-mode-only `bg-*` classes on tab containers,
// score cards, or controls used to ship unnoticed — dark-mode rendering was
// only caught via manual review. This test mocks an analyze response, walks
// every tab in dark mode, and asserts the visible panel background is actually
// dark (no channel > 80/255). If a future panel lands without a `dark:` bg
// variant, this will fail with the offending tab + color.

const DARK_CHANNEL_MAX = 80

function parseRGB(color: string): [number, number, number, number] | null {
  const m = color.match(/\d+(?:\.\d+)?/g)
  if (!m || m.length < 3) return null
  const [r, g, b, a = '1'] = m
  return [Number(r), Number(g), Number(b), Number(a)]
}

function isDarkSurface(color: string): boolean {
  const rgba = parseRGB(color)
  if (!rgba) return false
  const [r, g, b, a] = rgba
  // Fully transparent — no surface of its own, don't fail on it.
  if (a === 0) return true
  return r <= DARK_CHANNEL_MAX && g <= DARK_CHANNEL_MAX && b <= DARK_CHANNEL_MAX
}

async function assertDarkBg(locator: Locator, label: string) {
  await expect(locator, `${label}: not found`).toBeVisible()
  const color = await locator.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(isDarkSurface(color), `${label}: expected dark bg, got ${color}`).toBe(true)
}

const MOCK_RESULT = {
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
  securityResult: 'unavailable',
  documentationResult: 'unavailable',
  licensingResult: 'unavailable',
  inclusiveNamingResult: 'unavailable',
  responsivenessMetrics: 'unavailable',
  contributorMetricsByWindow: {
    30: { uniqueCommitAuthors: 'unavailable', commitCountsByAuthor: 'unavailable', repeatContributors: 'unavailable', newContributors: 'unavailable', commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
    60: { uniqueCommitAuthors: 'unavailable', commitCountsByAuthor: 'unavailable', repeatContributors: 'unavailable', newContributors: 'unavailable', commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
    90: { uniqueCommitAuthors: 'unavailable', commitCountsByAuthor: 'unavailable', repeatContributors: 'unavailable', newContributors: 'unavailable', commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
    180: { uniqueCommitAuthors: 'unavailable', commitCountsByAuthor: 'unavailable', repeatContributors: 'unavailable', newContributors: 'unavailable', commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
    365: { uniqueCommitAuthors: 'unavailable', commitCountsByAuthor: 'unavailable', repeatContributors: 'unavailable', newContributors: 'unavailable', commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
  },
  missingFields: ['releases12mo'],
}

async function setupAnalyzed(page: Page) {
  // Pre-seed dark-mode preference before any script runs, so the layout's
  // head-script adds the `dark` class during initial paint.
  await page.addInitScript(() => {
    try { window.localStorage.setItem('repopulse-theme', 'dark') } catch {}
  })

  await page.route('**/api/analyze', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ results: [MOCK_RESULT], failures: [], rateLimit: null }),
    })
  })

  await page.goto('/#token=gho_test_token&username=test-user')
  await expect(page.locator('html')).toHaveClass(/(^|\s)dark(\s|$)/)

  await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react')
  await page.getByRole('button', { name: /analyze/i }).click()
  await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible()
}

test.describe('#326 dark mode surfaces', () => {
  test('Overview top-bar controls render on dark surfaces', async ({ page }) => {
    await setupAnalyzed(page)

    await assertDarkBg(
      page.getByPlaceholder('Search report...'),
      'Search report input',
    )
    await assertDarkBg(
      page.getByRole('button', { name: /download json/i }),
      'Download JSON button',
    )
    await assertDarkBg(
      page.getByRole('button', { name: /download markdown/i }),
      'Download Markdown button',
    )
    await assertDarkBg(
      page.getByRole('button', { name: /copy link/i }),
      'Copy link button',
    )
  })

  test('Overview metric card renders on a dark surface', async ({ page }) => {
    await setupAnalyzed(page)
    await assertDarkBg(
      page.getByTestId('metric-card-facebook/react'),
      'Metric card article',
    )
  })

  // Recommendations is dynamic — only appears when there are recommendations,
  // which the minimal-unavailable mock doesn't produce. Other tabs are always
  // present on the default desktop viewport.
  const TAB_NAMES = ['Overview', 'Contributors', 'Activity', 'Responsiveness', 'Documentation', 'Security'] as const

  for (const name of TAB_NAMES) {
    test(`${name} tab: main panel renders on a dark surface`, async ({ page }) => {
      await setupAnalyzed(page)

      const tab = page.getByRole('tab', { name, exact: true })
      await tab.click()
      await expect(tab).toHaveAttribute('aria-selected', 'true')

      // Grab the first article/section under the main panel that has a
      // non-transparent background — that's the user-visible surface.
      const panel = page.locator('[role="region"], section, article').first()
      await expect(panel).toBeVisible()
      const color = await panel.evaluate((el) => getComputedStyle(el).backgroundColor)
      expect(isDarkSurface(color), `${name} panel: expected dark bg, got ${color}`).toBe(true)
    })
  }
})
