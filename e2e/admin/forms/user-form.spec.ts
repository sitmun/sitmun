import { test, expect } from '../fixtures';
import {
  control,
  gotoCreateForm,
  saveAndCaptureId,
  saveUpdate,
  touchAndClear,
  uniqueValue,
  waitForFormReady,
} from '../helpers/form';

test.describe('User form', () => {
  test('keeps save enabled when username is cleared', async ({ page }) => {
    await gotoCreateForm(page, '/#/user/-1/userForm', 'username');
    await touchAndClear(page, 'username');
    await expect(page.getByTestId('form-save')).toBeEnabled();
  });

  test('creates and updates a user', async ({ page, createdResources }) => {
    const username = uniqueValue('e2euser').replace(/-/g, '').slice(0, 50);
    const firstName = uniqueValue('e2e-fn');

    await gotoCreateForm(page, '/#/user/-1/userForm', 'username');
    await control(page, 'username').fill(username);

    const id = await saveAndCaptureId(page, 'users');
    createdResources.push({ collection: 'users', id });

    await page.goto(`/#/user/${id}/userForm`);
    await waitForFormReady(page, 'username');
    await expect(control(page, 'username')).toHaveValue(username);

    await control(page, 'firstName').fill(firstName);
    await saveUpdate(page, 'users', id);

    await page.reload();
    await waitForFormReady(page, 'username');
    await expect(control(page, 'firstName')).toHaveValue(firstName);
  });

  test('keeps create password after password field refocus (#260)', async ({
    page,
    request,
    createdResources,
  }) => {
    const username = uniqueValue('e2epw').replace(/-/g, '').slice(0, 50);
    const password = `Pw-${crypto.randomUUID().slice(0, 12)}`;

    await gotoCreateForm(page, '/#/user/-1/userForm', 'username');
    await control(page, 'username').fill(username);

    const passwordField = control(page, 'newPassword');
    await passwordField.fill(password);
    await passwordField.blur();
    await passwordField.focus();
    await passwordField.blur();

    const postPromise = page.waitForResponse((response) => {
      try {
        const pathname = new URL(response.url()).pathname;
        return response.request().method() === 'POST' && pathname === '/backend/api/users';
      } catch {
        return false;
      }
    });

    await page.getByTestId('form-save').click();
    const postResponse = await postPromise;
    const postText = await postResponse.text();
    expect(
      postResponse.ok(),
      `POST /backend/api/users failed: ${postResponse.status()} ${postText}`,
    ).toBeTruthy();

    const postPayload = JSON.parse(postResponse.request().postData() ?? '{}') as {
      password?: string;
    };
    expect(postPayload.password, `create payload missing password: ${postResponse.request().postData()}`).toBe(
      password,
    );

    const created = JSON.parse(postText) as { id?: number };
    expect(typeof created.id, `POST body missing numeric id: ${postText}`).toBe('number');
    const id = created.id as number;
    createdResources.push({ collection: 'users', id });

    const getUser = await request.get(`/backend/api/users/${id}`, {
      headers: { 'X-SITMUN-Client': 'admin' },
    });
    expect(getUser.ok(), `GET user failed: ${getUser.status()}`).toBeTruthy();
    const userBody = (await getUser.json()) as { passwordSet?: boolean };
    expect(userBody.passwordSet).toBe(true);

    const login = await request.post('/backend/api/authenticate', {
      data: { username, password },
    });
    expect(login.ok(), `authenticate failed: ${login.status()} ${await login.text()}`).toBeTruthy();
  });

  // #386: the add-roles picker compared role ids with assignment ids. In the test data, admin
  // (user 1) has assignments 10000-10002, all with role 10001, so roles 10001 and 10002 vanished.
  test('add-roles dialog lists roles whose id matches an assignment id (#386)', async ({ page }) => {
    await page.goto('/#/user/1/userForm');
    await waitForFormReady(page, 'username');
    await page.getByRole('tab', { name: /Roles per Territory|Roles por Territorio/i }).click();

    const panel = page.getByRole('tabpanel');
    await panel
      .locator('button')
      .filter({ has: page.locator('mat-icon', { hasText: 'add_circle_outline' }) })
      .first()
      .click();

    const roles = page.locator('mat-dialog-container ag-grid-angular').first();
    await expect(roles.getByRole('gridcell', { name: 'Role 1', exact: true })).toBeVisible();
    await expect(roles.getByRole('gridcell', { name: 'Role 2', exact: true })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('mat-dialog-container')).toHaveCount(0);
  });
});
