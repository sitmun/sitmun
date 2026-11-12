import { test, expect } from '@playwright/test';

async function readResolvedLanguage(
  page: import('@playwright/test').Page,
): Promise<string> {
  return page.evaluate(async () => {
    const aliases: Record<string, string> = { pt: 'pt-PT', oc: 'oc-aranes' };
    const configResponse = await fetch('/backend/api/configuration-parameters');
    const configBody = await configResponse.json();
    const params = Array.isArray(configBody)
      ? configBody
      : configBody?._embedded?.['configuration-parameters'] || [];
    const backendDefault =
      params.find((item: { name?: string; value?: string }) => item?.name === 'language.default')
        ?.value || 'en';

    const languagesResponse = await fetch('/backend/api/languages?size=100');
    const languagesBody = await languagesResponse.json();
    const languages = (
      Array.isArray(languagesBody) ? languagesBody : languagesBody?._embedded?.languages || []
    ) as Array<{ shortname?: string; enabled?: boolean | null }>;
    const available = languages
      .filter((item) => item.shortname && item.enabled !== false)
      .map((item) => item.shortname as string);

    const tags = navigator.languages?.length ? [...navigator.languages] : [];
    if (navigator.language) {
      tags.push(navigator.language);
    }
    for (const tag of tags) {
      const exact = available.find((code) => code.toLowerCase() === tag.toLowerCase());
      if (exact) {
        return exact;
      }
      const primary = tag.trim().split(/[-_]/)[0]?.toLowerCase();
      if (!primary) {
        continue;
      }
      const alias = aliases[primary];
      if (alias && available.includes(alias)) {
        return alias;
      }
      const byPrimary = available.find(
        (code) => code.toLowerCase() === primary || code.toLowerCase().startsWith(`${primary}-`),
      );
      if (byPrimary) {
        return byPrimary;
      }
    }
    return available.includes(backendDefault) ? backendDefault : available[0] || 'en';
  });
}

function toIso(shortname: string): string {
  return shortname.trim().split(/[-_]/)[0].toUpperCase();
}

test.describe('Admin language chrome', () => {
  test('login toolbar shows ISO closed and API endonyms; no form language field', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('lang');
      localStorage.removeItem('languages');
    });

    await page.goto('/#/login');
    const resolved = await readResolvedLanguage(page);
    const expectedIso = toIso(resolved);

    await expect(page.locator('[formControlName="lang"]')).toHaveCount(0);

    const languageButton = page.locator('button.language-toolbar-button');
    await expect(languageButton).toBeVisible({ timeout: 30_000 });
    await expect(languageButton).toContainText(expectedIso);
    await expect(languageButton).not.toContainText(/English|Català|Castellano/i);

    await languageButton.click();
    const menu = page.locator('.mat-mdc-menu-panel, .mat-menu-panel').last();
    await expect(menu.getByRole('menuitem', { name: 'English' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Català' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Castellano' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Anglès' })).toHaveCount(0);
    await expect(menu.getByRole('menuitem', { name: 'Castellà' })).toHaveCount(0);
  });
});
