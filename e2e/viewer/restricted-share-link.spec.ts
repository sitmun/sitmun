import { expect, test, type Page } from '@playwright/test';

import {
  APP_ID,
  MENORCA_TERRITORY_ID,
  readViewerCredentials,
  TERRITORY_ID,
} from './fixtures';

const sharedMap = `/user/map/${APP_ID}/${TERRITORY_ID}?mapState=share-token`;
const deniedMap = `/user/map/${APP_ID}/${MENORCA_TERRITORY_ID}?mapState=share-token`;

async function signIn(page: Page, username: string, password: string): Promise<void> {
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form .login-button button').click();
}

test.describe('restricted share links', () => {
  test('a logged-out person returns to the same map after the password form', async ({ page }) => {
    const credentials = await readViewerCredentials();

    await page.goto(sharedMap);
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page).toHaveURL(/redirect-after-login=.*mapState%3Dshare-token|mapState=share-token/);

    await signIn(page, credentials.username, credentials.password);

    await expect(page).toHaveURL(new RegExp(`/user/map/${APP_ID}/${TERRITORY_ID}`), {
      timeout: 30_000,
    });
    await expect(page).toHaveURL(/mapState=share-token/);
    await expect(page.locator('.tc-map')).toBeVisible({ timeout: 30_000 });
  });

  test('a signed-in person with access opens the shared map directly', async ({ page }) => {
    const credentials = await readViewerCredentials();

    await page.goto('/auth/login');
    await signIn(page, credentials.username, credentials.password);
    await expect(page).toHaveURL(/\/user\/dashboard/, { timeout: 30_000 });

    await page.goto(sharedMap);

    await expect(page).toHaveURL(/mapState=share-token/);
    await expect(page.locator('.tc-map')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
  });

  test('a person without access sees a no-access message and the map does not start', async ({
    page,
  }) => {
    const credentials = await readViewerCredentials();

    await page.goto('/auth/login');
    await signIn(page, credentials.expiryUsername, credentials.expiryPassword);
    await expect(page).toHaveURL(/\/user\/dashboard/, { timeout: 30_000 });

    await page.goto(deniedMap);

    await expect(page.getByRole('alertdialog')).toContainText('You cannot open this map.');
    await expect(page.locator('.tc-map')).toHaveCount(0);
  });
});
