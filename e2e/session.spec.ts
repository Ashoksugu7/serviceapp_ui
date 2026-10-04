import { expect, test } from '@playwright/test'

test('signed-out visitors are sent to sign in and returned afterwards', async ({ page }) => {
  await page.goto('/records')
  await expect(page).toHaveURL(/\/login\?next=%2Frecords/)
  await expect(page.getByRole('heading', { name: 'Sign in to ServiceOps360' })).toBeVisible()
})

test('an invalid session cookie is cleared with an explanation', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'so360_session', value: 'invalid', url: baseURL! }])
  await page.goto('/records')
  await expect(page).toHaveURL(/\/login\?reason=expired/)
  await expect(page.getByText('Your session has ended')).toBeVisible()
})

test('wrong credentials show the API message', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email or mobile number').fill('nobody@example.com')
  await page.getByLabel('Password').fill('not-the-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.locator('main [role="alert"]')).toContainText(/invalid email, mobile number or password/i)
})

test('password reset pages are reachable while signed out', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('link', { name: 'Forgot password?' }).click()
  await expect(page).toHaveURL(/\/forgot-password$/)
  await page.goto('/reset-password?token=bad')
  await expect(page.getByRole('heading', { name: 'Link not valid' })).toBeVisible()
})
