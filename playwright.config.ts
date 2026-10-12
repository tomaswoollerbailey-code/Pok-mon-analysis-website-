import { defineConfig, devices } from '@playwright/test';

const executablePath = process.env.PW_CHROMIUM_PATH; // e.g. /opt/pw-browsers/chromium in sandboxes

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4174',
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npx vite build --outDir dist-e2e && npx tsx tests/e2e/fixture.ts dist-e2e/data && npx vite preview --outDir dist-e2e --port 4174 --strictPort',
    url: 'http://localhost:4174',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
