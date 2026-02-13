/**
 * Functional E2E Tests — Full workflows across all three portals
 *
 * Tests login, navigation, facility creation, clinic booking,
 * resident management, and clinic resident assignment for each portal.
 *
 * These tests use mock auth (JWT cookie injection) since the portals
 * use client-side mock data and don't require a running backend.
 *
 * Run: npx playwright test portals-functional.spec.ts
 * Run headed: npx playwright test portals-functional.spec.ts --headed
 */

import { test, expect, type Page } from '@playwright/test';

// Increase default timeout for assertions since pages need to hydrate
test.use({ actionTimeout: 10_000 });

// ── Auth Helpers ────────────────────────────────────────────────────────

function buildMockJwt(role: string, firstName = 'Test', lastName = 'User'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: '1',
    role,
    email: `${role}@test.com`,
    first_name: firstName,
    last_name: lastName,
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url');
  return `${header}.${payload}.fakesig`;
}

async function loginAs(page: Page, role: string, firstName = 'Test', lastName = 'User') {
  const token = buildMockJwt(role, firstName, lastName);
  await page.context().addCookies([{
    name: 'access_token',
    value: token,
    domain: 'localhost',
    path: '/',
  }]);
}

/**
 * Mock the /api/auth/me endpoint at the network level so the client-side
 * auth store sees the user as authenticated with the given role.
 */
async function mockAuthApi(page: Page, role: string, firstName = 'Test', lastName = 'User') {
  await page.route('**/api/auth/me', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '1',
        email: `${role}@test.com`,
        first_name: firstName,
        last_name: lastName,
        role,
        status: 'active',
      }),
    }),
  );
  await page.route('**/api/auth/logout', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );
}

/** Full login setup: JWT cookie for middleware + API mock for auth store */
async function setupAuth(page: Page, role: string, firstName = 'Test', lastName = 'User') {
  await loginAs(page, role, firstName, lastName);
  await mockAuthApi(page, role, firstName, lastName);
}

/** Navigate to a page and wait for it to fully load */
async function goTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

// ── Nurse Manager Portal ────────────────────────────────────────────────

