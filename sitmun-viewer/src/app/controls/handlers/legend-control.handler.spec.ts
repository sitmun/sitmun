import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { AppCfg, AppTasks } from '@api/model/app-cfg';

import { LegendControlHandler } from './legend-control.handler';
import { AppConfigService } from '../../services/app-config.service';
import { SitnaApiService } from '../../services/sitna-api.service';
import { UIStateService } from '../../services/ui-state.service';

/**
 * SITNA prints customLegend by itself and drops the tree. Legend URL and a
 * static image both stay in the symbol slot under the existing titles.
 */
function renderEmbeddedLegendEntry(
  layer: { title: string; childTitle: string; customLegend?: string },
  legendResult: Array<Array<{ src?: string }>>
): HTMLElement {
  const entry = document.createElement('sitna-layer-legend');
  if (layer.customLegend) {
    entry.innerHTML = layer.customLegend;
    return entry;
  }
  const src = legendResult[0]?.[0]?.src ?? '';
  entry.innerHTML =
    '<li class="tc-ctl-legend-node">' +
    `<div class="tc-ctl-legend-title">${layer.title}</div>` +
    '<ul class="tc-ctl-legend-branch"><li class="tc-ctl-legend-node">' +
    `<div class="tc-ctl-legend-title">${layer.childTitle}</div>` +
    `<div class="tc-ctl-legend-watch"><img src="${src}" alt=""></div>` +
    '</li></ul></li>';
  return entry;
}

function expectEmbeddedLegendSymbol(
  entry: HTMLElement,
  title: string,
  childTitle: string,
  src: string
): void {
  expect(entry.querySelectorAll('.tc-ctl-legend-title')[0]?.textContent).toBe(title);
  expect(entry.querySelectorAll('.tc-ctl-legend-title')[1]?.textContent).toBe(childTitle);
  expect(entry.querySelector('.tc-ctl-legend-watch img')?.getAttribute('src')).toBe(src);
  expect(entry.querySelector(':scope > img')).toBeNull();
}

