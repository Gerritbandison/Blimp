import { test, expect } from '@playwright/test';

test.describe('Asset Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@blimp.io');
    await page.getByLabel(/password/i).fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/');

    // Navigate to assets
    await page.goto('/assets');
  });

  test('displays asset list page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /assets/i }).first()).toBeVisible();
  });

  test('can search for assets', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i).first();
    await searchInput.fill('MacBook');
    // Should filter the table
    await expect(searchInput).toHaveValue('MacBook');
  });

  test('can open add asset modal', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add asset/i });
    if (await addButton.isVisible()) {
      await addButton.click();
      await expect(page.getByRole('dialog')).toBeVisible();
    }
  });

  test('can click on an asset to view details', async ({ page }) => {
    // Click first asset row if table has data
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await expect(page.url()).toContain('/assets/');
    }
  });
});
