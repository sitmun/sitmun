import { test, expect } from '../fixtures';
import { control, dismissBlockingOverlays, gotoCreateForm } from '../helpers/form';
import type { Page } from '@playwright/test';

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
    const registered = (await rows.first().locator('[col-id="name"]').innerText()).trim();
    await rows.first().locator('.ag-checkbox-input').check();
    await panel
      .locator('button')
      .filter({ has: page.locator('mat-icon', { hasText: 'add_circle_outline' }) })
      .first()
      .click();

    const created: string[] = [];
    page.on('response', (response) => {
      if (response.request().method() !== 'POST' || !response.ok()) return;
      const location = response.headers().location;
      const service = /\/api\/services(\?|$)/.test(response.url()) && location?.match(/\/services\/(\d+)/);
      if (service) createdResources.push({ collection: 'services', id: Number(service[1]) });
      if (/\/api\/cartographies(\?|$)/.test(response.url())) {
        const id = location?.match(/\/cartographies\/(\d+)/);
        if (id) createdResources.push({ collection: 'cartographies', id: Number(id[1]) });
        created.push(response.url());
      }
    });
    await page.getByTestId('form-save').click();

    // The registered row becomes a link to its layer once the layers are saved.
    await expect(panel.getByRole('link', { name: registered, exact: true })).toBeVisible({ timeout: 15_000 });
    expect(created, 'only the registered row is created').toHaveLength(1);
    await expect(panel.locator('.sitmun-status-dot').first()).toHaveAttribute('aria-label', 'Unregistered layer');
  });
});
