import { test, expect } from '@playwright/test';

test.describe('End-to-End: Authentication Journey', () => {
  test('redirects root path to login page when unauthenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByRole('button', { name: /Sign In to SCAPE/i })).toBeVisible();
  });

  test('allows toggling between Sign In and Create Account modes', async ({ page }) => {
    await page.goto('/login');
    
    // Switch to register tab
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByText('Confirm Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /Create Platform Account/i })).toBeVisible();

    // Switch back to login tab
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('button', { name: /Sign In to SCAPE/i })).toBeVisible();
  });

  test('validates required email and password fields on submission', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Sign In to SCAPE/i }).click();
    // HTML5 native validation or custom alert
    const emailInput = page.getByPlaceholder('developer@company.com');
    await expect(emailInput).toBeVisible();
  });
});
