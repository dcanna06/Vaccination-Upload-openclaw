/**
 * E2E Tests — Immunisation History (API #3)
 *
 * Tests the full flow: Login → Search Individual → Hub → History Details.
 * Uses vendor test data (MAHER — has recorded encounters).
 *
 * Prerequisites:
 *   - Backend running on http://localhost:8000
 *   - Frontend running on http://localhost:3000
 *   - Database migrated (users table exists)
 *   - PRODA credentials configured in backend .env
 */

import { test, expect } from '@playwright/test';

const TIMESTAMP = Date.now();
const TEST_EMAIL = `hist-${TIMESTAMP}@test.com`;
const TEST_PASSWORD = 'SecurePass12345';

// Vendor test patient: Lyndon MAHER (Section 5 — has recorded encounters)
const PATIENT = {
  firstName: 'Lyndon',
  lastName: 'MAHER',
  dateOfBirth: '1962-09-27',
  gender: 'M',
  medicareCardNumber: '3951333251',
  medicareIRN: '1',
  providerNumber: '2448141T',
};

/** Register + login helper. */
async function loginUser(page: import('@playwright/test').Page) {
  await page.request.post('http://localhost:8000/api/auth/register', {
    data: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      first_name: 'History',
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
// 1. API-level: verify history/details endpoint directly
// ──────────────────────────────────────────────────────

test.describe('History Details API', () => {
  test('returns due vaccines and history for identified individual', async ({ request }) => {
    // Step 1: Identify individual
    const identifyResp = await request.post('http://localhost:8000/api/individuals/identify', {
      data: {
        personalDetails: {
          firstName: PATIENT.firstName,
          lastName: PATIENT.lastName,
          dateOfBirth: PATIENT.dateOfBirth,
          gender: PATIENT.gender,
        },
        medicareCard: {
          medicareCardNumber: PATIENT.medicareCardNumber,
          medicareIRN: PATIENT.medicareIRN,
        },
        informationProvider: { providerNumber: PATIENT.providerNumber },
      },
    });

    expect(identifyResp.status()).toBe(200);
    const identifyData = await identifyResp.json();
    expect(identifyData.status).toBe('success');
    expect(identifyData.individualIdentifier).toBeTruthy();

    // Step 2: Get history details
    const historyResp = await request.post(
      'http://localhost:8000/api/individuals/history/details',
      {
        data: {
          individualIdentifier: identifyData.individualIdentifier,
          informationProvider: { providerNumber: PATIENT.providerNumber },
          subjectDob: PATIENT.dateOfBirth,
        },
      },
    );

    expect(historyResp.status()).toBe(200);
    const historyData = await historyResp.json();

    expect(historyData.status).toBe('success');
    expect(historyData.statusCode).toMatch(/^AIR-[IW]-/);

    // MAHER has due vaccines — verify field mapping from AIR dueList
    expect(historyData.vaccineDueDetails).toBeInstanceOf(Array);
    expect(historyData.vaccineDueDetails.length).toBeGreaterThan(0);
    expect(historyData.vaccineDueDetails[0].antigenCode).toBeTruthy();
    expect(historyData.vaccineDueDetails[0].dueDate).toBeTruthy();
    expect(historyData.vaccineDueDetails[0].doseNumber).toBeTruthy();

    // MAHER has encounter history — verify flattened entries
    expect(historyData.immunisationHistory).toBeInstanceOf(Array);
    expect(historyData.immunisationHistory.length).toBeGreaterThan(0);
    const entry = historyData.immunisationHistory[0];
    expect(entry.dateOfService).toBeTruthy();
    expect(entry.vaccineCode).toBeTruthy();
    expect(entry.vaccineDose).toBeTruthy();
    expect(entry.status).toBe('VALID');
    expect(entry.editable).toBe(true);
  });
});

// ──────────────────────────────────────────────────────
// 2. Full UI flow: search → hub → history page
// ──────────────────────────────────────────────────────

test.describe('Immunisation History Page', () => {
  test('displays history after searching for an individual', async ({ page }) => {
    await loginUser(page);

    // Navigate to individual search
    await page.goto('/individuals');
    await expect(page.getByText('Search Individual')).toBeVisible();

    // Fill the form (labels not connected via htmlFor — use placeholder/position)
    await page.getByPlaceholder('10 digits').fill(PATIENT.medicareCardNumber);
    await page.getByPlaceholder('1-9').fill(PATIENT.medicareIRN);
    await page.locator('input').nth(2).fill(PATIENT.firstName);  // First Name
    await page.locator('input').nth(3).fill(PATIENT.lastName);   // Last Name
    await page.locator('input[type="date"]').fill(PATIENT.dateOfBirth);
    await page.locator('select').selectOption(PATIENT.gender);
    await page.getByPlaceholder('e.g. 1234567A').fill(PATIENT.providerNumber);

    // Submit search
    await page.getByRole('button', { name: /Search AIR/i }).click();

    // Should navigate to hub page
    await expect(page).toHaveURL(/\/individuals\/[^/]+$/, { timeout: 20000 });

    // Click "Immunisation History" card link
    await page.locator('a').filter({ hasText: 'Immunisation History' }).first().click();

    // Wait for history page to load
    await expect(page.getByRole('heading', { name: 'Immunisation History' })).toBeVisible({
      timeout: 15000,
    });

    // Wait for loading to complete
    await page.waitForFunction(() => !document.querySelector('.animate-spin'), {
      timeout: 20000,
    });

    // Verify NO error is shown
    await expect(page.locator('.border-red-500\\/50')).toBeHidden();

    // Verify "Vaccines Due" section with data
    await expect(page.getByRole('heading', { name: 'Vaccines Due' })).toBeVisible();
    await expect(
      page.getByText('There are no vaccinations due for this individual'),
    ).toBeHidden();
    await expect(page.locator('table').first().locator('tbody tr').first()).toBeVisible();

    // Verify "Immunisation History" section with data
    await expect(
      page.getByText('No immunisation history is recorded for this individual'),
    ).toBeHidden();
    const historyRows = page.locator('table').nth(1).locator('tbody tr');
    await expect(historyRows.first()).toBeVisible();

    // Verify table content: formatted date (dd/MM/yyyy), vaccine, status=Valid
    const firstRow = historyRows.first();
    await expect(firstRow.locator('td').first()).toContainText('/');
    await expect(firstRow.locator('td').nth(1)).not.toBeEmpty();
    await expect(firstRow.getByText('Valid')).toBeVisible();
  });
});
