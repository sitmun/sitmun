import { Injectable } from '@angular/core';

import type { AppCfg, AppTasks } from '@api/model/app-cfg';

import { SitnaApiService } from '../../services/sitna-api.service';
import { UIStateService } from '../../services/ui-state.service';
import type { Meld, MeldJoinPoint } from '../../types/meld.types';
import { ControlHandlerBase } from '../control-handler-base';
import { SitnaControlConfig } from '../control-handler.interface';
import {
  isLegendHeadingToggleTarget,
  shouldRefreshLegendOnPanelClick,
  syncLegendSymbolCollapse,
  toggleLegendSymbols
} from './legend-symbol-collapse';
import { syncLegendOrder } from './legend-work-layer-order';

declare function require(module: string): unknown;
const meld = require('meld') as Meld;

type LegendInfo = { legend?: Array<{ src?: string }> };

type RasterLegendTarget = {
  availableNames?: string[];
  names?: string[] | string;
  customLegend?: string;
  options?: { legendType?: string; legendURL?: string; stealth?: boolean };
  getInfo?: (name?: string) => LegendInfo;
  wrap?: { getInfo?: (name?: string) => LegendInfo };
};

type LegendChoice =
  | { kind: 'none' }
  | { kind: 'prioritize' }
  | { kind: 'legendUrl' }
  | { kind: 'static'; url: string };

function legendChoice(layer: {
  options?: { legendType?: string; legendURL?: string };
}): LegendChoice {
  const type = layer.options?.legendType;
  const url =
    typeof layer.options?.legendURL === 'string' ? layer.options.legendURL.trim() : '';
  if (type === 'LINK' && url) {
    return { kind: 'static', url };
  }
  if (type === 'LEGENDURL') {
    return { kind: 'legendUrl' };
  }
  if (type === 'LEGENDGRAPHIC') {
    return { kind: 'prioritize' };
  }
  return { kind: 'none' };
}

/**
 * Handler for the native SITNA legend control.
 *
 * Control Type: sitna.legend
 * Patches: Capas-parity LegendURL fallback when Raster.getLegend fails (#164)
 * Configuration: Simple div + optional parameters
 */
@Injectable({
  providedIn: 'root'
})
export class LegendControlHandler extends ControlHandlerBase {
  readonly controlIdentifier = 'sitna.legend';
  readonly sitnaConfigKey = 'legend';
  readonly requiredPatches = undefined;

  constructor(
    sitnaApi: SitnaApiService,
    private uiStateService: UIStateService
  ) {
    super(sitnaApi);
  }

  private getRasterPrototype(TC: any): any {
    return TC?.layer?.Raster?.prototype || TC?.wrap?.layer?.Raster?.prototype;
  }

