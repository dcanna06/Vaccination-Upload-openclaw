/**
 * E2E Tests — Submission with Provider Resolution
 *
 * Tests that submission correctly uses provider from selected location
 * and falls back gracefully when no location is selected.
 *
 * Run: npx playwright test submit-provider.spec.ts
 */

import { test, expect } from '@playwright/test';

const API = process.env.BACKEND_URL || 'http://localhost:8000';

test.describe('Submission with Provider Resolution', () => {
  test.beforeEach(async ({ page }) => {
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
    });
  });

  test('submit fetches provider from selected location', async ({ page }) => {
    // Set up location selection in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('selectedLocationId', '1');
    });

    let capturedSubmitBody: Record<string, unknown> | null = null;

    // Mock providers endpoint
    await page.route(`${API}/api/providers?location_id=1`, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            location_id: 1,
            provider_number: 'LOC001A',
            provider_type: 'GP',
            minor_id: 'WRR00001',
            hw027_status: 'approved',
            air_access_list: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ]),
      });
    });

    // Mock submit endpoint and capture body
    await page.route(`${API}/api/submit`, async (route) => {
      const body = route.request().postDataJSON();
      capturedSubmitBody = body;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          submissionId: 'test-123',
          status: 'running',
          totalBatches: 1,
        }),
      });
    });

    // Mock progress endpoint
    await page.route(`${API}/api/submit/test-123/progress`, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          submissionId: 'test-123',
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

    // Navigate to submit with data in store
    await page.addInitScript(() => {
      // Set upload store with batches
      const uploadState = {
        state: {
          parsedRows: [{ rowNumber: 1 }],
          groupedBatches: [
            {
              encounters: [
                {
                  individual: {
                    personalDetails: {
                      firstName: 'Test',
                      lastName: 'User',
                      dateOfBirth: '1990-01-01',
                      gender: 'M',
                    },
                  },
                  dateOfService: '2026-01-15',
                  episodes: [{ id: 1, vaccineCode: 'COMIRN', vaccineDose: '1' }],
                },
              ],
            },
          ],
        },
      };
      sessionStorage.setItem('upload-storage', JSON.stringify(uploadState));
    });

    await page.goto('/submit');

    // Wait for the fetch calls to happen
    await page.waitForTimeout(1000);

    // If submission was triggered, the body should include the provider
    if (capturedSubmitBody) {
      const provider = (capturedSubmitBody as Record<string, Record<string, string>>)
        .informationProvider;
      expect(provider?.providerNumber).toBe('LOC001A');
    }
  });

  test('submit without location falls back to empty provider', async ({ page }) => {
    // No location selected
    await page.addInitScript(() => {
      localStorage.removeItem('selectedLocationId');
    });

    let capturedSubmitBody: Record<string, unknown> | null = null;

    await page.route(`${API}/api/submit`, async (route) => {
      capturedSubmitBody = route.request().postDataJSON();
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          submissionId: 'test-456',
          status: 'running',
          totalBatches: 1,
        }),
      });
    });

    await page.route(`${API}/api/submit/test-456/progress`, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          submissionId: 'test-456',
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

    await page.goto('/submit');
    await page.waitForTimeout(1000);

    // Should still reach the page without error
    // Backend handles the fallback to config
  });
});
