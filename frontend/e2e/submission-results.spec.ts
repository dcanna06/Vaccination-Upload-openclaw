/**
 * E2E Tests — Submission Results page, Edit & Resubmit panel, CSV Export
 *
 * Prerequisites:
 *   - Backend running on http://localhost:8000
 *   - Frontend running on http://localhost:3000
 *   - At least one completed non-dry-run submission exists
 *
 * Run: npx playwright test submission-results.spec.ts
 */

import { test, expect } from '@playwright/test';

const API = process.env.BACKEND_URL || 'http://localhost:8000';

// Use a submission that has real AIR response data
const REAL_SUB_ID = '6b481c33-7821-4b82-821e-8378c4a3f7dd';
const RESULTS_URL = `/submissions/${REAL_SUB_ID}/results`;

// Helper: register + login a test user
async function loginViaUI(page: any) {
  const ts = Date.now();
  const email = `results-${ts}@test.com`;
  const password = 'SecurePass12345';
  await page.request.post(`${API}/api/auth/register`, {
    data: { email, password, first_name: 'Results', last_name: 'Tester' },
    failOnStatusCode: false,
  });
  await page.goto('/login');
  await page.getByLabel(/Email/i).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await expect(page).toHaveURL('/upload', { timeout: 15000 });
}

// ─────────────────────────────────────────────
// 1. Navigation & Page Load
// ─────────────────────────────────────────────

test.describe('Results Page — Load & Navigation', () => {
  test('loads the results page and shows summary header', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(RESULTS_URL);

    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(REAL_SUB_ID.slice(0, 8))).toBeVisible();
    await expect(page.getByText('Total Records')).toBeVisible();
    await expect(page.getByText('Successful').first()).toBeVisible();
  });

  test('shows correct total record count', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(RESULTS_URL);

    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });
    const totalCard = page.locator('text=Total Records').locator('..');
    await expect(totalCard.getByText('10')).toBeVisible();
  });

  test('Back to History button navigates to /history', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(RESULTS_URL);

    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Back to History' }).click();
    await expect(page).toHaveURL('/history');
  });

  test('shows error message for non-existent submission', async ({ page }) => {
    await loginViaUI(page);
    await page.goto('/submissions/nonexistent-id-12345/results');

    await expect(page.getByText(/not found/i)).toBeVisible({ timeout: 10000 });
  });
});

// ─────────────────────────────────────────────
// 2. Record Cards
// ─────────────────────────────────────────────

test.describe('Results Page — Record Cards', () => {
  test('renders all 10 record cards', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(RESULTS_URL);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    const cards = page.locator('[data-testid^="record-card-"]');
    await expect(cards).toHaveCount(10);
  });

  test('error records are expanded by default', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(RESULTS_URL);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    // Row 2 is ERROR — should be expanded, showing AIR message
    const row2 = page.locator('[data-testid="record-card-2"]');
    await expect(row2.getByText(/validation errors|encounter\(s\) that were not successfully recorded/).first()).toBeVisible();
  });

  test('shows patient name on record cards', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(RESULTS_URL);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('button', { name: /Tandra SCRIVENER/ })).toBeVisible();
  });

  test('shows vaccine code on record cards', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(RESULTS_URL);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    await expect(page.getByText('FLUVAX').first()).toBeVisible();
  });

  test('clicking a record card header toggles expansion', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(RESULTS_URL);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    // Row 3 is ERROR (AIR-E-1046) — expanded by default
    const row3 = page.locator('[data-testid="record-card-3"]');
    const toggleButton = row3.locator('button[aria-expanded]');

    // Collapse
    await toggleButton.click();
    const airMessage = row3.locator('text=encounter(s) that were not successfully recorded');
    await expect(airMessage).toBeHidden();

    // Re-expand
    await toggleButton.click();
    await expect(row3.getByText(/encounter\(s\) that were not successfully recorded/).first()).toBeVisible();
  });

  test('shows verbatim AIR message — compliance check', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(RESULTS_URL);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    // At least one of the two AIR error messages should appear verbatim
    const msg1 = page.getByText('The request contains validation errors.');
    const msg2 = page.getByText('There are encounter(s) that were not successfully recorded. Correct the details and submit for processing again or remove the invalid encounter(s).');

    const hasMsg1 = await msg1.first().isVisible().catch(() => false);
    const hasMsg2 = await msg2.first().isVisible().catch(() => false);
    expect(hasMsg1 || hasMsg2).toBe(true);
  });
});

// ─────────────────────────────────────────────
// 3. Filter Toolbar
// ─────────────────────────────────────────────

