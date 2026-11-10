import { provideZoneChangeDetection } from "@angular/core";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { defineCustomElements as jeepSqlite } from "jeep-sqlite/loader";
import { AppModule } from "./app/app.module";

platformBrowserDynamic()
  .bootstrapModule(AppModule, {
    applicationProviders: [provideZoneChangeDetection()],
  })
  .catch((err) => console.log(err));

jeepSqlite(window);
