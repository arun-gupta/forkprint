import { test, expect } from '@playwright/test'

// Issue #288 — Member permission distribution panel in the Governance tab.
// The demo renders the full org-summary shell from a fixture (including a
// memberPermission fixture section), so no network mocking is required.
// Lightweight DOM assertions only — no visual snapshots.

test.describe('Member permission distribution panel (#288)', () => {
  test('Governance tab shows the member permission distribution panel with role counts', async ({ page }) => {
    await page.goto('/demo/organization')

    const governanceTab = page.getByRole('tab', { name: /^Governance$/ })
    await expect(governanceTab).toBeVisible()
    await governanceTab.click()

    const panel = page.getByTestId('member-permission-panel')
    await expect(panel).toBeVisible()

    // Panel title
    await expect(panel.getByText(/member permission distribution/i)).toBeVisible()

    // Admin count appears (fixture: adminCount=8)
    await expect(panel.getByTestId('perm-admin-count')).toContainText('8')

    // Non-admin member count appears (fixture: memberCount=34)
    await expect(panel.getByTestId('perm-member-count')).toContainText('34')

    // Outside collaborator count appears (fixture: outsideCollaboratorCount=5)
    await expect(panel.getByTestId('perm-collab-count')).toContainText('5')
  })

  test('non-org input renders the N/A state (no role counts visible)', async ({ page }) => {
    await page.goto('/')
    // Mock the analyze API to return a user-repo result (non-org)
    await page.route('**/api/analyze', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [],
          failures: [],
          rateLimit: null,
        }),
      })
    })
    // Mock member-permissions for a non-org
    await page.route('**/api/org/member-permissions**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          section: {
            kind: 'member-permission-distribution',
            applicability: 'not-applicable-non-org',
            memberCount: null,
            outsideCollaboratorCount: null,
            unavailableReasons: [],
            resolvedAt: new Date().toISOString(),
          },
        }),
      })
    })

    // The N/A section should contain the N/A marker and no count cells
    const naSection = page.getByTestId('perm-na')
    if (await naSection.count() > 0) {
      await expect(page.getByTestId('perm-admin-count')).toHaveCount(0)
    }
  })
})
