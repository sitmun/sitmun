import { expect, test } from '@playwright/test';
import { QUERYABLE_LEAF_CARTOGRAPHY_ID, QUERYABLE_LEAF_NODE_ID } from './fixtures';
import {
  identifyAtMapCenter,
  loadQueryableLeafIntoCapas,
  loginAndOpenMap,
} from './helpers/mia';

const LAYER_NAME = '34_TOPO_TX';

type ProfileBody = {
  layers?: Array<{ layers?: string[]; queryableFeatureEnabled?: boolean }>;
  trees?: Array<{ nodes?: Record<string, { queryableActive?: boolean }> }>;
  tasks?: Array<Record<string, unknown>>;
};

/**
 * Tree node Consultable off (`queryableActive = false`) blocks map-click
 * GetFeatureInfo even when the cartography allows it (#377).
 */
test.describe('GetFeatureInfo tree node Consultable', () => {
  test('node with Consultable off sends no GetFeatureInfo on identify', async ({ page }) => {
    // The viewer service worker fetches the profile. page.route does not see that.
    await page.context().route(/\/config\/client\/profile\//, async (route) => {
      const response = await route.fetch();
      const body = (await response.json()) as ProfileBody;
      const node = body.trees
        ?.map((tree) => tree.nodes?.[QUERYABLE_LEAF_NODE_ID])
        .find((item) => item !== undefined);
      if (!node) {
        throw new Error(`profile has no tree node ${QUERYABLE_LEAF_NODE_ID}`);
      }
      node.queryableActive = false;
      // Drop the seeded MIA parent so only the GetFeatureInfo gate decides.
      body.tasks = (body.tasks ?? []).filter(
        (task) =>
          !(
            task['typeId'] === 16 &&
            String(task['cartographyId']) === String(QUERYABLE_LEAF_CARTOGRAPHY_ID)
          ),
      );
      await route.fulfill({
        status: response.status(),
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });

    const profileSeen = page.waitForResponse(
      (response) => response.url().includes('/config/client/profile/') && response.ok(),
    );
    await loginAndOpenMap(page, { requireMiaParent: false });
    const profileBody = (await (await profileSeen).json()) as ProfileBody;
    const layer = profileBody.layers?.find((item) => item.layers?.includes(LAYER_NAME));
    expect(layer?.queryableFeatureEnabled, 'cartography must allow GFI').not.toBe(false);

    await loadQueryableLeafIntoCapas(page);
    await expect(page.locator('#tc-slot-wlm .sitmun-wlm-gfi')).toHaveCount(0);

    const gfiUrls: string[] = [];
    page.on('request', (request) => {
      if (/REQUEST=GetFeatureInfo/i.test(request.url())) {
        gfiUrls.push(request.url());
      }
    });
    await identifyAtMapCenter(page);

    expect(gfiUrls.filter((url) => url.includes(LAYER_NAME))).toEqual([]);
    await expect(
      page.locator('.tc-ctl-popup .tc-ctl-finfo-layers table'),
    ).toHaveCount(0);
  });
});
