import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  NgModule,
  NO_ERRORS_SCHEMA,
  Provider,
  Type,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  getTestBed,
  TestBed,
  TestModuleMetadata,
} from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { App } from '@capacitor/app';
import { Geolocation } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';
import { Http } from '@capacitor-community/http';
import { IonicModule } from '@ionic/angular';
import {
  TranslateFakeLoader,
  TranslateLoader,
  TranslateModule,
} from '@ngx-translate/core';
import { of } from 'rxjs';
import { DatabaseService } from '../app/services/database.service';
import { MapaService } from '../app/services/mapa.service';
import { RequestService } from '../app/services/request.service';
import { SQLiteService } from '../app/services/sqlite.service';

const EMPTY_NAV_STATE = {
  rootNode: { id: 'headless-root', children: [] as string[] },
  nodes: [] as { id: string; title: string }[],
  taskNodes: [{ mapping: {}, action: '', viewMode: '' }],
  tasks: [{ id: 'headless/0', url: '', parameters: {} }],
  features: [] as unknown[],
  parentData: { features: [] as unknown[], activeLayer: '*' },
  category: { id: 0 },
  activeLayer: '*',
};

class HeadlessSqlite {
  readonly isService = true;
  readonly native = false;
  readonly platform = 'karma' as const;
  sqlite: null = null;

  getPlatform(): 'karma' {
    return this.platform;
  }

  initializePlugin(): void {
    return;
  }

  async initializeWebStore(): Promise<void> {
    return;
  }

  async isConnection(
    _database: string,
    _readonly?: boolean,
  ): Promise<{ result: false }> {
    return { result: false };
  }

  async createConnection(
    database: string,
    _encrypted: boolean,
    _mode: string,
    _version: number,
    _readonly?: boolean,
  ): Promise<never> {
    return Promise.reject(new Error(`headless sqlite: ${database}`));
  }

  async retrieveConnection(
    database: string,
    _readonly?: boolean,
  ): Promise<never> {
    return Promise.reject(new Error(`headless sqlite: ${database}`));
  }

  async closeConnection(_database: string, _readonly?: boolean): Promise<void> {
    return;
  }

  async retrieveAllConnections(): Promise<Map<string, unknown>> {
    return new Map();
  }

  async closeAllConnections(): Promise<void> {
    return;
  }
}

const OVERLAY_IMPORTS = [
  CommonModule,
  FormsModule,
  IonicModule,
  TranslateModule,
];

const OVERLAY_SCHEMAS = [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA];

@NgModule({
  imports: [
    IonicModule.forRoot(),
    TranslateModule.forRoot({
      defaultLanguage: 'ca',
      loader: {
        provide: TranslateLoader,
        useClass: TranslateFakeLoader,
      },
    }),
    RouterTestingModule.withRoutes([]),
  ],
  providers: [
    { provide: SQLiteService, useClass: HeadlessSqlite },
    {
      provide: ActivatedRoute,
      useValue: {
        queryParams: of({}),
        params: of({}),
        snapshot: { queryParams: {}, params: {}, data: {} },
      },
    },
  ],
})
class SitmunKarmaHarnessModule {}

function patchMethod(target: object, key: string, impl: (...args: never[]) => unknown): void {
  try {
    (target as Record<string, unknown>)[key] = impl;
  } catch {
    Object.defineProperty(target, key, {
      configurable: true,
      value: impl,
    });
  }
}

function installPluginShim(): void {
  patchMethod(Preferences, 'get', async () => ({ value: null }));
  patchMethod(Preferences, 'set', async () => undefined);
  patchMethod(Geolocation, 'checkPermissions', async () => ({
    location: 'granted',
    coarseLocation: 'granted',
  }));
  patchMethod(Geolocation, 'requestPermissions', async () => ({
    location: 'granted',
    coarseLocation: 'granted',
  }));
  patchMethod(App, 'exitApp', async () => undefined);
  patchMethod(Http, 'request', async () => ({ data: {} }));
  const originalFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof Request
          ? input.url
          : String(input);
    if (url.startsWith('http://localhost:9876') || url.startsWith('/')) {
      return originalFetch(input, init);
    }
    return Promise.resolve(
      new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }) as typeof fetch;
}

function emptyProfileRows(): Promise<{ json: string }[]> {
  return Promise.resolve([{ json: '[]' }]);
}

function componentSmokeProviders(): Provider[] {
  return [
    {
      provide: Router,
      useValue: {
        url: '/',
        events: of(),
        getCurrentNavigation: () => ({ extras: { state: EMPTY_NAV_STATE } }),
        navigateByUrl: () => Promise.resolve(true),
        navigate: () => Promise.resolve(true),
      },
    },
    {
      provide: MapaService,
      useValue: {
        initMap: () =>
          Promise.resolve({
            getProjection: () => ({ code: 'EPSG:3857' }),
            addLayers: () => undefined,
            getBaseLayers: () => [],
            removeLayers: () => undefined,
          }),
        createFeature: () => ({}),
        getBaseLayer: () => ({}),
      },
    },
    {
      provide: DatabaseService,
      useValue: {
        initDatabase: () => Promise.resolve(),
        addProfile: () => Promise.resolve(),
        getProfileData: () => emptyProfileRows(),
        getCategories: () => Promise.resolve([]),
        getFavorites: () => Promise.resolve([]),
      },
    },
    {
      provide: RequestService,
      useValue: {
        templateRequest: () => Promise.resolve([]),
      },
    },
  ];
}

function mergeOverlay(user: TestModuleMetadata): TestModuleMetadata {
  return {
    ...user,
    imports: [...OVERLAY_IMPORTS, ...(user.imports ?? [])],
    schemas: [...OVERLAY_SCHEMAS, ...(user.schemas ?? [])],
  };
}

function patchTestBed(): void {
  let configured = false;
  const bed = getTestBed() as TestBed & {
    configureTestingModule(moduleDef: TestModuleMetadata): TestBed;
    createComponent<T>(component: Type<T>): unknown;
    resetTestingModule(): TestBed;
  };
  const originalConfigure = bed.configureTestingModule.bind(bed);
  const originalCreate = bed.createComponent.bind(bed);
  const originalReset = bed.resetTestingModule.bind(bed);

  bed.configureTestingModule = (moduleDef: TestModuleMetadata) => {
    configured = true;
    return originalConfigure(mergeOverlay(moduleDef));
  };

  bed.createComponent = ((component: Type<unknown>) => {
    if (!configured) {
      bed.configureTestingModule({
        declarations: [component],
        providers: componentSmokeProviders(),
      });
    }
    return originalCreate(component);
  }) as typeof bed.createComponent;

  bed.resetTestingModule = () => {
    configured = false;
    return originalReset();
  };
}

let installed = false;

export function installSitmunKarmaHarness(): void {
  if (installed) {
    return;
  }
  installed = true;
  installPluginShim();
  getTestBed().initTestEnvironment(
    [BrowserDynamicTestingModule, SitmunKarmaHarnessModule],
    platformBrowserDynamicTesting(),
    { errorOnUnknownElements: false, errorOnUnknownProperties: false },
  );
  patchTestBed();
}
