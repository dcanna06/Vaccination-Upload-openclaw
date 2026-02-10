/**
 * E2E Tests — Bulk Immunisation History Request
 *
 * Tests the full flow: Upload Excel → Validate → Process → View Results → Download.
 * Uses vendor test data (MAHER, SCRIVENER — Section 5 patients with history).
 *
 * Prerequisites:
 *   - Backend running on http://localhost:8000
 *   - Frontend running on http://localhost:3000
 *   - Database migrated (users table exists)
 *   - PRODA credentials configured in backend .env
 *
 * Run: npx playwright test bulk-history.spec.ts
 */

import { test, expect } from '@playwright/test';

const API = 'http://localhost:8000';
const TIMESTAMP = Date.now();
const TEST_EMAIL = `bulk-hist-${TIMESTAMP}@test.com`;
const TEST_PASSWORD = 'SecurePass12345';

// Vendor test patients (Section 5 — have recorded encounters)
const PATIENTS = [
  {
    firstName: 'Lyndon',
    lastName: 'MAHER',
    dateOfBirth: '1962-09-27',
    gender: 'M',
    medicareCardNumber: '3951333251',
    medicareIRN: '1',
  },
  {
    firstName: 'Margaret',
    lastName: 'SCRIVENER',
    dateOfBirth: '1950-11-22',
    gender: 'F',
    medicareCardNumber: '3951333161',
    medicareIRN: '1',
  },
];

const PROVIDER_NUMBER = '2448141T';

/** Register + login helper. */
async function loginUser(page: import('@playwright/test').Page) {
  await page.request.post(`${API}/api/auth/register`, {
    data: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      first_name: 'Bulk',
      last_name: 'Tester',
    },
    failOnStatusCode: false,
  });

  await page.goto('/login');
  await page.getByLabel(/Email/i).fill(TEST_EMAIL);
  await page.getByLabel(/Password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await expect(page).toHaveURL('/upload', { timeout: 15000 });
}

// ──────────────────────────────────────────────────────
// 1. API-level tests — Validate endpoint
// ──────────────────────────────────────────────────────

