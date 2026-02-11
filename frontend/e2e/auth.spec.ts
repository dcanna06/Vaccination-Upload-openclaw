/**
 * E2E Tests — Registration, Login, Logout, Auth Guard
 *
 * Prerequisites:
 *   - Backend running on ${API}
 *   - Frontend running on http://localhost:3000
 *   - Database migrated (users table exists)
 *
 * Run: npx playwright test auth.spec.ts
 */

import { test, expect } from '@playwright/test';

const API = process.env.BACKEND_URL || 'http://localhost:8000';

// Unique email per test run to avoid conflicts
const TIMESTAMP = Date.now();
const TEST_EMAIL = `e2e-${TIMESTAMP}@test.com`;
const TEST_PASSWORD = 'SecurePass12345';

// ─────────────────────────────────────────────
// 1. Registration Page
// ─────────────────────────────────────────────

test.describe('Registration Page', () => {
  test('loads the registration page', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
    await expect(page.getByText('Register for AIR Bulk Vaccination Upload')).toBeVisible();
  });

  test('shows all required form fields', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByLabel(/First Name/i)).toBeVisible();
    await expect(page.getByLabel(/Last Name/i)).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Phone/i)).toBeVisible();
    await expect(page.getByLabel(/AHPRA Number/i)).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm Password', { exact: true })).toBeVisible();
  });

  test('has link to login page', async ({ page }) => {
    await page.goto('/register');

    const loginLink = page.getByRole('link', { name: /Sign in/i });
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL('/login');
  });

  test('shows error when passwords do not match', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel(/First Name/i).fill('Test');
    await page.getByLabel(/Last Name/i).fill('User');
    await page.getByLabel(/Email/i).fill('mismatch@test.com');
    await page.getByLabel('Password', { exact: true }).fill('SecurePass12345');
    await page.getByLabel('Confirm Password', { exact: true }).fill('DifferentPass123');

    await page.getByRole('button', { name: /Create Account/i }).click();

    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('successfully registers a new user', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel(/First Name/i).fill('E2E');
    await page.getByLabel(/Last Name/i).fill('Tester');
    await page.getByLabel(/Email/i).fill(TEST_EMAIL);
    await page.getByLabel(/Phone/i).fill('0412345678');
    await page.getByLabel(/AHPRA Number/i).fill('MED0001234567');
    await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel('Confirm Password', { exact: true }).fill(TEST_PASSWORD);

    await page.getByRole('button', { name: /Create Account/i }).click();

    // Should redirect to login with success banner
    await expect(page).toHaveURL(/\/login\?registered=1/, { timeout: 10000 });
    await expect(page.getByText('Account created successfully')).toBeVisible();
  });

  test('shows error for duplicate email', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel(/First Name/i).fill('Dup');
    await page.getByLabel(/Last Name/i).fill('User');
    await page.getByLabel(/Email/i).fill(TEST_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel('Confirm Password', { exact: true }).fill(TEST_PASSWORD);

    await page.getByRole('button', { name: /Create Account/i }).click();

    await expect(page.getByText(/already registered/i)).toBeVisible({ timeout: 10000 });
  });
});

// ─────────────────────────────────────────────
// 2. Login Page
// ─────────────────────────────────────────────

test.describe('Login Page', () => {
  test('loads the login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText('AIR Bulk Vaccination Upload')).toBeVisible();
    await expect(page.getByText('Sign in to your account')).toBeVisible();
  });

  test('Sign In button is enabled and clickable', async ({ page }) => {
    await page.goto('/login');

    const button = page.getByRole('button', { name: /Sign In/i });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });

  test('has link to registration page', async ({ page }) => {
    await page.goto('/login');

    const registerLink = page.getByRole('link', { name: /Create account/i });
    await expect(registerLink).toBeVisible();
    await registerLink.click();
    await expect(page).toHaveURL('/register');
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/Email/i).fill('nobody@test.com');
    await page.getByLabel(/Password/i).fill('WrongPassword123');

    await page.getByRole('button', { name: /Sign In/i }).click();

    await expect(page.getByText(/Invalid|failed/i)).toBeVisible({ timeout: 10000 });
  });

  test('successfully logs in with valid credentials', async ({ page }) => {
    // Register user via API first to ensure it exists
    await page.request.post(`${API}/api/auth/register`, {
      data: {
        email: `login-${TIMESTAMP}@test.com`,
        password: TEST_PASSWORD,
        first_name: 'Login',
        last_name: 'Tester',
      },
      failOnStatusCode: false,
    });

    await page.goto('/login');

    await page.getByLabel(/Email/i).fill(`login-${TIMESTAMP}@test.com`);
    await page.getByLabel(/Password/i).fill(TEST_PASSWORD);

    await page.getByRole('button', { name: /Sign In/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/upload', { timeout: 15000 });
  });
});

