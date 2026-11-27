import { TestBed } from '@angular/core/testing';

import { TranslateService } from '@ngx-translate/core';

import { SitnaApiService } from './sitna-api.service';
import { SitnaBaseLayerGuard } from './sitna-base-layer-guard.service';
import { NotificationService } from '../notifications/services/NotificationService';

class FakeMap {
  isLoaded = false;
  async addLayer(layer: { fail?: boolean }): Promise<string> {
    if (layer.fail) {
      throw new Error('Matrix set not found');
    }
    return 'added';
  }
}

describe('SitnaBaseLayerGuard', () => {
  let guard: SitnaBaseLayerGuard;
  let warning: jest.Mock;

  beforeEach(() => {
    warning = jest.fn();
    TestBed.configureTestingModule({
      providers: [
        SitnaBaseLayerGuard,
        { provide: SitnaApiService, useValue: { getTC: () => ({ Map: FakeMap }) } },
        { provide: NotificationService, useValue: { warning } },
        {
          provide: TranslateService,
          useValue: { instant: (key: string, params: { title: string }) => `${key}:${params.title}` }
        }
      ]
    });
    guard = TestBed.inject(SitnaBaseLayerGuard);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    guard.ensurePatched();
  });

  afterEach(() => {
    guard.restore();
    jest.restoreAllMocks();
  });

  it('skips a base layer that fails while the map loads, and names it', async () => {
    await expect(new FakeMap().addLayer({ fail: true, isBase: true, title: 'Orto' } as never)).resolves.toBeUndefined();
    expect(warning).toHaveBeenCalledWith('map.warning.baseLayerSkipped:Orto');
  });

  it('leaves a working base layer alone', async () => {
    await expect(new FakeMap().addLayer({ isBase: true, title: 'Topo' } as never)).resolves.toBe('added');
    expect(warning).not.toHaveBeenCalled();
  });

  it('still rejects a work layer that fails', async () => {
    await expect(new FakeMap().addLayer({ fail: true, title: 'Roads' } as never)).rejects.toThrow('Matrix set not found');
    expect(warning).not.toHaveBeenCalled();
  });

  it('still rejects a base layer that fails after the map has loaded', async () => {
    const map = new FakeMap();
    map.isLoaded = true;
    await expect(map.addLayer({ fail: true, isBase: true, title: 'Orto' } as never)).rejects.toThrow('Matrix set not found');
    expect(warning).not.toHaveBeenCalled();
  });

  it('installs the advice once', async () => {
    guard.ensurePatched();
    await new FakeMap().addLayer({ fail: true, isBase: true, title: 'Orto' } as never);
    expect(warning).toHaveBeenCalledTimes(1);
  });
});
