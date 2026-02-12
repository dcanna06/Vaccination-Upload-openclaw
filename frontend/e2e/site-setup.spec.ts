/**
 * E2E Tests — Site Setup Wizard
 *
 * Prerequisites:
 *   - Backend running on ${BACKEND_URL}
 *   - Frontend running on PLAYWRIGHT_BASE_URL
 *   - Database migrated (locations/location_providers tables exist)
 *   - Test user exists (david@test.com / TestPassword12)
 *
 * Run:
 *   PLAYWRIGHT_BASE_URL=https://air-vaccination-frontend.azurewebsites.net \
 *   BACKEND_URL=https://air-vaccination-backend.azurewebsites.net \
 *   npx playwright test site-setup.spec.ts
 */

import { test, expect, Page } from '@playwright/test';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const TEST_EMAIL = 'david@test.com';
const TEST_PASSWORD = 'TestPassword12';

/** Login via the UI form. */
async function loginViaUI(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/Email/i).fill(TEST_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await expect(page).toHaveURL('/upload', { timeout: 30000 });
}

test.describe('Site Setup Wizard', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60_000);
    await loginViaUI(page);
  });

  test('loads the setup page with all 4 steps', async ({ page }) => {
    await page.goto('/setup');

    await expect(page.getByRole('heading', { name: 'Site Setup' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Site Details/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Provider Number/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /HW027/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /PRODA Link/ })).toBeVisible();
  });

  test('starts on site details step', async ({ page }) => {
    await page.goto('/setup');

    await expect(page.getByText('Step 1: Site Details')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('site-name')).toBeVisible();
  });

  test('validates site name is required', async ({ page }) => {
    await page.goto('/setup');

    await expect(page.getByText('Create Site')).toBeVisible({ timeout: 15000 });
    await page.getByText('Create Site').click();
    await expect(page.getByText('Site name is required')).toBeVisible();
  });

  test('creates location and shows Minor ID', async ({ page }) => {
    // Mock the API response for location creation
    await page.route(`${BACKEND_URL}/api/locations`, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            organisation_id: 1,
            name: 'E2E Test Clinic',
            address_line_1: '1 Test St',
            address_line_2: '',
            suburb: 'Sydney',
            state: 'NSW',
            postcode: '2000',
            minor_id: 'TST-001',
            proda_link_status: 'pending',
            status: 'active',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          }),
        });
      }
    });

    // Mock setup-status endpoint
    await page.route(`${BACKEND_URL}/api/locations/1/setup-status`, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          location: {
            id: 1,
            name: 'E2E Test Clinic',
            minor_id: 'TST-001',
            proda_link_status: 'pending',
          },
          providers: [],
          setupComplete: false,
          steps: {
            siteDetails: { complete: true },
            providerLinked: { complete: false },
            hw027: { complete: false, statuses: {} },
            prodaLink: { complete: false, status: 'pending' },
            providerVerified: { complete: false, accessLists: {} },
          },
        }),
      });
    });

    await page.goto('/setup');

    await expect(page.getByTestId('site-name')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('site-name').fill('E2E Test Clinic');
    await page.getByText('Create Site').click();

    // Should advance to provider step
    await expect(page.getByText('Step 2: Provider Number')).toBeVisible({ timeout: 15000 });
  });

  test('navigates between steps via step buttons', async ({ page }) => {
    await page.goto('/setup');
    await expect(page.getByText('Step 1: Site Details')).toBeVisible({ timeout: 15000 });

    // Go to provider step
    await page.getByText(/Provider Number/).click();
    await expect(page.getByText('Step 2: Provider Number')).toBeVisible();

    // Go to HW027 step
    await page.getByText(/HW027/).click();
    await expect(page.getByText('Step 3: HW027 Form')).toBeVisible();

    // Go to PRODA step
    await page.getByRole('button', { name: '4. PRODA Link' }).click();
    await expect(page.getByText('Step 4: PRODA Linking & Verification')).toBeVisible();

    // Go back to site step
    await page.getByRole('button', { name: '1. Site Details' }).click();
    await expect(page.getByText('Step 1: Site Details')).toBeVisible();
  });

  test('back button navigates to previous step', async ({ page }) => {
    await page.goto('/setup');
    await expect(page.getByText('Step 1: Site Details')).toBeVisible({ timeout: 15000 });

    // Navigate to provider step
    await page.getByText(/Provider Number/).click();
    await expect(page.getByText('Step 2: Provider Number')).toBeVisible();

    // Click Back
    await page.getByText('Back').click();
    await expect(page.getByText('Step 1: Site Details')).toBeVisible();
  });

  test('PRODA step shows setup summary', async ({ page }) => {
    await page.goto('/setup');
    await expect(page.getByText('Step 1: Site Details')).toBeVisible({ timeout: 15000 });

    await page.getByText(/PRODA Link/).click();

    await expect(page.getByText('Setup Summary:')).toBeVisible();
    await expect(page.getByText('PRODA Link Status:')).toBeVisible();
  });
});
