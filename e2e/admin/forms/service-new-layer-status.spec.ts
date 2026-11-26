import { test, expect } from '../fixtures';
import { control, dismissBlockingOverlays, gotoCreateForm, waitForFormReady } from '../helpers/form';
import type { APIRequestContext, Locator, Page } from '@playwright/test';

// Served by e2e/scripts/e2e-wms-stub.mjs; the backend fetches the capabilities.
const STUB = 'http://127.0.0.1:18093';

async function selectServiceType(page: Page, type: 'WMS' | 'WFS'): Promise<void> {
  const typeSelect = control(page, 'type');
  await typeSelect.scrollIntoViewIfNeeded();
  await dismissBlockingOverlays(page);
  // Required-marker span in mdc-notched-outline covers the type mat-select trigger.
  await typeSelect.locator('.mat-mdc-select-trigger').click({ force: true });
  const option = page.getByRole('option', { name: type, exact: true });
  await option.waitFor({ state: 'visible', timeout: 15_000 });
  await option.click();
  await expect(typeSelect.locator('.mat-mdc-select-value-text')).toContainText(type);
}

const CASES = [
  { type: 'WMS', url: `${STUB}/wms`, tab: 'Layers', label: 'Unregistered layer' },
  { type: 'WFS', url: `${STUB}/wfs`, tab: 'Feature types', label: 'Unregistered feature type' },
] as const;

const ADMIN_HEADERS = { 'X-SITMUN-Client': 'admin', 'Content-Type': 'application/json' };

function idFrom(location: string | undefined, collection: string): number {
  const match = location?.match(new RegExp(`/${collection}/(\\d+)`));
  expect(match, `Location header for ${collection}: ${location}`).toBeTruthy();
  return Number(match![1]);
}

/** AG Grid keeps rows absolutely positioned; DOM order is not display order. */
function rowAt(panel: Locator, index: number): Locator {
  return panel.locator(`.ag-center-cols-container .ag-row[row-index="${index}"]`);
}

async function editAbstract(row: Locator, text: string): Promise<void> {
  const cell = row.locator('[col-id="description"]');
  await cell.dblclick();
  const input = cell.locator('input, textarea').first();
  await input.fill(text);
  await input.press('Enter');
  await expect(cell).toContainText(text);
}

async function deleteSelected(page: Page, panel: Locator): Promise<void> {
  await panel.locator('button').filter({ has: page.locator('mat-icon', { hasText: 'delete' }) }).first().click();
}

type CreatedResources = Array<{ collection: string; id: number }>;

/** New WMS service with its capabilities layers fetched into the Layers tab, not saved. */
async function newWmsServiceWithLayers(page: Page) {
  await gotoCreateForm(page, '/#/service/-1/serviceForm', 'name');
  await control(page, 'name').fill(`e2e-371-${Date.now()}`);
  await selectServiceType(page, 'WMS');
  await control(page, 'serviceURL').fill(`${STUB}/wms`);
  await page.getByRole('tab', { name: 'Layers', exact: true }).click();
  await page.locator('#capabilitiesButton').click();
  const dialog = page.locator('mat-dialog-container');
  await dialog.locator('button').filter({ has: page.locator('mat-icon', { hasText: 'check' }) }).click();
  const panel = page.getByRole('tabpanel');
  const rows = panel.locator('.ag-center-cols-container .ag-row');
  await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  expect(await rows.count()).toBeGreaterThan(1);
  return { panel, rows };
}

async function registerRow(page: Page, panel: Locator, row: Locator): Promise<string> {
  const name = (await row.locator('[col-id="name"]').innerText()).trim();
  await row.locator('.ag-checkbox-input').check();
  await panel
    .locator('button')
    .filter({ has: page.locator('mat-icon', { hasText: 'add_circle_outline' }) })
    .first()
    .click();
  return name;
}

