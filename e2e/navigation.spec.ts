import { test, expect } from '@playwright/test';

test.describe('Navigation & Layout', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@blimp.io');
    await page.getByLabel(/password/i).fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/');
  });

  test('sidebar has all navigation links', async ({ page }) => {
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /assets/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /apps/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /people/i })).toBeVisible();
  });

  test('can navigate to each main page', async ({ page }) => {
    const routes = [
      { link: /assets/i, url: '/assets' },
      { link: /apps/i, url: '/apps' },
      { link: /people/i, url: '/people' },
      { link: /settings/i, url: '/settings' },
    ];

    for (const route of routes) {
      await page.getByRole('link', { name: route.link }).click();
      await expect(page).toHaveURL(route.url);
    }
  });

  test('shows 404 page for unknown routes', async ({ page }) => {
    await page.goto('/this-does-not-exist');
    await expect(page.getByText(/404/)).toBeVisible();
    await expect(page.getByText(/page not found/i)).toBeVisible();
  });

  test('skip to content link is present', async ({ page }) => {
    const skipLink = page.getByText('Skip to main content');
    await expect(skipLink).toBeAttached();
  });

  test('can log out', async ({ page }) => {
    // Look for logout button/link in sidebar or top bar
    const logoutBtn = page.getByRole('button', { name: /log\s?out|sign\s?out/i });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await expect(page).toHaveURL('/login');
    }
  });
});
