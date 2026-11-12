import { readFileSync } from 'node:fs';
import { expect, test } from '../fixtures';
import { control, gotoCreateForm } from '../helpers/form';

const dictionary = JSON.parse(readFileSync('tools/dictionary/dictionary.json', 'utf8'));

function columnLength(key: string): number {
  return dictionary.columns[key].length;
}

async function expectLength(page: Parameters<typeof control>[0], name: string, length: number) {
  await expect(control(page, name)).toHaveAttribute('maxlength', String(length));
}

test.describe('Dictionary field limits', () => {
  test('application name follows the dictionary length', async ({ page }) => {
    await gotoCreateForm(page, '/#/application/-1/applicationForm', 'name');
    await expectLength(page, 'name', columnLength('STM_APP.APP_NAME'));
  });

  test('user email follows the dictionary length', async ({ page }) => {
    await gotoCreateForm(page, '/#/user/-1/userForm', 'email');
    await expectLength(page, 'email', columnLength('STM_USER.USE_EMAIL'));
  });
});
