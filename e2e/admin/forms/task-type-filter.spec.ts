import { test, expect } from '../fixtures';

const ADMIN_HEADERS = { 'X-SITMUN-Client': 'admin' };
// sitmun-admin/src/environments/constants.ts taskLocatorTypeId
const LOCATOR_TYPE_ID = 4;

test.describe('Task lists filtered by type', () => {
  test('Tarea → Localizador lists only locator tasks (#372)', async ({ page, request }) => {
    const response = await request.get('/backend/api/tasks?projection=view&size=10000', { headers: ADMIN_HEADERS });
    expect(response.ok(), `GET tasks: ${response.status()}`).toBeTruthy();
    const tasks = ((await response.json())._embedded?.tasks ?? []) as Array<{ name: string; typeId: number }>;
    const locator = tasks.find((task) => task.typeId === LOCATOR_TYPE_ID);
    const other = tasks.find(
      (task) => task.typeId !== LOCATOR_TYPE_ID && !tasks.some((t) => t.typeId === LOCATOR_TYPE_ID && t.name === task.name),
    );
    expect(locator, 'seed has a locator task').toBeTruthy();
    expect(other, 'seed has a task of another type').toBeTruthy();

    const listed = page.waitForResponse(
      (r) => /\/api\/tasks\?/.test(r.url()) && r.url().includes(`type.id=${LOCATOR_TYPE_ID}`),
    );
    await page.goto('/#/tasksLocator');
    await listed;
    const rows = page.locator('.ag-center-cols-container .ag-row');
    const search = page.getByLabel('Search', { exact: true });

    await search.fill(locator!.name);
    await search.press('End');
    await expect(rows.filter({ hasText: locator!.name }).first()).toBeVisible({ timeout: 10_000 });

    await search.fill(other!.name);
    await search.press('End');
    // Wait until the new search has applied before checking what it found.
    await expect(rows.filter({ hasText: locator!.name })).toHaveCount(0);
    await expect(rows.filter({ hasText: other!.name }), `${other!.name} is not a locator`).toHaveCount(0);
  });
});
