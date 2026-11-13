import { defineConfig, devices } from '@playwright/test';

// Requires the already-running local application on ports 3000 and 5000.
// This suite writes persistent demo rows to travelgo_dev; it has no cleanup hook.
export default defineConfig({
  testDir: './e2e',
  testMatch: 'local-demo.smoke.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: { baseURL: 'http://localhost:3000', headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'edge-local-demo', use: { ...devices['Desktop Chrome'], channel: 'msedge' } }],
});
