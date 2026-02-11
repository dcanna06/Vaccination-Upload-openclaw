/**
 * E2E Tests — Submission results & confirm warnings flow
 *
 * Tests the results page structure, confirm-all-warnings, and single-record
 * confirm flow.
 *
 * Prerequisites:
 *   - Backend running on http://localhost:8000
 *   - Frontend running on http://localhost:3000
 *   - At least one completed submission with WARNING response payloads
 *
 * Run: npx playwright test submission-confirm.spec.ts
 */

import { test, expect } from '@playwright/test';

const API = process.env.BACKEND_URL || 'http://localhost:8000';

/**
 * Find a submission with warning records. Limits API calls to avoid rate limits.
 * Returns { warningSubId, anySubId } — either or both may be null.
 */
async function findSubmissions(request: any): Promise<{ warningSubId: string | null; anySubId: string | null }> {
  const res = await request.get(`${API}/api/submissions`);
  if (res.status() !== 200) return { warningSubId: null, anySubId: null };

  const body = await res.json();
  const submissions = body.submissions ?? body;
  if (!Array.isArray(submissions)) return { warningSubId: null, anySubId: null };

  // Only check non-dry-run completed submissions (most likely to have real results)
  const candidates = submissions.filter(
    (s: any) => s.status === 'completed' && !s.dryRun,
  );

  let warningSubId: string | null = null;
  let anySubId: string | null = null;

  // Limit to 20 API calls to stay well under rate limit
  const maxChecks = Math.min(candidates.length, 20);

  for (let i = 0; i < maxChecks; i++) {
    const sub = candidates[i];
    const id = sub.submissionId || sub.id;
    if (!id) continue;

    const detailRes = await request.get(`${API}/api/submissions/${id}/results`);
    if (detailRes.status() !== 200) continue;

    const detail = await detailRes.json();
    if (!detail.counts || detail.counts.total === 0) continue;

    if (!anySubId) anySubId = id;

    if (detail.counts.warning > 0) {
      warningSubId = id;
      if (!anySubId) anySubId = id;
      break; // Found what we need
    }
  }

  return { warningSubId, anySubId: anySubId || warningSubId };
}

// Helper: register + login a test user via UI
async function loginViaUI(page: any) {
  const ts = Date.now();
  const email = `confirm-${ts}@test.com`;
  const password = 'SecurePass12345';
  await page.request.post(`${API}/api/auth/register`, {
    data: { email, password, first_name: 'Confirm', last_name: 'Tester' },
    failOnStatusCode: false,
  });
  await page.goto('/login');
  await page.getByLabel(/Email/i).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await expect(page).toHaveURL('/upload', { timeout: 15000 });
}

// ─────────────────────────────────────────────
// 1. API — Results & Confirm Endpoints
// ─────────────────────────────────────────────

test.describe('API — Results & Confirm Endpoints', () => {
  let warningSubId: string | null = null;

  test.beforeAll(async ({ request }) => {
    const ids = await findSubmissions(request);
    warningSubId = ids.warningSubId;
  });

  test('GET results returns correct structure with warning records', async ({ request }) => {
    test.skip(!warningSubId, 'No submission with warnings found');

    const res = await request.get(`${API}/api/submissions/${warningSubId!}/results`);
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('counts');
    expect(data).toHaveProperty('records');
    expect(data).toHaveProperty('pagination');
    expect(data.counts.warning).toBeGreaterThan(0);

    // Records with warnings should have CONFIRM_OR_CORRECT action
    const warnings = data.records.filter((r: any) => r.status === 'WARNING');
    expect(warnings.length).toBeGreaterThan(0);
    for (const w of warnings) {
      expect(w.actionRequired).toBe('CONFIRM_OR_CORRECT');
      expect(w.claimId).toBeTruthy();
      expect(w.airStatusCode).toMatch(/^AIR-W-/);
    }
  });

  test('POST confirm single record returns expected fields', async ({ request }) => {
    test.skip(!warningSubId, 'No submission with warnings found');

    // Find a confirmable record
    const resData = await (
      await request.get(`${API}/api/submissions/${warningSubId!}/results`)
    ).json();
    const confirmable = resData.records.find(
      (r: any) => r.actionRequired === 'CONFIRM_OR_CORRECT',
    );
    test.skip(!confirmable, 'No confirmable records available');

    const row = confirmable.rowNumber;
    const confirmRes = await request.post(
      `${API}/api/submissions/${warningSubId!}/records/${row}/confirm`,
      { headers: { 'Content-Type': 'application/json' } },
    );

    expect(confirmRes.status()).toBe(200);
    const confirmData = await confirmRes.json();
    expect(confirmData).toHaveProperty('status');
    expect(confirmData).toHaveProperty('airStatusCode');
    expect(confirmData).toHaveProperty('airMessage');
    expect(confirmData.status).toMatch(/^(SUCCESS|WARNING|ERROR)$/);
  });

  test('single record confirm persists result to disk', async ({ request }) => {
    test.skip(!warningSubId, 'No submission with warnings found');

    // Find a confirmable record
    const beforeData = await (
      await request.get(`${API}/api/submissions/${warningSubId!}/results`)
    ).json();
    const confirmable = beforeData.records.find(
      (r: any) => r.actionRequired === 'CONFIRM_OR_CORRECT',
    );
    if (!confirmable) return; // All already confirmed

    const row = confirmable.rowNumber;

    // Confirm the record
    const confirmRes = await request.post(
      `${API}/api/submissions/${warningSubId!}/records/${row}/confirm`,
      { headers: { 'Content-Type': 'application/json' } },
    );
    expect(confirmRes.status()).toBe(200);

    // Fetch results again — check the record updated
    const afterData = await (
      await request.get(`${API}/api/submissions/${warningSubId!}/results`)
    ).json();
    const updatedRecord = afterData.records.find((r: any) => r.rowNumber === row);
    expect(updatedRecord).toBeDefined();

    // The confirm response tells us what happened
    const confirmResult = await confirmRes.json();
    if (confirmResult.status === 'SUCCESS') {
      expect(updatedRecord.actionRequired).not.toBe('CONFIRM_OR_CORRECT');
    }
  });

  test('POST confirm-all-warnings returns counts and results array', async ({ request }) => {
    test.skip(!warningSubId, 'No submission with warnings found');

    const response = await request.post(
      `${API}/api/submissions/${warningSubId!}/confirm-all-warnings`,
      { headers: { 'Content-Type': 'application/json' } },
    );

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('confirmed');
    expect(data).toHaveProperty('failed');
    expect(data).toHaveProperty('results');
    expect(Array.isArray(data.results)).toBe(true);

    for (const r of data.results) {
      expect(r).toHaveProperty('row');
      expect(r).toHaveProperty('status');
      expect(r).toHaveProperty('airStatusCode');
    }

    // confirmed + failed should equal results length
    expect(data.confirmed + data.failed).toBe(data.results.length);
  });
});

