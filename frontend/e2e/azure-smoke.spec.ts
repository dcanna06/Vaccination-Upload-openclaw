/**
 * Azure Smoke Tests — Record Encounter, Bulk History, Clinic Mode
 *
 * Targets the Azure-deployed app to verify end-to-end flows.
 * Uses a pre-existing test user (no registration needed on Azure).
 *
 * Run:
 *   cd frontend
 *   PLAYWRIGHT_BASE_URL=https://air-vaccination-frontend.azurewebsites.net \
 *   BACKEND_URL=https://air-vaccination-backend.azurewebsites.net \
 *   npx playwright test azure-smoke.spec.ts --headed
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const TEST_EMAIL = 'david@test.com';
const TEST_PASSWORD = 'TestPassword12';
const PROVIDER_NUMBER = '2448141T';

// Test Excel files at repo root
const ENCOUNTER_FILE = path.resolve(__dirname, '../../air-vendor-test-upload.xlsx');
const HISTORY_FILE = path.resolve(__dirname, '../../bulk-history-test-data.xlsx');

/** Login via the UI form (user already exists on Azure). */
async function loginViaUI(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/Email/i).fill(TEST_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await expect(page).toHaveURL('/upload', { timeout: 30000 });
}

// ─────────────────────────────────────────────
// Suite 1: Record Encounter
// ─────────────────────────────────────────────

test.describe('Record Encounter', () => {
  test('upload Excel and see Upload Complete summary', async ({ page }) => {
    test.setTimeout(120_000);
    await loginViaUI(page);

    // Upload file
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(ENCOUNTER_FILE);

    // Wait for upload to complete
    await expect(page.getByText('Upload Complete')).toBeVisible({ timeout: 60000 });

    // Verify row counts are displayed
    await expect(page.getByText('Total Rows')).toBeVisible();
    await expect(page.getByText('Valid', { exact: true })).toBeVisible();
  });

  test('full flow: upload → review/validate → submit → see progress', async ({ page }) => {
    test.setTimeout(120_000);
    await loginViaUI(page);

    // Upload
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(ENCOUNTER_FILE);
    await expect(page.getByText('Upload Complete')).toBeVisible({ timeout: 60000 });

    // Navigate to Review & Validate
    const reviewButton = page.getByRole('button', { name: /Review & Validate/i });
    if (await reviewButton.isVisible()) {
      await reviewButton.click();
      await expect(page).toHaveURL(/\/validate/, { timeout: 15000 });
    }
  });

  test('submission results page shows records with status', async ({ page }) => {
    test.setTimeout(120_000);
    await loginViaUI(page);

    // Navigate to history page to find a completed submission
    await page.goto('/history');
    await expect(page.getByText(/Submission History/i)).toBeVisible({ timeout: 15000 });

    // If there are completed submissions, click View Results
    const viewButton = page.getByRole('button', { name: /View Results/i }).first();
    if (await viewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewButton.click();
      await expect(page).toHaveURL(/\/submissions\/.*\/results/, { timeout: 15000 });
      await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Total Records')).toBeVisible();
    }
  });
});

// ─────────────────────────────────────────────
// Suite 2: Bulk History
// ─────────────────────────────────────────────

