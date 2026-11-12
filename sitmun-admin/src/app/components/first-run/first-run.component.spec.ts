import { NgOptimizedImage } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField } from '@angular/forms/signals';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';

import { TranslateLoader, TranslatePipe, provideTranslateService } from '@ngx-translate/core';
import { BehaviorSubject, of } from 'rxjs';


import { LoginService } from '@app/core/auth/login.service';
import { Principal } from '@app/core/auth/principal.service';
import { LanguageService } from '@app/domain';
import { MaterialModule } from '@app/material-module';
import { FirstRunService } from '@app/services/first-run.service';
import { NotificationService } from '@app/services/notification.service';
import { environment } from '@environments/environment';

import { FirstRunComponent } from './first-run.component';

describe('FirstRunComponent', () => {
  let component: FirstRunComponent;
  let fixture: ComponentFixture<FirstRunComponent>;
  const router = { navigate: jest.fn() };
  const firstRunService = {
    load: () => of({ firstRun: true, currentDefault: 'en' }),
    clearCache: jest.fn(),
    save: jest.fn(),
  };
  const loginService = { logout: jest.fn(() => of(null)) };
  const principal = { identity: jest.fn(() => Promise.resolve(null)) };
  const languages$ = new BehaviorSubject<{ shortname: string; name: string }[]>([]);
  const languageService = {
    languagesToUse$: languages$.asObservable(),
  };

  beforeEach(async () => {
    router.navigate.mockReset();
    loginService.logout.mockClear();
    principal.identity.mockReset();
    principal.identity.mockResolvedValue(null);
    languages$.next([]);
    localStorage.removeItem('lang');
    await TestBed.configureTestingModule({
      declarations: [FirstRunComponent],
      imports: [
        FormField,
        MaterialModule,
        NgOptimizedImage,
        TranslatePipe,
      ],
      providers: [
        provideTranslateService({
          loader: {
            provide: TranslateLoader,
            useFactory: () => ({
              getTranslation: () => of({}),
            }),
          },
        }),
        provideRouter([]),
        provideNoopAnimations(),
        { provide: Router, useValue: router },
        { provide: LanguageService, useValue: languageService },
        { provide: FirstRunService, useValue: firstRunService },
        { provide: LoginService, useValue: loginService },
        { provide: Principal, useValue: principal },
        { provide: NotificationService, useValue: { showError: jest.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FirstRunComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => fixture?.destroy());

  it('keeps save available for a language that matches the current default', () => {
    expect(component.canSave()).toBe(false);
    component.passwordModel.set({ password: 'new-admin-pass', confirmPassword: 'new-admin-pass' });
    expect(component.canSave()).toBe(true);
    expect(component.languageModel().language).toBe('en');
  });

  it('opens on the welcome step and keeps the language selector in the second step', () => {
    const headers: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('mat-step-header');
    const panels: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.mat-vertical-stepper-content');

    expect(fixture.nativeElement.querySelector('.product-title').textContent).toBe(`SITMUN 3 - ${environment.version}`);
    expect(headers[0].textContent).toContain('firstRun.step.welcome');
    expect(panels[0].querySelector('mat-select')).toBeNull();
    expect(panels[1].querySelector('mat-select')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('mat-radio-group')).toBeNull();
  });

  it('always offers the admin password and no way to skip', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('firstRun.welcome.bodyAdmin');
    expect(text).not.toContain('firstRun.skip');
    expect(text).not.toContain('firstRun.password.otherAdmin');
    expect(fixture.nativeElement.querySelector('input[autocomplete="new-password"]')).not.toBeNull();
  });

  it('logs out an existing session when the stepper opens', async () => {
    fixture.destroy();
    loginService.logout.mockClear();
    principal.identity.mockResolvedValue({ username: 'admin' });
    fixture = TestBed.createComponent(FirstRunComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(loginService.logout).toHaveBeenCalled();
  });

  it('keeps the detected language, including Spanish, selected in the selector', async () => {
    const language = Object.getOwnPropertyDescriptor(Navigator.prototype, 'language');
    const languages = Object.getOwnPropertyDescriptor(Navigator.prototype, 'languages');
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'es-ES' });
    Object.defineProperty(navigator, 'languages', { configurable: true, value: ['es-ES', 'en'] });
    languages$.next([
      { shortname: 'ca', name: 'Català' },
      { shortname: 'es', name: 'Castellano' },
      { shortname: 'en', name: 'English' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.languageModel().language).toBe('es');
    expect(fixture.nativeElement.querySelector('mat-select')?.textContent).toContain('Castellano');
    expect(fixture.nativeElement.textContent).not.toContain('firstRun.language.detected');
    expect(fixture.nativeElement.textContent).not.toContain('firstRun.language.apply');
    expect(fixture.nativeElement.querySelector('.language-code')).toBeNull();

    if (language) {
      Object.defineProperty(navigator, 'language', language);
    }
    if (languages) {
      Object.defineProperty(navigator, 'languages', languages);
    }
  });

  it('uses a language chosen for the interface ahead of the browser', async () => {
    localStorage.setItem('lang', 'ca');
    const language = Object.getOwnPropertyDescriptor(Navigator.prototype, 'language');
    const languages = Object.getOwnPropertyDescriptor(Navigator.prototype, 'languages');
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'es-ES' });
    Object.defineProperty(navigator, 'languages', { configurable: true, value: ['es-ES'] });
    languages$.next([
      { shortname: 'ca', name: 'Català' },
      { shortname: 'es', name: 'Castellano' },
      { shortname: 'en', name: 'English' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.languageModel().language).toBe('ca');
    expect(component.currentDefault).toBe('en');

    if (language) {
      Object.defineProperty(navigator, 'language', language);
    }
    if (languages) {
      Object.defineProperty(navigator, 'languages', languages);
    }
  });

  it('follows a later interface language until the selector is used', () => {
    component.languages = [
      { shortname: 'ca', name: 'Català' },
      { shortname: 'es', name: 'Castellano' },
    ] as typeof component.languages;
    component.languageModel.update((model) => ({ ...model, language: 'es' }));

    component.changeLanguage('ca');
    expect(component.languageModel().language).toBe('ca');

    component.markLanguageChosen();
    component.changeLanguage('es');
    expect(component.languageModel().language).toBe('ca');
  });

  it('does not show the affected-values count', () => {
    component.languageModel.set({ language: 'ca' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('firstRun.language.previewAffected');
    expect(fixture.nativeElement.querySelector('.preview-card')).toBeNull();
    expect(component.languageForm().valid()).toBe(true);
  });

  it('requires a password and leaves the lock icon out of the fields', () => {
    expect(component.passwordForm().valid()).toBe(false);
    expect(hasPasswordError(component, 'required')).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('firstRun.skip');
    expect(fixture.nativeElement.textContent).not.toContain('firstRun.summary.passwordUnchanged');
    const fields: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('mat-form-field');
    for (const field of fields) {
      expect(field.textContent).not.toContain('lock');
    }
    expect(fixture.nativeElement.querySelector('.welcome-mark, .welcome-logo')).toBeNull();
  });

  it('rejects a password that is too short, too long, the username, or a mismatch', () => {

    component.passwordModel.set({ password: 'short', confirmPassword: 'short' });
    expect(hasPasswordError(component, 'tooShort')).toBe(true);

    component.passwordModel.set({ password: 'a'.repeat(51), confirmPassword: 'a'.repeat(51) });
    expect(hasPasswordError(component, 'tooLong')).toBe(true);

    component.passwordModel.set({ password: 'Admin', confirmPassword: 'Admin' });
    expect(hasPasswordError(component, 'sameAsUsername')).toBe(true);

    component.passwordModel.set({ password: 'new-admin-pass', confirmPassword: 'other-admin-pass' });
    expect(hasPasswordError(component, 'mismatch')).toBe(true);
    expect(component.canSave()).toBe(false);
  });

  it('does not save when Next or Back is clicked', () => {
    const save = jest.spyOn(component, 'save');
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    for (const button of buttons) {
      expect(button.getAttribute('type')).toBe('button');
    }

    fixture.nativeElement.querySelector('button.mat-stepper-next').click();
    fixture.nativeElement.querySelector('button.mat-stepper-previous').click();
    expect(save).not.toHaveBeenCalled();
  });

});

function hasPasswordError(component: FirstRunComponent, kind: string): boolean {
  return component.passwordForm().errors().some((error) => error.kind === kind);
}
