import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy, Platform } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { LanguageService } from './services/language.service';
import { InstancesService } from './services/instances.service';
import { AuthorizationService } from './services/authorization.service';
import { DatabaseService } from './services/database.service';
import { ProxyService } from './services/proxy.service';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { LoginService } from './services/login.service';
import { SQLiteService } from './services/sqlite.service';
import { MapService } from './services/map.service';

export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (createTranslateLoader),
        deps: [HttpClient]
      }
    })
  ],
  providers: [
    {
      provide: RouteReuseStrategy,
      useClass: IonicRouteStrategy
    },
    Platform,
    LanguageService,
    InstancesService,
    AuthorizationService,
    LoginService,
    DatabaseService,
    SQLiteService,
    ProxyService,
    MapService,
    TranslateService, provideHttpClient()],
  bootstrap: [AppComponent],
})
export class AppModule {}