  /**
   * Capas “i” uses getInfo().legend (capabilities Style/LegendURL).
   * sitna.legend calls getLegend(), which hard-requires DescribeLayer and
   * GetLegendGraphic on layer.url — broken for DiBa/ArcGIS WMS (#164).
   *
   * Also retries Legend.updateLayerTree when SITNA’s module-private
   * layerLoaded skipped insert (branch <ul> not ready / late LegendURL).
   */
  override async loadPatches(_context: AppCfg): Promise<void> {
    await this.withTCAsync(async (TC) => {
      const RasterProto = this.getRasterPrototype(TC);
      if (RasterProto?.getLegend && !RasterProto.__sitmunLegendUrlFallback) {
        const getLegendAdvice = meld.around(
          RasterProto,
          'getLegend',
          function (this: RasterLegendTarget, jp: MeldJoinPoint): unknown {
            const buildFromCapabilities = (): Promise<unknown[]> => {
              const names = Array.isArray(this.availableNames)
                ? this.availableNames
                : Array.isArray(this.names)
                  ? this.names
                  : typeof this.names === 'string' && this.names
                    ? [this.names]
                    : [];
              const resolveInfo = (name: string): LegendInfo | undefined => {
                if (typeof this.getInfo === 'function') {
                  return this.getInfo(name);
                }
                if (typeof this.wrap?.getInfo === 'function') {
                  return this.wrap.getInfo(name);
                }
                return undefined;
              };
              return Promise.all(
                names.map((name) => {
                  const src = resolveInfo(name)?.legend?.[0]?.src;
                  return src ? [{ layerName: name, src }] : null;
                })
              );
            };

            const choice = legendChoice(this);
            if (choice.kind === 'none') {
              return Promise.resolve([]);
            }
            if (choice.kind === 'legendUrl') {
              return buildFromCapabilities();
            }
            if (choice.kind === 'static') {
              delete this.customLegend;
              const names = Array.isArray(this.availableNames)
                ? this.availableNames
                : Array.isArray(this.names)
                  ? this.names
                  : typeof this.names === 'string' && this.names
                    ? [this.names]
                    : [];
              return Promise.resolve(
                names.map((name) => [{ layerName: name, src: choice.url }])
              );
            }

            return Promise.resolve(jp.proceed() as Promise<unknown>)
              .then((result) => {
                if (Array.isArray(result) && result.filter(Boolean).length > 0) {
                  return result;
                }
                return buildFromCapabilities();
              })
              .catch(() => buildFromCapabilities());
          }
        );

        RasterProto.__sitmunLegendUrlFallback = true;
        this.patchManager.add(() => {
          getLegendAdvice.remove();
          delete RasterProto.__sitmunLegendUrlFallback;
        });
      }

      const LegendProto = TC?.control?.Legend?.prototype;
      if (LegendProto?.updateLayerTree && !LegendProto.__sitmunLegendTreeRetry) {
        const treeAdvice = meld.around(
          LegendProto,
          'updateLayerTree',
          function (
            this: {
              div?: HTMLElement;
              removeLayer?: (layer: { id?: string }) => void;
            },
            jp: MeldJoinPoint
          ): unknown {
            const layer = jp.args[0] as {
              id?: string;
              isBase?: boolean;
              options?: { stealth?: boolean; legendType?: string; legendURL?: string };
              customLegend?: string;
              availableNames?: string[];
              getInfo?: (name?: string) => LegendInfo;
            };
            const choice = layer ? legendChoice(layer) : ({ kind: 'none' } as const);
            const restore: Array<() => void> = [];
            if (choice.kind === 'static' && layer) {
              delete layer.customLegend;
            }
            if (choice.kind === 'none' && layer) {
              const originalInfo = layer.getInfo;
              const originalNames = layer.availableNames;
              layer.getInfo = () => ({});
              layer.availableNames = [];
              restore.push(() => {
                layer.getInfo = originalInfo;
                layer.availableNames = originalNames;
              });
            } else if (
              choice.kind === 'static' &&
              layer?.availableNames?.length &&
              !layer.availableNames.some((name) => !!layer.getInfo?.(name)?.legend?.length)
            ) {
              const originalInfo = layer.getInfo;
              layer.getInfo = (name?: string) => {
                const info = originalInfo?.(name) ?? {};
                return info.legend?.length
                  ? info
                  : { ...info, legend: [{ src: choice.url }] };
              };
              restore.push(() => {
                layer.getInfo = originalInfo;
              });
            }
            const shouldShow = (target: typeof layer): boolean => {
              if (!target || target.isBase || target.options?.stealth) {
                return false;
              }
              const targetChoice = legendChoice(target);
              if (targetChoice.kind === 'none') {
                return false;
              }
              if (targetChoice.kind === 'static' || target.customLegend) {
                return true;
              }
              if (!target.availableNames) {
                return true;
              }
              return target.availableNames.some(
                (name) => !!target.getInfo?.(name)?.legend?.length
              );
            };

            const pending = Promise.resolve(jp.proceed() as Promise<unknown>);
            restore.forEach((undo) => undo());
            return pending.then(
              (result) => {
                const ul = this.div?.querySelector('ul.tc-ctl-legend-branch');
                const existing =
                  layer?.id != null
                    ? this.div?.querySelector(
                        `sitna-layer-legend[data-layer-id="${layer.id}"]`
                      )
                    : null;
                if (!shouldShow(layer) || !ul || existing) {
                  return result;
                }
                // Clears sticky module-private layerLoaded when DOM node missing.
                this.removeLayer?.(layer);
                return jp.proceed();
              }
            );
          }
        );

        LegendProto.__sitmunLegendTreeRetry = true;
        this.patchManager.add(() => {
          treeAdvice.remove();
          delete LegendProto.__sitmunLegendTreeRetry;
        });
      }

      // Issue repro opens Legend after LAYERADD. LayerLegend.getLegend no-ops while
      // the left drawer is off-screen; refresh tree + symbology when it expands.
      this.wireLegendPanelOpenRefresh(TC);
      this.wireLegendSymbolCollapse();
      this.wireLegendWorkLayerOrder();
    });
  }

