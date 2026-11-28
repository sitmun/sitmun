import { test, expect, type Page } from '@playwright/test';
import { APP_ID, isBackendRequest, readViewerCredentials, TERRITORY_ID } from './fixtures';

/**
 * A share link saved in the 3D view reopens in 3D at the same camera; one saved in the
 * flat view stays flat (#175). The link carries `mapState` as the share control writes it:
 * base64url JSON with `ext` and, in 3D, `vw3` from `cameraControls.getCameraState()`.
 */
type Camera = { cp: number[]; chpr: number[]; bcpd: number };
type MapView = { on3DView: boolean; extent: number[] | null; camera: Camera | null };

const mapUrl = `/user/map/${APP_ID}/${TERRITORY_ID}`;

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

function readMapView(page: Page): Promise<MapView | null> {
  return page.evaluate(() => {
    const TC = (window as unknown as { TC?: { getMap?: (el: Element) => any } }).TC;
    const map = Array.from(document.querySelectorAll('.tc-map, #mapa'))
      .map((el) => TC?.getMap?.(el))
      .find((candidate) => candidate && !candidate.div?.closest?.('.tc-ctl-ovmap') && candidate.baseLayers?.length);
    if (!map) {
      return null;
    }
    return {
      on3DView: !!map.on3DView,
      extent: map.on3DView ? null : (map.getExtent?.() ?? null),
      camera: map.on3DView ? (map.view3D?.cameraControls?.getCameraState?.() ?? null) : null,
    };
  });
}

async function openMap(page: Page, mapState?: string): Promise<void> {
  await page.goto(mapState ? `${mapUrl}?mapState=${mapState}` : mapUrl, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => readMapView(page), { timeout: 90_000 }).not.toBeNull();
  // The loading overlay goes away only after ShareControlHandler.restore has finished.
  await expect(page.locator('.map-loading-overlay')).toBeHidden({ timeout: 90_000 });
}

function token(state: unknown): string {
  return Buffer.from(JSON.stringify(state), 'utf8').toString('base64url');
}

function angleBetween(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

test.describe('Share link and the 3D camera (#175)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await login(page);
  });

  test('a link saved in 3D reopens in 3D at the same camera', async ({ page }) => {
    await openMap(page);
    const ext = (await readMapView(page))!.extent;
    expect(ext).toHaveLength(4);

    const button = page.locator('.tc-ctl-3d-btn');
    await button.click();
    // ThreeD.set3D re-enables the button once the 3D view has loaded and the camera has settled.
    await expect(button).toBeEnabled({ timeout: 90_000 });
    await expect.poll(async () => (await readMapView(page))?.camera ?? null, { timeout: 30_000 }).not.toBeNull();
    const saved = (await readMapView(page))!.camera!;

    await openMap(page, token({ ext, vw3: saved }));

    await expect.poll(async () => (await readMapView(page))?.on3DView, { timeout: 90_000 }).toBe(true);
    await expect.poll(async () => (await readMapView(page))?.camera ?? null, { timeout: 30_000 }).not.toBeNull();
    const restored = (await readMapView(page))!.camera!;
    expect(restored.cp[0]).toBeCloseTo(saved.cp[0], 5);
    expect(restored.cp[1]).toBeCloseTo(saved.cp[1], 5);
    expect(Math.abs(restored.cp[2] - saved.cp[2])).toBeLessThan(Math.max(1, saved.cp[2] * 0.01));
    // Heading and pitch are angles: 2π and 0 are the same heading.
    expect(angleBetween(restored.chpr[0], saved.chpr[0])).toBeLessThan(0.005);
    expect(angleBetween(restored.chpr[1], saved.chpr[1])).toBeLessThan(0.005);
  });

  test('a link saved in the flat view does not open 3D', async ({ page }) => {
    await openMap(page);
    const ext = (await readMapView(page))!.extent;

    await openMap(page, token({ ext }));

    expect((await readMapView(page))!.on3DView).toBe(false);
    await expect(page.locator('.tc-ctl-3d-btn')).not.toHaveClass(/tc-checked/);
  });
});
