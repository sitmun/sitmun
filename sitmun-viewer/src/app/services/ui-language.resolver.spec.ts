import { resolveUiLanguage, sortByLanguageOrder } from './ui-language.resolver';

describe('resolveUiLanguage', () => {
  it('prefers stored when available', () => {
    expect(
      resolveUiLanguage({
        stored: 'ca',
        backendDefault: 'en',
        availableShortnames: ['ca', 'en', 'es'],
        staticFallback: 'ca'
      })
    ).toBe('ca');
  });

  it('uses backendDefault when stored missing', () => {
    expect(
      resolveUiLanguage({
        stored: null,
        backendDefault: 'en',
        availableShortnames: ['ca', 'en', 'es'],
        staticFallback: 'ca'
      })
    ).toBe('en');
  });

  it('uses staticFallback when backend not available', () => {
    expect(
      resolveUiLanguage({
        stored: null,
        backendDefault: 'de',
        availableShortnames: ['ca', 'en'],
        staticFallback: 'en'
      })
    ).toBe('en');
  });

  it('uses the closest browser language when the server provided none', () => {
    expect(
      resolveUiLanguage({
        stored: null,
        browser: ['es-MX', 'en-US'],
        backendDefault: null,
        availableShortnames: ['ca', 'en', 'es', 'pt-PT'],
        staticFallback: 'ca'
      })
    ).toBe('es');
  });

  it('keeps the server default ahead of the browser', () => {
    expect(
      resolveUiLanguage({
        stored: null,
        browser: ['es-ES'],
        backendDefault: 'en',
        availableShortnames: ['ca', 'en', 'es'],
        staticFallback: 'ca'
      })
    ).toBe('en');
  });

  it('maps a Portuguese browser tag to the configured Portuguese language', () => {
    expect(
      resolveUiLanguage({
        stored: null,
        browser: ['pt-BR'],
        backendDefault: null,
        availableShortnames: ['es', 'pt-PT', 'en'],
        staticFallback: 'es'
      })
    ).toBe('pt-PT');
  });
});

describe('sortByLanguageOrder', () => {
  it('sorts by order then shortname', () => {
    expect(
      sortByLanguageOrder([
        { shortname: 'en', order: 3 },
        { shortname: 'ca', order: 1 }
      ]).map((l) => l.shortname)
    ).toEqual(['ca', 'en']);
  });
});
