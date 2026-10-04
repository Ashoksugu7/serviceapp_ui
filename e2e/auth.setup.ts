import { expect, test as setup } from '@playwright/test'

const roles = [
  { name: 'admin', email: 'E2E_ADMIN_EMAIL', password: 'E2E_ADMIN_PASSWORD' },
  { name: 'user', email: 'E2E_USER_EMAIL', password: 'E2E_USER_PASSWORD' },
  { name: 'super-admin', email: 'E2E_SUPER_ADMIN_EMAIL', password: 'E2E_SUPER_ADMIN_PASSWORD' },
] as const

for (const role of roles) {
  setup(`sign in as ${role.name}`, async ({ page }) => {
    const email = process.env[role.email]
    const password = process.env[role.password]
    setup.skip(!email || !password, `${role.email} / ${role.password} not set`)

    await page.goto('/login')
    await page.getByLabel('Email or mobile number').fill(email!)
    await page.getByLabel('Password').fill(password!)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await page.context().storageState({ path: `e2e/.auth/${role.name}.json` })
  })
}
