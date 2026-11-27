import { ToastController } from '@ionic/angular';

import { FeatureInfoService } from './feature-info.service';
import { InstancesService } from './instances.service';
import { LanguageService } from './language.service';
import { MapService } from './map.service';

jest.mock('@ionic/angular', () => ({ ToastController: class {} }));
jest.mock('@capacitor/geolocation', () => ({ Geolocation: {} }));
jest.mock('@capacitor/filesystem', () => ({ Filesystem: {}, Directory: {} }));

const units: Record<string, string> = {
  'EPSG:3857': 'm',
  'EPSG:25831': 'm',
  'EPSG:4326': 'degrees',
};

describe('MapService.initMap projection', () => {
  let mapCtor: jest.Mock;
  let service: MapService;

  const profile = (srs: string) => ({
    application: {
      srs,
      pointOfInterest: { x: 600000, y: 4420000 },
      initialExtent: [570000, 4400000, 610000, 4440000],
    },
    trees: [],
    layers: [],
    services: [],
    tasks: [],
  });

  beforeEach(() => {
    jest.useFakeTimers();
    const facade = {
      setBbox: jest.fn(),
      setZoom: jest.fn(),
      setCenter: jest.fn(),
      addLayers: jest.fn(),
      addPlugin: jest.fn(),
    };
    mapCtor = jest.fn(() => facade);
    (globalThis as any).M = {
      config: jest.fn(),
      proxy: jest.fn(),
      map: mapCtor,
      plugin: { Information: jest.fn() },
    };
    (globalThis as any).ol = {
      proj: {
        get: (code: string) => (units[code] ? { getUnits: () => units[code] } : null),
        transform: (c: number[]) => c,
      },
    };
    service = new MapService(
      {} as ToastController,
      {} as LanguageService,
      { init: jest.fn() } as unknown as FeatureInfoService,
      {} as InstancesService,
    );
  });

  afterEach(() => jest.useRealTimers());

  it('creates the map in the application projection', async () => {
    await service.initMap('map', profile('EPSG:25831'), 9, [], '');
    expect(mapCtor).toHaveBeenCalledWith(expect.objectContaining({ projection: 'EPSG:25831*m' }));
    expect(service.mapProj).toBe('EPSG:25831');
  });

  it('uses degree units for a geographic application projection', async () => {
    await service.initMap('map', profile('EPSG:4326'), 9, [], '');
    expect(mapCtor).toHaveBeenCalledWith(expect.objectContaining({ projection: 'EPSG:4326*d' }));
  });

  it('falls back to Web Mercator when the projection is unknown', async () => {
    await service.initMap('map', profile('EPSG:99999'), 9, [], '');
    expect(mapCtor).toHaveBeenCalledWith(expect.objectContaining({ projection: 'EPSG:3857*m' }));
    expect(service.mapProj).toBe('EPSG:3857');
  });
});
