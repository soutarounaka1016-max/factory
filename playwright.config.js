import { defineConfig, devices } from '@playwright/test';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const localStaticMode = Boolean(executablePath);
const pagesBase = '/factory/';
const localChromium = executablePath
  ? { browserName: 'chromium', launchOptions: { executablePath } }
  : {};

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 8000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: localStaticMode ? `https://dashboard.test${pagesBase}` : `http://127.0.0.1:4173${pagesBase}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: localStaticMode ? 'off' : 'retain-on-failure',
  },
  webServer: localStaticMode ? undefined : {
    command: 'npm run build && npm run preview -- --port 4173',
    url: `http://127.0.0.1:4173${pagesBase}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], ...localChromium } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'ipad-landscape', use: { ...devices['iPad Pro 11 landscape'], ...localChromium } },
    { name: 'ipad-portrait', use: { ...devices['iPad Pro 11'], ...localChromium } },
    { name: 'mobile', use: { ...devices['Pixel 7'], ...localChromium } },
  ],
});
