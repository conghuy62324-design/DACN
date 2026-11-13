import { defineConfig } from '@playwright/test';
import path from 'node:path';
const evidence = process.env.T_AI_02_EVIDENCE;
if (!evidence) throw new Error('Use t-ai-02-browser.cjs to create a fresh evidence directory');
export default defineConfig({
  testDir: './e2e', testMatch: 't-ai-02-assistant-ui.spec.ts', workers: 1, retries: 0,
  timeout: 30000, expect: { timeout: 5000 },
  outputDir: path.join(evidence, 'playwright'), reporter: [['list'], ['json', { outputFile: path.join(evidence, 'results.json') }]],
  use: { baseURL: 'http://127.0.0.1:3322', headless: true, channel: 'msedge', trace: 'retain-on-failure', screenshot: 'only-on-failure', timezoneId: 'Asia/Ho_Chi_Minh' },
  projects: [{ name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }],
  webServer: { command: 'npm.cmd run dev -- --host 127.0.0.1 --port 3322 --strictPort', url: 'http://127.0.0.1:3322', reuseExistingServer: false },
});
