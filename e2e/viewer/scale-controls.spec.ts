import { test, expect, type Page } from '@playwright/test';
import { APP_ID, isBackendRequest, readViewerCredentials, TERRITORY_ID } from './fixtures';

/**
 * An application with both Scale (`sitna.scale`) and Scale Bar (`sitna.scaleBar`) shows both
 * (#374). Both controls render into `#tc-slot-scale`; the profile is rewritten to include them.
 */
type Profile = { tasks?: Array<{ id: string; parameters: unknown; 'ui-control': string }> };

const CONTROLS = ['sitna.scale', 'sitna.scaleBar'];

function withScaleControls(profile: Profile): Profile {
  const tasks = profile.tasks ?? [];
  const missing = CONTROLS.filter((control) => !tasks.some((task) => task['ui-control'] === control));
  return {
    ...profile,
    tasks: [...tasks, ...missing.map((control) => ({ id: `task/e2e-${control}`, parameters: {}, 'ui-control': control }))],
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

test.describe('Scale and scale bar together (#374)', () => {
  test('both controls are visible and do not overlap', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await login(page);
    // context.route also sees the request when the viewer service worker makes it (Chromium).
    await page.context().route(`**/config/client/profile/${APP_ID}/${TERRITORY_ID}**`, async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, json: withScaleControls((await response.json()) as Profile) });
    });
    await page.goto(`/user/map/${APP_ID}/${TERRITORY_ID}`, { waitUntil: 'domcontentloaded' });

    const scale = page.locator('.tc-ctl-scl');
    const bar = page.locator('.tc-ctl-sb');
    await expect(scale).toBeVisible({ timeout: 90_000 });
    await expect(bar).toBeVisible({ timeout: 30_000 });
    await expect(bar.locator('.ol-scale-line-inner')).toHaveText(/\d/, { timeout: 30_000 });
    await expect(page.getByText('Configuration conflict', { exact: false })).toHaveCount(0);

    // The seed application also has the scale selector; every pair must be apart.
    const boxes: Array<{ name: string; x: number; y: number; width: number; height: number }> = [];
    for (const name of ['tc-ctl-ss', 'tc-ctl-scl', 'tc-ctl-sb']) {
      const control = page.locator(`.${name}`);
      if ((await control.count()) > 0 && (await control.first().isVisible())) {
        boxes.push({ name, ...(await control.first().boundingBox())! });
      }
    }
    for (const [i, a] of boxes.entries()) {
      for (const b of boxes.slice(i + 1)) {
        const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
        const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
        expect(overlapX * overlapY, `${JSON.stringify(a)} and ${JSON.stringify(b)} overlap`).toBe(0);
      }
    }

    // The bar's own label is on top, not covered by another control.
    const box = (await bar.locator('.ol-scale-line-inner').boundingBox())!;
    const topmost = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest('.tc-ctl-sb, .tc-ctl-scl, .tc-ctl-ss')?.className ?? '',
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    );
    expect(topmost).toContain('tc-ctl-sb');
  });
});