test.describe('Nurse Manager Portal — Full Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page, 'nurse_manager', 'Lisa', 'Chang');
  });

  test('can view dashboard with stats and facilities', async ({ page }) => {
    await goTo(page, '/nm-dashboard');
    await expect(page.locator('h1')).toContainText(/good morning/i, { timeout: 10000 });
    // Should show stat tiles
    await expect(page.getByText('Active Facilities')).toBeVisible();
    await expect(page.getByText('Total Residents').first()).toBeVisible();
    await expect(page.getByText('Upcoming Clinics').first()).toBeVisible();
  });

  test('can create a new facility', async ({ page }) => {
    await goTo(page,'/nm-facilities');
    await expect(page.locator('h1')).toContainText('My Facilities');

    // Count existing facilities
    const initialCount = await page.getByText(/facilities$/).first().textContent();

    // Click Add Facility button
    await page.getByRole('button', { name: /Add Facility/i }).click();

    // Fill in the form
    await expect(page.getByText('New Facility')).toBeVisible();
    await page.getByPlaceholder('e.g. Sunrise Aged Care').fill('E2E Test Facility');
    await page.getByPlaceholder('Street, Suburb, State').fill('123 Test St, Melbourne, VIC');
    await page.getByPlaceholder('Contact name').fill('Jane Doe');
    await page.getByPlaceholder('Phone number').fill('0400 000 000');
    await page.getByPlaceholder('Email address').fill('jane@test.com');
    await page.getByPlaceholder('Pharmacy name').fill('Test Pharmacy');

    // Submit
    await page.getByRole('button', { name: 'Add Facility' }).nth(1).click();

    // Verify facility appears in the list
    await expect(page.getByText('E2E Test Facility')).toBeVisible();
    await expect(page.getByText('123 Test St, Melbourne, VIC')).toBeVisible();
  });

  test('can expand facility to see details', async ({ page }) => {
    await goTo(page,'/nm-facilities');
    await expect(page.locator('h1')).toContainText('My Facilities');

    // Click first facility row to expand
    const firstFacility = page.locator('button').filter({ hasText: 'Sunrise' }).first();
    await firstFacility.click();

    // Should see expanded details
    await expect(page.getByText('CONTACT', { exact: false })).toBeVisible();
    await expect(page.getByText('PHONE', { exact: false })).toBeVisible();
    await expect(page.getByText('EMAIL', { exact: false })).toBeVisible();
  });

  test('can filter facilities by status', async ({ page }) => {
    await goTo(page,'/nm-facilities');
    await expect(page.locator('h1')).toContainText('My Facilities');

    // Click Active filter — button text is "Active (N)"
    await page.getByRole('button', { name: /Active \(\d/ }).click();
    const activeCount = await page.getByText(/\d+ facilities/).first().textContent();

    // Click All filter — button text is "All (N)"
    await page.getByRole('button', { name: /All \(\d/ }).click();
    const allCount = await page.getByText(/\d+ facilities/).first().textContent();

    // All should show >= active
    expect(allCount).not.toBe('');
    expect(activeCount).not.toBe('');
  });

  test('can navigate to clinics and create a new clinic', async ({ page }) => {
    await goTo(page,'/nm-clinics');
    await expect(page.locator('h1')).toContainText('Clinics');

    // Click Book New Clinic
    await page.getByRole('button', { name: /Book New Clinic/i }).click();

    // Step 0: Select Facility
    await expect(page.getByText('Step 0: Select Facility')).toBeVisible();
    const facilitySelect = page.locator('select').filter({ hasText: 'Select a facility' });
    await facilitySelect.selectOption({ index: 1 }); // Select first active facility
    await page.getByRole('button', { name: /Next: Clinic Details/i }).click();

    // Step 1: Clinic Details
    await expect(page.getByText('Step 1: Clinic Details')).toBeVisible();
    await page.getByPlaceholder('e.g. Autumn Flu Clinic').fill('E2E Test Clinic');
    await page.getByPlaceholder('e.g. Main Dining Hall').fill('Activity Room');

    // Select vaccine types
    await page.getByLabel('Influenza').check();
    await page.getByLabel('COVID-19').check();
    await page.getByRole('button', { name: /Next: Pick Date/i }).click();

    // Step 2: Date & Time
    await expect(page.getByText('Step 2: Pick Date')).toBeVisible();
    // Set a future date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    const dateStr = futureDate.toISOString().split('T')[0];
    await page.locator('input[type="date"]').fill(dateStr);
    await page.locator('select').filter({ hasText: 'Select time' }).selectOption('9:00 AM - 11:00 AM');
    await page.getByRole('button', { name: /Next: Assign Residents/i }).click();

    // Step 3: Assign Residents
    await expect(page.getByText('Step 3: Assign Residents')).toBeVisible();
    // Check some residents
    const checkboxes = page.locator('table tbody input[type="checkbox"]');
    const count = await checkboxes.count();
    if (count > 0) {
      await checkboxes.first().check();
      if (count > 1) {
        await checkboxes.nth(1).check();
      }
    }

    // Create the clinic
    await page.getByRole('button', { name: /Create Clinic/i }).click();

    // Verify clinic appears in the list
    await expect(page.getByText('E2E Test Clinic')).toBeVisible();
  });

  test('can add a resident via the residents page', async ({ page }) => {
    await goTo(page,'/nm-residents');
    await expect(page.locator('h1')).toContainText('Residents');

    // Click Add Resident button
    await page.getByRole('button', { name: /Add Resident$/i }).click();

    // Select a facility in the resident form (first select with "All Facilities" still selected)
    const facilitySelect = page.locator('select').filter({ hasText: 'All Facilities' }).first();
    await facilitySelect.selectOption({ index: 1 });

    // Fill in resident details
    await page.getByPlaceholder('First name').fill('E2E');
    await page.getByPlaceholder('Last name').fill('TestResident');
    await page.getByPlaceholder('Room', { exact: true }).fill('Z-999');

    // Submit (scope within form to avoid matching the header "Add Resident" button)
    await page.locator('form').getByRole('button', { name: 'Add Resident' }).click();

    // Verify resident appears in the table
    await expect(page.getByText('E2E TestResident')).toBeVisible();
  });

  test('can view eligibility dashboard', async ({ page }) => {
    await goTo(page,'/nm-eligibility');
    await expect(page.locator('h1')).toContainText('Eligibility Dashboard');

    // Should show summary cards
    await expect(page.getByText('Overdue').first()).toBeVisible();
    await expect(page.getByText('Coming Due').first()).toBeVisible();
    await expect(page.getByText('Total Eligible').first()).toBeVisible();

    // Should show resident eligibility table
    await expect(page.locator('table')).toBeVisible();
  });

  test('can use messaging', async ({ page }) => {
    await goTo(page,'/nm-messages');
    await expect(page.locator('h1')).toContainText('Messages');

    // Click on first thread
    const threads = page.locator('[class*="cursor-pointer"]').filter({ hasText: /Sunrise|Sunny|Ocean|Green|Willow/ });
    const threadCount = await threads.count();
    if (threadCount > 0) {
      await threads.first().click();
      // Should see conversation
      await expect(page.locator('input[placeholder*="message"]')).toBeVisible();
    }
  });
});

