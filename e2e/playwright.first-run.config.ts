import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');

/**
 * First-run wizard on its own H2 database. Do not run concurrently with the
 * other suites: they share backend port 18080 and admin port 4300.
 */
export default defineConfig({
  testDir: '.',
  outputDir: path.join(repoRoot, 'test-results'),
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: {
    timeout: 20_000,
  },
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never', outputFolder: path.join(repoRoot, 'playwright-report') }]]
    : [['list'], ['html', { open: 'never', outputFolder: path.join(repoRoot, 'playwright-report') }]],
  use: {
    baseURL: 'http://localhost:4300',
    locale: 'es-ES',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm run e2e:backend',
      cwd: repoRoot,
      env: { ...process.env, SITMUN_E2E_FIRST_RUN: '1' },
      url: 'http://localhost:18080/api/dashboard/health',
      timeout: 180_000,
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
  ],
  projects: [
    {
      name: 'first-run',
      testMatch: /admin\/first-run\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], locale: 'es-ES' },
    },
  ],
});