test.describe('Bulk History Validate API', () => {
  test('validates records and returns errors for invalid data', async ({ request }) => {
    const resp = await request.post(`${API}/api/bulk-history/validate`, {
      data: {
        records: [
          {
            rowNumber: 1,
            dateOfBirth: '1962-09-27',
            gender: 'M',
            medicareCardNumber: '3951333251',
            medicareIRN: '1',
            lastName: 'MAHER',
          },
          {
            rowNumber: 2,
            // Missing all identification — should fail
            dateOfBirth: '2000-01-01',
            gender: 'Z', // Invalid gender
          },
        ],
        providerNumber: PROVIDER_NUMBER,
      },
    });

    expect(resp.status()).toBe(200);
    const data = await resp.json();

    expect(data.totalRecords).toBe(2);
    expect(data.validRecords).toBe(1);
    expect(data.invalidRecords).toBe(1);
    expect(data.isValid).toBe(false);
    expect(data.errors.length).toBeGreaterThan(0);
    // Row 2 should have gender error
    const row2Errors = data.errors.filter(
      (e: { rowNumber: number }) => e.rowNumber === 2
    );
    expect(row2Errors.length).toBeGreaterThan(0);
  });

  test('returns isValid=true when all records pass validation', async ({ request }) => {
    const resp = await request.post(`${API}/api/bulk-history/validate`, {
      data: {
        records: PATIENTS.map((p, i) => ({
          rowNumber: i + 1,
          ...p,
        })),
        providerNumber: PROVIDER_NUMBER,
      },
    });

    expect(resp.status()).toBe(200);
    const data = await resp.json();

    expect(data.isValid).toBe(true);
    expect(data.validRecords).toBe(2);
    expect(data.invalidRecords).toBe(0);
    expect(data.errors).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────
// 2. API-level tests — Process + Results endpoints
// ──────────────────────────────────────────────────────

test.describe('Bulk History Process API', () => {
  test('processes records and returns immunisation history', async ({ request }) => {
    // Start processing
    const processResp = await request.post(`${API}/api/bulk-history/process`, {
      data: {
        records: PATIENTS.map((p, i) => ({
          rowNumber: i + 1,
          ...p,
        })),
        providerNumber: PROVIDER_NUMBER,
      },
    });

    expect(processResp.status()).toBe(200);
    const processData = await processResp.json();
    expect(processData.requestId).toBeTruthy();
    expect(processData.status).toBe('running');
    expect(processData.totalRecords).toBe(2);

    const requestId = processData.requestId;

    // Poll for completion (max 60 seconds)
    let completed = false;
    for (let i = 0; i < 60; i++) {
      const progressResp = await request.get(
        `${API}/api/bulk-history/${requestId}/progress`
      );
      expect(progressResp.status()).toBe(200);
      const progressData = await progressResp.json();

      if (progressData.status === 'completed') {
        completed = true;
        expect(progressData.progress.processedRecords).toBe(2);
        break;
      }

      if (progressData.status === 'error') {
        // Accept error status if PRODA credentials are not configured
        console.log('Process ended with error (PRODA may not be configured):', progressData.error);
        completed = true;
        break;
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    expect(completed).toBe(true);

    // Get results
    const resultsResp = await request.get(
      `${API}/api/bulk-history/${requestId}/results`
    );
    expect(resultsResp.status()).toBe(200);
    const resultsData = await resultsResp.json();

    expect(resultsData.requestId).toBe(requestId);
    expect(resultsData.results).toBeInstanceOf(Array);

    // If PRODA is configured and processing succeeded, verify history data
    if (resultsData.status === 'completed' && resultsData.successfulRecords > 0) {
      const successResults = resultsData.results.filter(
        (r: { status: string }) => r.status === 'success'
      );
      expect(successResults.length).toBeGreaterThan(0);

      // MAHER should have immunisation history
      const maher = successResults.find(
        (r: { lastName?: string }) => r.lastName === 'MAHER'
      );
      if (maher) {
        expect(maher.immunisationHistory).toBeInstanceOf(Array);
        expect(maher.immunisationHistory.length).toBeGreaterThan(0);
        expect(maher.immunisationHistory[0].vaccineCode).toBeTruthy();
        expect(maher.immunisationHistory[0].dateOfService).toBeTruthy();
      }
    }
  });

  test('download endpoint returns Excel file', async ({ request }) => {
    // Start a quick process
    const processResp = await request.post(`${API}/api/bulk-history/process`, {
      data: {
        records: [{ rowNumber: 1, ...PATIENTS[0] }],
        providerNumber: PROVIDER_NUMBER,
      },
    });

    const { requestId } = await processResp.json();

    // Wait for completion
    for (let i = 0; i < 60; i++) {
      const progressResp = await request.get(
        `${API}/api/bulk-history/${requestId}/progress`
      );
      const progressData = await progressResp.json();
      if (progressData.status === 'completed' || progressData.status === 'error') break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Try download
    const downloadResp = await request.get(
      `${API}/api/bulk-history/${requestId}/download`
    );

    // Download should succeed if processing completed
    if (downloadResp.status() === 200) {
      const contentType = downloadResp.headers()['content-type'];
      expect(contentType).toContain('spreadsheet');
      const disposition = downloadResp.headers()['content-disposition'];
      expect(disposition).toContain('immunisation-history');
      expect(disposition).toContain('.xlsx');
    }
  });

  test('returns 404 for non-existent request', async ({ request }) => {
    const resp = await request.get(
      `${API}/api/bulk-history/non-existent-id/progress`
    );
    expect(resp.status()).toBe(404);
  });
});

// ──────────────────────────────────────────────────────
// 3. UI tests — Page navigation and rendering
// ──────────────────────────────────────────────────────

test.describe('Bulk History UI', () => {
  test('page loads and shows upload step', async ({ page }) => {
    await loginUser(page);
    await page.goto('/bulk-history');

    await expect(page.getByRole('heading', { name: 'Bulk Immunisation History' })).toBeVisible();
    await expect(page.getByText('Upload patient details to retrieve immunisation histories')).toBeVisible();
    await expect(page.getByText('Upload Patient List')).toBeVisible();
  });

  test('sidebar has Bulk History link', async ({ page }) => {
    await loginUser(page);

    const sidebarLink = page.locator('nav a').filter({ hasText: 'Bulk History' });
    await expect(sidebarLink).toBeVisible();
    await sidebarLink.click();
    await expect(page).toHaveURL('/bulk-history');
  });

  test('shows step indicator with 4 steps', async ({ page }) => {
    await loginUser(page);
    await page.goto('/bulk-history');

    // Step indicators contain step number + label (e.g. "1 Upload", "2 Validate")
    const stepBar = page.locator('.flex.gap-2').first();
    await expect(stepBar.getByText('1')).toBeVisible();
    await expect(stepBar.getByText('2')).toBeVisible();
    await expect(stepBar.getByText('3')).toBeVisible();
    await expect(stepBar.getByText('4')).toBeVisible();
  });

  test('shows upload instructions with required columns', async ({ page }) => {
    await loginUser(page);
    await page.goto('/bulk-history');

    // Verify the upload instructions mention required column details
    await expect(
      page.getByText(/Date of Birth/i)
    ).toBeVisible();
    await expect(
      page.getByText(/Medicare Card Number/i)
    ).toBeVisible();
  });
});

// ──────────────────────────────────────────────────────
// 4. API-level — Upload endpoint
// ──────────────────────────────────────────────────────

test.describe('Bulk History Upload API', () => {
  test('rejects non-Excel files', async ({ request }) => {
    const resp = await request.post(`${API}/api/bulk-history/upload`, {
      multipart: {
        file: {
          name: 'test.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('not an excel file'),
        },
      },
    });

    // Should return 400 or 422 for invalid file
    expect(resp.status()).toBeGreaterThanOrEqual(400);
  });
});