// ─────────────────────────────────────────────
// 2. UI — Submission Results Page Structure
// ─────────────────────────────────────────────

test.describe('UI — Results Page Structure', () => {
  let subId: string | null = null;

  test.beforeAll(async ({ request }) => {
    const ids = await findSubmissions(request);
    subId = ids.anySubId || ids.warningSubId;
  });

  test('shows summary count cards', async ({ page, request }) => {
    test.skip(!subId, 'No submission with results found');

    await loginViaUI(page);
    await page.goto(`/submissions/${subId}/results`);

    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Total Records')).toBeVisible();
    await expect(page.getByText('Successful').first()).toBeVisible();
    await expect(page.getByText('Warnings').first()).toBeVisible();
    await expect(page.getByText('Errors').first()).toBeVisible();
  });

  test('record cards display AIR status codes', async ({ page }) => {
    test.skip(!subId, 'No submission with results found');

    await loginViaUI(page);
    await page.goto(`/submissions/${subId}/results`);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    await expect(page.getByText(/AIR-[WEI]-\d{4}/).first()).toBeVisible();
  });

  test('Export button is visible', async ({ page }) => {
    test.skip(!subId, 'No submission with results found');

    await loginViaUI(page);
    await page.goto(`/submissions/${subId}/results`);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('button', { name: /Export/i })).toBeVisible();
  });

  test('filter tabs are visible', async ({ page }) => {
    test.skip(!subId, 'No submission with results found');

    await loginViaUI(page);
    await page.goto(`/submissions/${subId}/results`);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('button', { name: /All/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Success/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Warnings/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Errors/i }).first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// 3. UI — Confirm Warnings Flow
// ─────────────────────────────────────────────

test.describe('UI — Confirm Warnings Flow', () => {
  let warningSubId: string | null = null;
  let hasConfirmable = false;

  test.beforeAll(async ({ request }) => {
    const ids = await findSubmissions(request);
    warningSubId = ids.warningSubId;
    if (warningSubId) {
      const resData = await (
        await request.get(`${API}/api/submissions/${warningSubId}/results`)
      ).json();
      hasConfirmable = resData.records?.some(
        (r: any) => r.actionRequired === 'CONFIRM_OR_CORRECT',
      ) ?? false;
    }
  });

  test('Confirm All Warnings button visible when confirmable records exist', async ({ page }) => {
    test.skip(!hasConfirmable, 'No confirmable records');

    await loginViaUI(page);
    await page.goto(`/submissions/${warningSubId}/results`);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('button', { name: /Confirm All Warnings/i })).toBeVisible();
  });

  test('individual Confirm & Accept button works', async ({ page, request }) => {
    test.skip(!hasConfirmable, 'No confirmable records');

    await loginViaUI(page);
    await page.goto(`/submissions/${warningSubId}/results`);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    // Find Confirm & Accept button
    const confirmBtn = page.getByRole('button', { name: /Confirm & Accept/i }).first();
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });

    // Click it
    await confirmBtn.click();

    // Wait for refresh (fetchResults is called after confirm)
    await page.waitForTimeout(5000);

    // Page should still show Submission Results
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible();
  });

  test('Confirm All Warnings shows spinner then feedback banner', async ({ page }) => {
    test.skip(!hasConfirmable, 'No confirmable records');

    await loginViaUI(page);
    await page.goto(`/submissions/${warningSubId}/results`);
    await expect(page.getByRole('heading', { name: /Submission Results/i })).toBeVisible({ timeout: 10000 });

    const confirmAllBtn = page.getByRole('button', { name: /Confirm All Warnings/i });

    // Button might not be visible if previous test confirmed some records
    const visible = await confirmAllBtn.isVisible().catch(() => false);
    if (!visible) return;

    await confirmAllBtn.click();

    // Should show spinner text
    await expect(page.getByText('Confirming...')).toBeVisible();

    // Wait for banner
    await expect(
      page.getByText(/Confirmation complete|Failed to confirm/i),
    ).toBeVisible({ timeout: 60000 });
  });
});