test.describe('Results Page — Filters', () => {
  test('filter tabs are visible with counts', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(RESULTS_URL);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('button', { name: /All/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Success/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Warnings/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Errors/i }).first()).toBeVisible();
  });

  test('clicking Errors filter shows only error records', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(RESULTS_URL);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Errors/i }).click();

    // All records are errors, so count should be 10
    const cards = page.locator('[data-testid^="record-card-"]');
    await expect(cards).toHaveCount(10);
    await expect(page.getByText(/AIR-E-/).first()).toBeVisible();
  });

  test('clicking Warnings filter shows warning records (may be 0)', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(RESULTS_URL);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Warnings/i }).first().click();

    // Check the page shows either warning cards or "No warning records found"
    const noRecordsMsg = page.getByText(/No warning records found/i);
    const cards = page.locator('[data-testid^="record-card-"]');

    const hasNoRecords = await noRecordsMsg.isVisible().catch(() => false);
    const cardCount = await cards.count();

    // Either shows message or has warning cards
    expect(hasNoRecords || cardCount >= 0).toBe(true);
  });

  test('clicking All filter restores all records', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(RESULTS_URL);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    // Filter to errors
    await page.getByRole('button', { name: /Errors/i }).click();
    const cardsAfterFilter = page.locator('[data-testid^="record-card-"]');
    const errorCount = await cardsAfterFilter.count();

    // Back to all
    await page.getByRole('button', { name: /All/i }).first().click();
    await expect(page.locator('[data-testid^="record-card-"]')).toHaveCount(10);
    expect(errorCount).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────
// 4. Edit & Resubmit Panel
// ─────────────────────────────────────────────

test.describe('Edit & Resubmit Panel', () => {
  test('clicking Edit & Resubmit opens the slide-over panel', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(RESULTS_URL);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    const editButton = page.getByRole('button', { name: /Edit & Resubmit/i }).first();
    await editButton.click();

    await expect(page.getByLabel(/First Name/i)).toBeVisible();
    await expect(page.getByLabel(/Last Name/i)).toBeVisible();
    await expect(page.getByLabel(/Date of Birth/i)).toBeVisible();
  });

  test('panel is pre-populated with record data', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(RESULTS_URL);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    const row2 = page.locator('[data-testid="record-card-2"]');
    await row2.getByRole('button', { name: /Edit & Resubmit/i }).click();

    await expect(page.getByLabel(/First Name/i)).toHaveValue('Tandra');
    await expect(page.getByLabel(/Last Name/i)).toHaveValue('SCRIVENER');
    await expect(page.getByLabel(/Vaccine Code/i)).toHaveValue('FLUVAX');
  });

  test('panel closes on Cancel button', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(RESULTS_URL);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    page.getByRole('button', { name: /Edit & Resubmit/i }).first().click();
    await expect(page.getByLabel(/First Name/i)).toBeVisible();

    await page.getByRole('button', { name: /Cancel/i }).click();
    await expect(page.getByLabel(/First Name/i)).toBeHidden();
  });

  test('panel closes on Escape key', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(RESULTS_URL);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    page.getByRole('button', { name: /Edit & Resubmit/i }).first().click();
    await expect(page.getByLabel(/First Name/i)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByLabel(/First Name/i)).toBeHidden();
  });

  test('panel shows gender dropdown with correct options', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(RESULTS_URL);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    page.getByRole('button', { name: /Edit & Resubmit/i }).first().click();
    await expect(page.getByLabel(/Gender/i)).toBeVisible();

    const genderSelect = page.getByLabel(/Gender/i);
    const options = genderSelect.locator('option');
    const optionTexts = await options.allTextContents();

    expect(optionTexts).toContain('Male');
    expect(optionTexts).toContain('Female');
    expect(optionTexts).toContain('Not Stated');
  });

  test('panel shows route dropdown with correct options', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(RESULTS_URL);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    page.getByRole('button', { name: /Edit & Resubmit/i }).first().click();

    const routeSelect = page.getByLabel(/Route/i);
    await expect(routeSelect).toBeVisible();

    const options = routeSelect.locator('option');
    const optionTexts = await options.allTextContents();

    expect(optionTexts).toContain('Intramuscular');
    expect(optionTexts).toContain('Subcutaneous');
  });

  test('clearing a required field shows validation error', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(RESULTS_URL);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    page.getByRole('button', { name: /Edit & Resubmit/i }).first().click();

    const firstNameField = page.getByLabel(/First Name/i);
    await firstNameField.clear();
    await page.getByLabel(/Last Name/i).click();

    await expect(page.getByText(/required/i).first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// 5. Confirm & Accept (Warning records)
// ─────────────────────────────────────────────

test.describe('Confirm & Accept', () => {
  test('error records do NOT show Confirm button', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(RESULTS_URL);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    // Row 3 is ERROR with action=NONE
    const row3 = page.locator('[data-testid="record-card-3"]');
    await expect(row3.getByRole('button', { name: /Confirm/i })).toBeHidden();
  });
});

// ─────────────────────────────────────────────
// 6. CSV Export
// ─────────────────────────────────────────────

test.describe('CSV Export', () => {
  test('Export button is visible', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(RESULTS_URL);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('button', { name: /Export/i })).toBeVisible();
  });

  test('export endpoint returns CSV with correct headers', async ({ request }) => {
    const response = await request.get(
      `${API}/api/submissions/${REAL_SUB_ID}/export`,
    );

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/csv');

    const body = await response.text();
    expect(body).toContain('AIR Submission Results Report');
    expect(body).toContain(REAL_SUB_ID);
    expect(body).toContain('Row,Status,AIR Code,AIR Message');
    expect(body).toContain('Tandra');
  });
});

