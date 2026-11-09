import { expect, test, type CreatedResource, type Page } from '../fixtures';
import { dismissBlockingOverlays, gotoCreateForm, saveAndCaptureId } from '../helpers/form';

const LOCALES = ['ca', 'en', 'es', 'fr', 'oc-aranes'] as const;

test.describe('SQL query task test', () => {
  test('undeclared placeholder blocks Test, a declared parameter and a save unblock it, and an edit blocks it again', async ({
    page,
    createdResources,
  }) => {
    await openSqlQuery(page);
    await page.locator('[data-testid=sql-editor] .cm-content').click();
    await page.keyboard.type('SELECT ${p} AS echo');
    await expect(page.getByTestId('sql-test')).toBeDisabled();
    await expect(page.getByTestId('sql-test-block')).toContainText('p');
    await expect(page.getByTestId('sql-test-block')).not.toContainText('UNDECLARED');

    await addParameter(page, 'p', 'Echo');
    await openDetails(page);
    await expect(page.getByTestId('sql-test')).toBeDisabled();
    await expect(page.getByTestId('sql-test-save-first')).toBeVisible();
    await saveSqlTask(page, createdResources);
    await expect(page.getByTestId('sql-test-save-first')).toHaveCount(0);
    await expect(page.getByTestId('sql-test')).toBeEnabled();
    await page.getByTestId('sql-test').click();
    const testDialog = page.locator('mat-dialog-container').getByTestId('sql-test-dialog');
    await expect(testDialog).toBeVisible();
    await testDialog.getByTestId('sql-client-p').fill('hi');
    await testDialog.getByTestId('sql-test-run').click();
    await expect(page.getByTestId('sql-run-Run 1 as written')).toContainText('SELECT ? AS echo');
    const values = page.getByTestId('sql-run-Run 1 as written').locator('.sql-run-grid').first();
    await expect(values).toContainText('1');
    await expect(values).toContainText('hi');
    await testDialog.getByRole('tab').nth(1).click();
    await expect(page.getByTestId('sql-run-Run 2 one page')).toBeVisible();

    await page.keyboard.press('Escape');
    await page.locator('[data-testid=sql-editor] .cm-content').click();
    await page.keyboard.type(' ');
    await expect(page.getByTestId('sql-test')).toBeDisabled();
    await expect(page.getByTestId('sql-test-save-first')).toBeVisible();
    await expect(page.getByTestId('form-save')).toBeEnabled();
  });

  test('invalid placeholders are underlined and named', async ({ page }) => {
    await openSqlQuery(page);
    await page.locator('[data-testid=sql-editor] .cm-content').click();
    await page.keyboard.type("SELECT parcels_${x}, 'a${p}' FROM t");
    await expect(page.locator('.cm-sql-invalid')).toHaveCount(2);
    const problems = page.getByTestId('sql-test-block');
    await expect(problems).toContainText('x');
    await expect(problems).toContainText('p');
    await expect(problems).not.toContainText('NAME_PART');
    await expect(problems).not.toContainText('PARTIAL_LITERAL');
  });

  test('the add-parameter dialog rejects a reserved name and a blank provided value', async ({ page }) => {
    await openSqlQuery(page);
    const dialog = await openParameterDialog(page);
    await dialog.locator('[formControlName=name]').fill('limit');
    await dialog.locator('[formControlName=label]').fill('Limit');
    await confirmParameterDialog(dialog);
    await expect(dialog.locator('mat-error')).toContainText('limit');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');

    await dialog.locator('[formControlName=name]').fill('secret');
    await dialog.locator('[formControlName=provided]').click();
    await dialog.locator('[formControlName=value]').fill('');
    await confirmParameterDialog(dialog);
    await expect(dialog.locator('mat-error')).toBeVisible();
    await expect(dialog).toBeVisible();
  });

  test('a query that returns more than the row cap shows the truncation notice', async ({ page, createdResources }) => {
    await openSqlQuery(page);
    const sql = process.env.SITMUN_E2E_DATASOURCE_URL
      ? 'SELECT g AS id FROM generate_series(1, 1001) AS g'
      : 'SELECT X AS id FROM SYSTEM_RANGE(1, 1001)';
    await page.locator('[data-testid=sql-editor] .cm-content').click();
    await page.keyboard.type(sql);
    await saveSqlTask(page, createdResources);
    await page.getByTestId('sql-test').click();
    const testDialog = page.locator('mat-dialog-container').getByTestId('sql-test-dialog');
    await testDialog.getByTestId('sql-test-run').click();
    await expect(testDialog.getByTestId('sql-truncated')).toBeVisible();
  });

  test('a query that already pages fails the second run', async ({ page, createdResources }) => {
    await openSqlQuery(page);
    await page.locator('[data-testid=sql-editor] .cm-content').click();
    await page.keyboard.type('SELECT 1 AS n FETCH FIRST 5 ROWS ONLY');
    await saveSqlTask(page, createdResources);
    await expect(page.getByTestId('sql-test')).toBeEnabled();
    await page.getByTestId('sql-test').click();
    const testDialog = page.locator('mat-dialog-container').getByTestId('sql-test-dialog');
    await testDialog.getByTestId('sql-test-run').click();
    await expect(testDialog.getByTestId('sql-run-Run 1 as written')).toHaveAttribute('data-ok', 'true');
    await testDialog.getByRole('tab').nth(1).click();
    await expect(testDialog.getByTestId('sql-run-Run 2 one page')).toHaveAttribute('data-ok', 'false');
  });

  test('format inserts line breaks and keeps a system placeholder', async ({ page }) => {
    await openSqlQuery(page);
    await page.locator('[data-testid=sql-editor] .cm-content').click();
    await page.keyboard.type('SELECT #{USER_NAME} AS name FROM t WHERE #{USER_NAME} IS NOT NULL');
    await page.getByTestId('sql-format').click();
    const editor = page.locator('[data-testid=sql-editor]');
    await expect(editor.locator('.cm-line')).not.toHaveCount(1);
    await expect(editor).toContainText('#{USER_NAME}');
  });

  test('an empty result shows no rows in both runs', async ({ page, createdResources }) => {
    await openSqlQuery(page);
    await page.locator('[data-testid=sql-editor] .cm-content').click();
    await page.keyboard.type('SELECT 1 AS n WHERE 1 = 0');
    await saveSqlTask(page, createdResources);
    await page.getByTestId('sql-test').click();
    const testDialog = page.locator('mat-dialog-container').getByTestId('sql-test-dialog');
    await testDialog.getByTestId('sql-test-run').click();
    await expect(testDialog.getByTestId('sql-run-Run 1 as written')).toHaveAttribute('data-ok', 'true');
    await expect(testDialog.getByTestId('sql-run-Run 1 as written')).toContainText(/No rows\.|Sin filas\.|Sense files\.|Aucune ligne\.|Cap de linha\./);
    await testDialog.getByRole('tab').nth(1).click();
    await expect(testDialog.getByTestId('sql-run-Run 2 one page')).toHaveAttribute('data-ok', 'true');
    await expect(testDialog.getByTestId('sql-run-Run 2 one page')).toContainText(/No rows\.|Sin filas\.|Sense files\.|Aucune ligne\.|Cap de linha\./);
  });

  test('a provided parameter shows its stored value and binds it', async ({ page, createdResources }) => {
    await openSqlQuery(page);
    await page.locator('[data-testid=sql-editor] .cm-content').click();
    await page.keyboard.type('SELECT ${secret} AS echo');
    await addProvidedParameter(page, 'secret', 'Secret', 'kept');
    await openDetails(page);
    await saveSqlTask(page, createdResources);
    await page.getByTestId('sql-test').click();
    const testDialog = page.locator('mat-dialog-container').getByTestId('sql-test-dialog');
    await expect(testDialog).toContainText('secret: kept');
    await expect(testDialog.getByTestId('sql-client-secret')).toHaveCount(0);
    await testDialog.getByTestId('sql-test-run').click();
    await expect(testDialog.getByTestId('sql-run-Run 1 as written')).toContainText('SELECT ? AS echo');
    await expect(testDialog.getByTestId('sql-run-Run 1 as written').locator('.sql-run-grid').first()).toContainText('kept');
  });

  test('the requested page is appended only to the second run', async ({ page, createdResources }) => {
    await openSqlQuery(page);
    await page.locator('[data-testid=sql-editor] .cm-content').click();
    await page.keyboard.type('SELECT 1 AS n');
    await saveSqlTask(page, createdResources);
    await page.getByTestId('sql-test').click();
    const testDialog = page.locator('mat-dialog-container').getByTestId('sql-test-dialog');
    await testDialog.getByTestId('sql-limit').fill('2');
    await testDialog.getByTestId('sql-offset').fill('1');
    await testDialog.getByTestId('sql-test-run').click();
    await expect(testDialog.getByTestId('sql-run-Run 1 as written')).not.toContainText('OFFSET');
    await testDialog.getByRole('tab').nth(1).click();
    await expect(testDialog.getByTestId('sql-run-Run 2 one page')).toContainText('OFFSET 1 ROWS FETCH NEXT 2 ROWS ONLY');
  });

  test('an unused parameter keeps Test disabled', async ({ page }) => {
    await openSqlQuery(page);
    await page.locator('[data-testid=sql-editor] .cm-content').click();
    await page.keyboard.type('SELECT 1 AS n');
    await addParameter(page, 'extra', 'Extra');
    await openDetails(page);
    await expect(page.getByTestId('sql-test')).toBeDisabled();
  });

  test('an unknown table fails both runs', async ({ page, createdResources }) => {
    await openSqlQuery(page);
    await page.locator('[data-testid=sql-editor] .cm-content').click();
    await page.keyboard.type('SELECT * FROM table_that_does_not_exist');
    await saveSqlTask(page, createdResources);
    await page.getByTestId('sql-test').click();
    const testDialog = page.locator('mat-dialog-container').getByTestId('sql-test-dialog');
    await testDialog.getByTestId('sql-test-run').click();
    await expect(testDialog.getByTestId('sql-run-Run 1 as written')).toHaveAttribute('data-ok', 'false');
    await expect(testDialog.getByTestId('sql-run-Run 1 as written').locator('textarea').last()).not.toHaveValue('');
    await testDialog.getByRole('tab').nth(1).click();
    await expect(testDialog.getByTestId('sql-run-Run 2 one page')).toHaveAttribute('data-ok', 'false');
    await expect(testDialog.getByTestId('sql-run-Run 2 one page').locator('textarea').last()).not.toHaveValue('');
  });

  test('the test dialog has no raw translation keys in any locale', async ({ page, createdResources }) => {
    await openSqlQuery(page);
    await page.locator('[data-testid=sql-editor] .cm-content').click();
    await page.keyboard.type('SELECT 1 AS n');
    const id = await saveSqlTask(page, createdResources);
    for (const locale of LOCALES) {
      await page.evaluate((lang) => localStorage.setItem('lang', lang), locale);
      await page.goto(`/#/taskQuery/${id}/5`);
      await page.reload();
      await expect(page.getByTestId('sql-test')).toBeEnabled();
      await page.getByTestId('sql-test').click();
      const dialog = page.locator('mat-dialog-container').getByTestId('sql-test-dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).not.toContainText('entity.task.query.');
      await page.keyboard.press('Escape');
    }
  });

  test('the save-first hint has no raw translation key in any locale', async ({ page }) => {
    for (const locale of LOCALES) {
      await page.addInitScript((lang) => {
        localStorage.setItem('lang', lang);
      }, locale);
      await openSqlQuery(page);
      await expect(page.getByTestId('sql-test-save-first')).toBeVisible();
      await expect(page.getByTestId('sql-test-save-first')).not.toContainText('entity.task.query.');
    }
  });
});

async function openSqlQuery(page: Page): Promise<void> {
  const connectionName = await ensureConnection(page);
  await gotoCreateForm(page, '/#/taskQuery/-1/5', 'name');
  await page.locator('[formControlName=name]').fill(`e2e-sql-${Date.now()}`);
  await selectOption(page, 'scope', /sql/i);
  await selectOption(page, 'taskGroupId', /.+/);
  await selectOption(page, 'connectionId', new RegExp(escapeRegExp(connectionName), 'i'));
  await expect(page.getByTestId('sql-editor')).toBeVisible();
}

async function ensureConnection(page: Page): Promise<string> {
  const url = process.env.SITMUN_E2E_DATASOURCE_URL;
  if (!url) {
    return 'E2E H2 self (Plantilla SQL)';
  }
  const username = process.env.SITMUN_E2E_DATASOURCE_USERNAME;
  const password = process.env.SITMUN_E2E_DATASOURCE_PASSWORD;
  expect(username, 'SITMUN_E2E_DATASOURCE_USERNAME').toBeTruthy();
  expect(password, 'SITMUN_E2E_DATASOURCE_PASSWORD').toBeTruthy();
  const name = `e2e-pg16-${Date.now()}`;
  const created = await page.request.post('/backend/api/connections', {
    headers: { 'X-SITMUN-Client': 'admin', 'Content-Type': 'application/json' },
    data: {
      name,
      driver: 'org.postgresql.Driver',
      user: username,
      password,
      url,
    },
  });
  expect(created.ok(), await created.text()).toBeTruthy();
  return name;
}

async function saveSqlTask(page: Page, createdResources: CreatedResource[]): Promise<number> {
  const id = await saveAndCaptureId(page, 'tasks');
  createdResources.push({ collection: 'tasks', id });
  return id;
}

async function addParameter(page: Page, name: string, label: string): Promise<void> {
  const dialog = await openParameterDialog(page);
  await fillParameter(page, dialog, name, label);
  await confirmParameterDialog(dialog);
  await expect(dialog).toBeHidden();
}

async function addProvidedParameter(page: Page, name: string, label: string, value: string): Promise<void> {
  const dialog = await openParameterDialog(page);
  await fillParameter(page, dialog, name, label);
  await dialog.locator('[formControlName=value]').fill(value);
  await dialog.locator('[formControlName=provided]').click();
  await confirmParameterDialog(dialog);
  await expect(dialog).toBeHidden();
}

async function fillParameter(
  page: Page,
  dialog: ReturnType<Page['locator']>,
  name: string,
  label: string,
): Promise<void> {
  await dialog.locator('[formControlName=name]').fill(name);
  await dialog.locator('[formControlName=label]').fill(label);
  await dialog.locator('[formControlName=dataType]').click();
  await page.getByRole('option', { name: 'string' }).click();
}

async function openParameterDialog(page: Page) {
  await page.getByRole('tab', { name: /Parameters|Paràmetres|Parámetros|Paramètres/i }).click();
  const grid = page.locator('.mat-mdc-tab-body-active app-relation-grid');
  await expect(grid).toBeVisible();
  await grid
    .locator('button')
    .filter({ has: page.locator('mat-icon', { hasText: 'add_circle_outline' }) })
    .first()
    .click();
  const dialog = page.locator('mat-dialog-container').filter({ has: page.locator('[formControlName=name]') });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function confirmParameterDialog(dialog: ReturnType<Page['locator']>): Promise<void> {
  await dialog.locator('mat-dialog-actions button').filter({ hasText: 'add_circle_outline' }).click();
}

async function openDetails(page: Page): Promise<void> {
  await page.getByRole('tab', { name: /General information|Informació general|Información general|Informations générales|Informacions generalas/i }).click();
}

async function selectOption(page: Page, controlName: string, text: RegExp): Promise<void> {
  const select = page.locator(`[formControlName=${controlName}]`);
  await select.scrollIntoViewIfNeeded();
  await dismissBlockingOverlays(page);
  await select.locator('.mat-mdc-select-trigger').click({ force: true });
  const option = page.getByRole('option').filter({ hasText: text }).first();
  await option.waitFor({ state: 'visible' });
  await option.click();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
