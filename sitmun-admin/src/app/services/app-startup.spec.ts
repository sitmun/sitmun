import { HttpErrorResponse } from '@angular/common/http';

import { of, throwError } from 'rxjs';

import { config } from '@config';

import { initializeConfiguration, initializeLanguages, isBackendUnavailable } from './app-startup';
import { AppStateService } from './app-state.service';

function setBrowserLanguages(tags: string[]): void {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    get: () => tags,
  });
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    get: () => tags[0] ?? '',
  });
}

describe('app startup', () => {
  const logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() };

  beforeEach(() => {
    config.defaultLang = 'ca';
    localStorage.removeItem('lang');
    setBrowserLanguages(['en-GB']);
  });

  it('treats a status 0 response as a server that is not reachable', () => {
    expect(isBackendUnavailable(new HttpErrorResponse({ status: 0 }))).toBe(true);
    expect(isBackendUnavailable(new HttpErrorResponse({ status: 504 }))).toBe(true);
    expect(isBackendUnavailable(new HttpErrorResponse({ status: 500 }))).toBe(false);
  });

  it('waits instead of showing an initialization error when the server is down', async () => {
    const state = new AppStateService(logger as never);
    const messages = { enable: jest.fn(), disable: jest.fn() };
    const translate = { setDefaultLang: jest.fn(), use: () => of(null) };

    await initializeLanguages(
      { fetchAllItems: () => throwError(() => new HttpErrorResponse({ status: 0 })), applyLanguagesToUse: jest.fn() } as never,
      { fetchAllItems: () => of([]) } as never,
      translate as never,
      logger as never,
      state,
      messages as never,
      { getDefaultLanguageFallback: () => 'ca' } as never,
    )();

    expect(state.isWaitingForBackend()).toBe(true);
    expect(state.hasInitializationError()).toBe(false);
    expect(messages.enable).not.toHaveBeenCalled();
    expect(translate.setDefaultLang).toHaveBeenCalledWith('en');
  });

  it('uses the closest browser language when the server is down', async () => {
    setBrowserLanguages(['fr-FR', 'de']);
    const translate = { setDefaultLang: jest.fn(), use: jest.fn(() => of(null)) };

    await initializeLanguages(
      { fetchAllItems: () => throwError(() => new HttpErrorResponse({ status: 0 })), applyLanguagesToUse: jest.fn() } as never,
      { fetchAllItems: () => of([]) } as never,
      translate as never,
      logger as never,
      new AppStateService(logger as never),
      { enable: jest.fn(), disable: jest.fn() } as never,
      { getDefaultLanguageFallback: () => 'ca' } as never,
    )();

    expect(translate.setDefaultLang).toHaveBeenCalledWith('fr');
    expect(translate.use).toHaveBeenCalledWith('fr');
  });

  it('uses the first configured language when the browser matches none', async () => {
    setBrowserLanguages(['de-DE']);
    const translate = { setDefaultLang: jest.fn(), use: jest.fn(() => of(null)) };

    await initializeLanguages(
      { fetchAllItems: () => throwError(() => new HttpErrorResponse({ status: 0 })), applyLanguagesToUse: jest.fn() } as never,
      { fetchAllItems: () => of([]) } as never,
      translate as never,
      logger as never,
      new AppStateService(logger as never),
      { enable: jest.fn(), disable: jest.fn() } as never,
      { getDefaultLanguageFallback: () => 'ca' } as never,
    )();

    expect(translate.setDefaultLang).toHaveBeenCalledWith('es');
  });

  it('keeps the language chosen on the waiting page while the server is down', async () => {
    localStorage.setItem('lang', 'es');
    const state = new AppStateService(logger as never);
    const translate = { setDefaultLang: jest.fn(), use: jest.fn(() => of(null)) };

    await initializeLanguages(
      { fetchAllItems: () => throwError(() => new HttpErrorResponse({ status: 0 })), applyLanguagesToUse: jest.fn() } as never,
      { fetchAllItems: () => of([]) } as never,
      translate as never,
      logger as never,
      state,
      { enable: jest.fn(), disable: jest.fn() } as never,
      { getDefaultLanguageFallback: () => 'ca' } as never,
    )();

    expect(translate.setDefaultLang).toHaveBeenCalledWith('es');
    expect(translate.use).toHaveBeenCalledWith('es');
  });

  it('keeps a real startup failure on the error page', async () => {
    const state = new AppStateService(logger as never);
    const messages = { enable: jest.fn(), disable: jest.fn() };

    await initializeConfiguration(
      { fetchAllItems: () => throwError(() => new HttpErrorResponse({ status: 500 })) } as never,
      { setDefaultLang: jest.fn(), use: () => of(null) } as never,
      logger as never,
      state,
      messages as never,
    )();

    expect(state.isWaitingForBackend()).toBe(false);
    expect(state.hasInitializationError()).toBe(true);
    expect(messages.enable).toHaveBeenCalled();
  });
});
