import { test, expect } from '@playwright/test'

// Issue #359 — /demo/organization regression guard for the Recommendations
// tab. The demo renders the full org-summary shell from a fixture, so this
// spec does not need network mocking. Lightweight DOM assertions only.

test.describe('Org Recommendations tab (#359)', () => {
  test('demo renders the Recommendations tab and its panel', async ({ page }) => {
    await page.goto('/demo/organization')

    // Tab strip contains the Recommendations entry.
    const tab = page.getByRole('tab', { name: /^Recommendations$/ })
    await expect(tab).toBeVisible()

    // Selecting it reveals the panel.
    await tab.click()
    await expect(page.getByTestId('org-recommendations-panel')).toBeVisible()
  })
})
