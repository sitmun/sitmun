import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateLoader, TranslateService, provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { environment } from '@environments/environment';

import { BackendWaitingComponent } from './backend-waiting.component';

describe('BackendWaitingComponent', () => {
  let fixture: ComponentFixture<BackendWaitingComponent>;

  beforeEach(async () => {
    localStorage.setItem('lang', 'ca');
    await TestBed.configureTestingModule({
      imports: [BackendWaitingComponent],
      providers: [
        provideTranslateService({
          loader: {
            provide: TranslateLoader,
            useFactory: () => ({ getTranslation: () => of({}) }),
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BackendWaitingComponent);
    fixture.detectChanges();
  });

  it('shows a waiting sentence instead of an error', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(fixture.nativeElement.querySelector('.welcome-mark, .welcome-logo')).toBeNull();
    expect(fixture.nativeElement.querySelector('.waiting-status mat-spinner')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.product-title').textContent).toBe(
      `SITMUN 3 - ${environment.version}`,
    );
    expect(text).toContain('backend.waiting.title');
    expect(text).not.toContain('firstRun.title');
    expect(text).toContain('backend.waiting.body');
    expect(text).not.toContain('backend.error.initialization.title');
  });

  it('offers only the languages configured for this page', () => {
    const button = fixture.nativeElement.querySelector('.language-toolbar-button') as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.getAttribute('aria-label')).toBe('entity.login.language');
    expect(button.textContent).toContain('CA');
    expect(fixture.componentInstance.languages).toEqual(environment.waitingPageLanguages);
  });

  it('stores the language chosen on this page', () => {
    fixture.componentInstance.changeLanguage('es');
    fixture.detectChanges();

    expect(localStorage.getItem('lang')).toBe('es');
    expect(TestBed.inject(TranslateService).getCurrentLang()).toBe('es');
    const button = fixture.nativeElement.querySelector('.language-toolbar-button') as HTMLButtonElement;
    expect(button.textContent).toContain('ES');
  });

  afterEach(() => localStorage.removeItem('lang'));
});
