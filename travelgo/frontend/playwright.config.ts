import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const frontendDir = fileURLToPath(new URL('.', import.meta.url));
const backendDir = fileURLToPath(new URL('../backend/', import.meta.url));
const backendPort = process.env.PLAYWRIGHT_BACKEND_PORT || '5001';
const frontendPort = process.env.PLAYWRIGHT_FRONTEND_PORT || '3001';
const frontendUrl = `http://127.0.0.1:${frontendPort}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: frontendUrl,
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
      env: { PORT: backendPort, APP_ORIGINS: frontendUrl },
      url: `http://127.0.0.1:${backendPort}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npm.cmd run dev -- --host 127.0.0.1 --port ${frontendPort}`,
      cwd: frontendDir,
      env: { VITE_PROXY_TARGET: `http://127.0.0.1:${backendPort}` },
      url: frontendUrl,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
