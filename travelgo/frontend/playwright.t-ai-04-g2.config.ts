import { defineConfig } from '@playwright/test';
import path from 'node:path';
const evidence = process.env.T_AI_04_G2_EVIDENCE;
if (!evidence) throw new Error('A fresh task evidence directory is required');
export default defineConfig({
  testDir: './e2e', testMatch: ['t-ai-04-g2-frontend.spec.ts', 't-ai-02-assistant-ui.spec.ts'], workers: 1, retries: 0,
  timeout: 30000, expect: { timeout: 5000 },
  outputDir: path.join(evidence, 'playwright'), reporter: [['list'], ['json', { outputFile: path.join(evidence, 'results.json') }]],
  use: { baseURL: 'http://127.0.0.1:3352', headless: true, channel: 'msedge', timezoneId: 'Asia/Ho_Chi_Minh', trace: 'retain-on-failure', screenshot: 'only-on-failure', serviceWorkers: 'block' },
  projects: [{ name: 'desktop', use: { viewport: { width: 1440, height: 900 } } }, { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }],
  webServer: { command: 'npm.cmd run dev -- --host 127.0.0.1 --port 3352 --strictPort', url: 'http://127.0.0.1:3352', reuseExistingServer: false,
    env: { VITE_PROXY_TARGET: 'http://127.0.0.1:1', LLM_LIVE_ENABLED: 'false', LLM_USAGE_APPROVED: 'false' } },
});
