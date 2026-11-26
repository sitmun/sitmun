import { test, expect } from '../fixtures';
import { waitForFormReady } from '../helpers/form';

const ADMIN_HEADERS = { 'X-SITMUN-Client': 'admin', 'Content-Type': 'application/json' };
const LAYER_NAME = 'E2E.Styles384';
const STYLE_NAMES = ['default', 'border', 'label'];

const CAPABILITIES_STUB = {
  success: true,
  type: 'OGC:WMS 1.3.0',
  asJson: {
    WMS_Capabilities: {
      version: '1.3.0',
      Service: { Title: 'E2E styles', Abstract: 'E2E capabilities stub' },
      Capability: {
        Layer: {
          CRS: ['EPSG:25831'],
          Layer: {
            Name: LAYER_NAME,
            Title: 'E2E layer with three styles',
            Style: STYLE_NAMES.map((name) => ({ Name: name, Title: name })),
          },
        },
      },
    },
  },
};

function idFromLocation(location: string | undefined, collection: string): number {
  const match = location?.match(new RegExp(`/${collection}/(\\d+)`));
  expect(match, `Location header for ${collection}: ${location}`).toBeTruthy();
  return Number(match![1]);
}

test.describe('Service form layer registration', () => {
  test('stores every advertised style of a registered WMS layer (#384)', async ({
    page,
    request,
    createdResources,
  }) => {
    const created = await request.post('/backend/api/services', {
      headers: ADMIN_HEADERS,
      data: {
        name: `e2e-styles-${Date.now()}`,
        type: 'WMS',
        serviceURL: 'https://example.org/e2e-384/wms',
        blocked: false,
        isProxied: false,
      },
    });
    expect(created.ok(), `create service: ${created.status()} ${await created.text()}`).toBeTruthy();
    const serviceId = idFromLocation(created.headers().location, 'services');
    createdResources.push({ collection: 'services', id: serviceId });

    await page.route('**/helpers/capabilities**', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CAPABILITIES_STUB) });
    });
    const styleResponses: number[] = [];
    page.on('response', (response) => {
      const request = response.request();
      if (request.method() !== 'POST') return;
      if (/\/api\/cartography-styles(\?|$)/.test(response.url())) styleResponses.push(response.status());
      if (/\/api\/cartographies(\?|$)/.test(response.url()) && response.ok()) {
        createdResources.push({
          collection: 'cartographies',
          id: idFromLocation(response.headers().location, 'cartographies'),
        });
      }
    });

    await page.goto(`/#/service/${serviceId}/serviceForm`);
    await waitForFormReady(page, 'name');
    await page.getByRole('tab', { name: 'Layers', exact: true }).click();

    await page.locator('#capabilitiesButton').click();
    const dialog = page.locator('mat-dialog-container');
    await dialog.locator('button').filter({ has: page.locator('mat-icon', { hasText: 'check' }) }).click();

    const panel = page.getByRole('tabpanel');
    const row = panel.locator('.ag-row').filter({ hasText: LAYER_NAME });
    await expect(row.first()).toBeVisible({ timeout: 15_000 });
    await row.first().locator('.ag-checkbox-input').check();
    await panel
      .locator('button')
      .filter({ has: page.locator('mat-icon', { hasText: 'add_circle_outline' }) })
      .first()
      .click();

    await page.getByTestId('form-save').click();

    await expect
      .poll(() => styleResponses.length, { timeout: 15_000, message: 'POST /api/cartography-styles' })
      .toBe(STYLE_NAMES.length);
    expect(styleResponses.every((status) => status >= 200 && status < 300), `statuses ${styleResponses}`).toBe(true);
  });
});
