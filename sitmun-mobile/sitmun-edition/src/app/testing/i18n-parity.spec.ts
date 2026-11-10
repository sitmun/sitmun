import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const dir = join(__dirname, '../../assets/i18n');

const flat = (value: Record<string, unknown>, prefix = ''): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [name, child] of Object.entries(value)) {
    const key = prefix ? `${prefix}.${name}` : name;
    if (child !== null && typeof child === 'object') {
      Object.assign(out, flat(child as Record<string, unknown>, key));
    } else {
      out[key] = String(child ?? '');
    }
  }
  return out;
};

const readLocale = (lang: string): Record<string, string> =>
  flat(JSON.parse(readFileSync(join(dir, `${lang}.json`), 'utf8')) as Record<string, unknown>);

const locales = readdirSync(dir)
  .filter((name) => name.endsWith('.json'))
  .map((name) => name.slice(0, -'.json'.length));

const englishKeys = Object.keys(readLocale('en')).sort();

describe('i18n key parity', () => {
  it.each(locales)('%s matches the English keys and has no empty value', (lang) => {
    const locale = readLocale(lang);
    expect(Object.keys(locale).sort()).toEqual(englishKeys);
    for (const key of englishKeys) {
      expect(locale[key].trim().length).toBeGreaterThan(0);
    }
  });
});
