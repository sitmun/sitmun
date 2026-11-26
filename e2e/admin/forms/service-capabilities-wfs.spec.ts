import { test, expect } from '../fixtures';
import { control, dismissBlockingOverlays, gotoCreateForm } from '../helpers/form';

// Served by e2e/scripts/e2e-wms-stub.mjs. The backend fetches it; nothing is stubbed in the browser.
const WFS_STUB_URL = 'http://127.0.0.1:18093/wfs';

async function selectServiceTypeWfs(page: import('@playwright/test').Page): Promise<void> {
  const typeSelect = control(page, 'type');
  await typeSelect.scrollIntoViewIfNeeded();
  await dismissBlockingOverlays(page);
  // Required-marker span in mdc-notched-outline covers the type mat-select trigger.
  await typeSelect.locator('.mat-mdc-select-trigger').click({ force: true });
  const option = page.getByRole('option', { name: 'WFS', exact: true });
  await option.waitFor({ state: 'visible', timeout: 15_000 });
  await option.click();
  await expect(typeSelect.locator('.mat-mdc-select-value-text')).toContainText('WFS');
}

test.describe('Service form WFS capabilities', () => {
  test('reads WFS service details through the backend helper (#382)', async ({ page }) => {
    await gotoCreateForm(page, '/#/service/-1/serviceForm', 'name');
    await selectServiceTypeWfs(page);
    await control(page, 'serviceURL').fill(WFS_STUB_URL);

    const helper = page.waitForResponse(
      (response) => /\/helpers\/capabilities/.test(response.url()) && response.request().method() === 'POST',
    );
    await page.locator('.sitmun-service-form-metadata-button').click();
    const dialog = page.locator('mat-dialog-container');
    await expect(dialog).toBeVisible();
    await dialog.locator('button').filter({ has: page.locator('mat-icon', { hasText: 'check' }) }).click();

    const response = await helper;
    expect(response.status(), await response.text()).toBe(200);
    await expect(control(page, 'name')).toHaveValue('E2E WFS stub', { timeout: 15_000 });
    await expect(control(page, 'description')).toHaveValue('E2E WFS capabilities stub');
  });

  test('lists the WFS feature types through the backend helper (#382)', async ({ page }) => {
    await gotoCreateForm(page, '/#/service/-1/serviceForm', 'name');
    await selectServiceTypeWfs(page);
    await control(page, 'serviceURL').fill(WFS_STUB_URL);
    await page.getByRole('tab', { name: 'Feature types', exact: true }).click();

    const helper = page.waitForResponse(
      (response) => /\/helpers\/capabilities/.test(response.url()) && response.request().method() === 'POST',
    );
    await page.locator('#capabilitiesButton').click();
    const dialog = page.locator('mat-dialog-container');
    await expect(dialog).toBeVisible();
    await dialog.locator('button').filter({ has: page.locator('mat-icon', { hasText: 'check' }) }).click();

    const response = await helper;
    expect(response.status(), await response.text()).toBe(200);
    await expect(
      page.getByRole('tabpanel').locator('.ag-row').filter({ hasText: 'e2e_wfs_point' }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
