import { expect, test } from '@playwright/test'

test('platform admin manages companies only', async ({ page }) => {
  await page.goto('/')
  const sidebar = page.getByRole('navigation', { name: 'Main navigation' })
  await expect(sidebar.getByRole('link', { name: 'Companies' })).toBeVisible()
  await expect(sidebar.getByRole('link', { name: 'Service Entry' })).toHaveCount(0)

  await page.goto('/admin/companies')
  await expect(page.getByRole('table')).toBeVisible()
  await page.locator('table a').first().click()
  await expect(page.getByText('Users', { exact: true }).first()).toBeVisible()
  await page.getByRole('link', { name: 'Service profiles' }).click()
  await expect(page.getByText('Built-in fields')).toBeVisible()
})

test('transaction screens are not available to the platform admin', async ({ page }) => {
  await page.goto('/service-entry')
  await expect(page).toHaveURL(/\/\?denied=1/)
})
