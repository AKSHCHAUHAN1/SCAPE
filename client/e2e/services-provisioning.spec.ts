import { test, expect } from '@playwright/test';

test.describe('End-to-End: Services and Platform Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated user state in localStorage or store
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            accessToken: 'mock-e2e-token',
            user: {
              id: 'e2e-user',
              email: 'e2e@scape.dev',
              role: 'developer',
              teamId: 'team-e2e',
            },
            isAuthenticated: true,
          },
        }),
      );
    });
  });

  test('authenticated user can navigate between Dashboard, Catalog, and Cost views', async ({ page }) => {
    // Intercept health metrics API to avoid backend requirement during client test
    await page.route('**/health/metrics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'healthy',
          uptimeMs: 3600000,
          uptimeFormatted: '1h 0m',
          timestamp: new Date().toISOString(),
          platform: {
            services: { total: 4, active: 4, pending: 0, failed: 0 },
            deployments: { total: 10, activeJobs: 0, successRate: 100, recentDeployments: [] },
            cost: { totalSpendUsd: 250.0 },
            infrastructure: {
              database: 'healthy',
              api: 'healthy',
              provisioningQueue: 'healthy',
              costSync: 'healthy',
            },
          },
        }),
      });
    });

    await page.route('**/costs/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalUsd: 250.0,
          monthlyCostUsd: 120.0,
          currency: 'USD',
          byService: [],
          monthlyTrend: [],
        }),
      });
    });

    await page.route('**/services', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/dashboard');
    await expect(page.getByText('Platform Dashboard')).toBeVisible();
    await expect(page.getByText('All systems operational')).toBeVisible();

    // Click Service Catalog in sidebar
    await page.getByRole('link', { name: 'Service Catalog' }).click();
    await expect(page).toHaveURL(/.*\/services/);

    // Click Cost Dashboard in sidebar
    await page.getByRole('link', { name: 'Cost Dashboard' }).click();
    await expect(page).toHaveURL(/.*\/costs/);
  });
});