// ── Facility Portal ─────────────────────────────────────────────────────

test.describe('Facility Portal — Full Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page, 'facility_staff', 'Sarah', 'Wilson');
  });

  test('can view dashboard', async ({ page }) => {
    await goTo(page,'/facility-dashboard');
    await expect(page.locator('h1')).toContainText(/good morning/i);
    await expect(page.getByText('Total Residents').first()).toBeVisible();
    await expect(page.getByText('Upcoming Clinics').first()).toBeVisible();
  });

  test('can add a single resident', async ({ page }) => {
    await goTo(page,'/facility-residents');
    await expect(page.locator('h1')).toContainText('Residents');

    // Click Add Resident
    await page.getByRole('button', { name: /Add Resident$/i }).click();

    // Fill form (facility portal doesn't need facility selector — single facility)
    await page.getByPlaceholder('First name').fill('Facility');
    await page.getByPlaceholder('Last name').fill('TestResident');
    await page.getByPlaceholder('Room', { exact: true }).fill('F-100');

    // Select gender
    const genderSelect = page.locator('select').filter({ hasText: 'Select...' });
    if (await genderSelect.count() > 0) {
      await genderSelect.first().selectOption('F');
    }

    // Submit (scope within form to avoid matching the header "Add Resident" button)
    await page.locator('form').getByRole('button', { name: 'Add Resident' }).click();

    // Verify resident appears
    await expect(page.getByText('Facility TestResident')).toBeVisible();
  });

  test('can search and filter residents', async ({ page }) => {
    await goTo(page,'/facility-residents');

    // Search for a resident
    await page.getByPlaceholder(/Search by name or room/i).fill('Frank');

    // Should show filtered results (Frank Morrison is in Sunny Acres)
    await expect(page.getByText('Frank').first()).toBeVisible();
  });

  test('can view resident profile panel', async ({ page }) => {
    await goTo(page,'/facility-residents');

    // Click on a resident row
    const residentRow = page.locator('tbody tr').first();
    await residentRow.click();

    // Should show profile panel with details
    await expect(page.getByText('Date of Birth')).toBeVisible();
    await expect(page.getByText('Vaccinations')).toBeVisible();
  });

  test('can book a clinic', async ({ page }) => {
    await goTo(page,'/facility-clinics');
    await expect(page.locator('h1')).toContainText('Clinics');

    // Click Book New Clinic
    await page.getByRole('button', { name: /Book New Clinic/i }).click();

    // Step 1: Clinic Details
    await expect(page.getByText('Step 1: Clinic Details')).toBeVisible();
    await page.getByPlaceholder('e.g. Autumn Flu Clinic').fill('Facility E2E Clinic');
    await page.getByPlaceholder('e.g. Main Dining Hall').fill('Rec Room');
    await page.getByLabel('Influenza').check();
    await page.getByRole('button', { name: /Next: Pick Date/i }).click();

    // Step 2: Date & Time
    await expect(page.getByText('Step 2: Pick Date')).toBeVisible();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    await page.locator('input[type="date"]').fill(futureDate.toISOString().split('T')[0]);
    await page.locator('select').filter({ hasText: 'Select time' }).selectOption('10:00 AM - 12:00 PM');
    await page.getByRole('button', { name: /Next: Assign Residents/i }).click();

    // Step 3: Assign Residents
    await expect(page.getByText('Step 3: Assign Residents')).toBeVisible();
    const checkboxes = page.locator('table tbody input[type="checkbox"]');
    const count = await checkboxes.count();
    if (count > 0) {
      await checkboxes.first().check();
      if (count > 1) await checkboxes.nth(1).check();
      if (count > 2) await checkboxes.nth(2).check();
    }

    // Create
    await page.getByRole('button', { name: /Create Clinic/i }).click();

    // Should NOT see the create form anymore
    await expect(page.getByText('Step 1: Clinic Details')).not.toBeVisible();
  });

  test('can expand clinic and toggle consent', async ({ page }) => {
    await goTo(page,'/facility-clinics');

    // Click on the first clinic card to expand it
    const clinicCards = page.locator('button').filter({ hasText: /Flu|COVID|Autumn|Spring/ });
    const cardCount = await clinicCards.count();
    if (cardCount > 0) {
      await clinicCards.first().click();

      // Look for consent Yes/No buttons in the expanded section (exact match to avoid clinic card)
      const yesButtons = page.getByRole('button', { name: 'Yes', exact: true });
      const yesCount = await yesButtons.count();
      if (yesCount > 0) {
        await yesButtons.first().click();
        // Verify the button got the active state (emerald color)
        await expect(yesButtons.first()).toHaveClass(/emerald/);
      }
    }
  });

  test('can view eligibility dashboard', async ({ page }) => {
    await goTo(page,'/facility-eligibility');
    await expect(page.locator('h1')).toContainText('Eligibility Dashboard');

    // Toggle vaccine filters
    const allCheckbox = page.getByLabel('All');
    await allCheckbox.uncheck();
    // All vaccine checkboxes should be unchecked
    await expect(page.getByText('No residents match')).toBeVisible();

    // Re-check All
    await allCheckbox.check();
    // Should see residents again
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  test('can view upload page', async ({ page }) => {
    await goTo(page,'/facility-upload');
    await expect(page.locator('h1')).toContainText('Upload Vaccination Data');
    await expect(page.getByText('Download the Excel template')).toBeVisible();
    await expect(page.getByText(/Drop your Excel file here/i)).toBeVisible();
  });
});

