import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { RouteReuseStrategy } from "@angular/router";

import { IonicModule, IonicRouteStrategy, Platform } from "@ionic/angular";

import { AppComponent } from "./app.component";
import { AppRoutingModule } from "./app-routing.module";
import { LanguageService } from "./services/language.service";
import { InstancesService } from "./services/instances.service";
import { AuthorizationService } from "./services/authorization.service";
import { DatabaseService } from "./services/database.service";
import { ProxyService } from "./services/proxy.service";
import { TranslatePipe, provideTranslateService } from "@ngx-translate/core";
import { provideHttpClient, withXhr } from "@angular/common/http";
import { provideTranslateHttpLoader } from "@ngx-translate/http-loader";

import { LoginService } from "./services/login.service";
import { SQLiteService } from "./services/sqlite.service";
import { MapService } from "./services/map.service";

@NgModule({
  declarations: [AppComponent],
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
    LanguageService,
    InstancesService,
    AuthorizationService,
    LoginService,
    DatabaseService,
    SQLiteService,
    ProxyService,
    MapService,
    provideHttpClient(withXhr()),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
