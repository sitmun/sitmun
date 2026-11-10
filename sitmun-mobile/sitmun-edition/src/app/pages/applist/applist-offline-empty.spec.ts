import { readFileSync } from 'fs';
import { join } from 'path';

describe('offline application list', () => {
  it('explains an empty list while the device is offline', () => {
    const html = readFileSync(join(__dirname, 'applist.page.html'), 'utf8');
    expect(html).toContain('*ngIf="!networkConnected && !applications.length"');
    expect(html).toContain("applist.offlineEmpty");

    for (const locale of ['en', 'es', 'ca', 'fr']) {
      const messages = JSON.parse(
        readFileSync(join(__dirname, `../../../assets/i18n/${locale}.json`), 'utf8')
      );
      expect(messages.applist.offlineEmpty).toEqual(expect.any(String));
      expect(messages.applist.offlineEmpty.length).toBeGreaterThan(0);
    }
  });
});
