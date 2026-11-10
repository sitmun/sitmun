import {ChangeDetectionStrategy, Component, DestroyRef, inject, Injector, OnDestroy, OnInit} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

import {TranslateService} from '@ngx-translate/core';
import {EMPTY, Observable, Subscription, timer} from 'rxjs';
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators';

import {LoginService} from '@app/core/auth/login.service';
import {Principal} from '@app/core/auth/principal.service';
import {ErrorTrackingService} from '@app/services/error-tracking.service';
import {LoggerService} from '@app/services/logger.service';
import {config} from '@config';

import {retryAppStartup} from './services/app-startup';
import {AppStateService} from './services/app-state.service';
import {readBrowserLanguages, resolveUiLanguage} from './services/ui-language.resolver';


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styles: [],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'admin-app';

  /** translate service*/
  translate;

  /** current logged in user account*/
  currentAccount: any;

  isOpen: boolean;

  hasInitializationError$: Observable<boolean>;
  initializationError$: Observable<any>;
  waitingForBackend$: Observable<boolean>;

  private readonly subscription: Subscription;
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  constructor(
    /** Translate service */public trans: TranslateService,
    /** Identity service */public principal: Principal,
    /** Login service */public loginService: LoginService,
    private readonly loggerService: LoggerService,
    private readonly appStateService: AppStateService,
    private readonly errorTrackingService: ErrorTrackingService
  ) {
    this.translate = trans;
    this.hasInitializationError$ = this.appStateService.state$.pipe(
      map(state => state.hasInitializationError)
    );
    this.initializationError$ = this.appStateService.state$.pipe(
      map(state => state.initializationError)
    );
    this.waitingForBackend$ = this.appStateService.state$.pipe(
      map(state => state.waitingForBackend)
    );
  }

  /** On component init, get logged user account*/
  ngOnInit() {
    this.initializeErrorTracking();

    if (!config.languagesToUse || config.languagesToUse.length === 0) {
      this.loggerService.warn('Languages not loaded - APP_INITIALIZER may have failed');
    } else {
      this.loggerService.debug(`App component initialized with ${config.languagesToUse.length} languages available`);
    }

    this.setInitialLanguage();
    this.appStateService.state$.pipe(
      map(state => state.waitingForBackend),
      distinctUntilChanged(),
      switchMap(waiting => waiting ? timer(1500, 2000) : EMPTY),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      void retryAppStartup(this.injector);
    });

    this.principal.identity().then((account) => {
      this.currentAccount = account;
      if (account) {
        this.loginService.startSessionRefresh();
      }
    });

  }

  private initializeErrorTracking(): void {
    try {
      this.loggerService.debug('Error tracking initialized');
    } catch (error) {
      console.warn('Error tracking initialization warning:', error);
    }
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  private setInitialLanguage() {
    const available = (config.languagesToUse || []).map(lang => lang.shortname);
    const chosen = resolveUiLanguage({
      stored: localStorage.getItem('lang'),
      browser: readBrowserLanguages(),
      backendDefault: config.defaultLang,
      availableShortnames: available,
      staticFallback: config.defaultLang || available[0] || 'en',
    });
    this.translate.use(chosen);
    this.translate.setDefaultLang(chosen);
  }

  /** Change app language*/
  changeLanguage(locale: string) {
    this.translate.use(locale);
    this.translate.setDefaultLang(locale);
    localStorage.setItem('lang', locale);
  }

  navOpen(_$event): void {
    this.isOpen = !this.isOpen;
  }

  /** Whether user is logged in */
  isLoggedIn() {
    return this.principal.isAuthenticated();
  }
}
