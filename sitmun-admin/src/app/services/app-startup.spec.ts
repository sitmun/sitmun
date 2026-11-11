import { HttpErrorResponse } from '@angular/common/http';
import { Injector } from '@angular/core';
import { Router } from '@angular/router';

import { TranslateService } from '@ngx-translate/core';
import { Observable, of, Subject, throwError } from 'rxjs';

import { MessagesInterceptorStateService } from '@app/core';
import { LanguageService } from '@app/domain';
import { config } from '@config';

import { AppConfigService } from './app-config.service';
import {
  initializeFromSetupStatus,
  isBackendConfiguring,
  isBackendUnavailable,
  retryAppStartup,
} from './app-startup';
import { AppStateService } from './app-state.service';
import { LoggerService } from './logger.service';
import { SetupStatusService } from './setup-status.service';

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

const logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() };

describe('app startup', () => {
  beforeEach(() => {
    config.defaultLang = 'ca';
    localStorage.removeItem('lang');
    setBrowserLanguages(['en-GB']);
  });

  it('treats a status 0 response as a server that is not reachable', () => {
    expect(isBackendUnavailable(new HttpErrorResponse({ status: 0 }))).toBe(true);
    expect(isBackendUnavailable(new HttpErrorResponse({ status: 504 }))).toBe(true);
    expect(isBackendUnavailable(new HttpErrorResponse({ status: 500 }))).toBe(false);
    expect(isBackendConfiguring(new HttpErrorResponse({ status: 503, error: { status: 'configuring' } }))).toBe(true);
    expect(isBackendConfiguring(new HttpErrorResponse({ status: 503 }))).toBe(false);
    expect(isBackendConfiguring(new HttpErrorResponse({ status: 0 }))).toBe(false);
  });

  it('waits instead of showing an initialization error when the server is down', async () => {
    const state = new AppStateService(logger as never);
    const messages = { enable: jest.fn(), disable: jest.fn() };
    const translate = { setFallbackLang: jest.fn(), use: () => of(null) };
    const calls = { status: 0, languages: 0 };

    await initializeFromSetupStatus(
      statusService(throwError(() => new HttpErrorResponse({ status: 0 })), calls),
      languageService(calls),
      translate as never,
      logger as never,
      state,
      messages as never,
      { getDefaultLanguageFallback: () => 'ca' } as never,
    )();

    expect(calls.status).toBe(1);
    expect(calls.languages).toBe(0);
    expect(state.isWaitingForBackend()).toBe(true);
    expect(state.getState().waitingReason).toBe('unreachable');
    expect(state.hasInitializationError()).toBe(false);
    expect(messages.enable).not.toHaveBeenCalled();
    expect(translate.setFallbackLang).toHaveBeenCalledWith('en');
  });

  it('uses the closest browser language when the server is down', async () => {
    setBrowserLanguages(['fr-FR', 'de']);
    const translate = { setFallbackLang: jest.fn(), use: jest.fn(() => of(null)) };
    const calls = { status: 0, languages: 0 };

    await initializeFromSetupStatus(
      statusService(throwError(() => new HttpErrorResponse({ status: 0 })), calls),
      languageService(calls),
      translate as never,
      logger as never,
      new AppStateService(logger as never),
      { enable: jest.fn(), disable: jest.fn() } as never,
      { getDefaultLanguageFallback: () => 'ca' } as never,
    )();

    expect(translate.setFallbackLang).toHaveBeenCalledWith('fr');
    expect(translate.use).toHaveBeenCalledWith('fr');
  });

  it('uses the first configured language when the browser matches none', async () => {
    setBrowserLanguages(['de-DE']);
    const translate = { setFallbackLang: jest.fn(), use: jest.fn(() => of(null)) };
    const calls = { status: 0, languages: 0 };

    await initializeFromSetupStatus(
      statusService(throwError(() => new HttpErrorResponse({ status: 0 })), calls),
      languageService(calls),
      translate as never,
      logger as never,
      new AppStateService(logger as never),
      { enable: jest.fn(), disable: jest.fn() } as never,
      { getDefaultLanguageFallback: () => 'ca' } as never,
    )();

    expect(translate.setFallbackLang).toHaveBeenCalledWith('es');
  });

  it('keeps the language chosen on the waiting page while the server is down', async () => {
    localStorage.setItem('lang', 'es');
    const translate = { setFallbackLang: jest.fn(), use: jest.fn(() => of(null)) };
    const calls = { status: 0, languages: 0 };

    await initializeFromSetupStatus(
      statusService(throwError(() => new HttpErrorResponse({ status: 0 })), calls),
      languageService(calls),
      translate as never,
      logger as never,
      new AppStateService(logger as never),
      { enable: jest.fn(), disable: jest.fn() } as never,
      { getDefaultLanguageFallback: () => 'ca' } as never,
    )();

    expect(translate.setFallbackLang).toHaveBeenCalledWith('es');
    expect(translate.use).toHaveBeenCalledWith('es');
  });

  it('keeps a real startup failure on the error page', async () => {
    const state = new AppStateService(logger as never);
    const messages = { enable: jest.fn(), disable: jest.fn() };
    const calls = { status: 0, languages: 0 };

    await initializeFromSetupStatus(
      statusService(throwError(() => new HttpErrorResponse({ status: 500 })), calls),
      languageService(calls),
      { setFallbackLang: jest.fn(), use: () => of(null) } as never,
      logger as never,
      state,
      messages as never,
      { getDefaultLanguageFallback: () => 'en' } as never,
    )();

    expect(calls.status).toBe(1);
    expect(calls.languages).toBe(0);
    expect(state.isWaitingForBackend()).toBe(false);
    expect(state.hasInitializationError()).toBe(true);
    expect(state.getInitializationError().source).toBe('setup');
    expect(messages.enable).toHaveBeenCalled();
  });

  it('shows a version mismatch when setup status is missing', async () => {
    const state = new AppStateService(logger as never);
    const calls = { status: 0, languages: 0 };

    await initializeFromSetupStatus(
      statusService(throwError(() => new HttpErrorResponse({ status: 404 })), calls),
      languageService(calls),
      { setFallbackLang: jest.fn(), use: () => of(null) } as never,
      logger as never,
      state,
      { enable: jest.fn(), disable: jest.fn() } as never,
      { getDefaultLanguageFallback: () => 'en' } as never,
    )();

    expect(state.hasInitializationError()).toBe(true);
    expect(state.getInitializationError().source).toBe('setup-status');
    expect(state.isWaitingForBackend()).toBe(false);
  });

  it('shows the waiting page while setup status is still pending', async () => {
    const state = new AppStateService(logger as never);
    const pending = new Subject<{
      firstRun: boolean;
      defaultLanguage: string;
      languages: ReturnType<typeof enabledLanguages>;
    }>();
    const calls = { status: 0, languages: 0 };

    const finished = initializeFromSetupStatus(
      statusService(pending, calls),
      languageService(calls),
      { setFallbackLang: jest.fn(), use: () => of(null) } as never,
      logger as never,
      state,
      { enable: jest.fn(), disable: jest.fn() } as never,
      { getDefaultLanguageFallback: () => 'en' } as never,
    )();

    await finished;

    expect(calls.status).toBe(1);
    expect(state.isWaitingForBackend()).toBe(true);
    expect(state.getState().waitingReason).toBe('unreachable');
    expect(state.hasInitializationError()).toBe(false);

    pending.next({ firstRun: true, defaultLanguage: 'en', languages: enabledLanguages() });
    pending.complete();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(state.isWaitingForBackend()).toBe(false);
    expect(config.defaultLang).toBe('en');
  });

  it('opens first-run from the only startup request when the admin password is empty', async () => {
    const navigate = jest.fn(async () => true);
    const calls = { status: 0, languages: 0 };
    const { injector, state } = recoveryInjector(
      of({ firstRun: true, defaultLanguage: 'en', languages: enabledLanguages() }),
      navigate,
      calls,
    );

    await retryAppStartup(injector);

    expect(calls.status).toBe(1);
    expect(calls.languages).toBe(0);
    expect(navigate).toHaveBeenCalledWith(['/first-run']);
    expect(state.isWaitingForBackend()).toBe(false);
  });

  it('opens login from the only startup request when first-run is closed', async () => {
    const navigate = jest.fn(async () => true);
    const calls = { status: 0, languages: 0 };
    const { injector } = recoveryInjector(
      of({ firstRun: false, defaultLanguage: 'en', languages: enabledLanguages() }),
      navigate,
      calls,
    );

    await retryAppStartup(injector);

    expect(calls.status).toBe(1);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('stays on the waiting page when setup status is still unreachable', async () => {
    const navigate = jest.fn(async () => true);
    const calls = { status: 0, languages: 0 };
    const { injector, state } = recoveryInjector(
      throwError(() => new HttpErrorResponse({ status: 0 })),
      navigate,
      calls,
    );

    await retryAppStartup(injector);

    expect(navigate).not.toHaveBeenCalled();
    expect(state.isWaitingForBackend()).toBe(true);
    expect(state.getState().waitingReason).toBe('unreachable');
  });

  it('says the system is configuring when setup status returns that 503', async () => {
    const navigate = jest.fn(async () => true);
    const calls = { status: 0, languages: 0 };
    const { injector, state } = recoveryInjector(
      throwError(() => new HttpErrorResponse({ status: 503, error: { status: 'configuring' } })),
      navigate,
      calls,
    );

    await retryAppStartup(injector);

    expect(navigate).not.toHaveBeenCalled();
    expect(state.hasInitializationError()).toBe(false);
    expect(state.isWaitingForBackend()).toBe(true);
    expect(state.getState().waitingReason).toBe('configuring');
  });

  it('moves from an unreachable server to configuring without leaving the waiting page', async () => {
    const state = new AppStateService(logger as never);
    state.setWaitingForBackend('unreachable');
    const calls = { status: 0, languages: 0 };

    await initializeFromSetupStatus(
      statusService(
        throwError(() => new HttpErrorResponse({ status: 503, error: { status: 'configuring' } })),
        calls,
      ),
      languageService(calls),
      { setFallbackLang: jest.fn(), use: () => of(null) } as never,
      logger as never,
      state,
      { enable: jest.fn(), disable: jest.fn() } as never,
      { getDefaultLanguageFallback: () => 'en' } as never,
    )();

    expect(state.isWaitingForBackend()).toBe(true);
    expect(state.getState().waitingReason).toBe('configuring');
    expect(state.hasInitializationError()).toBe(false);
  });
});

function enabledLanguages() {
  return [
    { id: 1, shortname: 'en', name: 'English', order: 3 },
    { id: 2, shortname: 'es', name: 'Castellano', order: 2 },
  ];
}

function statusService(
  result: Observable<unknown>,
  calls: { status: number },
): SetupStatusService {
  return {
    load: () => {
      calls.status += 1;
      return result;
    },
  } as never;
}

function languageService(calls: { languages: number }): LanguageService {
  return {
    fetchAllItems: () => {
      calls.languages += 1;
      return of([]);
    },
    applyLanguagesToUse: (items: unknown) => items,
  } as never;
}

function recoveryInjector(
  statusResult: Observable<unknown>,
  navigate: jest.Mock,
  calls: { status: number; languages: number },
): { injector: Injector; state: AppStateService } {
  const state = new AppStateService(logger as never);
  state.setWaitingForBackend();
  const injector = Injector.create({
    providers: [
      { provide: AppStateService, useValue: state },
      { provide: TranslateService, useValue: { setFallbackLang: jest.fn(), use: () => of(null) } },
      { provide: LoggerService, useValue: logger },
      { provide: MessagesInterceptorStateService, useValue: { enable: jest.fn(), disable: jest.fn() } },
      { provide: LanguageService, useValue: languageService(calls) },
      { provide: AppConfigService, useValue: { getDefaultLanguageFallback: () => 'en' } },
      { provide: SetupStatusService, useValue: statusService(statusResult, calls) },
      { provide: Router, useValue: { navigate } },
    ],
  });
  return { injector, state };
}
