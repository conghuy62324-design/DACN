import { defineConfig, devices } from '@playwright/test';

// Frontend security fixtures only: no backend process or database connection.
const port = process.env.POPUP_TEST_PORT || '3125';
export default defineConfig({
  testDir: './e2e', testMatch: 't05-map-popup.spec.ts', workers: 1, retries: 0,
  timeout: 60000, expect: { timeout: 10000 }, reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${port}`, headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'edge-popup', use: { ...devices['Desktop Chrome'], channel: 'msedge' } }],
  webServer: { command: `npm.cmd run dev -- --host 127.0.0.1 --port ${port} --strictPort`, url: `http://127.0.0.1:${port}`, reuseExistingServer: false },
});
