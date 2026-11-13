import { defineConfig } from '@playwright/test';
import path from 'node:path';
const evidence = process.env.T_AI_03A_EVIDENCE;
if (!evidence || !process.env.VITE_PROXY_TARGET) throw new Error('Use t-ai-03-a-run.cjs with guarded test DB');
export default defineConfig({
  testDir: './e2e', testMatch: 't-ai-03-a-real-integration.spec.ts', workers: 1, retries: 0,
  timeout: 35000, expect: { timeout: 7000 },
  outputDir: path.join(evidence, 'playwright'), reporter: [['list'], ['json', { outputFile: path.join(evidence, 'results.json') }]],
  use: { baseURL: 'http://127.0.0.1:3333', headless: true, channel: 'msedge', trace: 'retain-on-failure',
    screenshot: 'only-on-failure', timezoneId: 'Asia/Ho_Chi_Minh' },
  projects: [{ name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }],
  webServer: { command: 'npm.cmd run dev -- --host 127.0.0.1 --port 3333 --strictPort',
    url: 'http://127.0.0.1:3333', reuseExistingServer: false },
});
