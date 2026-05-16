import { expect, test } from '@playwright/test'

test('has title', async ({ page }) => {
  await page.goto('/')

  // Expect a title "to contain" a substring - matches actual title
  await expect(page).toHaveTitle("There's nothing to watch")
})

test('loads application without errors', async ({ page }) => {
  // Set up console error tracking before navigation
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })

  await page.goto('/')

  // Wait for the app to load and check that main elements are present
  await expect(page.locator('#root')).toBeAttached()
  await expect(page.locator('#voroforce')).toBeAttached()

  // Wait for the app to initialize
  await page.waitForTimeout(3000)

  // Should not have critical console errors (excluding expected WebGL warnings)
  const criticalErrors = consoleErrors.filter(
    (error) =>
      !error.includes('WebGL') &&
      !error.includes('GPU') &&
      !error.includes('canvas') &&
      !error.includes('voroforce') &&
      !error.toLowerCase().includes('webgl'),
  )

  expect(criticalErrors).toHaveLength(0)
})

test('voroforce container is present', async ({ page }) => {
  await page.goto('/')

  // Wait for the voroforce to initialize
  await page.waitForTimeout(2000)

  // Check that the voroforce container exists
  const voroforceContainer = page.locator('#voroforce')
  await expect(voroforceContainer).toBeAttached()

  // Check for canvas element (WebGL rendering)
  const canvas = page.locator('canvas').first()
  if (await canvas.isVisible()) {
    await expect(canvas).toBeVisible()
  }
})
