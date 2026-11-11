import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { form, validateTree } from '@angular/forms/signals';
import { Router } from '@angular/router';

import { TranslateService } from '@ngx-translate/core';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { LoginService } from '@app/core/auth/login.service';
import { Principal } from '@app/core/auth/principal.service';
import { Language, LanguageService } from '@app/domain';
import { FirstRunService, PASSWORD_CHANGED_KEY } from '@app/services/first-run.service';
import { toLanguageIsoCode } from '@app/services/language-iso';
import { NotificationService } from '@app/services/notification.service';
import { matchBrowserLanguage, readBrowserLanguages } from '@app/services/ui-language.resolver';
import { config } from '@config';
import { environment } from '@environments/environment';

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 50;

interface LanguageChoice {
  language: string;
}

interface PasswordChoice {
  password: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-first-run',
  templateUrl: './first-run.component.html',
  styleUrls: ['./first-run.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class FirstRunComponent implements OnInit, OnDestroy {
  languages: Language[] = [];
  currentShortname = '';
  currentDefault = '';
  readonly productTitle = `SITMUN 3 - ${environment.version}`;
  detectedShortname = '';
  readonly saving = signal(false);
  showPassword = false;

  readonly languageModel = signal<LanguageChoice>({ language: '' });
  readonly languageForm = form(this.languageModel, (path) => {
    validateTree(path, ({ value }) => {
      if (!value().language) {
        return { kind: 'languageRequired' };
      }
      return undefined;
    });
  });

  readonly passwordModel = signal<PasswordChoice>({ password: '', confirmPassword: '' });
  readonly passwordForm = form(this.passwordModel, (path) => {
    validateTree(path, ({ value }) => passwordErrors(value()));
  });

  readonly canSave = computed(() => {
    if (this.saving() || !this.languageForm().valid() || !this.passwordForm().valid()) {
      return false;
    }
    return this.passwordModel().password.trim().length > 0;
  });

  private readonly destroy$ = new Subject<void>();
  private languageChosen = false;

  constructor(
    private readonly router: Router,
    private readonly translateService: TranslateService,
    private readonly languageService: LanguageService,
    private readonly firstRunService: FirstRunService,
    private readonly loginService: LoginService,
    private readonly principal: Principal,
    private readonly notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    void this.releaseSession();
    this.languageService.languagesToUse$
      .pipe(takeUntil(this.destroy$))
      .subscribe((languages) => {
        this.languages = languages;
        this.detectedShortname =
          matchBrowserLanguage(readBrowserLanguages(), languages.map((language) => language.shortname)) || '';
        this.applyUiLanguage(languages);
        this.preselectLanguage();
      });

    void this.loadStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isoCode(shortname: string): string {
    return toLanguageIsoCode(shortname || '');
  }

  markLanguageChosen(): void {
    this.languageChosen = true;
  }

  chooseLanguage(shortname: string): void {
    this.languageChosen = true;
    this.languageModel.update((model) => ({ ...model, language: shortname }));
  }

  changeLanguage(shortname: string): void {
    this.currentShortname = shortname;
    this.translateService.use(shortname);
    this.translateService.setFallbackLang(shortname);
    localStorage.setItem('lang', shortname);
    this.preselectLanguage();
  }

  selectedLanguageName(): string {
    const shortname = this.languageModel().language;
    return this.languages.find((language) => language.shortname === shortname)?.name ?? shortname;
  }

  hasPasswordError(kind: string): boolean {
    return this.passwordForm().errors().some((error) => error.kind === kind);
  }

  save(): void {
    if (!this.canSave()) {
      return;
    }
    const languageChoice = this.languageModel();
    const password = this.passwordModel().password.trim();
    this.saving.set(true);
    this.firstRunService
      .save({
        language: languageChoice.language || null,
        continueOnMissingTranslations: true,
        password: password || null,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.saving.set(false);
          this.firstRunService.clearCache();
          if (result.passwordChanged) {
            sessionStorage.setItem(PASSWORD_CHANGED_KEY, '1');
          }
          const leave = () => this.leaveAfterSave(result.passwordChanged);
          if (languageChoice.language) {
            config.defaultLang = languageChoice.language;
            this.currentShortname = languageChoice.language;
            this.translateService.setFallbackLang(languageChoice.language);
            localStorage.setItem('lang', languageChoice.language);
            this.translateService.use(languageChoice.language).subscribe({ next: leave, error: leave });
            return;
          }
          leave();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          const missing = error.status === 409;
          this.notificationService.showError(
            'firstRun.error.title',
            missing ? 'firstRun.error.missing' : (error.error?.message || 'firstRun.error.title'),
            missing || !error.error?.message
          );
        },
      });
  }

  private leaveAfterSave(passwordChanged: boolean): void {
    if (passwordChanged) {
      sessionStorage.setItem(PASSWORD_CHANGED_KEY, '1');
    }
    this.loginService.logout().subscribe(() => {
      void this.router.navigate(['/login'], {
        queryParams: passwordChanged ? { passwordChanged: '1' } : {},
      });
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  private async loadStatus(): Promise<void> {
    try {
      const status = await firstValueFrom(this.firstRunService.load());
      this.currentDefault = status.currentDefault;
      if (!status.firstRun) {
        const identity = await this.principal.identity();
        void this.router.navigate([identity ? '/dashboard' : '/login']);
        return;
      }
      this.preselectLanguage();
    } catch {
      this.notificationService.showError('firstRun.error.title', 'firstRun.error.title', true);
    }
  }

  private async releaseSession(): Promise<void> {
    const identity = await this.principal.identity();
    if (identity) {
      await firstValueFrom(this.loginService.logout());
    }
  }

  private preselectLanguage(): void {
    if (this.languageChosen) {
      return;
    }
    const choice = this.uiLanguageChoice() || this.detectedShortname || this.currentDefault || this.languages[0]?.shortname || '';
    if (!choice || choice === this.languageModel().language) {
      return;
    }
    this.languageModel.update((model) => ({ ...model, language: choice }));
  }

  private uiLanguageChoice(): string {
    const stored = localStorage.getItem('lang') || '';
    if (!stored) {
      return '';
    }
    if (this.languages.length && !this.languages.some((language) => language.shortname === stored)) {
      return '';
    }
    return stored;
  }

  private applyUiLanguage(languages: Language[]): void {
    const chosen = this.translateService.getCurrentLang() || localStorage.getItem('lang') || this.detectedShortname;
    if (chosen && languages.some((language) => language.shortname === chosen)) {
      this.currentShortname = chosen;
      this.translateService.use(chosen);
    }
  }

}

function passwordErrors(choice: PasswordChoice): { kind: string }[] | undefined {
  const password = choice.password;
  const confirm = choice.confirmPassword;
  if (!password.trim()) {
    return [{ kind: 'required' }];
  }
  const errors: { kind: string }[] = [];
  if (password.length < PASSWORD_MIN) {
    errors.push({ kind: 'tooShort' });
  }
  if (password.length > PASSWORD_MAX) {
    errors.push({ kind: 'tooLong' });
  }
  if (password.toLowerCase() === 'admin') {
    errors.push({ kind: 'sameAsUsername' });
  }
  if (password !== confirm) {
    errors.push({ kind: 'mismatch' });
  }
  return errors.length ? errors : undefined;
}
