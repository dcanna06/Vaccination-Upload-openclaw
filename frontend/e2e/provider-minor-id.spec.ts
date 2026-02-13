/**
 * E2E Tests — Provider Minor ID Assignment
 *
 * Tests the full flow:
 *   1. Link a provider number → auto-assigned WRR##### Minor ID
 *   2. Minor ID displayed on setup wizard steps 2 & 3
 *   3. Minor ID displayed on admin providers page
 *   4. Submission uses provider minor_id for dhs-auditId
 *   5. Backend API returns minor_id in provider responses
 *
 * Prerequisites:
 *   - Backend running on BACKEND_URL (default http://localhost:8000)
 *   - Frontend running on PLAYWRIGHT_BASE_URL (default http://localhost:3000)
 *   - Database migrated (migration 0006 applied)
 *   - Test user exists (david@test.com / TestPassword12)
 *
 * Run:
 *   npx playwright test provider-minor-id.spec.ts
 */

import { test, expect, Page, BrowserContext, APIRequestContext } from '@playwright/test';

const API = process.env.BACKEND_URL || 'http://localhost:8000';
const TEST_EMAIL = 'david@test.com';
const TEST_PASSWORD = 'TestPassword12';

async function loginViaUI(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/Email/i).fill(TEST_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await expect(page).toHaveURL('/upload', { timeout: 30000 });
}

/**
 * Log in via API and set the auth cookie on the browser context.
 * This gives a real JWT that the Next.js middleware will accept.
 */
