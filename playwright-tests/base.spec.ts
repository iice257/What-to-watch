import { expect, test } from '@playwright/test'

test('renders the canonical gallery route', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('ScrollFlix')
  await expect(
    page.getByRole('region', { name: 'Warp Wall movie gallery' }),
  ).toBeVisible()
})

test('loads the gallery without application console errors', async ({
  page,
}) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })

  await page.goto('/')

  await expect(
    page.getByRole('region', { name: 'Warp Wall movie gallery' }),
  ).toBeVisible()

  const criticalErrors = consoleErrors.filter(
    (error) =>
      !error.includes('WebGL') &&
      !error.includes('GPU') &&
      !error.includes('canvas') &&
      !error.toLowerCase().includes('webgl'),
  )

  expect(criticalErrors).toHaveLength(0)
})
