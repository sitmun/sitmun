import { readFileSync } from 'fs';
import { join } from 'path';

const KEYS = [
  'firstRun.title',
  'firstRun.step.welcome',
  'firstRun.step.language',
  'firstRun.step.password',
  'firstRun.welcome.bodyAdmin',
  'firstRun.welcome.next',
  'firstRun.language.next',
  'firstRun.back',
  'firstRun.summary.language',
  'firstRun.summary.password',
  'firstRun.language.title',
  'firstRun.language.description',
  'firstRun.password.title',
  'firstRun.password.hint',
  'firstRun.password.new',
  'firstRun.password.confirm',
  'firstRun.password.show',
  'firstRun.password.hide',
  'firstRun.password.mismatch',
  'firstRun.password.tooShort',
  'firstRun.password.tooLong',
  'firstRun.password.sameAsUsername',
  'firstRun.save',
  'firstRun.passwordChanged',
  'firstRun.error.title',
  'firstRun.error.missing',
] as const;

const LANGS = ['ca', 'en', 'es', 'fr', 'oc-aranes', 'pt-PT'] as const;

describe('first-run i18n keys', () => {
  it.each(LANGS)('%s.json defines the first-run keys', (lang) => {
    const bundle = JSON.parse(
      readFileSync(join(__dirname, `../../assets/i18n/${lang}.json`), 'utf8')
    ) as Record<string, string>;
    for (const key of KEYS) {
      expect(bundle[key]).toBeDefined();
      expect(String(bundle[key]).length).toBeGreaterThan(0);
    }
  });
});