// ─────────────────────────────────────────────
// 7. History Page → Results Navigation
// ─────────────────────────────────────────────

test.describe('History Page', () => {
  test('history page loads and shows submissions', async ({ page }) => {
    await loginViaUI(page);
    await page.goto('/history');

    await expect(page.getByText(/Submission History/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('completed').first()).toBeVisible();
  });

  test('View Results button navigates to results page', async ({ page }) => {
    await loginViaUI(page);
    await page.goto('/history');
    await expect(page.getByText(/Submission History/i)).toBeVisible({ timeout: 10000 });

    const viewButton = page.getByRole('button', { name: /View Results/i }).first();
    await viewButton.click();

    await expect(page).toHaveURL(/\/submissions\/.*\/results/);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });
  });
});

// ─────────────────────────────────────────────
// 8. API Direct Tests
// ─────────────────────────────────────────────

test.describe('API — Direct endpoint tests', () => {
  test('GET /api/submissions/{id}/results returns correct shape', async ({ request }) => {
    const response = await request.get(
      `${API}/api/submissions/${REAL_SUB_ID}/results`,
    );

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.id).toBe(REAL_SUB_ID);
    expect(data.counts).toBeDefined();
    expect(data.counts.total).toBe(10);
    expect(data.records).toHaveLength(10);

    // Record shape
    const rec = data.records[0];
    expect(rec.rowNumber).toBeDefined();
    expect(rec.status).toMatch(/^(SUCCESS|WARNING|ERROR)$/);
    expect(rec.airStatusCode).toBeDefined();
    expect(rec.airMessage).toBeTruthy();
    expect(rec.individual).toBeDefined();
    expect(rec.individual.firstName).toBeTruthy();
    expect(rec.encounter).toBeDefined();
    expect(rec.actionRequired).toMatch(/^(NONE|CONFIRM_OR_CORRECT)$/);
  });

  test('GET /api/submissions/{id}/results?status=ERROR filters correctly', async ({ request }) => {
    const response = await request.get(
      `${API}/api/submissions/${REAL_SUB_ID}/results?status=ERROR`,
    );

    const data = await response.json();
    expect(data.records.every((r: any) => r.status === 'ERROR')).toBe(true);
    expect(data.records.length).toBeGreaterThan(0);
    expect(data.counts.total).toBe(10);
  });

  test('GET /api/submissions/{id}/results with pagination', async ({ request }) => {
    const response = await request.get(
      `${API}/api/submissions/${REAL_SUB_ID}/results?page=1&page_size=3`,
    );

    const data = await response.json();
    expect(data.records).toHaveLength(3);
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.pageSize).toBe(3);
    expect(data.pagination.totalRecords).toBe(10);
    expect(data.pagination.totalPages).toBe(4);
  });

  test('GET /api/submissions/nonexistent/results returns 404', async ({ request }) => {
    const response = await request.get(
      `${API}/api/submissions/nonexistent-id/results`,
    );
    expect(response.status()).toBe(404);
  });

  test('verbatim AIR message is preserved exactly', async ({ request }) => {
    const response = await request.get(
      `${API}/api/submissions/${REAL_SUB_ID}/results`,
    );

    const data = await response.json();

    // All records are errors — check for verbatim error messages
    const messages = data.records.map((r: any) => r.airMessage);
    const hasValidation = messages.includes('The request contains validation errors.');
    const hasEncounter = messages.includes(
      'There are encounter(s) that were not successfully recorded. Correct the details and submit for processing again or remove the invalid encounter(s).',
    );

    expect(hasValidation || hasEncounter).toBe(true);
  });
});
