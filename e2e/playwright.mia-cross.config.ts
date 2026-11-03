import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');
const adminAuthFile = path.join(__dirname, '.auth/admin.json');

/**
 * Cross-stack MIA / Plantilla suite: shared H2, admin, viewer, proxy, WMS stub.
 * Do not run concurrently with admin, viewer, application-contact, or mobile suites.
 */
export default defineConfig({
  testDir: '.',
  outputDir: path.join(repoRoot, 'test-results'),
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 180_000,
  expect: {
    timeout: 20_000,
  },
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never', outputFolder: path.join(repoRoot, 'playwright-report') }]]
    : [['list'], ['html', { open: 'never', outputFolder: path.join(repoRoot, 'playwright-report') }]],
  use: {
    baseURL: 'http://localhost:4300',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
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
      command: 'pnpm run e2e:proxy',
      cwd: repoRoot,
      url: 'http://localhost:18082/actuator/health',
      timeout: 300_000,
      reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    },
    {
      command: 'pnpm run e2e:admin',
      cwd: repoRoot,
      url: 'http://localhost:4300',
      timeout: 120_000,
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
      name: 'setup',
      testMatch: /admin\/auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'viewer-setup',
      testMatch: /viewer\/setup\/.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mia-cross',
      testMatch: /mia-cross\/.*\.spec\.ts/,
      dependencies: ['setup', 'viewer-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: adminAuthFile,
      },
    },
  ],
});