describe('LegendControlHandler', () => {
  let handler: LegendControlHandler;
  let mockSitnaApi: jest.Mocked<SitnaApiService>;
  let mockAppConfigService: jest.Mocked<AppConfigService>;
  let mockUIStateService: jest.Mocked<UIStateService>;
  let mockAppCfg: AppCfg;
  let TC: {
    layer: {
      Raster: {
        prototype: {
          getLegend: jest.Mock;
          getInfo?: jest.Mock;
          __sitmunLegendUrlFallback?: boolean;
        };
      };
    };
    control: {
      Legend: {
        prototype: {
          updateLayerTree: jest.Mock;
          removeLayer: jest.Mock;
          div?: HTMLElement;
          __sitmunLegendTreeRetry?: boolean;
        };
      };
    };
  };

  beforeEach(() => {
    TC = {
      layer: {
        Raster: {
          prototype: {
            getLegend: jest.fn()
          }
        }
      },
      control: {
        Legend: {
          prototype: {
            updateLayerTree: jest.fn().mockResolvedValue(undefined),
            removeLayer: jest.fn()
          }
        }
      }
    };

    mockSitnaApi = {
      getTC: jest.fn().mockReturnValue(TC),
      getSITNA: jest.fn().mockReturnValue({} as any),
      getTCProperty: jest.fn(),
      isReady: jest.fn().mockReturnValue(true)
    } as Partial<jest.Mocked<SitnaApiService>> as jest.Mocked<SitnaApiService>;

    mockAppConfigService = {
      getControlDefault: jest.fn().mockReturnValue({ div: 'tc-slot-legend' })
    } as Partial<
      jest.Mocked<AppConfigService>
    > as jest.Mocked<AppConfigService>;

    mockUIStateService = {
      enableLegendButton: jest.fn(),
      disableLegendButton: jest.fn(),
      isLegendButtonEnabled: jest.fn()
    } as Partial<jest.Mocked<UIStateService>> as jest.Mocked<UIStateService>;

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        LegendControlHandler,
        { provide: SitnaApiService, useValue: mockSitnaApi },
        { provide: AppConfigService, useValue: mockAppConfigService },
        { provide: UIStateService, useValue: mockUIStateService }
      ]
    });

    handler = TestBed.inject(LegendControlHandler);

    mockAppCfg = {
      application: {
        id: 1,
        title: 'Test App',
        type: 'test',
        theme: 'default',
        srs: 'EPSG:25831',
        initialExtent: [0, 0, 100, 100]
      },
      backgrounds: [],
      groups: [],
      layers: [],
      services: [],
      tasks: [],
      trees: []
    };
  });

  it('should be created', () => {
    expect(handler).toBeTruthy();
  });

  describe('controlIdentifier', () => {
    it('should have correct control identifier', () => {
      expect(handler.controlIdentifier).toBe('sitna.legend');
    });
  });

  describe('requiredPatches', () => {
    it('should have no required patches', () => {
      expect(handler.requiredPatches).toBeUndefined();
    });
  });

  describe('buildConfiguration()', () => {
    it('should return configuration with default div', () => {
      const task: AppTasks = {
        'ui-control': 'sitna.legend',
        parameters: {}
      } as any;
      const context: AppCfg = {} as any;

      const config = handler.buildConfiguration(task, context);

      expect(config).toEqual({ div: 'tc-slot-legend' });
      expect(mockUIStateService.enableLegendButton).toHaveBeenCalled();
    });

    it('should merge task parameters', () => {
      const task: AppTasks = {
        'ui-control': 'sitna.legend',
        parameters: {
          position: 'top-left',
          collapsible: true
        }
      } as any;
      const context: AppCfg = {} as any;

      const config = handler.buildConfiguration(task, context);

      expect(config).toEqual({
        div: 'tc-slot-legend',
        position: 'top-left',
        collapsible: true
      });
      expect(mockUIStateService.enableLegendButton).toHaveBeenCalled();
    });

    it('should allow parameters to override div', () => {
      const task: AppTasks = {
        'ui-control': 'sitna.legend',
        parameters: {
          div: 'custom-legend-div'
        }
      } as any;
      const context: AppCfg = {} as any;

      const config = handler.buildConfiguration(task, context);

      expect(config?.div).toBe('custom-legend-div');
      expect(mockUIStateService.enableLegendButton).toHaveBeenCalled();
    });

    it('should always call enableLegendButton', () => {
      const task: AppTasks = {
        'ui-control': 'sitna.legend',
        parameters: {}
      } as any;
      const context: AppCfg = {} as any;

      handler.buildConfiguration(task, context);

      expect(mockUIStateService.enableLegendButton).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadPatches() LegendURL fallback (#164)', () => {
    it('falls back to getInfo LegendURL when native getLegend rejects', async () => {
      TC.layer.Raster.prototype.getLegend.mockRejectedValue(
        new Error('The request not allowed.')
      );

      await handler.loadPatches(mockAppCfg);

      const layer = Object.create(TC.layer.Raster.prototype);
      layer.options = { legendType: 'LEGENDGRAPHIC' };
      layer.availableNames = ['CAE1M_141A'];
      layer.getInfo = jest.fn().mockReturnValue({
        legend: [{ src: 'http://127.0.0.1:18093/legend?layer=CAE1M_141A' }]
      });

      const result = await layer.getLegend(true);
      expect(result).toEqual([
        [
          {
            layerName: 'CAE1M_141A',
            src: 'http://127.0.0.1:18093/legend?layer=CAE1M_141A'
          }
        ]
      ]);
      expect(layer.getInfo).toHaveBeenCalledWith('CAE1M_141A');
    });

    it('falls back when native getLegend returns empty entries', async () => {
      TC.layer.Raster.prototype.getLegend.mockResolvedValue([null, null]);

      await handler.loadPatches(mockAppCfg);

      const layer = Object.create(TC.layer.Raster.prototype);
      layer.options = { legendType: 'LEGENDGRAPHIC' };
      layer.availableNames = ['L1'];
      layer.getInfo = jest.fn().mockReturnValue({
        legend: [{ src: 'http://example.com/legend.png' }]
      });

      const result = await layer.getLegend(false);
      expect(result).toEqual([
        [{ layerName: 'L1', src: 'http://example.com/legend.png' }]
      ]);
    });

    it('keeps native getLegend result when it has usable entries', async () => {
      const native = [[{ layerName: 'L1', src: 'data:image/png;base64,abc' }]];
      TC.layer.Raster.prototype.getLegend.mockResolvedValue(native);

      await handler.loadPatches(mockAppCfg);

      const layer = Object.create(TC.layer.Raster.prototype);
      layer.options = { legendType: 'LEGENDGRAPHIC' };
      layer.availableNames = ['L1'];
      layer.getInfo = jest.fn();

      const result = await layer.getLegend(true);
      expect(result).toBe(native);
      expect(layer.getInfo).not.toHaveBeenCalled();
    });

    it('embeds the capabilities image for LEGENDURL and does not call native getLegend', async () => {
      const native = TC.layer.Raster.prototype.getLegend;
      await handler.loadPatches(mockAppCfg);

      const layer = Object.create(TC.layer.Raster.prototype);
      layer.options = { legendType: 'LEGENDURL' };
      layer.availableNames = ['L1'];
      layer.getInfo = jest.fn().mockReturnValue({
        legend: [{ src: 'http://example.com/capabilities.png' }]
      });

      const result = await layer.getLegend(true);
      const entry = renderEmbeddedLegendEntry(
        {
          title: 'Gestió municipal',
          childTitle: 'Illes urbanes',
          customLegend: layer.customLegend
        },
        result
      );

      expect(result).toEqual([
        [{ layerName: 'L1', src: 'http://example.com/capabilities.png' }]
      ]);
      expect(layer.customLegend).toBeUndefined();
      expectEmbeddedLegendSymbol(
        entry,
        'Gestió municipal',
        'Illes urbanes',
        'http://example.com/capabilities.png'
      );
      expect(native).not.toHaveBeenCalled();
    });

    it('embeds a static legend image the same way as a Legend URL symbol', async () => {
      const native = TC.layer.Raster.prototype.getLegend;
      await handler.loadPatches(mockAppCfg);

      const layer = Object.create(TC.layer.Raster.prototype);
      const url =
        'https://raw.githubusercontent.com/sitmun/community/master/logotip%20SITMUN%20JPG/horitzontal/01.principal-horit-normal.jpg';
      layer.options = { legendType: 'LINK', legendURL: url };
      layer.availableNames = ['CAE1M_112L_FF'];

      const result = await layer.getLegend(true);
      const entry = renderEmbeddedLegendEntry(
        {
          title: 'Gestió municipal',
          childTitle: 'Carrers',
          customLegend: layer.customLegend
        },
        result
      );

      expect(result).toEqual([[{ layerName: 'CAE1M_112L_FF', src: url }]]);
      expect(layer.customLegend).toBeUndefined();
      expectEmbeddedLegendSymbol(entry, 'Gestió municipal', 'Carrers', url);
      expect(native).not.toHaveBeenCalled();
    });

    it('returns no image for a blank WMS or WMTS legend type', async () => {
      const native = TC.layer.Raster.prototype.getLegend;
      await handler.loadPatches(mockAppCfg);

      const layer = Object.create(TC.layer.Raster.prototype);
      layer.availableNames = ['L1'];
      layer.getInfo = jest.fn().mockReturnValue({
        legend: [{ src: 'http://example.com/legend.png' }]
      });

      const result = await layer.getLegend(true);
      expect(result).toEqual([]);
      expect(native).not.toHaveBeenCalled();
      expect(layer.getInfo).not.toHaveBeenCalled();
    });

    it('restores prototype and guard marker on cleanup', async () => {
      const original = TC.layer.Raster.prototype.getLegend;
      const originalTree = TC.control.Legend.prototype.updateLayerTree;
      await handler.loadPatches(mockAppCfg);
      expect(TC.layer.Raster.prototype.getLegend).not.toBe(original);
      expect(TC.layer.Raster.prototype.__sitmunLegendUrlFallback).toBe(true);
      expect(TC.control.Legend.prototype.updateLayerTree).not.toBe(originalTree);
      expect(TC.control.Legend.prototype.__sitmunLegendTreeRetry).toBe(true);

      handler.cleanup();

      expect(TC.layer.Raster.prototype.getLegend).toBe(original);
      expect(TC.layer.Raster.prototype.__sitmunLegendUrlFallback).toBeUndefined();
      expect(TC.control.Legend.prototype.updateLayerTree).toBe(originalTree);
      expect(TC.control.Legend.prototype.__sitmunLegendTreeRetry).toBeUndefined();
    });

    it('retries updateLayerTree when LegendURL exists but DOM node is missing', async () => {
      const branch = document.createElement('ul');
      branch.className = 'tc-ctl-legend-branch';
      const div = document.createElement('div');
      div.appendChild(branch);
      TC.control.Legend.prototype.div = div;
      const updateMock = TC.control.Legend.prototype.updateLayerTree;
      updateMock.mockResolvedValue(undefined);

      await handler.loadPatches(mockAppCfg);

      const legend = Object.create(TC.control.Legend.prototype);
      legend.div = div;
      legend.removeLayer = TC.control.Legend.prototype.removeLayer;

      const layer = {
        id: 'wl-1',
        isBase: false,
        options: { legendType: 'LEGENDGRAPHIC' },
        availableNames: ['L1'],
        getInfo: jest.fn().mockReturnValue({
          legend: [{ src: 'http://example.com/legend.png' }]
        })
      };

      await legend.updateLayerTree(layer, true);

      expect(TC.control.Legend.prototype.removeLayer).toHaveBeenCalledWith(layer);
      expect(updateMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('Integration', () => {
    it('should handle full lifecycle', async () => {
      await handler.loadPatches(mockAppCfg);

      const task: AppTasks = {
        'ui-control': 'sitna.legend',
        parameters: { custom: 'value' }
      } as any;
      const context: AppCfg = {} as any;

      const config = handler.buildConfiguration(task, context);
      expect(config).toBeDefined();
      expect(config?.div).toBe('tc-slot-legend');
      expect(mockUIStateService.enableLegendButton).toHaveBeenCalled();
    });
  });
});
