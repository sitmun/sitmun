import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { RouteReuseStrategy } from "@angular/router";

import { IonicModule, IonicRouteStrategy, Platform } from "@ionic/angular";
import { provideTranslateHttpLoader } from "@ngx-translate/http-loader";

import { TranslatePipe, provideTranslateService } from "@ngx-translate/core";
import { AppComponent } from "./app.component";
import { AppRoutingModule } from "./app-routing.module";
import { provideHttpClient, withXhr } from "@angular/common/http";
import { AuthorizationService } from "./services/authorization.service";
import { RequestService } from "./services/request.service";
import { InstancesService } from "./services/instances.service";
import { LanguageService } from "./services/language.service";
import { DatabaseService } from "./services/database.service";
import { SQLiteService } from "./services/sqlite.service";
import { TruncatePipe } from "./components/truncate.pipe";
import { MapaService } from "./services/mapa.service";

@NgModule({
  declarations: [AppComponent, TruncatePipe],
  exports: [TruncatePipe],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    TranslatePipe,
  ],
  providers: [
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: "./assets/i18n/",
        suffix: ".json",
      }),
    }),
    {
      provide: RouteReuseStrategy,
      useClass: IonicRouteStrategy,
    },
    Platform,
    InstancesService,
    LanguageService,
    AuthorizationService,
    RequestService,
    DatabaseService,
    SQLiteService,
    MapaService,
    provideHttpClient(withXhr()),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
