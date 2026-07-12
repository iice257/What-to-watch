import { expect, test } from '@playwright/test'

test.describe('Gallery user flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('region', { name: 'Warp Wall movie gallery' }),
    ).toBeVisible()
  })

  test('switches between gallery and movie index', async ({ page }) => {
    await page.getByRole('button', { name: 'Movie index' }).click()
    await expect(
      page.getByRole('region', { name: 'Movie list view' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Gallery' }).click()
    await expect(
      page.getByRole('region', { name: 'Warp Wall movie gallery' }),
    ).toBeVisible()
  })

  test('filters the movie index by title', async ({ page }) => {
    await page.getByRole('button', { name: 'Movie index' }).click()
    const search = page.getByRole('searchbox', { name: 'Search movie titles' })
    await search.fill('the')

    await expect(search).toHaveValue('the')
    await expect(
      page.getByRole('region', { name: 'Movie list view' }),
    ).toBeVisible()
  })
})
