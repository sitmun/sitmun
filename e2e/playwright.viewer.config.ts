import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');

export default defineConfig({
  testDir: './viewer',
  outputDir: path.join(repoRoot, 'test-results'),
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never', outputFolder: path.join(repoRoot, 'playwright-report') }]]
    : [['list'], ['html', { open: 'never', outputFolder: path.join(repoRoot, 'playwright-report') }]],
  use: {
    baseURL: 'http://localhost:4400',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: process.env.SITMUN_E2E_VIDEO === '1' ? 'on' : 'retain-on-failure',
    // Password/catalog/proxy flows need the viewer SW for middleware + proxy_token.
    serviceWorkers: 'allow',
  },
  webServer: [
    {
      command: 'pnpm run e2e:backend',
      cwd: repoRoot,
      url: 'http://localhost:18080/api/dashboard/health',
      timeout: 180_000,
      reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    },
    {
      command: 'pnpm run e2e:wms-stub',
      cwd: repoRoot,
      url: 'http://127.0.0.1:18093/health',
      timeout: 30_000,
      reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    },
    {
      // e2e-proxy waits for backend health before bootRun (parallel webServers).
      command: 'pnpm run e2e:proxy',
      cwd: repoRoot,
      url: 'http://localhost:18082/actuator/health',
      timeout: 300_000,
      reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    },
    {
      command: 'pnpm run e2e:viewer:app',
      cwd: repoRoot,
      url: 'http://localhost:4400',
      timeout: 420_000,
      reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    },
  ],
  projects: [
    {
      name: 'viewer-setup',
      testMatch: /setup\/.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'viewer-public',
      testMatch: /(public-access|language-chrome)\.spec\.ts/,
      dependencies: ['viewer-setup'],
      use: {
        ...devices['Desktop Chrome'],
        // Public SPA routes only: a stale SW can serve Not found for /auth/login.
        // Cache-Control no-store on HTML (viewer serve-e2e) is the other half.
        serviceWorkers: 'block',
      },
    },
    {
      name: 'viewer-password',
      testMatch: /(password-access|profile-positions|restricted-share-link)\.spec\.ts/,
      dependencies: ['viewer-setup'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'viewer-catalog',
      testMatch: /(?:layer-catalog|folder-catalog-info)\.spec\.ts/,
      dependencies: ['viewer-setup'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'viewer-legend',
      testMatch: /legend\.spec\.ts/,
      dependencies: ['viewer-setup'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'viewer-basemap',
      testMatch: /basemap-none\.spec\.ts/,
      dependencies: ['viewer-setup'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'viewer-mia',
      testMatch: /mia-render\.spec\.ts/,
      dependencies: ['viewer-setup'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'viewer-print',
      testMatch: /print-map\.spec\.ts/,
      dependencies: ['viewer-setup'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'viewer-gfi',
      testMatch: /gfi-html-embed\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'viewer-gfi-fields',
      testMatch: /gfi-field-list\.spec\.ts/,
      dependencies: ['viewer-setup'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'viewer-parameters',
      testMatch: /parameter-scope\.spec\.ts/,
      dependencies: ['viewer-setup'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