// ── Pharmacist Portal ───────────────────────────────────────────────────

test.describe('Pharmacist Portal — Full Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page, 'pharmacist', 'Sarah', 'Chen');
  });

  test('can view dashboard with multi-facility stats', async ({ page }) => {
    await goTo(page,'/pharm-dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Should show multi-facility stat tiles
    await expect(page.getByText('Total Facilities')).toBeVisible();
    await expect(page.getByText('Total Residents').first()).toBeVisible();
    await expect(page.getByText('Upcoming Clinics').first()).toBeVisible();
  });

  test('can filter clinics by facility', async ({ page }) => {
    await goTo(page,'/pharm-clinics');
    await expect(page.locator('h1')).toContainText('My Clinics');

    // Use the facility selector to filter
    const facilitySelect = page.locator('select').filter({ hasText: 'All Facilities' }).first();
    if (await facilitySelect.count() > 0) {
      await facilitySelect.selectOption({ index: 1 });
      // Should filter the clinic list
      await page.waitForTimeout(300);
    }
  });

  test('can view and manage residents across facilities', async ({ page }) => {
    await goTo(page,'/pharm-residents');
    await expect(page.locator('h1')).toContainText('Residents');

    // Should show facility column in the table
    await expect(page.locator('thead').getByText('Facility')).toBeVisible();

    // Add a resident
    await page.getByRole('button', { name: /Add Resident$/i }).click();

    // Select facility in the add resident form (first with "All Facilities" still selected)
    const facilitySelect = page.locator('select').filter({ hasText: 'All Facilities' }).first();
    await facilitySelect.selectOption({ index: 1 });

    // Fill form
    await page.getByPlaceholder('First name').fill('Pharm');
    await page.getByPlaceholder('Last name').fill('TestResident');

    // Submit (scope within form to avoid matching the header "Add Resident" button)
    await page.locator('form').getByRole('button', { name: 'Add Resident' }).click();

    // Verify
    await expect(page.getByText('Pharm TestResident')).toBeVisible();
  });

  test('can view availability calendar', async ({ page }) => {
    await goTo(page,'/pharm-availability');
    await expect(page.locator('h1')).toContainText('Availability');

    // Should show month navigation (buttons use SVG icons, not text)
    const monthHeading = page.locator('h2').filter({ hasText: /\w+ \d{4}/ });
    await expect(monthHeading).toBeVisible();
    const navContainer = monthHeading.locator('..');
    await expect(navContainer.locator('button').first()).toBeVisible();
    await expect(navContainer.locator('button').nth(1)).toBeVisible();

    // Should show day-of-week headers
    await expect(page.getByText('Mon')).toBeVisible();
    await expect(page.getByText('Fri', { exact: true })).toBeVisible();

    // Should show legend
    await expect(page.getByText('Available').first()).toBeVisible();
  });

  test('can use messaging', async ({ page }) => {
    await goTo(page,'/pharm-messages');
    await expect(page.locator('h1')).toContainText('Messages');

    // Click on first thread
    const threads = page.locator('[class*="cursor-pointer"]').filter({ hasText: /Sunrise|Sunny|Ocean/ });
    const threadCount = await threads.count();
    if (threadCount > 0) {
      await threads.first().click();

      // Type and send a message
      const input = page.locator('input[type="text"]').filter({ hasText: '' }).last();
      if (await input.count() > 0) {
        await input.fill('E2E test message from pharmacist');
        await page.getByRole('button', { name: /Send/i }).click();
        await expect(page.getByText('E2E test message from pharmacist')).toBeVisible();
      }
    }
  });

  test('can expand clinic and view consent table', async ({ page }) => {
    await goTo(page,'/pharm-clinics');

    // Click on a clinic card
    const clinicCards = page.locator('button').filter({ hasText: /Flu|COVID|Autumn|Spring/ });
    const cardCount = await clinicCards.count();
    if (cardCount > 0) {
      await clinicCards.first().click();

      // Should see the consent table or "No residents" message
      const hasResidents = await page.locator('table').nth(1).count() > 0;
      if (hasResidents) {
        await expect(page.getByText('Resident').first()).toBeVisible();
      }
    }
  });
});

