import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {

  private languageSubscribed: any = null;
  languages = {
    default: 'ca',
    options: [
        { code: 'ca', name: 'Cat', value: 'cat' },
        { code: 'es', name: 'Cas', value: 'cast' },
        { code: 'en', name: 'En', value: 'angl' },
        { code: 'fr', name: 'Fr', value: 'fran' },
    ]
  };

  constructor(private translate: TranslateService) {
    this.translate.setDefaultLang(this.languages.default);
    this.setInitialLanguage();
  }

  setInitialLanguage() {
    Preferences.get({key: 'language'}).then(storageLanguage => {
      if (storageLanguage.value) {
        this.setLanguage(storageLanguage.value);
      } else {
        this.setLanguage(this.languages.default);
      }
    });
  }

  subscribeLang(callback: any) {
    this.languageSubscribed = this.translate.onLangChange.subscribe(callback);
  }

  unsubscribeLang() {
    this.languageSubscribed.unsubscribe();
    this.languageSubscribed = null;
  }
  
  loadLang = (labels: Record<string, string>) => {
    const messages: any = {};
    Object.keys(labels).forEach(label => {
      this.translate.get(labels[label]).subscribe(value => {
        messages[label] = value
      })
    });
    return messages;
  }

  setLanguage(langCode: string) {
    this.languages.default = langCode;
    this.translate.use(langCode);
    Preferences.set({key: 'language', value: langCode});
  }

  getLanguage() {
    return this.languages.default;
  }

  getLanguageValue() {
    const languageOption = this.languages.options.find(lang => lang.code === this.languages.default);
    return languageOption ? languageOption.value : null;
  }

  getLocale() {
    return `${this.languages.default}-${this.languages.default.toUpperCase()}`;
  }

  getLanguageOptions() {
    return this.languages.options;
  }

  translateTag(tag: string) {
    return this.translate.get(tag);
  }
}
