import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  reporter: [['html', { open: 'never' }], ['list']],
  outputDir: './test-results/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  // Requires frontend (port 3000) and backend (port 8000) already running.
  // Start manually with: npm run dev (frontend) + uvicorn (backend)
  webServer: undefined,
});
