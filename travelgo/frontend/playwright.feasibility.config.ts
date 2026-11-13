import { defineConfig, devices } from '@playwright/test';
// Browser/UI replay of frozen synthetic service outputs. No DB in this suite.
const port = '3131';
const evidence = process.env.T11B_BROWSER_EVIDENCE || '../docs/evidence/t11b/browser';
export default defineConfig({
  testDir: './e2e', testMatch: 't11b-feasibility.spec.ts', workers: 1, retries: 0,
  timeout: 30000, expect: { timeout: 5000 }, reporter: [['list'], ['json', { outputFile: `${evidence}/results.json` }]],
  outputDir: `${evidence}/artifacts`,
  use: { baseURL: `http://127.0.0.1:${port}`, headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'edge-t11b', use: { ...devices['Desktop Chrome'], channel: 'msedge' } }],
  webServer: { command: `npm.cmd run dev -- --host 127.0.0.1 --port ${port} --strictPort`, url: `http://127.0.0.1:${port}`, reuseExistingServer: false },
});
