import { test, expect } from '@playwright/test'

test.describe('RFE #345 — global elevated-scope indicator', () => {
  test('baseline session renders no banner and no chip', async ({ page }) => {
    await page.goto('/#token=gho_test_token&username=test-user&scopes=public_repo')

    // Wait for the signed-in app shell to render
    await expect(page.getByText('test-user')).toBeVisible()

    await expect(page.getByTestId('elevated-scope-banner')).toHaveCount(0)
    await expect(page.getByTestId('elevated-scope-chip')).toHaveCount(0)
  })

  test('elevated session renders a global banner enumerating read:org', async ({ page }) => {
    await page.goto(
      '/#token=gho_test_token&username=test-user&scopes=' + encodeURIComponent('public_repo read:org'),
    )

    const banner = page.getByTestId('elevated-scope-banner')
    await expect(banner).toBeVisible()

    // Scope name appears verbatim, not as a boolean "elevated" marker
    await expect(page.getByTestId('elevated-scope-banner-scopes')).toHaveText('read:org')

    // Amber-ish background (computed-style regression guard per feedback memo)
    const bg = await banner.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).not.toBe('rgba(0, 0, 0, 0)')
    expect(bg).not.toBe('transparent')
  })

  test('elevated session also renders a persistent chip next to the user badge', async ({ page }) => {
    await page.goto(
      '/#token=gho_test_token&username=test-user&scopes=' + encodeURIComponent('public_repo read:org'),
    )

    const chip = page.getByTestId('elevated-scope-chip')
    await expect(chip).toBeVisible()
    // Scope lives on the hover tooltip, not visible text
    await expect(chip).toHaveAttribute('title', /read:org/)
    await expect(chip).toHaveAttribute('aria-label', /read:org/)
  })

  test('dismissing the banner keeps the chip visible', async ({ page }) => {
    await page.goto(
      '/#token=gho_test_token&username=test-user&scopes=' + encodeURIComponent('public_repo read:org'),
    )

    await expect(page.getByTestId('elevated-scope-banner')).toBeVisible()
    await page.getByRole('button', { name: /dismiss elevated permissions banner/i }).click()
    await expect(page.getByTestId('elevated-scope-banner')).toHaveCount(0)

    // Chip stays — it's the always-on indicator
    await expect(page.getByTestId('elevated-scope-chip').first()).toBeVisible()
  })
})
