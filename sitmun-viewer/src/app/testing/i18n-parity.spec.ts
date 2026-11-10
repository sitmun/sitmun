import {readdirSync, readFileSync} from 'fs';
import {join} from 'path';

const dir = join(__dirname, '../../assets/i18n');

const readLocale = (lang: string): Record<string, string> =>
  JSON.parse(readFileSync(join(dir, `${lang}.json`), 'utf8')) as Record<string, string>;

const locales = readdirSync(dir)
  .filter((name) => name.endsWith('.json'))
  .map((name) => name.slice(0, -'.json'.length));

const englishKeys = Object.keys(readLocale('en')).sort();

describe('i18n key parity', () => {
  it.each(locales)('%s matches the English keys and has no empty value', (lang) => {
    const locale = readLocale(lang);
    expect(Object.keys(locale).sort()).toEqual(englishKeys);
    for (const key of englishKeys) {
      expect(String(locale[key] ?? '').trim().length).toBeGreaterThan(0);
    }
  });
});
