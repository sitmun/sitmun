import { HttpErrorResponse } from '@angular/common/http';
import { Injector } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { DataTablesRegistry } from '@app/components/data-tables.util';
import { MessagesInterceptorStateService } from '@app/core';
import { Resource } from '@app/core/hal/resource/resource.model';
import { ConfigurationParametersService, LanguageService } from '@app/domain';
import { config } from '@config';
import { environment } from '@environments/environment';

import { AppConfigService } from './app-config.service';
import { AppStateService } from './app-state.service';
import { LoggerService } from './logger.service';
import { readBrowserLanguages, resolveUiLanguage } from './ui-language.resolver';

/** The browser never reached the server, or a proxy answered because nothing was listening. */
export function isBackendUnavailable(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) {
    return false;
  }
  return error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504;
}

let startupRetrying = false;

/** Runs startup again after the server was not reachable. */
export async function retryAppStartup(injector: Injector): Promise<void> {
  const appStateService = injector.get(AppStateService);
  if (!appStateService.isWaitingForBackend() || startupRetrying) {
    return;
  }
  startupRetrying = true;
  try {
    await initializeConfiguration(
      injector.get(ConfigurationParametersService),
      injector.get(TranslateService),
      injector.get(LoggerService),
      appStateService,
      injector.get(MessagesInterceptorStateService),
    )();
    await initializeLanguages(
      injector.get(LanguageService),
      injector.get(ConfigurationParametersService),
      injector.get(TranslateService),
      injector.get(LoggerService),
      appStateService,
      injector.get(MessagesInterceptorStateService),
      injector.get(AppConfigService),
    )();
  } finally {
    startupRetrying = false;
  }
}

export function initializeLanguages(
  languageService: LanguageService,
  configurationService: ConfigurationParametersService,
  translateService: TranslateService,
  loggerService: LoggerService,
  appStateService: AppStateService,
  messagesInterceptorState: MessagesInterceptorStateService,
  appConfigService: AppConfigService
) {
  return async () => {
    messagesInterceptorState.disable();
    DataTablesRegistry.setLoggerService(loggerService);
    Resource.setLoggerService(loggerService);

    try {
      if (!config.defaultLang) {
        try {
          const configParams = await firstValueFrom(configurationService.fetchAllItems());
          const defaultLangParam = configParams.find(element => element.name === 'language.default');
          if (defaultLangParam?.value) {
            config.defaultLang = defaultLangParam.value;
          }
        } catch {
          // configuration may load in a parallel initializer; fall back below
        }
      }

      const languages = languageService.applyLanguagesToUse(
        await firstValueFrom(languageService.fetchAllItems())
      );

      const chosen = resolveUiLanguage({
        stored: localStorage.getItem('lang'),
        browser: readBrowserLanguages(),
        backendDefault: config.defaultLang,
        availableShortnames: languages.map(l => l.shortname),
        staticFallback: appConfigService.getDefaultLanguageFallback() || 'en',
      });
      translateService.setFallbackLang(chosen);
      appStateService.clearWaitingForBackend();
      messagesInterceptorState.enable();
      return await firstValueFrom(translateService.use(chosen));
    } catch (error) {
      if (isBackendUnavailable(error)) {
        messagesInterceptorState.disable();
        appStateService.setWaitingForBackend();
        return useFallbackLanguage(translateService);
      }
      const initError = {
        message: 'Failed to initialize languages',
        originalError: error,
        source: 'languages',
        timestamp: new Date().toISOString()
      };
      appStateService.setInitializationError(initError, 'languages');
      messagesInterceptorState.enable();
      return useFallbackLanguage(translateService);
    }
  };
}

export function initializeConfiguration(
  configurationService: ConfigurationParametersService,
  translateService: TranslateService,
  loggerService: LoggerService,
  appStateService: AppStateService,
  messagesInterceptorState: MessagesInterceptorStateService
) {
  return async () => {
    messagesInterceptorState.disable();
    try {
      const configParams = await firstValueFrom(configurationService.fetchAllItems());
      const defaultLang = configParams.find(element => element.name === 'language.default');

      if (defaultLang) {
        config.defaultLang = defaultLang.value;
      }

      loggerService.debug(`Configuration initialized: ${configParams.length} parameters loaded`);
      if (!appStateService.isWaitingForBackend()) {
        messagesInterceptorState.enable();
      }
    } catch (error) {
      if (isBackendUnavailable(error)) {
        messagesInterceptorState.disable();
        appStateService.setWaitingForBackend();
        return;
      }
      const initError = {
        message: 'Failed to initialize configuration',
        originalError: error,
        source: 'configuration',
        timestamp: new Date().toISOString()
      };
      appStateService.setInitializationError(initError, 'configuration');
      messagesInterceptorState.enable();
    }
  };
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
