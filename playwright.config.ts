import { defineConfig } from '@playwright/test'

// End-to-end checks against a running Go API and this app.
// Credentials come from the environment (see e2e/README.md); nothing is stored in the repo.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/.report' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'admin', testMatch: /admin\.spec\.ts/, dependencies: ['setup'], use: { storageState: 'e2e/.auth/admin.json' } },
    { name: 'user', testMatch: /user\.spec\.ts/, dependencies: ['setup'], use: { storageState: 'e2e/.auth/user.json' } },
    { name: 'super-admin', testMatch: /super-admin\.spec\.ts/, dependencies: ['setup'], use: { storageState: 'e2e/.auth/super-admin.json' } },
    { name: 'mobile', testMatch: /mobile\.spec\.ts/, dependencies: ['setup'], use: { storageState: 'e2e/.auth/admin.json', viewport: { width: 375, height: 812 } } },
    { name: 'session', testMatch: /session\.spec\.ts/ },
  ],
})
