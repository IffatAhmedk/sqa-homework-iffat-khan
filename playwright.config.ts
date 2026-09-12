import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // Live site backed by an LLM: one retry absorbs transient upstream slowness
  // without hiding real failures (a genuine bug fails twice).
  retries: 1,
  workers: 3,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'artifacts/report', open: 'always' }],
  ],
  use: {
    baseURL: 'https://ask.permission.ai',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 720 },
  },
});