// ─────────────────────────────────────────────
// 3. Auth Guard & Dashboard
// ─────────────────────────────────────────────

test.describe('Auth Guard', () => {
  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.context().clearCookies();

    await page.goto('/upload');

    // Should redirect to login
    await expect(page).toHaveURL('/login', { timeout: 10000 });
  });

  test('authenticated user sees dashboard with their name', async ({ page }) => {
    // Register + login via API first
    const email = `guard-${TIMESTAMP}@test.com`;
    await page.request.post(`${API}/api/auth/register`, {
      data: { email, password: TEST_PASSWORD, first_name: 'Guard', last_name: 'User' },
      failOnStatusCode: false,
    });

    // Login via the UI
    await page.goto('/login');
    await page.getByLabel(/Email/i).fill(email);
    await page.getByLabel(/Password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL('/upload', { timeout: 15000 });

    // Should see user name in header
    await expect(page.getByText('Guard User')).toBeVisible();
  });

  test('Sign Out button logs user out', async ({ page }) => {
    // Register + login via API first
    const email = `signout-${TIMESTAMP}@test.com`;
    await page.request.post(`${API}/api/auth/register`, {
      data: { email, password: TEST_PASSWORD, first_name: 'SignOut', last_name: 'Tester' },
      failOnStatusCode: false,
    });

    await page.goto('/login');
    await page.getByLabel(/Email/i).fill(email);
    await page.getByLabel(/Password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL('/upload', { timeout: 15000 });

    // Click Sign Out
    await page.getByRole('button', { name: /Sign Out/i }).click();

    // Should redirect to login
    await expect(page).toHaveURL('/login', { timeout: 10000 });
  });
});

// ─────────────────────────────────────────────
// 4. API — Direct endpoint tests
// ─────────────────────────────────────────────

test.describe('Auth API', () => {
  test('POST /api/auth/register returns 201 with user data', async ({ request }) => {
    const email = `api-${TIMESTAMP}@test.com`;
    const response = await request.post(`${API}/api/auth/register`, {
      data: {
        email,
        password: TEST_PASSWORD,
        first_name: 'API',
        last_name: 'Test',
        phone: '0400000000',
        ahpra_number: 'MED9999999999',
      },
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.email).toBe(email);
    expect(data.first_name).toBe('API');
    expect(data.phone).toBe('0400000000');
    expect(data.ahpra_number).toBe('MED9999999999');
    expect(data.role).toBe('provider');
    expect(data.status).toBe('active');
  });

  test('POST /api/auth/login returns token and sets cookie', async ({ request }) => {
    // Register a user for this specific test
    const email = `apilogin-${TIMESTAMP}@test.com`;
    await request.post(`${API}/api/auth/register`, {
      data: { email, password: TEST_PASSWORD, first_name: 'ApiLogin', last_name: 'Test' },
    });

    const response = await request.post(`${API}/api/auth/login`, {
      data: { email, password: TEST_PASSWORD },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.access_token).toBeTruthy();
    expect(data.token_type).toBe('bearer');

    const cookies = response.headers()['set-cookie'];
    expect(cookies).toContain('access_token=');
    expect(cookies).toContain('HttpOnly');
  });

  test('POST /api/auth/login returns 401 for bad credentials', async ({ request }) => {
    const response = await request.post(`${API}/api/auth/login`, {
      data: { email: 'nobody@test.com', password: 'WrongPassword123' },
    });

    expect(response.status()).toBe(401);
  });

  test('GET /api/auth/me returns 401 without cookie', async ({ request }) => {
    const response = await request.get(`${API}/api/auth/me`);
    expect(response.status()).toBe(401);
  });

  test('POST /api/auth/logout returns 200', async ({ request }) => {
    const response = await request.post(`${API}/api/auth/logout`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('Logged out');
  });
});
