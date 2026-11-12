import { HttpErrorResponse } from '@angular/common/http';
import { Injector } from '@angular/core';
import { Router } from '@angular/router';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { DataTablesRegistry } from '@app/components/data-tables.util';
import { MessagesInterceptorStateService } from '@app/core';
import { Resource } from '@app/core/hal/resource/resource.model';
import { LanguageService } from '@app/domain';
import { config } from '@config';
import { environment } from '@environments/environment';

import { AppConfigService } from './app-config.service';
import { AppStateService, WaitingReason } from './app-state.service';
import { LoggerService } from './logger.service';
import { SetupStatus, SetupStatusService } from './setup-status.service';
import { readBrowserLanguages, resolveUiLanguage } from './ui-language.resolver';

/** The browser never reached the server, or a proxy answered because nothing was listening. */
export function isBackendUnavailable(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) {
    return false;
  }
  return error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504;
}

/** The backend is up and still applying first-run setup. */
export function isBackendConfiguring(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse) || error.status !== 503) {
    return false;
  }
  const body = error.error as { status?: string } | null;
  return body?.status === 'configuring';
}

function waitingReasonFor(error: unknown): WaitingReason {
  return isBackendConfiguring(error) ? 'configuring' : 'unreachable';
}

function isSetupStatusMissing(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 404;
}

let startupRetrying = false;

/** Paint the waiting page when setup status has not answered by then. */
const SHOW_WAITING_AFTER_MS = 300;

type StartupResult = { ok: true; status: SetupStatus } | { ok: false; error: unknown };

/** Runs startup again after the server was not reachable. */
export async function retryAppStartup(injector: Injector): Promise<void> {
  const appStateService = injector.get(AppStateService);
  if (!appStateService.isWaitingForBackend() || startupRetrying) {
    return;
  }
  startupRetrying = true;
  try {
    const setupStatus = injector.get(SetupStatusService);
    const logger = injector.get(LoggerService);
    let status: SetupStatus;
    try {
      status = await firstValueFrom(setupStatus.load(true));
    } catch (error) {
      if (isBackendUnavailable(error)) {
        appStateService.setWaitingForBackend(waitingReasonFor(error));
        return;
      }
      if (isSetupStatusMissing(error)) {
        recordSetupStatusMismatch(appStateService, error);
        return;
      }
      logger.warn('Setup status failed during startup retry', error);
      return;
    }
    const router = injector.get(Router);
    await router.navigate([status.firstRun ? '/first-run' : '/login']);
    await applySetupStatus(
      status,
      injector.get(LanguageService),
      injector.get(TranslateService),
      logger,
      appStateService,
      injector.get(MessagesInterceptorStateService),
      injector.get(AppConfigService),
    );
  } finally {
    startupRetrying = false;
  }
}

export function initializeFromSetupStatus(
  setupStatus: SetupStatusService,
  languageService: LanguageService,
  translateService: TranslateService,
  loggerService: LoggerService,
  appStateService: AppStateService,
  messagesInterceptorState: MessagesInterceptorStateService,
  appConfigService: AppConfigService,
) {
  return async () => {
    messagesInterceptorState.disable();
    DataTablesRegistry.setLoggerService(loggerService);
    Resource.setLoggerService(loggerService);
    const outcome = firstValueFrom(setupStatus.load(true)).then(
      (status): StartupResult => ({ ok: true, status }),
      (error): StartupResult => ({ ok: false, error }),
    );
    const quick = await Promise.race([
      outcome,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), SHOW_WAITING_AFTER_MS)),
    ]);
    if (quick) {
      return settleStartup(
        quick,
        languageService,
        translateService,
        loggerService,
        appStateService,
        messagesInterceptorState,
        appConfigService,
      );
    }
    appStateService.setWaitingForBackend('unreachable');
    void outcome.then((result) =>
      settleStartup(
        result,
        languageService,
        translateService,
        loggerService,
        appStateService,
        messagesInterceptorState,
        appConfigService,
      ),
    );
    return useFallbackLanguage(translateService);
  };
}

async function settleStartup(
  result: StartupResult,
  languageService: LanguageService,
  translateService: TranslateService,
  loggerService: LoggerService,
  appStateService: AppStateService,
  messagesInterceptorState: MessagesInterceptorStateService,
  appConfigService: AppConfigService,
): Promise<unknown> {
  if (result.ok) {
    return applySetupStatus(
      result.status,
      languageService,
      translateService,
      loggerService,
      appStateService,
      messagesInterceptorState,
      appConfigService,
    );
  }
  return settleStartupFailure(
    result['error'],
    translateService,
    appStateService,
    messagesInterceptorState,
  );
}

function settleStartupFailure(
  error: unknown,
  translateService: TranslateService,
  appStateService: AppStateService,
  messagesInterceptorState: MessagesInterceptorStateService,
): Promise<unknown> {
  if (isBackendUnavailable(error)) {
    messagesInterceptorState.disable();
    appStateService.setWaitingForBackend(waitingReasonFor(error));
    return useFallbackLanguage(translateService);
  }
  if (isSetupStatusMissing(error)) {
    recordSetupStatusMismatch(appStateService, error);
    messagesInterceptorState.enable();
    return useFallbackLanguage(translateService);
  }
  appStateService.setInitializationError(
    {
      message: 'Failed to initialize setup status',
      originalError: error,
      source: 'setup',
      timestamp: new Date().toISOString(),
    },
    'setup',
  );
  messagesInterceptorState.enable();
  return useFallbackLanguage(translateService);
}

async function applySetupStatus(
  status: SetupStatus,
  languageService: LanguageService,
  translateService: TranslateService,
  loggerService: LoggerService,
  appStateService: AppStateService,
  messagesInterceptorState: MessagesInterceptorStateService,
  appConfigService: AppConfigService,
): Promise<unknown> {
  if (status.defaultLanguage) {
    config.defaultLang = status.defaultLanguage;
  }
  const languages = languageService.languagesFromSetup(status.languages || []);
  const chosen = resolveUiLanguage({
    stored: localStorage.getItem('lang'),
    browser: readBrowserLanguages(),
    backendDefault: config.defaultLang,
    availableShortnames: languages.map((language) => language.shortname),
    staticFallback: appConfigService.getDefaultLanguageFallback() || 'en',
  });
  translateService.setFallbackLang(chosen);
  appStateService.clearWaitingForBackend();
  messagesInterceptorState.enable();
  loggerService.debug(
    `Setup status loaded: firstRun=${status.firstRun}, ${languages.length} languages`,
  );
  return firstValueFrom(translateService.use(chosen));
}

function recordSetupStatusMismatch(appStateService: AppStateService, error: unknown): void {
  appStateService.setInitializationError(
    {
      message: 'backend.error.setupStatus',
      originalError: error,
      source: 'setup-status',
      timestamp: new Date().toISOString(),
    },
    'setup-status',
  );
}

/** The server provided no language. Use the user's choice, then the closest browser language. */
function useFallbackLanguage(translateService: TranslateService): Promise<unknown> {
  const available = [...environment.waitingPageLanguages];
  const chosen = resolveUiLanguage({
    stored: localStorage.getItem('lang'),
    browser: readBrowserLanguages(),
    backendDefault: null,
    availableShortnames: available,
    staticFallback: available[0] || 'en',
  });
  translateService.setFallbackLang(chosen);
  return firstValueFrom(translateService.use(chosen));
}
