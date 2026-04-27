import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'fs'

// Load .env.local so PORT (set to 3010 locally) is available in this config.
if (existsSync('.env.local')) process.loadEnvFile('.env.local')

const port = process.env.PORT ?? '3000'
const baseURL = process.env.BASE_URL ?? `http://localhost:${port}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
})