  private wireLegendPanelOpenRefresh(TC: any): void {
    if ((document as any).__sitmunLegendPanelRefreshPending) {
      return;
    }
    (document as any).__sitmunLegendPanelRefreshPending = true;

    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let attachedPanel: HTMLElement | null = null;
    let panelObserver: MutationObserver | null = null;
    let waitObserver: MutationObserver | null = null;

    const refresh = (leftPanel: HTMLElement): void => {
      if (
        leftPanel.classList.contains('tc-collapsed-left') ||
        leftPanel.classList.contains('tc-collapsed')
      ) {
        return;
      }
      const legendTab = leftPanel.querySelector('#legend-tab');
      const legendCtl = leftPanel.querySelector(
        '#tc-slot-legend.tc-ctl-legend, .tc-ctl-legend'
      );
      if (!legendCtl || legendTab?.classList.contains('tc-hidden')) {
        return;
      }
      const mapEl = document.querySelector('.tc-map');
      if (!TC?.Map?.get || !mapEl) {
        return;
      }
      const map = TC.Map.get(mapEl);
      const legend =
        map.getControlsByClass?.(TC.control.Legend)?.[0] ||
        (map.controls || []).find(
          (c: { CLASS?: string; div?: HTMLElement }) =>
            c?.CLASS === 'tc-ctl-legend' ||
            c?.div?.classList?.contains('tc-ctl-legend')
        );
      if (!legend?.updateLayerTree) {
        return;
      }
      void (async () => {
        for (const layer of [...(map.workLayers || [])]) {
          await legend.updateLayerTree(layer, true);
        }
        await Promise.all(
          Array.from(legendCtl.querySelectorAll('sitna-layer-legend')).map(
            (el) => {
              const node = el as HTMLElement & {
                getLegend?: () => Promise<unknown> | void;
              };
              return Promise.resolve(node.getLegend?.());
            }
          )
        );
      })();
    };

    const scheduleRefresh = (): void => {
      if (!attachedPanel) {
        return;
      }
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      // After script.js toggles classes / visibility on legend-tab click.
      refreshTimer = setTimeout(() => refresh(attachedPanel!), 150);
    };

    const onPanelClick = (event: Event): void => {
      if (!shouldRefreshLegendOnPanelClick(event.target)) {
        return;
      }
      scheduleRefresh();
    };

    const attach = (leftPanel: HTMLElement): void => {
      if ((leftPanel as any).__sitmunLegendPanelRefresh) {
        return;
      }
      attachedPanel = leftPanel;
      panelObserver = new MutationObserver(scheduleRefresh);
      panelObserver.observe(leftPanel, {
        attributes: true,
        attributeFilter: ['class']
      });
      leftPanel.addEventListener('click', onPanelClick, true);
      (leftPanel as any).__sitmunLegendPanelRefresh = true;
      waitObserver?.disconnect();
      waitObserver = null;
    };

    const existing = document.querySelector(
      'section.tc-left-panel, .tc-left-panel'
    ) as HTMLElement | null;
    if (existing) {
      attach(existing);
    } else {
      waitObserver = new MutationObserver(() => {
        const panel = document.querySelector(
          'section.tc-left-panel, .tc-left-panel'
        ) as HTMLElement | null;
        if (panel) {
          attach(panel);
        }
      });
      waitObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }

    this.patchManager.add(() => {
      panelObserver?.disconnect();
      waitObserver?.disconnect();
      if (attachedPanel) {
        attachedPanel.removeEventListener('click', onPanelClick, true);
        delete (attachedPanel as any).__sitmunLegendPanelRefresh;
      }
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      delete (document as any).__sitmunLegendPanelRefreshPending;
    });
  }

