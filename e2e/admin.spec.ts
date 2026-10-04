import { expect, test, type Page } from '@playwright/test'

// Creates E2E-prefixed data in the company. Run against a development database.
const stamp = Date.now().toString().slice(-6)
const customerName = `E2E Customer ${stamp}`

test.describe.configure({ mode: 'serial' })

async function nav(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name, exact: true }).click()
}

test('sidebar shows company screens for an admin', async ({ page }) => {
  await page.goto('/')
  const sidebar = page.getByRole('navigation', { name: 'Main navigation' })
  for (const name of ['Service Entry', 'Records', 'Stand-by', 'Customers', 'Staff', 'Products & Services', 'Service Profiles', 'Users']) {
    await expect(sidebar.getByRole('link', { name, exact: true })).toBeVisible()
  }
  await expect(sidebar.getByRole('link', { name: 'Companies' })).toHaveCount(0)
})

test('create a customer', async ({ page }) => {
  await page.goto('/masters/customers')
  await page.getByRole('button', { name: 'Add customer' }).click()
  const drawer = page.getByRole('dialog', { name: 'Add customer' })
  await drawer.getByLabel('Customer name').fill(customerName)
  await drawer.getByLabel('Contact no').fill(`98${stamp}00`)
  await drawer.getByRole('button', { name: 'Create customer' }).click()
  await expect(page.getByText(/Customer C-\d+ was created/)).toBeVisible()
  await page.getByPlaceholder('Search name or mobile no').fill(customerName)
  await expect(page.getByRole('cell', { name: customerName })).toBeVisible()
})

test('service profiles open with fields, statuses and settings', async ({ page }) => {
  await page.goto('/settings/profiles')
  await expect(page.getByText('Built-in fields')).toBeVisible()
  await page.getByRole('tab', { name: 'Statuses' }).click()
  await expect(page.getByText('Initial').first()).toBeVisible()
  await page.getByRole('tab', { name: 'Settings' }).click()
  await expect(page.getByText('Profile details')).toBeVisible()
})

let requestNo = ''

test('save a service entry and open it from Records', async ({ page }) => {
  await page.goto('/service-entry')
  await page.getByPlaceholder('Type a mobile number or name').fill(customerName)
  await page.getByRole('button', { name: new RegExp(customerName) }).click()
  await expect(page.getByRole('button', { name: 'Change' })).toBeVisible()

  // Fill every required text/choice control the profile defines.
  for (const field of await page.locator('form label:has(span:text-matches("\\\\*$"))').all()) {
    const textarea = field.locator('textarea')
    const input = field.locator('input:not([readonly])[type="text"], input:not([readonly]):not([type])')
    const select = field.locator('select')
    if (await textarea.count()) await textarea.fill('E2E complaint')
    else if (await input.count()) await input.fill('E2E value')
    else if (await select.count()) await select.selectOption({ index: 1 })
  }
  for (const group of await page.locator('form [role="radiogroup"]').all()) await group.getByRole('radio').first().click()

  await page.getByRole('button', { name: 'Save entry' }).click()
  const saved = page.getByText(/saved/).first()
  await expect(saved).toBeVisible()
  requestNo = (await page.locator('.font-mono').filter({ hasText: /^[A-Z]+\d+$/ }).first().textContent()) ?? ''
  expect(requestNo).toMatch(/^[A-Z]+\d+$/)

  await nav(page, 'Records')
  await page.getByPlaceholder('Search record no, customer, mobile or details').fill(requestNo)
  await page.getByRole('link', { name: requestNo }).click()
  await expect(page.getByRole('heading', { name: requestNo })).toBeVisible()
  await expect(page.getByText('Created as')).toBeVisible()
})

test('a new mobile number creates the customer with the entry', async ({ page }) => {
  const mobile = `97${stamp}${String(Date.now()).slice(-2)}`
  await page.goto('/service-entry')
  await page.getByPlaceholder('Type a mobile number or name').fill(mobile)
  await expect(page.getByText('New customer', { exact: true })).toBeVisible()
  await page.getByRole('textbox', { name: 'Name' }).fill(`E2E New ${stamp}`)
  await page.getByRole('textbox', { name: 'Address' }).fill('E2E street')
  for (const field of await page.locator('form label:has(span:text-matches("\\\\*$")) textarea').all()) await field.fill('E2E complaint')
  for (const group of await page.locator('form [role="radiogroup"]').all()) await group.getByRole('radio').first().click()
  await page.getByRole('button', { name: 'Save entry' }).click()
  await expect(page.getByText(/for new customer C-\d+/)).toBeVisible()

  // The same number now finds the customer instead of creating another.
  await page.getByPlaceholder('Type a mobile number or name').fill(mobile)
  await expect(page.getByRole('button', { name: 'Change' })).toBeVisible()
})

test('change status records history', async ({ page }) => {
  test.skip(!requestNo, 'needs the saved entry')
  await page.goto('/records')
  await page.getByPlaceholder('Search record no, customer, mobile or details').fill(requestNo)
  await page.getByRole('link', { name: requestNo }).click()
  const select = page.getByLabel('New status')
  const options = await select.locator('option:not([disabled])').allTextContents()
  const target = options.find((option) => !option.includes('closes') && option !== (options[0] ?? ''))
  test.skip(!target, 'profile has only one open status')
  await select.selectOption({ label: target! })
  await page.getByRole('button', { name: 'Update' }).click()
  await expect(page.getByText('Status changed', { exact: true })).toBeVisible()
})

test('edit a record saves only changes', async ({ page }) => {
  test.skip(!requestNo, 'needs the saved entry')
  await page.goto('/records')
  await page.getByPlaceholder('Search record no, customer, mobile or details').fill(requestNo)
  await page.getByRole('link', { name: requestNo }).click()
  await page.getByRole('button', { name: 'Edit' }).click()
  const textarea = page.locator('form textarea').first()
  test.skip(!(await textarea.count()), 'profile has no multi-line field')
  await textarea.fill('E2E complaint edited')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText(`${requestNo} was updated.`)).toBeVisible()
  await expect(page.getByText(/changed/).first()).toBeVisible()
})

test('out-store and stand-by screens load', async ({ page }) => {
  await page.goto('/standby')
  await expect(page.getByRole('heading', { name: 'Stand-by' })).toBeVisible()
  await expect(page.locator('main [role="alert"]')).toHaveCount(0)
  const outStore = page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Out-Store Entry' })
  if (await outStore.count()) {
    await outStore.click()
    await expect(page.getByRole('tab', { name: 'At shops' })).toBeVisible()
    await expect(page.locator('main [role="alert"]')).toHaveCount(0)
  }
})
