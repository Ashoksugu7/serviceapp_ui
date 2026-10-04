import { expect, test } from '@playwright/test'

test('mobile navigation opens and closes', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).not.toBeInViewport()
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Records' }).click()
  await expect(page.getByRole('heading', { name: 'Records' })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
