import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { MaterialModule } from '@app/material-module';
import { toLanguageIsoCode } from '@app/services/language-iso';
import { readBrowserLanguages, resolveUiLanguage } from '@app/services/ui-language.resolver';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-backend-waiting',
  templateUrl: './backend-waiting.component.html',
  styleUrls: ['./backend-waiting.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [MaterialModule, NgOptimizedImage, TranslateModule],
})
export class BackendWaitingComponent implements OnInit {
  readonly languages = environment.waitingPageLanguages;
  readonly productTitle = `SITMUN 3 - ${environment.version}`;
  currentShortname = '';

  constructor(private readonly translateService: TranslateService) {}

  ngOnInit(): void {
    const chosen = resolveUiLanguage({
      stored: localStorage.getItem('lang') || this.translateService.currentLang,
      browser: readBrowserLanguages(),
      backendDefault: this.translateService.currentLang,
      availableShortnames: [...this.languages],
      staticFallback: this.languages[0] || 'en',
    });
    this.changeLanguage(chosen);
  }

  isoCode(shortname: string): string {
    return toLanguageIsoCode(shortname || '');
  }

  changeLanguage(shortname: string): void {
    if (!this.languages.includes(shortname)) {
      return;
    }
    this.currentShortname = shortname;
    this.translateService.use(shortname);
    this.translateService.setDefaultLang(shortname);
    localStorage.setItem('lang', shortname);
  }
}
