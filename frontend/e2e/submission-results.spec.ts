/**
 * E2E Tests — Submission Results page, Edit & Resubmit panel, CSV Export
 *
 * Prerequisites:
 *   - Backend running on http://localhost:8000
 *   - Frontend running on http://localhost:3000
 *   - At least one completed non-dry-run submission exists
 *
 * Run: npx playwright test
 * Run headed: npx playwright test --headed
 */

import { test, expect } from '@playwright/test';

// Real submission with AIR warning/error results
const REAL_SUB_ID = '6b481c33-7821-4b82-821e-8378c4a3f7dd';
const RESULTS_URL = `/submissions/${REAL_SUB_ID}/results`;

// ─────────────────────────────────────────────
// 1. Navigation & Page Load
// ─────────────────────────────────────────────

test.describe('Results Page — Load & Navigation', () => {
  test('loads the results page and shows summary header', async ({ page }) => {
    await page.goto(RESULTS_URL);

    // Page title
    await expect(page.getByText('Submission Results')).toBeVisible();

    // Submission ID prefix shown
    await expect(page.getByText(REAL_SUB_ID.slice(0, 8))).toBeVisible();

    // 4 summary count cards
    await expect(page.getByText('Total Records')).toBeVisible();
    // "Successful" appears as card label
    await expect(page.locator('text=Successful').first()).toBeVisible();
  });

  test('shows correct total record count', async ({ page }) => {
    await page.goto(RESULTS_URL);

    // API returns 10 records for this submission
    const totalCard = page.locator('text=Total Records').locator('..');
    await expect(totalCard.getByText('10')).toBeVisible();
  });

  test('Back to History button navigates to /history', async ({ page }) => {
    await page.goto(RESULTS_URL);

    await page.getByRole('button', { name: 'Back to History' }).click();
    await expect(page).toHaveURL('/history');
  });

  test('shows 404-friendly message for non-existent submission', async ({ page }) => {
    await page.goto('/submissions/nonexistent-id-12345/results');

    await expect(page.getByText(/not found/i)).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// 2. Record Cards
// ─────────────────────────────────────────────

test.describe('Results Page — Record Cards', () => {
  test('renders all 10 record cards', async ({ page }) => {
    await page.goto(RESULTS_URL);

    const cards = page.locator('[data-testid^="record-card-"]');
    await expect(cards).toHaveCount(10);
  });

  test('error and warning records are expanded by default', async ({ page }) => {
    await page.goto(RESULTS_URL);

    // Row 2 is a WARNING — should be expanded, showing AIR status code
    const row2 = page.locator('[data-testid="record-card-2"]');
    // The expanded view shows the AIR message verbatim
    await expect(row2.getByText(/encounter\(s\) that were not successfully recorded/)).toBeVisible();
  });

  test('shows patient name and vaccine info on record cards', async ({ page }) => {
    await page.goto(RESULTS_URL);

    // Row 2 header button includes "Tandra SCRIVENER"
    await expect(page.getByRole('button', { name: /Tandra SCRIVENER/ })).toBeVisible();
  });

  test('shows vaccine code on record cards', async ({ page }) => {
    await page.goto(RESULTS_URL);

    await expect(page.getByText('FLUVAX').first()).toBeVisible();
  });

  test('clicking a record card header toggles expansion', async ({ page }) => {
    await page.goto(RESULTS_URL);

    const row2 = page.locator('[data-testid="record-card-2"]');
    const toggleButton = row2.locator('button[aria-expanded]');

    // Currently expanded (warning) — collapse it
    await toggleButton.click();

    // AIR message should be hidden after collapse
    const airMessage = row2.locator('text=encounter(s) that were not successfully recorded');
    await expect(airMessage).toBeHidden();

    // Re-expand
    await toggleButton.click();
    await expect(row2.getByText(/encounter\(s\) that were not successfully recorded/)).toBeVisible();
  });

  test('displays episode pills for warning records', async ({ page }) => {
    await page.goto(RESULTS_URL);

    // Row 2 has an episode with FLUVAX | AIR-W-0044
    // Episode code is visible on the page
    await expect(page.getByText('AIR-W-0044').first()).toBeVisible();
  });

  test('shows verbatim AIR message — compliance check', async ({ page }) => {
    await page.goto(RESULTS_URL);

    // The exact verbatim message from AIR must appear unmodified
    const verbatimMsg = 'There are encounter(s) that were not successfully recorded. Correct the details or submit confirmation accepting episode(s) status.';
    await expect(page.getByText(verbatimMsg).first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// 3. Filter Toolbar
// ─────────────────────────────────────────────

test.describe('Results Page — Filters', () => {
  test('filter tabs are visible with counts', async ({ page }) => {
    await page.goto(RESULTS_URL);

    // Filter buttons: All, Success, Warnings, Errors
    await expect(page.getByRole('button', { name: /All/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Success/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Warnings/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Errors/i })).toBeVisible();
  });

  test('clicking Errors filter shows only error records', async ({ page }) => {
    await page.goto(RESULTS_URL);

    await page.getByRole('button', { name: /Errors/i }).click();

    // Should show 5 error cards
    const cards = page.locator('[data-testid^="record-card-"]');
    await expect(cards).toHaveCount(5);

    // All visible cards should be errors (AIR-E-1046)
    await expect(page.getByText('AIR-E-1046').first()).toBeVisible();
  });

  test('clicking Warnings filter shows only warning records', async ({ page }) => {
    await page.goto(RESULTS_URL);

    await page.getByRole('button', { name: /^Warnings/ }).click();

    const cards = page.locator('[data-testid^="record-card-"]');
    await expect(cards).toHaveCount(5);

    await expect(page.getByText('AIR-W-1008').first()).toBeVisible();
  });

  test('clicking All filter restores all records', async ({ page }) => {
    await page.goto(RESULTS_URL);

    // Filter to errors first
    await page.getByRole('button', { name: /Errors/i }).click();
    await expect(page.locator('[data-testid^="record-card-"]')).toHaveCount(5);

    // Back to all — click the "All" button in the filter toolbar
    const allButton = page.locator('button', { hasText: /^All/ }).first();
    await allButton.click();
    await expect(page.locator('[data-testid^="record-card-"]')).toHaveCount(10);
  });
});

// ─────────────────────────────────────────────
// 4. Edit & Resubmit Panel
// ─────────────────────────────────────────────

test.describe('Edit & Resubmit Panel', () => {
  test('clicking Edit & Resubmit opens the slide-over panel', async ({ page }) => {
    await page.goto(RESULTS_URL);

    // Find an error record's Edit & Resubmit button
    const editButton = page.getByRole('button', { name: /Edit & Resubmit/i }).first();
    await editButton.click();

    // Panel should appear with form fields
    await expect(page.getByLabel(/First Name/i)).toBeVisible();
    await expect(page.getByLabel(/Last Name/i)).toBeVisible();
    await expect(page.getByLabel(/Date of Birth/i)).toBeVisible();
  });

  test('panel is pre-populated with record data', async ({ page }) => {
    await page.goto(RESULTS_URL);

    // Open panel for row 2 (Tandra SCRIVENER)
    const row2 = page.locator('[data-testid="record-card-2"]');
    await row2.getByRole('button', { name: /Edit & Resubmit/i }).click();

    await expect(page.getByLabel(/First Name/i)).toHaveValue('Tandra');
    await expect(page.getByLabel(/Last Name/i)).toHaveValue('SCRIVENER');
    await expect(page.getByLabel(/Vaccine Code/i)).toHaveValue('FLUVAX');
  });

  test('panel closes on Cancel button', async ({ page }) => {
    await page.goto(RESULTS_URL);

    const editButton = page.getByRole('button', { name: /Edit & Resubmit/i }).first();
    await editButton.click();

    await expect(page.getByLabel(/First Name/i)).toBeVisible();

    await page.getByRole('button', { name: /Cancel/i }).click();

    // Panel should be gone
    await expect(page.getByLabel(/First Name/i)).toBeHidden();
  });

  test('panel closes on Escape key', async ({ page }) => {
    await page.goto(RESULTS_URL);

    page.getByRole('button', { name: /Edit & Resubmit/i }).first().click();
    await expect(page.getByLabel(/First Name/i)).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.getByLabel(/First Name/i)).toBeHidden();
  });

  test('panel shows gender dropdown with correct options', async ({ page }) => {
    await page.goto(RESULTS_URL);

    page.getByRole('button', { name: /Edit & Resubmit/i }).first().click();
    await expect(page.getByLabel(/Gender/i)).toBeVisible();

    const genderSelect = page.getByLabel(/Gender/i);
    const options = genderSelect.locator('option');
    const optionTexts = await options.allTextContents();

    // Dropdowns show labels like "Male", "Female", "Not Stated"
    expect(optionTexts).toContain('Male');
    expect(optionTexts).toContain('Female');
    expect(optionTexts).toContain('Not Stated');
  });

  test('panel shows route dropdown with correct options', async ({ page }) => {
    await page.goto(RESULTS_URL);

    page.getByRole('button', { name: /Edit & Resubmit/i }).first().click();

    const routeSelect = page.getByLabel(/Route/i);
    await expect(routeSelect).toBeVisible();

    const options = routeSelect.locator('option');
    const optionTexts = await options.allTextContents();

    expect(optionTexts).toContain('Intramuscular');
    expect(optionTexts).toContain('Subcutaneous');
  });

  test('clearing a required field shows validation error', async ({ page }) => {
    await page.goto(RESULTS_URL);

    page.getByRole('button', { name: /Edit & Resubmit/i }).first().click();

    const firstNameField = page.getByLabel(/First Name/i);
    await firstNameField.clear();
    // Tab away to trigger validation
    await page.getByLabel(/Last Name/i).click();

    // Submit button should be disabled or validation error shown
    await expect(page.getByText(/required/i).first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// 5. Confirm & Accept (Warning records)
// ─────────────────────────────────────────────

test.describe('Confirm & Accept', () => {
  test('warning records show Confirm & Accept button', async ({ page }) => {
    await page.goto(RESULTS_URL);

    // Row 2 is WARNING with CONFIRM_OR_CORRECT
    const row2 = page.locator('[data-testid="record-card-2"]');
    await expect(row2.getByRole('button', { name: /Confirm/i })).toBeVisible();
  });

  test('error records do NOT show Confirm button', async ({ page }) => {
    await page.goto(RESULTS_URL);

    // Row 3 is ERROR with action=NONE
    const row3 = page.locator('[data-testid="record-card-3"]');
    await expect(row3.getByRole('button', { name: /Confirm/i })).toBeHidden();
  });

  test('Confirm All Warnings button is visible in toolbar', async ({ page }) => {
    await page.goto(RESULTS_URL);

    await expect(page.getByRole('button', { name: /Confirm All/i })).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// 6. CSV Export
// ─────────────────────────────────────────────

test.describe('CSV Export', () => {
  test('Export button is visible', async ({ page }) => {
    await page.goto(RESULTS_URL);

    await expect(page.getByRole('button', { name: /Export/i })).toBeVisible();
  });

  test('export endpoint returns CSV with correct headers', async ({ request }) => {
    const response = await request.get(
      `http://localhost:8000/api/submissions/${REAL_SUB_ID}/export`
    );

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/csv');

    const body = await response.text();
    expect(body).toContain('AIR Submission Results Report');
    expect(body).toContain(REAL_SUB_ID);
    expect(body).toContain('Row,Status,AIR Code,AIR Message');
    // Verify verbatim message in CSV
    expect(body).toContain('AIR-W-1008');
    expect(body).toContain('AIR-E-1046');
    expect(body).toContain('Tandra');
  });
});

// ─────────────────────────────────────────────
// 7. History Page → Results Navigation
// ─────────────────────────────────────────────

test.describe('History Page', () => {
  test('history page loads and shows submissions', async ({ page }) => {
    await page.goto('/history');

    await expect(page.getByText(/Submission History/i)).toBeVisible();
    // Should have at least one submission listed
    await expect(page.getByText('completed').first()).toBeVisible();
  });

  test('View Results button navigates to results page', async ({ page }) => {
    await page.goto('/history');

    // Click the first View Results button
    const viewButton = page.getByRole('button', { name: /View Results/i }).first();
    await viewButton.click();

    // Should navigate to a /submissions/.../results URL
    await expect(page).toHaveURL(/\/submissions\/.*\/results/);
    await expect(page.getByText('Submission Results')).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// 8. API Direct Tests
// ─────────────────────────────────────────────

test.describe('API — Direct endpoint tests', () => {
  test('GET /api/submissions/{id}/results returns correct shape', async ({ request }) => {
    const response = await request.get(
      `http://localhost:8000/api/submissions/${REAL_SUB_ID}/results`
    );

    expect(response.status()).toBe(200);
    const data = await response.json();

    // Top-level shape
    expect(data.id).toBe(REAL_SUB_ID);
    expect(data.counts).toBeDefined();
    expect(data.counts.total).toBe(10);
    expect(data.counts.warning).toBe(5);
    expect(data.counts.error).toBe(5);
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
      `http://localhost:8000/api/submissions/${REAL_SUB_ID}/results?status=ERROR`
    );

    const data = await response.json();
    expect(data.records.every((r: any) => r.status === 'ERROR')).toBe(true);
    expect(data.records).toHaveLength(5);
    // Counts still reflect total
    expect(data.counts.total).toBe(10);
  });

  test('GET /api/submissions/{id}/results with pagination', async ({ request }) => {
    const response = await request.get(
      `http://localhost:8000/api/submissions/${REAL_SUB_ID}/results?page=1&page_size=3`
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
      'http://localhost:8000/api/submissions/nonexistent-id/results'
    );
    expect(response.status()).toBe(404);
  });

  test('verbatim message is preserved exactly', async ({ request }) => {
    const response = await request.get(
      `http://localhost:8000/api/submissions/${REAL_SUB_ID}/results`
    );

    const data = await response.json();
    const warningRecord = data.records.find((r: any) => r.status === 'WARNING');

    // This exact message must come through unmodified from AIR
    expect(warningRecord.airMessage).toBe(
      'There are encounter(s) that were not successfully recorded. Correct the details or submit confirmation accepting episode(s) status.'
    );
  });
});
