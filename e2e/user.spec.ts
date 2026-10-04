import { expect, test } from '@playwright/test'

test('user sees transactions and read-only masters', async ({ page }) => {
  await page.goto('/')
  const sidebar = page.getByRole('navigation', { name: 'Main navigation' })
  await expect(sidebar.getByRole('link', { name: 'Service Entry' })).toBeVisible()
  await expect(sidebar.getByRole('link', { name: 'Service Profiles' })).toHaveCount(0)
  await expect(sidebar.getByRole('link', { name: 'Users' })).toHaveCount(0)

  await page.goto('/masters/customers')
  await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add customer' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0)
})

test('admin-only screens redirect with a notice', async ({ page }) => {
  await page.goto('/settings/profiles')
  await expect(page).toHaveURL(/\/\?denied=1/)
  await expect(page.getByText('You do not have access to that screen.')).toBeVisible()
})
