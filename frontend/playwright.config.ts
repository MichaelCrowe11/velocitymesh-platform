import { defineConfig, devices } from '@playwright/test';

/**
 * Comprehensive E2E Testing Configuration for VelocityMesh Frontend
 * Includes accessibility, performance, and cross-browser testing
 */

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ...(process.env.CI ? [['github']] : []),
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile devices
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // Tablet
    {
      name: 'tablet',
      use: { ...devices['iPad Pro'] },
    },

    // Accessibility testing
    {
      name: 'accessibility',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/*.a11y.test.ts',
    },

    // Performance testing
    {
      name: 'performance',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-web-bluetooth', '--disable-web-security']
        }
      },
      testMatch: '**/*.perf.test.ts',
    },
  ],

  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      mode: 'only-on-failure',
      animations: 'disabled',
    },
  },

  // Global setup for authentication and test data
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),
});