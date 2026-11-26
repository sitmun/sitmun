import { test, expect, type Page } from '@playwright/test';
import {
  APP_ID,
  isBackendRequest,
  PROXY_PATH,
  readViewerCredentials,
  TERRITORY_ID,
  waitForProxyTokenInIndexedDb,
  waitForServiceWorkerControl,
} from './fixtures';

/**
 * Overview map through the proxy (#421). SITNA loads the overview with plain <img> requests
 * (mode no-cors). The service worker must still send the proxy token on them, so a user with
 * access sees the overview without a 403 or the «configuration issue» warning.
 */
async function loginAndOpenMap(page: Page): Promise<void> {
  const credentials = await readViewerCredentials();
  await page.goto('/auth/login');
  await page.locator('input[name="username"]').fill(credentials.username);
  await page.locator('input[name="password"]').fill(credentials.password);
  const account = page.waitForResponse(
    (response) => isBackendRequest(response, '/account', 'GET') && response.ok(),
  );
  await page.locator('form .login-button button').click();
  await account;
  await expect(page).toHaveURL(/\/user\/dashboard/);

  await page.goto(`/user/map/${APP_ID}/${TERRITORY_ID}`, { waitUntil: 'domcontentloaded' });
  await waitForServiceWorkerControl(page);
  await waitForProxyTokenInIndexedDb(page);
  await page.locator('#tc-slot-ovmap').waitFor({ state: 'attached', timeout: 90_000 });
}

test.describe('Overview map through the proxy (#421)', () => {
  test('opening the overview sends the proxy token and shows no access warning', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const proxied: number[] = [];
    page.on('response', (response) => {
      const url = new URL(response.url());
      if (url.pathname === PROXY_PATH && /GetMap/i.test(url.search)) {
        proxied.push(response.status());
      }
    });

    await loginAndOpenMap(page);
    const panel = page.locator('.tc-ovmap-panel');
    if ((await panel.getAttribute('class'))?.includes('tc-collapsed-right')) {
      await panel.locator('> h1').click();
      await expect(panel).not.toHaveClass(/tc-collapsed-right/);
    }
    await expect
      .poll(() => proxied.filter((status) => status === 200).length, {
        timeout: 30_000,
        message: 'overview must load a GetMap through the proxy',
      })
      .toBeGreaterThan(0);

    expect(
      proxied.filter((status) => status === 403),
      'no proxied GetMap may be refused for a user with access',
    ).toEqual([]);
    await expect(
      page.locator('app-notification').filter({ hasText: /configuration issue/i }),
    ).toHaveCount(0);
  });
});
