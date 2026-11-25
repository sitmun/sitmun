import { test, expect, type Page } from '@playwright/test';
import { APP_ID, isBackendRequest, readViewerCredentials, TERRITORY_ID } from './fixtures';

/**
 * Overview map with a WMTS background (#388). WMTS GetTile takes one layer identifier and a
 * mandatory TileMatrixSet and Format (OGC 07-057r7, Table 22). The profile is rewritten so the
 * first background is a layer of the local WMTS stub and there is no situation-map group.
 */
const WMTS_STUB = 'http://127.0.0.1:18094/wmts';
const WMTS_SERVICE_ID = 'service/e2e-wmts';
const WMTS_LAYER_ID = 'layer/e2e-wmts';
const WMTS_GROUP_ID = 'group/e2e-wmts';

type Profile = {
  application: Record<string, unknown>;
  backgrounds: Array<Record<string, unknown>>;
  groups: Array<Record<string, unknown>>;
  layers: Array<Record<string, unknown>>;
  services: Array<Record<string, unknown>>;
  tasks?: Array<{ 'ui-control'?: string }>;
};

function withWmtsBackgroundFirst(profile: Profile): Profile {
  const { ['situation-map']: _situationMap, ...application } = profile.application;
  return {
    ...profile,
    application,
    services: [
      ...profile.services,
      {
        id: WMTS_SERVICE_ID,
        url: WMTS_STUB,
        type: 'WMTS',
        isProxied: false,
        parameters: { matrixSet: 'EPSG:25831', format: 'image/png' },
      },
    ],
    layers: [
      ...profile.layers,
      { id: WMTS_LAYER_ID, title: 'E2E WMTS overview', service: WMTS_SERVICE_ID, layers: ['orto'] },
    ],
    groups: [...profile.groups, { id: WMTS_GROUP_ID, title: 'E2E WMTS', layers: [WMTS_LAYER_ID] }],
    backgrounds: [
      { id: WMTS_GROUP_ID, title: 'E2E WMTS', thumbnail: '', order: -1 },
      ...profile.backgrounds,
    ],
  };
}

async function login(page: Page): Promise<void> {
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
}

test.describe('Overview map with a WMTS background (#388)', () => {
  test('the overview loads the WMTS layer without a layer-not-found error', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(`${error.message}\n${error.stack ?? ''}`));

    await login(page);

    let profileTasks: Profile['tasks'];
    // context.route also sees the request when the viewer service worker makes it (Chromium).
    await page.context().route(`**/config/client/profile/${APP_ID}/${TERRITORY_ID}**`, async (route) => {
      const response = await route.fetch();
      const profile = withWmtsBackgroundFirst((await response.json()) as Profile);
      profileTasks = profile.tasks;
      await route.fulfill({ response, json: profile });
    });
    const tiles: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.startsWith(WMTS_STUB) && /\/tile\/orto\/|[?&]layer=orto(&|$)/i.test(url)) tiles.push(url);
    });

    await page.goto(`/user/map/${APP_ID}/${TERRITORY_ID}`, { waitUntil: 'domcontentloaded' });
    await page.locator('#tc-slot-ovmap').waitFor({ state: 'attached', timeout: 90_000 });
    expect(
      profileTasks?.some((task) => task['ui-control'] === 'sitna.overviewMap'),
      'profile must include sitna.overviewMap (setup task-availability)',
    ).toBeTruthy();

    await expect.poll(() => tiles.length, { timeout: 60_000 }).toBeGreaterThan(0);
    // Give the overview control time to build its own WMTS layer after the main map.
    await page.waitForTimeout(5_000);

    expect(
      consoleErrors.filter((text) => /not found/i.test(text) && /WMTS|orto/i.test(text)),
      'overview WMTS layer must resolve (#388)',
    ).toEqual([]);
  });
});
