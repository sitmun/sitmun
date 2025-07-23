import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy, Platform } from '@ionic/angular';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { AuthorizationService } from './services/authorization.service';
import { RequestService } from './services/request.service';
import { InstancesService } from './services/instances.service';
import { LanguageService } from './services/language.service';
import { DatabaseService } from './services/database.service';
import { SQLiteService } from './services/sqlite.service';
import { TruncatePipe } from './components/truncate.pipe';
import { MapaService } from './services/mapa.service';

export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    TruncatePipe
  ],
  exports: [TruncatePipe],
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
    InstancesService,
    LanguageService,
    AuthorizationService,
    RequestService,
    DatabaseService,
    SQLiteService,
    MapaService,
    TranslateService, provideHttpClient()
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
