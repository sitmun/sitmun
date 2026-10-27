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
        { code: 'es', name: 'Cas'},
        { code: 'en', name: 'En'},
        { code: 'fr', name: 'Fr'},
        { code: 'ca', name: 'Cat'},
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

  getLanguageOptions() {
    return this.languages.options;
  }

  translateTag(tag: string) {
    return this.translate.get(tag);
  }
}
