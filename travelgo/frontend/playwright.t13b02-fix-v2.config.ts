import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
if (!process.env.T13B02_RUN_ID || !process.env.T13B02_EVIDENCE) throw new Error('Use backend/scripts/t13b02-fix-v2-run.cjs');
const back = process.env.PLAYWRIGHT_BACKEND_PORT!;
const front = process.env.PLAYWRIGHT_FRONTEND_PORT!;
const origin = `http://127.0.0.1:${front}`;
export default defineConfig({
  testDir: './e2e', testMatch: 't13b02-fix-v2-business-moderation.spec.ts', workers: 1, fullyParallel: false, retries: 0,
  timeout: 240000, expect: { timeout: 10000 },
  reporter: [['list'], ['json', { outputFile: `${process.env.T13B02_EVIDENCE}/playwright.json` }]],
  outputDir: `${process.env.T13B02_EVIDENCE}/artifacts`,
  // Spec records and sanitizes failing action/network traces; raw credentials and DOM snapshots are not published.
  use: { baseURL: origin, headless: true, actionTimeout: 10000, navigationTimeout: 20000, trace: 'off', screenshot: 'off', serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'msedge', viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], channel: 'msedge', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: [
    { command: 'node scripts/t13b02-server.cjs', cwd: path.resolve('../backend'), env: { PORT: back, APP_ORIGINS: origin }, url: `http://127.0.0.1:${back}/api/health`, reuseExistingServer: false, timeout: 30000 },
    { command: `npm.cmd run dev -- --host 127.0.0.1 --port ${front} --strictPort`, cwd: process.cwd(), env: { VITE_PROXY_TARGET: `http://127.0.0.1:${back}`, VITE_API_URL: '/api' }, url: origin, reuseExistingServer: false, timeout: 30000 },
  ],
});
