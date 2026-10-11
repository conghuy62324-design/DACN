import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const frontendDir = fileURLToPath(new URL('.', import.meta.url));
const backendDir = fileURLToPath(new URL('../backend/', import.meta.url));

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{
    name: 'edge-desktop',
    use: { ...devices['Desktop Chrome'], channel: 'msedge' },
  }],
  webServer: [
    {
      command: 'npm.cmd start',
      cwd: backendDir,
      url: 'http://127.0.0.1:5000/api/health',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npm.cmd run dev -- --host 127.0.0.1',
      cwd: frontendDir,
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
