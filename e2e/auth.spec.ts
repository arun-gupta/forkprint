import { test, expect } from '@playwright/test'

test.describe('P1-F14 GitHub OAuth Authentication', () => {
  test('shows sign-in prompt when unauthenticated', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /sign in with github/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /repository list/i })).toHaveCount(0)
  })

  test('sign-in link points to the OAuth login route', async ({ page }) => {
    await page.goto('/')
    const link = page.getByRole('link', { name: /sign in with github/i })
    await expect(link).toHaveAttribute('href', '/api/auth/login')
  })

  test('reads token from URL fragment and shows app after OAuth callback', async ({ page }) => {
    // Simulate what happens after the OAuth callback redirects to /#token=...&username=...
    await page.goto('/#token=gho_test_token&username=test-user')

    // AuthGate reads the fragment and calls signIn — app shell becomes visible
    await expect(page.getByText('test-user')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /repository list/i })).toBeVisible()

    // Fragment should be cleared from the URL
    await expect(page).toHaveURL('/')
  })

  test('sign-out clears session and returns to sign-in prompt', async ({ page }) => {
    await page.goto('/#token=gho_test_token&username=test-user')
    await expect(page.getByText('test-user')).toBeVisible()

    await page.getByRole('button', { name: /sign out/i }).click()

    await expect(page.getByRole('link', { name: /sign in with github/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /sign out/i })).toHaveCount(0)
  })

  test('shows error message when auth_error query param is present', async ({ page }) => {
    await page.goto('/?auth_error=access_denied')

    await expect(page.getByText(/sign-in failed/i)).toBeVisible()
    await expect(page.getByText(/access denied/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /sign in with github/i })).toBeVisible()
  })
})