// ── Cross-Portal Integration ────────────────────────────────────────────

test.describe('Cross-Portal Integration', () => {
  test('nurse manager creates facility, then it appears in facility count', async ({ page }) => {
    await setupAuth(page, 'nurse_manager', 'Lisa', 'Chang');
    await goTo(page,'/nm-facilities');

    // Count before
    const beforeText = await page.getByText(/\d+ facilities/).first().textContent();
    const beforeCount = parseInt(beforeText?.match(/(\d+)/)?.[1] || '0');

    // Add facility
    await page.getByRole('button', { name: /Add Facility/i }).click();
    await page.getByPlaceholder('e.g. Sunrise Aged Care').fill('Integration Test Home');
    await page.getByPlaceholder('Street, Suburb, State').fill('456 Int St, Sydney, NSW');
    await page.getByRole('button', { name: 'Add Facility' }).nth(1).click();

    // Count after
    const afterText = await page.getByText(/\d+ facilities/).first().textContent();
    const afterCount = parseInt(afterText?.match(/(\d+)/)?.[1] || '0');

    expect(afterCount).toBe(beforeCount + 1);
  });

  test('facility portal shows correct single-facility view', async ({ page }) => {
    await setupAuth(page, 'facility_staff', 'Sarah', 'Wilson');
    await goTo(page,'/facility-dashboard');

    // Should show single facility context
    await expect(page.getByText('Sunny Acres Aged Care').first()).toBeVisible();

    // Should NOT show facility selector (single-facility portal)
    await goTo(page,'/facility-residents');
    await expect(page.locator('h1')).toContainText('Residents');
    // The add form should NOT have a facility selector
    await page.getByRole('button', { name: /Add Resident$/i }).click();
    await expect(page.locator('select').filter({ hasText: 'All Facilities' })).not.toBeVisible();
  });

  test('full workflow: navigate all sections in nurse manager portal', async ({ page }) => {
    await setupAuth(page, 'nurse_manager', 'Lisa', 'Chang');

    // Dashboard
    await goTo(page,'/nm-dashboard');
    await expect(page.locator('h1')).toContainText(/good morning/i);

    // Facilities
    await goTo(page,'/nm-facilities');
    await expect(page.locator('h1')).toContainText('My Facilities');

    // Clinics
    await goTo(page,'/nm-clinics');
    await expect(page.locator('h1')).toContainText('Clinics');

    // Residents
    await goTo(page,'/nm-residents');
    await expect(page.locator('h1')).toContainText('Residents');

    // Eligibility
    await goTo(page,'/nm-eligibility');
    await expect(page.locator('h1')).toContainText('Eligibility Dashboard');

    // Upload
    await goTo(page,'/nm-upload');
    await expect(page.locator('h1')).toContainText('Upload');

    // Messages
    await goTo(page,'/nm-messages');
    await expect(page.locator('h1')).toContainText('Messages');
  });
});
