import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.use({ locale: 'es-ES' });

async function openApp(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('sitmun.e2e.firstRunCleared') === '1') {
      return;
    }
    localStorage.removeItem('lang');
    localStorage.removeItem('sitmun.firstRun.dismissed');
    sessionStorage.setItem('sitmun.e2e.firstRunCleared', '1');
  });
  await page.goto('/');
}

async function signIn(page: import('@playwright/test').Page, password: string): Promise<void> {
  await page.locator('[formControlName="username"]').fill('admin');
  await page.locator('[formControlName="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
}

test('saving Catalan and a new password signs the admin out', async ({ page }) => {
  await openApp(page);
  await expect(page.getByText(/^SITMUN 3 - /)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Configuración inicial' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toHaveCount(0);
  await expect(page.locator('.welcome-logo')).toHaveCount(0);
  await page.getByRole('button', { name: 'Elegir idioma' }).click();
  const language = page.getByRole('combobox', { name: 'Idioma de la base de datos' });
  await expect(language).toContainText('Castellano');

  await language.click();
  await page.getByRole('option', { name: 'Català' }).click();
  await expect(language).toContainText('Català');
  await expect(page.getByText('Detectado en el navegador')).toHaveCount(0);
  await expect(page.getByText('Traducciones que faltan')).toHaveCount(0);
  await expect(page.getByText('Valores afectados')).toHaveCount(0);
  await page.getByRole('button', { name: 'Continuar a la contraseña' }).click();

  await page.getByLabel('Nueva contraseña').fill('new-admin-pass');
  await page.getByLabel('Confirmar contraseña').fill('new-admin-pass');
  await expect(page.getByText('El idioma de la base de datos será Català.')).toBeVisible();
  await page.getByRole('button', { name: 'Guardar' }).click();

  await expect(page).toHaveURL(/\/#\/login/);
  await expect(page.getByText('Contrasenya canviada. Entreu amb la nova contrasenya.')).toBeVisible();

  await page.goto('/#/first-run');
  await expect(page).toHaveURL(/\/#\/login/);
  const closed = await page.request.get('http://localhost:18080/api/setup/first-run');
  expect(closed.status()).toBe(404);

  await page.locator('[formControlName="username"]').fill('admin');
  await page.locator('[formControlName="password"]').fill('admin');
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText('Usuari i/o contrasenya incorrecte')).toBeVisible();

  await page.locator('[formControlName="password"]').fill('new-admin-pass');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/#\/dashboard/);
  await expect(page.getByRole('heading', { name: 'Configuración inicial' })).toHaveCount(0);
  await expect(page.getByText('Idioma de la base de datos sin definir')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Iniciar sessió' })).toHaveCount(0);
  await expect(page.locator('button.language-toolbar-button')).toContainText('CA');
});
