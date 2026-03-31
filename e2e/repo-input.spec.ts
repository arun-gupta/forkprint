import { test, expect } from '@playwright/test'

test.describe('P1-F01 Repo Input — US1 (valid input)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('accepts a single valid slug and shows no error', async ({ page }) => {
    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react')
    await page.getByRole('button', { name: /analyze/i }).click()
    await expect(page.getByTestId('repo-error')).not.toBeVisible()
  })

  test('extracts slug from a pasted GitHub URL', async ({ page }) => {
    await page.getByRole('textbox', { name: /repository list/i }).fill('https://github.com/facebook/react')
    await page.getByRole('button', { name: /analyze/i }).click()
    await expect(page.getByTestId('repo-error')).not.toBeVisible()
  })

  test('accepts comma-separated slugs', async ({ page }) => {
    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react, torvalds/linux')
    await page.getByRole('button', { name: /analyze/i }).click()
    await expect(page.getByTestId('repo-error')).not.toBeVisible()
  })

  test('accepts multiple slugs on separate lines', async ({ page }) => {
    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react\ntorvalds/linux\nmicrosoft/typescript')
    await page.getByRole('button', { name: /analyze/i }).click()
    await expect(page.getByTestId('repo-error')).not.toBeVisible()
  })
})

test.describe('P1-F01 Repo Input — US2 (invalid input)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows inline error on empty submission', async ({ page }) => {
    await page.getByRole('button', { name: /analyze/i }).click()
    await expect(page.getByTestId('repo-error')).toBeVisible()
  })

  test('shows inline error for slug with no owner', async ({ page }) => {
    await page.getByRole('textbox', { name: /repository list/i }).fill('react')
    await page.getByRole('button', { name: /analyze/i }).click()
    await expect(page.getByTestId('repo-error')).toBeVisible()
  })

  test('shows inline error for slug with no repo name', async ({ page }) => {
    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/')
    await page.getByRole('button', { name: /analyze/i }).click()
    await expect(page.getByTestId('repo-error')).toBeVisible()
  })

  test('clears error after valid resubmission', async ({ page }) => {
    await page.getByRole('button', { name: /analyze/i }).click()
    await expect(page.getByTestId('repo-error')).toBeVisible()
    await page.getByRole('textbox', { name: /repository list/i }).fill('facebook/react')
    await page.getByRole('button', { name: /analyze/i }).click()
    await expect(page.getByTestId('repo-error')).not.toBeVisible()
  })
})
