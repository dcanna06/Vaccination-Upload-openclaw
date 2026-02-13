/**
 * E2E Smoke Tests — Facility, Pharmacist, and Nurse Manager Portals
 *
 * Verifies that each portal's pages load with the correct heading,
 * that role-based middleware correctly isolates portals, and that
 * unauthenticated users are redirected to /login.
 *
 * Uses mock JWT cookies (no real backend auth needed).
 *
 * Run: npx playwright test portals-smoke.spec.ts
 */

import { test, expect } from '@playwright/test';

// Helper to set auth cookie for testing
async function loginAs(page: import('@playwright/test').Page, role: string) {
  // Create a mock JWT with the specified role
  // The middleware decodes the JWT to get the role
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: '1',
    role,
    email: `${role}@test.com`,
    first_name: 'Test',
    last_name: 'User',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url');
  const token = `${header}.${payload}.fakesig`;

  await page.context().addCookies([{
    name: 'access_token',
    value: token,
    domain: 'localhost',
    path: '/',
  }]);
}

// ─────────────────────────────────────────────
// 1. Facility Portal
// ─────────────────────────────────────────────

test.describe('Facility Portal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'facility_staff');
  });

  test('facility staff sees dashboard', async ({ page }) => {
    await page.goto('/facility-dashboard');
    await expect(page.locator('h1')).toContainText(/good morning/i);
  });

  test('facility staff can navigate to residents', async ({ page }) => {
    await page.goto('/facility-residents');
    await expect(page.locator('h1')).toContainText('Residents');
  });

  test('facility staff can navigate to clinics', async ({ page }) => {
    await page.goto('/facility-clinics');
    await expect(page.locator('h1')).toContainText('Clinics');
  });

  test('facility staff can navigate to eligibility', async ({ page }) => {
    await page.goto('/facility-eligibility');
    await expect(page.locator('h1')).toContainText('Eligibility Dashboard');
  });

  test('facility staff can navigate to upload', async ({ page }) => {
    await page.goto('/facility-upload');
    await expect(page.locator('h1')).toContainText('Upload Vaccination Data');
  });

  test('facility staff CANNOT access nurse manager routes', async ({ page }) => {
    await page.goto('/nm-dashboard');
    // Should be redirected to facility dashboard
    await page.waitForURL('**/facility-dashboard');
  });
});

// ─────────────────────────────────────────────
// 2. Pharmacist Portal
// ─────────────────────────────────────────────

test.describe('Pharmacist Portal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'pharmacist');
  });

  test('pharmacist sees dashboard', async ({ page }) => {
    await page.goto('/pharm-dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('pharmacist can navigate to clinics', async ({ page }) => {
    await page.goto('/pharm-clinics');
    await expect(page.locator('h1')).toContainText('My Clinics');
  });

  test('pharmacist can navigate to residents', async ({ page }) => {
    await page.goto('/pharm-residents');
    await expect(page.locator('h1')).toContainText('Residents');
  });

  test('pharmacist can navigate to messages', async ({ page }) => {
    await page.goto('/pharm-messages');
    await expect(page.locator('h1')).toContainText('Messages');
  });

  test('pharmacist can access existing upload portal', async ({ page }) => {
    await page.goto('/upload');
    // Should not redirect - pharmacist can access dashboard routes
    await expect(page).toHaveURL(/\/upload/);
  });

  test('pharmacist CANNOT access nurse manager routes', async ({ page }) => {
    await page.goto('/nm-dashboard');
    await page.waitForURL('**/pharm-dashboard');
  });
});

// ─────────────────────────────────────────────
// 3. Nurse Manager Portal
// ─────────────────────────────────────────────

test.describe('Nurse Manager Portal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'nurse_manager');
  });

  test('nurse manager sees dashboard', async ({ page }) => {
    await page.goto('/nm-dashboard');
    await expect(page.locator('h1')).toContainText(/good morning/i);
  });

  test('nurse manager can navigate to facilities', async ({ page }) => {
    await page.goto('/nm-facilities');
    await expect(page.locator('h1')).toContainText('My Facilities');
  });

  test('nurse manager can navigate to clinics', async ({ page }) => {
    await page.goto('/nm-clinics');
    await expect(page.locator('h1')).toContainText('Clinics');
  });

  test('nurse manager can navigate to residents', async ({ page }) => {
    await page.goto('/nm-residents');
    await expect(page.locator('h1')).toContainText('Residents');
  });

  test('nurse manager can navigate to eligibility', async ({ page }) => {
    await page.goto('/nm-eligibility');
    await expect(page.locator('h1')).toContainText('Eligibility Dashboard');
  });

  test('nurse manager can navigate to messages', async ({ page }) => {
    await page.goto('/nm-messages');
    await expect(page.locator('h1')).toContainText('Messages');
  });

  test('nurse manager CANNOT access facility routes', async ({ page }) => {
    await page.goto('/facility-dashboard');
    await page.waitForURL('**/nm-dashboard');
  });
});

// ─────────────────────────────────────────────
// 4. Portal Isolation
// ─────────────────────────────────────────────

test.describe('Portal Isolation', () => {
  test('unauthenticated user redirected to login', async ({ page }) => {
    await page.goto('/facility-dashboard');
    await page.waitForURL('**/login');
  });

  test('root path redirects facility_staff to role home', async ({ page }) => {
    await loginAs(page, 'facility_staff');
    await page.goto('/');
    await page.waitForURL('**/facility-dashboard');
  });

  test('root path redirects pharmacist to role home', async ({ page }) => {
    await loginAs(page, 'pharmacist');
    await page.goto('/');
    await page.waitForURL('**/pharm-dashboard');
  });

  test('root path redirects nurse_manager to role home', async ({ page }) => {
    await loginAs(page, 'nurse_manager');
    await page.goto('/');
    await page.waitForURL('**/nm-dashboard');
  });
});
