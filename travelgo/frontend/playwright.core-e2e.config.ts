import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
if (!process.env.T13A_RUN_ID || !process.env.T13A_EVIDENCE) throw new Error('Run through backend/scripts/t13a-run.cjs');
const frontPort = process.env.PLAYWRIGHT_FRONTEND_PORT!;
const backPort = process.env.PLAYWRIGHT_BACKEND_PORT!;
const origin = `http://127.0.0.1:${frontPort}`;
export default defineConfig({
  testDir: './e2e', testMatch: 't13a-core.spec.ts', workers: 1, fullyParallel: false, retries: 0,
  timeout: 90000, expect: { timeout: 8000 },
  reporter: [['list'], ['json', { outputFile: `${process.env.T13A_EVIDENCE}/playwright.json` }]],
  outputDir: `${process.env.T13A_EVIDENCE}/artifacts`,
  use: { baseURL: origin, headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure', serviceWorkers: 'block' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'msedge', viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], channel: 'msedge', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: [
    { command: 'node scripts/t13a-server.cjs', cwd: path.resolve('../backend'), env: { PORT: backPort, APP_ORIGINS: origin }, url: `http://127.0.0.1:${backPort}/api/health`, reuseExistingServer: false, timeout: 30000 },
    { command: `npm.cmd run dev -- --host 127.0.0.1 --port ${frontPort} --strictPort`, cwd: process.cwd(), env: { VITE_PROXY_TARGET: `http://127.0.0.1:${backPort}`, VITE_API_URL: '/api' }, url: origin, reuseExistingServer: false, timeout: 30000 },
  ],
});