/** Records cartography writes and failed API calls, and queues created rows for cleanup. */
function trackLayerWrites(page: Page, createdResources: CreatedResources) {
  const created: string[] = [];
  const otherWrites: string[] = [];
  const failures: string[] = [];
  page.on('response', (response) => {
    const method = response.request().method();
    const url = response.url();
    if (/\/api\//.test(url) && response.status() >= 400) failures.push(`${method} ${response.status()} ${url}`);
    if (method === 'GET' || !response.ok()) return;
    const location = response.headers().location;
    const service = method === 'POST' && /\/api\/services(\?|$)/.test(url) && location?.match(/\/services\/(\d+)/);
    if (service) createdResources.push({ collection: 'services', id: Number(service[1]) });
    if (/\/api\/cartographies(\/|\?|$)/.test(url)) {
      if (method === 'POST' && /\/api\/cartographies(\?|$)/.test(url)) {
        const id = location?.match(/\/cartographies\/(\d+)/);
        if (id) createdResources.push({ collection: 'cartographies', id: Number(id[1]) });
        created.push(url);
      } else {
        otherWrites.push(`${method} ${url}`);
      }
    }
  });
  return { created, otherWrites, failures };
}


test.describe('New service fetched layers', () => {
  for (const { type, url, tab, label } of CASES) {
    test(`${type}: fetched layers are unregistered, not pending creation (#371)`, async ({ page }) => {
      await gotoCreateForm(page, '/#/service/-1/serviceForm', 'name');
      await selectServiceType(page, type);
      await control(page, 'serviceURL').fill(url);
      await page.getByRole('tab', { name: tab, exact: true }).click();

      await page.locator('#capabilitiesButton').click();
      const dialog = page.locator('mat-dialog-container');
      await expect(dialog).toBeVisible();
      await dialog.locator('button').filter({ has: page.locator('mat-icon', { hasText: 'check' }) }).click();

      const dots = page.getByRole('tabpanel').locator('.ag-center-cols-container .ag-row .sitmun-status-dot');
      await expect(dots.first()).toBeVisible({ timeout: 15_000 });
      const labels = await dots.evaluateAll((spans) => spans.map((span) => span.getAttribute('aria-label')));
      expect(labels.length).toBeGreaterThan(0);
      expect(labels, 'every fetched row is unregistered until Registrar').toEqual(labels.map(() => label));
    });
  }

  test('saving a new service creates only the registered layer (#371)', async ({ page, createdResources }) => {
    const { panel } = await newWmsServiceWithLayers(page);
    const registered = await registerRow(page, panel, rowAt(panel, 0));
    const writes = trackLayerWrites(page, createdResources);
    await page.getByTestId('form-save').click();

    // The registered row becomes a link to its layer once the layers are saved.
    await expect(panel.getByRole('link', { name: registered, exact: true })).toBeVisible({ timeout: 15_000 });
    expect(writes.created, 'only the registered row is created').toHaveLength(1);
    expect(writes.otherWrites).toEqual([]);
    expect(writes.failures).toEqual([]);
    await expect(panel.locator('.sitmun-status-dot').first()).toHaveAttribute('aria-label', 'Unregistered layer');
  });

  test('a new service: an edited, registered row is created with the edit (#371)', async ({ page, createdResources }) => {
    const { panel } = await newWmsServiceWithLayers(page);
    await editAbstract(rowAt(panel, 0), 'e2e edited abstract');
    await registerRow(page, panel, rowAt(panel, 0));
    const bodies: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && /\/api\/cartographies(\?|$)/.test(request.url())) bodies.push(request.postData() ?? '');
    });
    const writes = trackLayerWrites(page, createdResources);
    await page.getByTestId('form-save').click();

    await expect.poll(() => writes.created.length, { timeout: 15_000 }).toBe(1);
    expect(bodies[0]).toContain('e2e edited abstract');
    expect(writes.otherWrites).toEqual([]);
    expect(writes.failures).toEqual([]);
  });

  test('a new service: an edited, unregistered row is neither created nor updated (#371)', async ({
    page,
    createdResources,
  }) => {
    const { panel } = await newWmsServiceWithLayers(page);
    await editAbstract(rowAt(panel, 1), 'e2e not registered');
    const registered = await registerRow(page, panel, rowAt(panel, 0));
    const writes = trackLayerWrites(page, createdResources);
    await page.getByTestId('form-save').click();

    await expect(panel.getByRole('link', { name: registered, exact: true })).toBeVisible({ timeout: 15_000 });
    expect(writes.created).toHaveLength(1);
    expect(writes.otherWrites).toEqual([]);
    expect(writes.failures).toEqual([]);
  });

  test('a new service: a removed, unregistered row is not deleted on save (#371)', async ({ page, createdResources }) => {
    const { panel } = await newWmsServiceWithLayers(page);
    await rowAt(panel, 1).locator('.ag-checkbox-input').check();
    await deleteSelected(page, panel);
    await expect(rowAt(panel, 1).locator('.sitmun-status-dot')).toHaveAttribute('aria-label', 'Pending delete');
    // Removing keeps the row selected; Registrar would register it too.
    await rowAt(panel, 1).locator('.ag-checkbox-input').uncheck();
    const registered = await registerRow(page, panel, rowAt(panel, 0));
    const writes = trackLayerWrites(page, createdResources);
    await page.getByTestId('form-save').click();

    await expect(panel.getByRole('link', { name: registered, exact: true })).toBeVisible({ timeout: 15_000 });
    expect(writes.created).toHaveLength(1);
    expect(writes.otherWrites, 'nothing to delete for a row that was never created').toEqual([]);
    expect(writes.failures).toEqual([]);
  });
});

