import { test, expect } from '../fixtures';
import { waitForFormReady } from '../helpers/form';

const ADMIN_HEADERS = { 'X-SITMUN-Client': 'admin', 'Content-Type': 'application/json' };
// Served by e2e/scripts/e2e-wms-stub.mjs: an XML Schema with no `xsd:` prefix, as INSPIRE servers send.
const INSPIRE_WFS_URL = 'http://127.0.0.1:18093/wfs-inspire';
const TYPE_NAME = 'e2e_inspire_point';
const FEATURE_INFORMATION_TAB = 'Feature information';

function idFromLocation(location: string | undefined, collection: string): number {
  const match = location?.match(new RegExp(`/${collection}/(\\d+)`));
  expect(match, `Location header for ${collection}: ${location}`).toBeTruthy();
  return Number(match![1]);
}

test.describe('Layer form feature information', () => {
  test('loads properties from a schema whose root has no prefix (#419)', async ({
    page,
    request,
    createdResources,
  }) => {
    const service = await request.post('/backend/api/services', {
      headers: ADMIN_HEADERS,
      data: {
        name: `e2e-inspire-${Date.now()}`,
        type: 'WFS',
        serviceURL: INSPIRE_WFS_URL,
        blocked: false,
        isProxied: false,
      },
    });
    expect(service.ok(), `create service: ${service.status()} ${await service.text()}`).toBeTruthy();
    const serviceId = idFromLocation(service.headers().location, 'services');
    createdResources.push({ collection: 'services', id: serviceId });

    const layer = await request.post('/backend/api/cartographies', {
      headers: ADMIN_HEADERS,
      data: {
        name: `e2e-inspire-layer-${Date.now()}`,
        layers: [TYPE_NAME],
        queryableFeatureAvailable: false,
        queryableFeatureEnabled: false,
        useAllStyles: false,
        blocked: false,
        service: `http://localhost:18080/api/services/${serviceId}`,
      },
    });
    expect(layer.ok(), `create layer: ${layer.status()} ${await layer.text()}`).toBeTruthy();
    const layerId = idFromLocation(layer.headers().location, 'cartographies');
    createdResources.push({ collection: 'cartographies', id: layerId });

    await page.goto(`/#/layers/${layerId}/layersForm`);
    await waitForFormReady(page, 'name');
    await page.getByRole('tab', { name: FEATURE_INFORMATION_TAB, exact: true }).click();

    const helper = page.waitForResponse((response) => /\/helpers\/feature-type/.test(response.url()));
    await page.locator('#featureInfoSeedButton').click();
    const dialog = page.locator('mat-dialog-container');
    await expect(dialog).toBeVisible();
    await dialog.locator('button').filter({ has: page.locator('mat-icon', { hasText: 'check' }) }).click();

    const response = await helper;
    expect(response.status(), await response.text()).toBe(200);
    const panel = page.getByRole('tabpanel');
    for (const name of ['code', 'place', 'geom']) {
      await expect(panel.locator('.ag-row').filter({ hasText: name }).first()).toBeVisible({ timeout: 15_000 });
    }
    await expect(panel.getByText('The WFS feature type could not be read')).toHaveCount(0);
  });
});
