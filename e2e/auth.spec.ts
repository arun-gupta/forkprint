import { test, expect } from '@playwright/test'

test.describe('P1-F02 GitHub PAT Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('stores a PAT and reloads it on the next visit', async ({ page }) => {
    await page.getByLabel(/github personal access token/i).fill('ghp_example')
    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react')
    await page.getByRole('button', { name: /analyze/i }).click()

    await page.reload()

    await expect(page.getByLabel(/github personal access token/i)).toHaveValue('ghp_example')
    await expect(page.getByText(/public_repo/i)).toBeVisible()
  })

  test('blocks submission when no PAT is available', async ({ page }) => {
    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react')
    await page.getByRole('button', { name: /analyze/i }).click()

    await expect(page.getByTestId('token-error')).toBeVisible()
  })

  test('hides the PAT field when a server token is configured', async ({ page }) => {
    test.skip(!process.env.GITHUB_TOKEN, 'This scenario requires GITHUB_TOKEN to be set for the app process')

    await expect(page.getByLabel(/github personal access token/i)).toHaveCount(0)
    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react')
    await page.getByRole('button', { name: /analyze/i }).click()
    await expect(page.getByTestId('repo-error')).toHaveCount(0)
  })
})