  private wireLegendSymbolCollapse(): void {
    if ((document as Document & { __sitmunLegendSymbolCollapse?: boolean })
      .__sitmunLegendSymbolCollapse) {
      return;
    }
    (
      document as Document & { __sitmunLegendSymbolCollapse?: boolean }
    ).__sitmunLegendSymbolCollapse = true;

    const knownIds = new Set<string>();
    let slot: HTMLElement | null = null;
    let listObserver: MutationObserver | null = null;
    let waitObserver: MutationObserver | null = null;

    const sync = (): void => {
      if (!slot) {
        return;
      }
      syncLegendSymbolCollapse(
        Array.from(slot.querySelectorAll('sitna-layer-legend')),
        knownIds
      );
    };

    const onClick = (event: Event): void => {
      if (!isLegendHeadingToggleTarget(event.target)) {
        return;
      }
      const entry = (event.target as Element).closest('sitna-layer-legend');
      if (entry instanceof HTMLElement) {
        toggleLegendSymbols(entry);
      }
    };

    const attach = (next: HTMLElement): void => {
      if (slot === next) {
        return;
      }
      slot?.removeEventListener('click', onClick);
      listObserver?.disconnect();
      slot = next;
      slot.addEventListener('click', onClick);
      listObserver = new MutationObserver(sync);
      listObserver.observe(slot, { childList: true, subtree: true });
      sync();
    };

    const existing = document.getElementById('tc-slot-legend');
    if (existing) {
      attach(existing);
    } else {
      waitObserver = new MutationObserver(() => {
        const found = document.getElementById('tc-slot-legend');
        if (found) {
          attach(found);
          waitObserver?.disconnect();
          waitObserver = null;
        }
      });
      waitObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }

    this.patchManager.add(() => {
      listObserver?.disconnect();
      waitObserver?.disconnect();
      slot?.removeEventListener('click', onClick);
      delete (document as Document & { __sitmunLegendSymbolCollapse?: boolean })
        .__sitmunLegendSymbolCollapse;
    });
  }

  private wireLegendWorkLayerOrder(): void {
    const doc = document as Document & { __sitmunLegendWorkLayerOrder?: boolean };
    if (doc.__sitmunLegendWorkLayerOrder) {
      return;
    }
    doc.__sitmunLegendWorkLayerOrder = true;

    let scheduled = false;
    let wlmList: HTMLElement | null = null;
    let legendList: HTMLElement | null = null;
    let wlmObserver: MutationObserver | null = null;
    let legendObserver: MutationObserver | null = null;
    let waitObserver: MutationObserver | null = null;

    const sync = (): void => {
      scheduled = false;
      if (!wlmList || !legendList) {
        return;
      }
      syncLegendOrder(legendList, wlmList);
    };

    const schedule = (): void => {
      if (scheduled) {
        return;
      }
      scheduled = true;
      queueMicrotask(sync);
    };

    const attach = (): void => {
      const nextWlm = document.querySelector(
        '.tc-ctl-wlm .tc-ctl-wlm-content > ul'
      ) as HTMLElement | null;
      const nextLegend = document.querySelector(
        '#tc-slot-legend ul.tc-ctl-legend-branch'
      ) as HTMLElement | null;
      if (nextWlm && nextWlm !== wlmList) {
        wlmObserver?.disconnect();
        wlmList = nextWlm;
        wlmObserver = new MutationObserver(schedule);
        wlmObserver.observe(wlmList, { childList: true });
      }
      if (nextLegend && nextLegend !== legendList) {
        legendObserver?.disconnect();
        legendList = nextLegend;
        legendObserver = new MutationObserver(schedule);
        legendObserver.observe(legendList, { childList: true });
      }
      if (wlmList && legendList) {
        schedule();
        waitObserver?.disconnect();
        waitObserver = null;
      }
    };

    attach();
    if (!wlmList || !legendList) {
      waitObserver = new MutationObserver(attach);
      waitObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }

    this.patchManager.add(() => {
      wlmObserver?.disconnect();
      legendObserver?.disconnect();
      waitObserver?.disconnect();
      delete doc.__sitmunLegendWorkLayerOrder;
    });
  }

  override buildConfiguration(
    task: AppTasks,
    context: AppCfg
  ): SitnaControlConfig | null {
    const config = super.buildConfiguration(task, context);
    this.uiStateService.enableLegendButton();
    return config;
  }
}