test.describe('Saved service layers', () => {
  async function savedServiceWithLayer(page: Page, request: APIRequestContext, createdResources: CreatedResources) {
    const service = await request.post('/backend/api/services', {
      headers: ADMIN_HEADERS,
      data: { name: `e2e-371-saved-${Date.now()}`, type: 'WMS', serviceURL: `${STUB}/wms`, blocked: false, isProxied: false },
    });
    expect(service.ok(), await service.text()).toBeTruthy();
    const serviceId = idFrom(service.headers().location, 'services');
    createdResources.push({ collection: 'services', id: serviceId });
    const layer = await request.post('/backend/api/cartographies', {
      headers: ADMIN_HEADERS,
      data: {
        name: `e2e-371-layer-${Date.now()}`,
        layers: ['e2e_371_layer'],
        queryableFeatureAvailable: false,
        queryableFeatureEnabled: false,
        useAllStyles: false,
        blocked: false,
        service: `http://localhost:18080/api/services/${serviceId}`,
      },
    });
    expect(layer.ok(), await layer.text()).toBeTruthy();
    const layerId = idFrom(layer.headers().location, 'cartographies');
    createdResources.push({ collection: 'cartographies', id: layerId });

    await page.goto(`/#/service/${serviceId}/serviceForm`);
    await waitForFormReady(page, 'name');
    await page.getByRole('tab', { name: 'Layers', exact: true }).click();
    const panel = page.getByRole('tabpanel');
    const row = panel.locator('.ag-center-cols-container .ag-row').first();
    await expect(row).toBeVisible({ timeout: 15_000 });
    return { panel, row, layerId };
  }

  test('updating a registered layer saves the edit', async ({ page, request, createdResources }) => {
    const { row, layerId } = await savedServiceWithLayer(page, request, createdResources);
    await editAbstract(row, 'e2e saved edit');
    await expect(row.locator('.sitmun-status-dot')).toHaveAttribute('aria-label', 'Pending modify');
    const writes = trackLayerWrites(page, createdResources);
    await page.getByTestId('form-save').click();

    await expect.poll(() => writes.otherWrites.length, { timeout: 15_000 }).toBeGreaterThan(0);
    expect(writes.created).toEqual([]);
    expect(writes.failures).toEqual([]);
    await expect
      .poll(async () => (await (await request.get(`/backend/api/cartographies/${layerId}`, { headers: ADMIN_HEADERS })).json()).description)
      .toBe('e2e saved edit');
  });

  test('removing a registered layer deletes it', async ({ page, request, createdResources }) => {
    const { panel, row, layerId } = await savedServiceWithLayer(page, request, createdResources);
    await row.locator('.ag-checkbox-input').check();
    await deleteSelected(page, panel);
    const writes = trackLayerWrites(page, createdResources);
    await page.getByTestId('form-save').click();

    await expect
      .poll(async () => (await request.get(`/backend/api/cartographies/${layerId}`, { headers: ADMIN_HEADERS })).status(), {
        timeout: 15_000,
      })
      .toBe(404);
    expect(writes.otherWrites.some((write) => write.startsWith('DELETE'))).toBe(true);
    expect(writes.created).toEqual([]);
    expect(writes.failures).toEqual([]);
  });
});
