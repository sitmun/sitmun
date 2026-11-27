import { test, expect, type Page } from '@playwright/test';
import { APP_ID, isBackendRequest, readViewerCredentials, TERRITORY_ID } from './fixtures';

/**
 * One misconfigured WMTS background must not stop the whole map from loading (#380).
 * The profile is rewritten to add a WMTS background from the local stub
 * (e2e/scripts/e2e-wmts-stub.mjs), broken in one of the three ways the issue reports.
 */
const WMTS_STUB = 'http://127.0.0.1:18094/wmts';
const BROKEN_TITLE = 'E2E broken WMTS';
// Seeded backgrounds of APP_ID, plus the entry the viewer appends.
const WORKING = ['WMTS Bases - ICGC- Topo', 'WMTS Bases - ICGC- Orto', 'No base map'];

type Profile = {
  application: Record<string, unknown>;
  backgrounds: Array<Record<string, unknown>>;
  groups: Array<Record<string, unknown>>;
  layers: Array<Record<string, unknown>>;
  services: Array<Record<string, unknown>>;
};

type Broken = { parameters: Record<string, string>; layer: string; first: boolean };

function withBackground(profile: Profile, broken: Broken): Profile {
  const id = 'e2e-380';
  const background = { id: `group/${id}`, title: BROKEN_TITLE, thumbnail: '', order: broken.first ? -1 : 9999 };
  return {
    ...profile,
    services: [...profile.services, { id: `service/${id}`, url: WMTS_STUB, type: 'WMTS', isProxied: false, parameters: broken.parameters }],
    layers: [...profile.layers, { id: `layer/${id}`, title: BROKEN_TITLE, service: `service/${id}`, layers: [broken.layer] }],
    groups: [...profile.groups, { id: `group/${id}`, title: BROKEN_TITLE, layers: [`layer/${id}`] }],
    backgrounds: broken.first ? [background, ...profile.backgrounds] : [...profile.backgrounds, background],
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

async function openMapWith(page: Page, broken: Broken): Promise<void> {
  await login(page);

  // context.route also sees the request when the viewer service worker makes it (Chromium).
  await page.context().route(`**/config/client/profile/${APP_ID}/${TERRITORY_ID}**`, async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, json: withBackground((await response.json()) as Profile, broken) });
  });
  await page.goto(`/user/map/${APP_ID}/${TERRITORY_ID}`, { waitUntil: 'domcontentloaded' });
}

type MapState = { baseLayers: string[]; active: string | null };

/** Base layers of the main API-SITNA map, once it exists (the overview map is a separate TC.Map). */
function readMapState(page: Page): Promise<MapState | null> {
  return page.evaluate(() => {
    const TC = (window as unknown as { TC?: { getMap?: (el: Element) => any } }).TC;
    const map = Array.from(document.querySelectorAll('.tc-map, #mapa'))
      .map((el) => TC?.getMap?.(el))
      .find((candidate) => candidate && !candidate.div?.closest?.('.tc-ctl-ovmap') && candidate.baseLayers?.length);
    return map
      ? {
          baseLayers: map.baseLayers.map((layer: { title?: string }) => layer.title),
          active: map.baseLayer?.title ?? null,
        }
      : null;
  });
}

async function expectWorkingBackgrounds(page: Page): Promise<void> {
  await expect.poll(() => readMapState(page), { message: 'the map loads with base layers', timeout: 60_000 }).not.toBeNull();
  // A failed load replaces the loading overlay with an error dialog.
  await expect(page.locator('.map-loading-overlay')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  const state = (await readMapState(page))!;
  expect(state.baseLayers, 'every working background is still a base layer').toEqual(expect.arrayContaining(WORKING));
  expect(state.baseLayers).not.toContain(BROKEN_TITLE);
  expect(WORKING.slice(0, 2), `the map shows a working background, not «${state.active}»`).toContain(state.active);
  await expect(page.getByText(BROKEN_TITLE).first(), 'a warning names the skipped background').toBeVisible();
}

test.describe('A broken WMTS background does not block the map (#380)', () => {
  test('a WMTS service without matrixSet', async ({ page }) => {
    await openMapWith(page, { parameters: { format: 'image/png' }, layer: 'orto', first: false });
    await expectWorkingBackgrounds(page);
  });

  test('a WMTS layer name the service does not offer', async ({ page }) => {
    await openMapWith(page, { parameters: { matrixSet: 'EPSG:25831', format: 'image/png' }, layer: 'no-such-layer', first: false });
    await expectWorkingBackgrounds(page);
  });

  test('a WMTS background on another grid ordered first', async ({ page }) => {
    await openMapWith(page, { parameters: { matrixSet: 'EPSG:3857', format: 'image/png' }, layer: 'merc', first: true });
    await expectWorkingBackgrounds(page);
  });
});