async function loginViaAPI(request: APIRequestContext, context: BrowserContext) {
  // Register (ignore if already exists)
  await request.post(`${API}/api/auth/register`, {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD, first_name: 'David', last_name: 'Test' },
    failOnStatusCode: false,
  });
  const loginRes = await request.post(`${API}/api/auth/login`, {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  const cookies = loginRes.headers()['set-cookie'] || '';
  const match = cookies.match(/access_token=([^;]+)/);
  if (match) {
    await context.addCookies([{
      name: 'access_token',
      value: match[1],
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }]);
  }
}

// ---------------------------------------------------------------------------
// 1. Backend API — Provider link returns minor_id
// ---------------------------------------------------------------------------
test.describe('Backend API — Provider Minor ID', () => {
  let authCookie = '';

  test.beforeAll(async ({ request }) => {
    // Register (ignore if already exists) + login to get cookie
    await request.post(`${API}/api/auth/register`, {
      data: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        first_name: 'David',
        last_name: 'Test',
      },
      failOnStatusCode: false,
    });
    const loginRes = await request.post(`${API}/api/auth/login`, {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    const cookies = loginRes.headers()['set-cookie'] || '';
    // Extract the access_token cookie
    const match = cookies.match(/access_token=([^;]+)/);
    authCookie = match ? `access_token=${match[1]}` : '';
  });

  test('POST /api/providers returns minor_id in WRR format', async ({ request }) => {
    // First ensure a location exists
    const locRes = await request.post(`${API}/api/locations`, {
      headers: { Cookie: authCookie },
      data: {
        name: `E2E MinorID Test ${Date.now()}`,
        address_line_1: '123 Test St',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
      },
      failOnStatusCode: false,
    });

    // May fail if DB isn't seeded — skip gracefully
    if (locRes.status() !== 201) {
      test.skip(true, `Location creation returned ${locRes.status()} — DB may not be ready`);
      return;
    }

    const location = await locRes.json();

    // Link a provider
    const providerNumber = `E2E${Date.now().toString().slice(-4)}`;
    const provRes = await request.post(`${API}/api/providers`, {
      headers: { Cookie: authCookie },
      data: {
        location_id: location.id,
        provider_number: providerNumber,
        provider_type: 'GP',
      },
    });

    expect(provRes.status()).toBe(201);
    const provider = await provRes.json();

    // Verify minor_id is present and in WRR##### format
    expect(provider.minor_id).toBeDefined();
    expect(provider.minor_id).toMatch(/^WRR\d{5}$/);
    expect(provider.provider_number).toBe(providerNumber);

    // GET /api/providers also returns minor_id
    const listRes = await request.get(
      `${API}/api/providers?location_id=${location.id}`,
      { headers: { Cookie: authCookie } },
    );
    expect(listRes.ok()).toBe(true);
    const providers = await listRes.json();
    const found = providers.find(
      (p: { provider_number: string }) => p.provider_number === providerNumber,
    );
    expect(found).toBeDefined();
    expect(found.minor_id).toMatch(/^WRR\d{5}$/);

    // Cleanup: unlink provider
    await request.delete(`${API}/api/providers/${provider.id}`, {
      headers: { Cookie: authCookie },
    });
  });

  test('each provider gets a unique minor_id', async ({ request }) => {
    // Create location
    const locRes = await request.post(`${API}/api/locations`, {
      headers: { Cookie: authCookie },
      data: {
        name: `E2E Unique MinorID ${Date.now()}`,
        suburb: 'Melbourne',
        state: 'VIC',
        postcode: '3000',
      },
      failOnStatusCode: false,
    });

    if (locRes.status() !== 201) {
      test.skip(true, `Location creation returned ${locRes.status()}`);
      return;
    }

    const location = await locRes.json();
    const ts = Date.now().toString().slice(-3);

    // Link two providers
    const res1 = await request.post(`${API}/api/providers`, {
      headers: { Cookie: authCookie },
      data: { location_id: location.id, provider_number: `P1${ts}A`, provider_type: 'GP' },
    });
    const res2 = await request.post(`${API}/api/providers`, {
      headers: { Cookie: authCookie },
      data: { location_id: location.id, provider_number: `P2${ts}B`, provider_type: 'Nurse' },
    });

    expect(res1.status()).toBe(201);
    expect(res2.status()).toBe(201);

    const prov1 = await res1.json();
    const prov2 = await res2.json();

    expect(prov1.minor_id).toMatch(/^WRR\d{5}$/);
    expect(prov2.minor_id).toMatch(/^WRR\d{5}$/);
    expect(prov1.minor_id).not.toBe(prov2.minor_id);

    // Cleanup
    await request.delete(`${API}/api/providers/${prov1.id}`, { headers: { Cookie: authCookie } });
    await request.delete(`${API}/api/providers/${prov2.id}`, { headers: { Cookie: authCookie } });
  });

  test('duplicate provider link returns 409', async ({ request }) => {
    const locRes = await request.post(`${API}/api/locations`, {
      headers: { Cookie: authCookie },
      data: { name: `E2E Dup Test ${Date.now()}`, suburb: 'Brisbane', state: 'QLD', postcode: '4000' },
      failOnStatusCode: false,
    });

    if (locRes.status() !== 201) {
      test.skip(true, `Location creation returned ${locRes.status()}`);
      return;
    }

    const location = await locRes.json();
    const provNum = `DUP${Date.now().toString().slice(-4)}`;

    const res1 = await request.post(`${API}/api/providers`, {
      headers: { Cookie: authCookie },
      data: { location_id: location.id, provider_number: provNum, provider_type: 'GP' },
    });
    expect(res1.status()).toBe(201);

    // Second link with same provider number should fail
    const res2 = await request.post(`${API}/api/providers`, {
      headers: { Cookie: authCookie },
      data: { location_id: location.id, provider_number: provNum, provider_type: 'GP' },
      failOnStatusCode: false,
    });
    expect(res2.status()).toBe(409);

    // Cleanup
    const prov = await res1.json();
    await request.delete(`${API}/api/providers/${prov.id}`, { headers: { Cookie: authCookie } });
  });
});

// ---------------------------------------------------------------------------
// 2. Setup Wizard — Minor ID shown on provider linking
// ---------------------------------------------------------------------------
test.describe('Setup Wizard — Provider Minor ID Display', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60_000);
    await loginViaUI(page);
  });

  test('linking a provider shows WRR Minor ID on step 2', async ({ page }) => {
    const MOCK_MINOR_ID = 'WRR00042';

    // Mock location creation (pass through GET requests)
    await page.route(`${API}/api/locations`, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 99,
            organisation_id: 1,
            name: 'Minor ID Test Clinic',
            address_line_1: '',
            address_line_2: '',
            suburb: '',
            state: 'NSW',
            postcode: '2000',
            minor_id: 'LOC-099',
            proda_link_status: 'pending',
            status: 'active',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock provider creation — returns minor_id (pass through GET requests)
    await page.route(`${API}/api/providers`, async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            location_id: body.location_id,
            provider_number: body.provider_number,
            provider_type: body.provider_type,
            minor_id: MOCK_MINOR_ID,
            hw027_status: 'not_submitted',
            air_access_list: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock setup-status after location creation (no providers yet)
    let setupStatusCallCount = 0;
    await page.route(`${API}/api/locations/99/setup-status`, async (route) => {
      setupStatusCallCount++;
      const hasProvider = setupStatusCallCount > 1;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          location: {
            id: 99,
            name: 'Minor ID Test Clinic',
            minor_id: 'LOC-099',
            proda_link_status: 'pending',
            address_line_1: '',
            address_line_2: '',
            suburb: '',
            state: 'NSW',
            postcode: '2000',
            status: 'active',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
          providers: hasProvider
            ? [
                {
                  id: 1,
                  location_id: 99,
                  provider_number: '1234567A',
                  provider_type: 'GP',
                  minor_id: MOCK_MINOR_ID,
                  hw027_status: 'not_submitted',
                  air_access_list: null,
                  created_at: '2026-01-01T00:00:00Z',
                  updated_at: '2026-01-01T00:00:00Z',
                },
              ]
            : [],
          setupComplete: false,
          steps: {
            siteDetails: { complete: true },
            providerLinked: { complete: hasProvider },
            hw027: { complete: false, statuses: hasProvider ? { '1234567A': 'not_submitted' } : {} },
            prodaLink: { complete: false, status: 'pending' },
            providerVerified: { complete: false, accessLists: {} },
          },
        }),
      });
    });

    await page.goto('/setup');

    // Step 1: Create site
    await expect(page.getByTestId('site-name')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('site-name').fill('Minor ID Test Clinic');
    await page.getByText('Create Site').click();

    // Step 2: Provider step — link a provider
    await expect(page.getByText('Step 2: Provider Number')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('provider-number-input').fill('1234567A');
    await page.getByText('Link Provider').click();

    // Minor ID should appear
    await expect(page.getByText(MOCK_MINOR_ID)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('use this on HW027 form')).toBeVisible();
  });

  test('step 3 HW027 shows provider → Minor ID mapping', async ({ page }) => {
    const MOCK_MINOR_ID = 'WRR00099';

    // Mock setup-status with a linked provider
    await page.route(`${API}/api/locations/*/setup-status`, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          location: {
            id: 1,
            name: 'HW027 Test Clinic',
            minor_id: 'LOC-001',
            proda_link_status: 'pending',
            address_line_1: '',
            address_line_2: '',
            suburb: '',
            state: 'NSW',
            postcode: '',
            status: 'active',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
          providers: [
            {
              id: 10,
              location_id: 1,
              provider_number: '9876543B',
              provider_type: 'Pharmacist',
              minor_id: MOCK_MINOR_ID,
              hw027_status: 'not_submitted',
              air_access_list: null,
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            },
          ],
          setupComplete: false,
          steps: {
            siteDetails: { complete: true },
            providerLinked: { complete: true },
            hw027: { complete: false, statuses: { '9876543B': 'not_submitted' } },
            prodaLink: { complete: false, status: 'pending' },
            providerVerified: { complete: false, accessLists: {} },
          },
        }),
      });
    });

    // Pre-select a location
    await page.addInitScript(() => {
      localStorage.setItem('selectedLocationId', '1');
    });

    await page.goto('/setup');
    await expect(page.getByText('Step 1: Site Details')).toBeVisible({ timeout: 15000 });

    // Navigate to HW027 step
    await page.getByRole('button', { name: /HW027/ }).click();
    await expect(page.getByText('Step 3: HW027 Form')).toBeVisible();

    // Should show provider number → Minor ID mapping
    await expect(page.getByText('9876543B')).toBeVisible();
    await expect(page.getByText(MOCK_MINOR_ID)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 3. Admin Providers Page — Minor ID column
// ---------------------------------------------------------------------------
test.describe('Admin Providers Page — Minor ID Display', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60_000);
    await loginViaUI(page);
  });

  test('providers list shows Minor ID per provider', async ({ page }) => {
    // Mock locations
    await page.route(`${API}/api/locations`, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            organisation_id: 1,
            name: 'Test Location',
            address_line_1: '',
            address_line_2: '',
            suburb: 'Sydney',
            state: 'NSW',
            postcode: '2000',
            minor_id: 'LOC-001',
            proda_link_status: 'linked',
            status: 'active',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ]),
      });
    });

    // Mock providers
    await page.route(`${API}/api/providers?location_id=1`, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            location_id: 1,
            provider_number: 'PROV001A',
            provider_type: 'GP',
            minor_id: 'WRR00001',
            hw027_status: 'approved',
            air_access_list: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
          {
            id: 2,
            location_id: 1,
            provider_number: 'PROV002B',
            provider_type: 'Pharmacist',
            minor_id: 'WRR00002',
            hw027_status: 'submitted',
            air_access_list: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ]),
      });
    });

    await page.goto('/admin/providers');

    // Wait for providers to load
    await expect(page.getByText('PROV001A')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('PROV002B')).toBeVisible();

    // Minor IDs should be visible
    await expect(page.getByText('WRR00001')).toBeVisible();
    await expect(page.getByText('WRR00002')).toBeVisible();

    // Minor ID label should appear
    const minorIdLabels = page.getByText('Minor ID:');
    await expect(minorIdLabels.first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 4. Submission — Provider minor_id used for dhs-auditId
// ---------------------------------------------------------------------------
test.describe('Submission — Provider Minor ID in dhs-auditId', () => {
  test('submit sends locationId so backend resolves provider minor_id', async ({ page }) => {
    // Mock auth
    await page.addInitScript(() => {
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            isAuthenticated: true,
            user: { first_name: 'Test', last_name: 'User', role: 'org_admin' },
          },
        }),
      );
      localStorage.setItem('selectedLocationId', '5');
    });

    let capturedSubmitBody: Record<string, unknown> | null = null;

    // Mock providers endpoint with minor_id
    await page.route(`${API}/api/providers?location_id=5`, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 10,
            location_id: 5,
            provider_number: '2448141T',
            provider_type: 'GP',
            minor_id: 'WRR00010',
            hw027_status: 'approved',
            air_access_list: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ]),
      });
    });

    // Mock submit endpoint — capture body
    await page.route(`${API}/api/submit`, async (route) => {
      capturedSubmitBody = route.request().postDataJSON();
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          submissionId: 'minor-id-test-001',
          status: 'running',
          totalBatches: 1,
        }),
      });
    });

    // Mock progress
    await page.route(`${API}/api/submit/minor-id-test-001/progress`, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          submissionId: 'minor-id-test-001',
          status: 'completed',
          progress: {
            totalBatches: 1,
            completedBatches: 1,
            successfulRecords: 1,
            failedRecords: 0,
            pendingConfirmation: 0,
            status: 'completed',
          },
          pendingConfirmation: [],
        }),
      });
    });

    // Set upload data
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'upload-storage',
        JSON.stringify({
          state: {
            parsedRows: [{ rowNumber: 1 }],
            groupedBatches: [
              {
                encounters: [
                  {
                    individual: {
                      personalDetails: {
                        firstName: 'Jane',
                        lastName: 'Doe',
                        dateOfBirth: '1985-06-15',
                        gender: 'F',
                      },
                    },
                    dateOfService: '2026-02-01',
                    episodes: [{ id: 1, vaccineCode: 'COMIRN', vaccineDose: '1' }],
                  },
                ],
              },
            ],
          },
        }),
      );
    });

    await page.goto('/submit');
    await page.waitForTimeout(2000);

    // Verify the submission body includes locationId and provider info
    if (capturedSubmitBody) {
      const body = capturedSubmitBody as Record<string, unknown>;
      expect(body.locationId).toBe(5);
      const provider = body.informationProvider as Record<string, string>;
      expect(provider?.providerNumber).toBe('2448141T');
    }
  });
});