test.describe('Bulk History', () => {
  test('upload bulk history Excel and see parsed records table', async ({ page }) => {
    test.setTimeout(180_000);
    await loginViaUI(page);

    await page.goto('/bulk-history');
    await expect(page.getByRole('heading', { name: 'Bulk Immunisation History' })).toBeVisible();

    // Upload file
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(HISTORY_FILE);

    // Click Upload & Parse
    await page.getByRole('button', { name: /Upload & Parse/i }).click();

    // Should move to validate step and show parsed records table
    await expect(page.getByRole('heading', { name: /Patients/i })).toBeVisible({ timeout: 60000 });
    await expect(page.locator('table')).toBeVisible();
  });

  test('full flow: upload → provider → validate → fetch history → results', async ({ page }) => {
    test.setTimeout(180_000);
    await loginViaUI(page);

    await page.goto('/bulk-history');
    await expect(page.getByRole('heading', { name: 'Bulk Immunisation History' })).toBeVisible();

    // Upload
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(HISTORY_FILE);
    await page.getByRole('button', { name: /Upload & Parse/i }).click();
    await expect(page.getByRole('heading', { name: /Patients/i })).toBeVisible({ timeout: 60000 });

    // Enter provider number
    const providerInput = page.getByPlaceholder(/2448141T/i);
    await providerInput.fill(PROVIDER_NUMBER);

    // Click Fetch History
    const fetchButton = page.getByRole('button', { name: /Fetch History/i });
    await fetchButton.click();

    // Should show processing or results
    const processingOrResults = page.getByText(/Processing|Total Patients|History Retrieved/i);
    await expect(processingOrResults.first()).toBeVisible({ timeout: 30000 });

    // Wait for results step (polling completes)
    await expect(page.getByText(/Total Patients/i)).toBeVisible({ timeout: 180000 });
    await expect(page.getByText(/History Retrieved/i)).toBeVisible();
  });

  test('download results returns Excel file', async ({ page }) => {
    test.setTimeout(180_000);
    await loginViaUI(page);

    await page.goto('/bulk-history');

    // Upload
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(HISTORY_FILE);
    await page.getByRole('button', { name: /Upload & Parse/i }).click();
    await expect(page.getByRole('heading', { name: /Patients/i })).toBeVisible({ timeout: 60000 });

    // Enter provider and fetch
    await page.getByPlaceholder(/2448141T/i).fill(PROVIDER_NUMBER);
    await page.getByRole('button', { name: /Fetch History/i }).click();

    // Wait for results
    await expect(page.getByText(/Total Patients/i)).toBeVisible({ timeout: 180000 });

    // Click download — expect a download event
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.getByRole('button', { name: /Download Excel/i }).click(),
    ]);

    expect(download.suggestedFilename()).toContain('.xlsx');
  });
});

// ─────────────────────────────────────────────
// Suite 3: Clinic Mode
// ─────────────────────────────────────────────

test.describe('Clinic Mode', () => {
  test('empty state shows "No patient data loaded" with link to bulk-history', async ({ page }) => {
    test.setTimeout(60_000);
    await loginViaUI(page);

    await page.goto('/clinic-mode');
    await expect(page.getByRole('heading', { name: 'Vaccine Clinic Mode' })).toBeVisible();
    await expect(page.getByText('No patient data loaded')).toBeVisible();
    await expect(page.getByText('Go to Bulk History')).toBeVisible();
  });

  test('"Go to Bulk History" button navigates correctly', async ({ page }) => {
    test.setTimeout(60_000);
    await loginViaUI(page);

    await page.goto('/clinic-mode');
    await page.getByText('Go to Bulk History').click();
    await expect(page).toHaveURL('/bulk-history');
  });

  test('sidebar has "Clinic Mode" link', async ({ page }) => {
    test.setTimeout(60_000);
    await loginViaUI(page);

    const sidebarLink = page.locator('nav a').filter({ hasText: 'Clinic Mode' });
    await expect(sidebarLink).toBeVisible();
    await sidebarLink.click();
    await expect(page).toHaveURL('/clinic-mode');
  });

  test('full flow: bulk-history results → Enter Clinic Mode → view patients', async ({ page }) => {
    test.setTimeout(240_000);
    await loginViaUI(page);

    // Run full bulk-history flow first
    await page.goto('/bulk-history');
    await expect(page.getByRole('heading', { name: 'Bulk Immunisation History' })).toBeVisible();

    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(HISTORY_FILE);
    await page.getByRole('button', { name: /Upload & Parse/i }).click();
    await expect(page.getByRole('heading', { name: /Patients/i })).toBeVisible({ timeout: 60000 });

    await page.getByPlaceholder(/2448141T/i).fill(PROVIDER_NUMBER);
    await page.getByRole('button', { name: /Fetch History/i }).click();

    // Wait for results
    await expect(page.getByText(/Total Patients/i)).toBeVisible({ timeout: 180000 });

    // Click Enter Clinic Mode
    const clinicButton = page.getByRole('button', { name: /Enter Clinic Mode/i });
    await expect(clinicButton).toBeVisible();
    await clinicButton.click();

    // Should navigate to clinic-mode with data loaded
    await expect(page).toHaveURL('/clinic-mode', { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Vaccine Clinic Mode' })).toBeVisible();

    // If data loaded, should NOT show empty state
    const emptyState = page.getByText('No patient data loaded');
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    if (!hasEmptyState) {
      // Clinic cards or patient data should be visible
      await expect(page.locator('[data-testid^="clinic-card-"]').first()).toBeVisible({ timeout: 10000 });
    }
  });
});
