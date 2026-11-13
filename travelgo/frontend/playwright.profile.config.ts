import { defineConfig, devices } from '@playwright/test';

// Profile/session UI fixtures only. No backend or database is started here.
const port = process.env.PROFILE_TEST_PORT || '3127';
export default defineConfig({
  testDir: './e2e', testMatch: 't07-profile.mock.spec.ts', workers: 1, retries: 0,
  timeout: 30000, expect: { timeout: 4000 }, reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${port}`, headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'edge-profile-mock', use: { ...devices['Desktop Chrome'], channel: 'msedge' } }],
  webServer: { command: `npm.cmd run dev -- --host 127.0.0.1 --port ${port} --strictPort`, url: `http://127.0.0.1:${port}`, reuseExistingServer: false },
});
