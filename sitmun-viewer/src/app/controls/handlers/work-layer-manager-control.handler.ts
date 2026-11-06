import { inject, Injectable } from '@angular/core';

import type { AppCfg } from '@api/model/app-cfg';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';


import { catalogLayerPathTitles } from './catalog-layer-path';
import {
  collapseCatalogCompositeWorkLayerPath,
  removeOrphanWorkLayerElements
} from './work-layer-display-path';
import {
  collectionOrderFromList,
  showWorkLayerStackTopFirst
} from './work-layer-stack-order';
import { ConfigLookupService } from '../../services/config-lookup.service';
import { SitnaApiService } from '../../services/sitna-api.service';
import type { Meld, MeldJoinPoint } from '../../types/meld.types';
import { ControlHandlerBase } from '../control-handler-base';

declare function require(module: string): any;

const meld = require('meld') as Meld;

const WLM_ELEMENT_TEMPLATE_SUFFIX = '-elm';
const WLM_GFI_CLASS = 'sitmun-wlm-gfi';
/** Sitna icon font `--icon-info` (PUA). SITMUN 2 associates “i” with GetFeatureInfo. */
const SITNA_ICON_INFO = '\ue923';
/** Material Icons ligature for layer metadata (not Sitna “i” / GFI). */
const MATERIAL_ICON_ARTICLE = 'article';

type CatalogLegendNode = {
  title?: string;
  name?: string;
  uid?: unknown;
  visibilityState?: number;
  children?: CatalogLegendNode[];
  legend?: unknown;
};

/** SITNA Consts.visibility.HAS_VISIBLE. A catalog folder is not a capabilities node. */
const CATALOG_FOLDER_VISIBILITY = 2;
const WLM_PATH_SEPARATOR = ' \u203A ';

function catalogLegendFolderUid(titles: string[], index: number): string {
  return `sitmun-catalog:${titles.slice(0, index + 1).join('::')}`;
}

function legendLayerNames(layer: { names?: string[] }): string[] {
  return (layer.names ?? []).filter((name) => name.length > 0);
}

function matchesLegendName(nodeName: string, names: Set<string>): boolean {
  if (names.has(nodeName)) {
    return true;
  }
  const separator = nodeName.indexOf(':');
  const bare = separator >= 0 ? nodeName.slice(separator + 1) : nodeName;
  return bare !== nodeName && names.has(bare);
}

function findNamedLegendNodes(
  tree: CatalogLegendNode,
  names: string[]
): CatalogLegendNode[] {
  const wanted = new Set(names);
  const found: CatalogLegendNode[] = [];
  const walk = (node: CatalogLegendNode): void => {
    if (typeof node.name === 'string' && matchesLegendName(node.name, wanted)) {
      found.push(node);
      return;
    }
    for (const child of node.children ?? []) {
      walk(child);
    }
  };
  walk(tree);
  return found;
}

function nestCatalogLegendTree(
  leaf: CatalogLegendNode | null | undefined,
  titles: string[]
): CatalogLegendNode | null | undefined {
  if (!leaf || titles.length <= 1) {
    return leaf;
  }
  const breadcrumb = titles.slice(1).join(WLM_PATH_SEPARATOR);
  const symbolRow: CatalogLegendNode = {
    ...leaf,
    title: breadcrumb,
    name: typeof leaf.name === 'string' ? leaf.name : breadcrumb,
    // SITNA refreshes the single legend row whose id equals the layer id.
    // A catalog row keeps its own id so that refresh does not paste the tree inside it.
    uid: catalogLegendFolderUid(titles, titles.length - 1),
    // Keep the capabilities VISIBLE state. HAS_VISIBLE makes Legend.updateScale
    // skip this leaf and hide the whole entry as out of scale.
    children: Array.isArray(leaf.children) ? leaf.children.slice() : []
  };
  const wrapped: CatalogLegendNode = {
    title: titles[0],
    name: titles[0],
    uid: catalogLegendFolderUid(titles, 0),
    visibilityState: CATALOG_FOLDER_VISIBILITY,
    children: [symbolRow]
  };
  return wrapped;
}

function catalogNestedLegend(
  layer: {
    names?: string[];
    options?: { nodeId?: string };
    __sitmunNestedLegend?: {
      source: CatalogLegendNode;
      key: string;
      tree: CatalogLegendNode;
    };
  },
  tree: CatalogLegendNode | null | undefined,
  appCfg: AppCfg | undefined
): CatalogLegendNode | null | undefined {
  const nodeId = layer.options?.nodeId;
  if (!nodeId || !tree || !appCfg) {
    return tree;
  }
  const titles = catalogLayerPathTitles(nodeId, appCfg);
  if (titles.length <= 1) {
    return tree;
  }
  const names = legendLayerNames(layer);
  const key = `${titles.join('\0')}::${names.join('\0')}`;
  const cached = layer.__sitmunNestedLegend;
  if (cached && cached.source === tree && cached.key === key) {
    return cached.tree;
  }
  const named = names.length > 0 ? findNamedLegendNodes(tree, names) : [];
  const leaf = named.length === 1 ? named[0] : tree;
  const nested = nestCatalogLegendTree(leaf, titles);
  if (nested && nested !== tree) {
    layer.__sitmunNestedLegend = { source: tree, key, tree: nested };
  }
  return nested ?? tree;
}

function wfsLegendSources(legend: unknown): string[] {
  const sources: string[] = [];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== 'object') {
      return;
    }
    const record = value as { src?: unknown; symbols?: unknown };
    if (typeof record.src === 'string' && record.src.length > 0) {
      sources.push(record.src);
    }
    if (record.symbols) {
      walk(record.symbols);
    }
  };
  walk(legend);
  return sources;
}

function wfsTreeLegendSources(tree: unknown): string[] {
  if (!tree || typeof tree !== 'object') {
    return [];
  }
  const record = tree as { legend?: unknown; children?: unknown };
  const sources = wfsLegendSources(record.legend);
  if (Array.isArray(record.children)) {
    for (const child of record.children) {
      sources.push(...wfsTreeLegendSources(child));
    }
  }
  return sources;
}

function setFeatureShowsPopup(
  layer: { features?: Array<{ showsPopup?: boolean }> },
  enabled: boolean
): void {
  for (const feature of layer.features ?? []) {
    feature.showsPopup = enabled;
  }
}

const GFI_I18N = {
  label: 'workLayerManager.gfi.label',
  on: 'workLayerManager.gfi.on',
  off: 'workLayerManager.gfi.off',
  unavailable: 'workLayerManager.gfi.unavailable'
} as const;

/**
 * Handler for the native SITNA workLayerManager control.
 * Patches catalog composite layers so Loaded Layers matches single-layer UX (#161).
 * Capas GFI toggle (Sitna info / “i” glyph) controls per-layer GetFeatureInfo via
 * `layer.options.sitmunGfiEnabled`.
 */
@Injectable({
  providedIn: 'root'
})
export class WorkLayerManagerControlHandler extends ControlHandlerBase {
  readonly controlIdentifier = 'sitna.workLayerManager';
  readonly sitnaConfigKey = 'workLayerManager';
  readonly requiredPatches = undefined;

  private readonly configLookup = inject(ConfigLookupService);
  private readonly translate = inject(TranslateService);
  private patchesApplied = false;
  private readonly wlmGfiObservers = new WeakMap<object, MutationObserver>();
  private readonly wlmGfiVisibilityHooks = new WeakSet<object>();
  private readonly wlmGfiTracked = new WeakSet<object>();
  private readonly wlmGfiChangeHooks = new WeakSet<object>();
  private wlmDecorating = false;
  private readonly wlmGfiRoots = new Set<ParentNode>();
  private readonly wlmGfiControls = new Set<object>();
  private langChangeSub?: Subscription;

  constructor(sitnaApi: SitnaApiService) {
    super(sitnaApi);
  }

  override async loadPatches(_context: AppCfg): Promise<void> {
    if (this.patchesApplied) {
      return;
    }

    await this.patchCatalogCompositeDisplayPath();
    await this.patchWfsScaleRow();
    await this.patchCatalogLegendTree();
    await this.patchWorkLayerStackOrder();
    await this.patchWlmGfiDecoration();
    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      for (const control of this.wlmGfiControls) {
        this.decorateGfiIndicators(control);
      }
    });
    this.patchManager.add(() => {
      this.langChangeSub?.unsubscribe();
      this.langChangeSub = undefined;
    });
    this.patchesApplied = true;
  }

  override cleanup(): void {
    for (const root of this.wlmGfiRoots) {
      root.querySelectorAll(`.${WLM_GFI_CLASS}`).forEach((el) => el.remove());
    }
    this.wlmGfiRoots.clear();
    this.wlmGfiControls.clear();
    super.cleanup();
    this.patchesApplied = false;
  }

  private gfiLabel(): string {
    return this.translate.instant(GFI_I18N.label);
  }

  private gfiTitle(blocked: boolean, enabled: boolean): string {
    const key = blocked
      ? GFI_I18N.unavailable
      : enabled
        ? GFI_I18N.on
        : GFI_I18N.off;
    return this.translate.instant(key);
  }

  private async patchCatalogCompositeDisplayPath(): Promise<void> {
    await this.withTCAsync(async (TC) => {
      const wlmProto = TC?.control?.WorkLayerManager?.prototype;
      if (!wlmProto || typeof wlmProto.getRenderedHtml !== 'function') {
        return;
      }

      const advice = meld.around(
        wlmProto,
        'getRenderedHtml',
        function (this: any, joinPoint: MeldJoinPoint): unknown {
          const templateId = joinPoint.args[0] as string;
          const layerData = joinPoint.args[1] as
            | { id?: string; path?: string[][] }
            | undefined;

          if (
            typeof templateId === 'string' &&
            templateId.endsWith(WLM_ELEMENT_TEMPLATE_SUFFIX) &&
            layerData &&
            Array.isArray(layerData.path) &&
            this.map &&
            typeof this.map.getLayer === 'function'
          ) {
            const layer = this.map.getLayer(layerData.id);
            const nodeId = layer?.options?.nodeId as string | undefined;
            const layerNameCount = Array.isArray(layer?.names)
              ? layer.names.length
              : 0;

            if (nodeId && layerNameCount > 1) {
              layerData.path = collapseCatalogCompositeWorkLayerPath(
                layerData.path,
                { nodeId, layerNameCount }
              );
            }
          }

          const rendered = joinPoint.proceed();
          // Abort late elm HTML when the layer was removed during legend fetch.
          if (
            typeof templateId === 'string' &&
            templateId.endsWith(WLM_ELEMENT_TEMPLATE_SUFFIX) &&
            layerData?.id &&
            this.map &&
            typeof this.map.getLayer === 'function'
          ) {
            const map = this.map;
            const layerId = layerData.id;
            return Promise.resolve(rendered).then((html) => {
              if (!map.getLayer(layerId)) {
                // Never settle: SITNA's then() must not insert a Capas LI.
                return new Promise(() => undefined);
              }
              return html;
            });
          }
          return rendered;
        }
      );

      this.patchManager.add(() => advice.remove());
    });
  }

  private async patchWfsScaleRow(): Promise<void> {
    await this.withTCAsync(async (TC) => {
      const wlmProto = TC?.control?.WorkLayerManager?.prototype;
      if (!wlmProto || typeof wlmProto.updateScale !== 'function') {
        return;
      }
      if (wlmProto.__sitmunWfsScale) {
        return;
      }

      const advice = meld.around(
        wlmProto,
        'updateScale',
        function (this: {
          CLASS: string;
          map?: {
            getLayer?: (id: string) =>
              | {
                  type?: string;
                  minResolution?: number;
                  maxResolution?: number;
                  options?: {
                    type?: string;
                    minResolution?: number;
                    maxResolution?: number;
                  };
                }
              | undefined;
            getResolution?: () => number;
          };
          getLayerUIElements?: () => HTMLElement[];
        }, joinPoint: MeldJoinPoint): unknown {
          const result = joinPoint.proceed();
          const resolution = this.map?.getResolution?.();
          const rows = this.getLayerUIElements?.() ?? [];
          for (const li of rows) {
            const layer = this.map?.getLayer?.(li.dataset['layerId'] ?? '');
            if (
              !layer ||
              (layer.type !== 'WFS' && layer.options?.type !== 'WFS')
            ) {
              continue;
            }
            const min = layer.options?.minResolution ?? layer.minResolution;
            const max = layer.options?.maxResolution ?? layer.maxResolution;
            let visible = true;
            if (typeof resolution === 'number') {
              if (typeof min === 'number' && resolution < min) {
                visible = false;
              }
              if (typeof max === 'number' && resolution > max) {
                visible = false;
              }
            }
            li.classList.toggle(this.CLASS + '-elm-notvisible', !visible);
          }
          return result;
        }
      );
      wlmProto.__sitmunWfsScale = true;
      this.patchManager.add(() => {
        advice.remove();
        delete wlmProto.__sitmunWfsScale;
      });
    });
  }

  private async patchCatalogLegendTree(): Promise<void> {
    await this.withTCAsync(async (TC) => {
      this.adviseCatalogLegendTree(TC?.layer?.Vector?.prototype, (layer) => {
        return layer.type === 'WFS' || layer.options?.type === 'WFS';
      });
      this.adviseCatalogLegendTree(TC?.layer?.Raster?.prototype, () => true);
    });
  }

  private adviseCatalogLegendTree(
    proto:
      | {
          getTree?: () => unknown;
          __sitmunCatalogLegendTree?: boolean;
        }
      | undefined,
    applies: (layer: {
      type?: string;
      options?: { type?: string };
    }) => boolean
  ): void {
    if (
      !proto ||
      typeof proto.getTree !== 'function' ||
      proto.__sitmunCatalogLegendTree
    ) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const handler = this;
    const advice = meld.around(
      proto,
      'getTree',
      function (
        this: {
          type?: string;
          options?: { type?: string; nodeId?: string };
          __sitmunNestedLegend?: {
            source: CatalogLegendNode;
            key: string;
            tree: CatalogLegendNode;
          };
        },
        joinPoint: MeldJoinPoint
      ): unknown {
        const tree = joinPoint.proceed() as
          | CatalogLegendNode
          | null
          | undefined;
        if (!applies(this)) {
          return tree;
        }
        return catalogNestedLegend(
          this,
          tree,
          handler.sitnaApi.getGlobal('currentAppCfg') ?? undefined
        );
      }
    );
    proto.__sitmunCatalogLegendTree = true;
    this.patchManager.add(() => {
      advice.remove();
      delete proto.__sitmunCatalogLegendTree;
    });
  }

  private async patchWorkLayerStackOrder(): Promise<void> {
    await this.withTCAsync(async (TC) => {
      const wlmProto = TC?.control?.WorkLayerManager?.prototype as
        | {
            updateLayerOrder?: () => void;
            __sitmunWorkLayerStackOrder?: boolean;
          }
        | undefined;
      if (
        !wlmProto ||
        typeof wlmProto.updateLayerOrder !== 'function' ||
        wlmProto.__sitmunWorkLayerStackOrder
      ) {
        return;
      }
      const advice = meld.around(
        wlmProto,
        'updateLayerOrder',
        function (
          this: {
            div?: HTMLElement;
            map?: {
              layers?: Array<{
                id?: string;
                isBase?: boolean;
                wrap?: { layer?: object };
              }>;
              workLayers?: Array<{ id?: string }>;
              wrap?: {
                getLayerIndex?: (olLayer: object) => number;
                insertLayer?: (olLayer: object, index: number) => void;
                map?: {
                  getLayers?: () => {
                    remove?: (olLayer: object) => void;
                  };
                };
              };
            };
          },
          joinPoint: MeldJoinPoint
        ): void {
          const list = this.div?.querySelector('ul');
          const listedIds = list
            ? [...list.children].map(
                (row) => (row as HTMLElement).dataset['layerId'] ?? ''
              )
            : [];
          const desiredBottomToTop = collectionOrderFromList(listedIds);
          const map = this.map;
          const layers = map?.layers;
          if (desiredBottomToTop.length > 1 && layers && map?.wrap) {
            const byId = new Map(layers.map((layer) => [layer.id ?? '', layer]));
            const collection = map.wrap.map?.getLayers?.();
            const getLayerIndex = map.wrap.getLayerIndex;
            const insertLayer = map.wrap.insertLayer;
            if (collection?.remove && getLayerIndex && insertLayer) {
              const placed = desiredBottomToTop
                .map((id) => byId.get(id))
                .filter((layer) => !!layer?.wrap?.layer)
                .map((layer) => ({
                  ol: layer!.wrap!.layer as object,
                  idx: getLayerIndex.call(map.wrap, layer!.wrap!.layer as object)
                }))
                .filter((item) => item.idx >= 0);
              if (placed.length > 1) {
                const start = Math.min(...placed.map((item) => item.idx));
                for (const item of [...placed].sort((a, b) => b.idx - a.idx)) {
                  collection.remove?.(item.ol);
                }
                desiredBottomToTop.forEach((id, offset) => {
                  const olLayer = byId.get(id)?.wrap?.layer;
                  if (olLayer) {
                    insertLayer.call(map.wrap, olLayer, start + offset);
                  }
                });
              }
            }
            const slots: number[] = [];
            layers.forEach((layer, index) => {
              if (layer.id && desiredBottomToTop.includes(layer.id)) {
                slots.push(index);
              }
            });
            slots.forEach((index, offset) => {
              const next = byId.get(desiredBottomToTop[offset]);
              if (next) {
                layers[index] = next;
              }
            });
            map.workLayers = layers.filter((layer) => !layer.isBase);
          }
          joinPoint.proceed();
          if (list instanceof HTMLElement) {
            showWorkLayerStackTopFirst(list);
          }
        }
      );
      wlmProto.__sitmunWorkLayerStackOrder = true;
      this.patchManager.add(() => {
        advice.remove();
        delete wlmProto.__sitmunWorkLayerStackOrder;
      });
    });
  }

  private async patchWlmGfiDecoration(): Promise<void> {
    await this.withTCAsync(async (TC) => {
      const wlmProto = TC?.control?.WorkLayerManager?.prototype;
      if (!wlmProto || typeof wlmProto.updateLayerTree !== 'function') {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const handler = this;
      const advice = meld.around(
        wlmProto,
        'updateLayerTree',
        function (this: any, joinPoint: MeldJoinPoint): unknown {
          handler.ensureWlmGfiObserver(this);
          const result = joinPoint.proceed();
          handler.paintMissingWfsLegends(this);
          queueMicrotask(() => {
            handler.scrubOrphanWorkLayerRows(this);
            handler.decorateGfiIndicators(this);
          });
          return result;
        }
      );

      this.patchManager.add(() => {
        advice.remove();
      });
    });
  }

  private paintMissingWfsLegends(wlmControl: {
    map?: {
      getLayer?: (id: string) =>
        | {
            type?: string;
            options?: { type?: string };
            getTree?: () => { legend?: unknown };
          }
        | undefined;
    };
    getLayerUIElements?: () => HTMLElement[];
  }): void {
    const rows = wlmControl.getLayerUIElements?.() ?? [];
    for (const li of rows) {
      if (li.querySelector('.tc-ctl-wlm-legend img, .tc-ctl-wlm-custom-legend img')) {
        continue;
      }
      const layer = wlmControl.map?.getLayer?.(li.dataset['layerId'] ?? '');
      if (!layer || (layer.type !== 'WFS' && layer.options?.type !== 'WFS')) {
        continue;
      }
      const sources = wfsTreeLegendSources(layer.getTree?.());
      if (!sources.length) {
        continue;
      }
      const box = document.createElement('div');
      box.className = 'tc-ctl-wlm-legend';
      for (const src of sources) {
        const img = document.createElement('img');
        img.setAttribute('data-img', src);
        box.append(img);
      }
      li.append(box);
    }
  }

  private ensureWlmGfiObserver(wlmControl: any): void {
    const div = wlmControl?.div as HTMLElement | undefined;
    const map = wlmControl?.map;
    if (!div) {
      return;
    }

    if (!this.wlmGfiControls.has(wlmControl)) {
      this.wlmGfiControls.add(wlmControl);
      this.patchManager.add(() => this.wlmGfiControls.delete(wlmControl));
    }

    if (!this.wlmGfiObservers.has(wlmControl)) {
      const observe = (): void => {
        observer.observe(div, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class']
        });
      };
      const observer = new MutationObserver(() => {
        // Decorating writes the same subtree. Disconnect so those writes
        // cannot schedule another pass.
        observer.disconnect();
        try {
          this.scrubOrphanWorkLayerRows(wlmControl);
          this.decorateGfiIndicators(wlmControl);
        } finally {
          observe();
        }
      });
      observe();
      this.wlmGfiObservers.set(wlmControl, observer);
      this.patchManager.add(() => {
        observer.disconnect();
        this.wlmGfiObservers.delete(wlmControl);
      });
    }

    if (
      map &&
      typeof map.on === 'function' &&
      !this.wlmGfiVisibilityHooks.has(wlmControl)
    ) {
      const onVisibility = () => this.decorateGfiIndicators(wlmControl);
      map.on('layervisibility.tc', onVisibility);
      map.on('layervisibility', onVisibility);
      this.wlmGfiVisibilityHooks.add(wlmControl);
      this.patchManager.add(() => {
        if (typeof map.off === 'function') {
          map.off('layervisibility.tc', onVisibility);
          map.off('layervisibility', onVisibility);
        }
      });
    }

    if (!this.wlmGfiChangeHooks.has(wlmControl)) {
      const onChange = (event: Event) => {
        const target = event.target as HTMLElement | null;
        if (!target?.classList?.contains(WLM_GFI_CLASS)) {
          return;
        }
        const li = target.closest(
          'li.tc-ctl-wlm-elm[data-layer-id]'
        ) as HTMLElement | null;
        const layerId = li?.dataset['layerId'];
        if (!li || !layerId || typeof map?.getLayer !== 'function') {
          return;
        }
        if (
          li.classList.contains('tc-ctl-wlm-elm-notvisible') ||
          target.hasAttribute('disabled')
        ) {
          return;
        }
        const layer = map.getLayer(layerId);
        if (!layer?.options) {
          return;
        }
        const checked = target.hasAttribute('checked');
        layer.options.sitmunGfiEnabled = checked;
        setFeatureShowsPopup(layer, checked);
        target.setAttribute(
          'data-sitmun-wlm-gfi',
          checked ? 'enabled' : 'off'
        );
        target.title = this.gfiTitle(false, checked);
      };
      div.addEventListener('change', onChange);
      this.wlmGfiChangeHooks.add(wlmControl);
      this.patchManager.add(() => {
        div.removeEventListener('change', onChange);
        this.wlmGfiChangeHooks.delete(wlmControl);
      });
    }
  }

  /** Remove Capas LIs left behind by SITNA's async updateLayerTree race. */
  private scrubOrphanWorkLayerRows(wlmControl: any): void {
    const div = wlmControl?.div as ParentNode | undefined;
    const map = wlmControl?.map;
    if (!div || !map || typeof map.getLayer !== 'function') {
      return;
    }
    removeOrphanWorkLayerElements(div, (id) => map.getLayer(id));
  }

  /** Inject / sync Capas GFI toggles for queryable catalog leaves. */
  private decorateGfiIndicators(wlmControl: any): void {
    if (this.wlmDecorating) {
      return;
    }
    this.wlmDecorating = true;
    try {
      this.decorateGfiIndicatorsNow(wlmControl);
    } finally {
      queueMicrotask(() => {
        this.wlmDecorating = false;
      });
    }
  }

  private decorateGfiIndicatorsNow(wlmControl: any): void {
    const div = wlmControl?.div as ParentNode | undefined;
    const map = wlmControl?.map;
    if (!div || !map || typeof map.getLayer !== 'function') {
      return;
    }

    this.ensureWlmGfiObserver(wlmControl);
    this.wlmGfiRoots.add(div);
    if (!this.wlmGfiTracked.has(wlmControl)) {
      this.wlmGfiTracked.add(wlmControl);
      this.patchManager.add(() => {
        div.querySelectorAll(`.${WLM_GFI_CLASS}`).forEach((el) => el.remove());
        this.wlmGfiRoots.delete(div);
      });
    }

    div.querySelectorAll('li.tc-ctl-wlm-elm[data-layer-id]').forEach((node) => {
      const li = node as HTMLElement;
      const layerId = li.dataset['layerId'];
      if (!layerId) {
        return;
      }

      const layer = map.getLayer(layerId);
      const nodeId = layer?.options?.nodeId as string | undefined;
      const tools = li.querySelector('.tc-ctl-wlm-tools');
      if (!tools || !nodeId) {
        return;
      }
      this.syncWfsWorkLayerRow(li, layer);
      if (!this.configLookup.isQueryableLeaf(nodeId)) {
        // Consultable off on the tree node: hide Capas GFI and block identify.
        li.querySelector(`:scope .${WLM_GFI_CLASS}`)?.remove();
        if (layer?.options) {
          layer.options.sitmunGfiEnabled = false;
          setFeatureShowsPopup(layer, false);
        }
        return;
      }

      if (layer.options && layer.options.sitmunGfiEnabled === undefined) {
        layer.options.sitmunGfiEnabled = true;
      }
      const userOn = layer.options?.sitmunGfiEnabled !== false;

      let gfi = tools.querySelector(`:scope > .${WLM_GFI_CLASS}`) as
        | HTMLElement
        | null;
      if (gfi && gfi.tagName !== 'SITNA-TOGGLE') {
        gfi.remove();
        gfi = null;
      }
      const meta = tools.querySelector(
        ':scope > .tc-ctl-wlm-cb-info, :scope > sitna-toggle.tc-ctl-wlm-cb-info'
      ) as HTMLElement | null;
      if (meta) {
        meta.setAttribute('checked-icon-text', MATERIAL_ICON_ARTICLE);
        meta.setAttribute('unchecked-icon-text', MATERIAL_ICON_ARTICLE);
      }
      if (!gfi) {
        gfi = document.createElement('sitna-toggle');
        gfi.className = WLM_GFI_CLASS;
        gfi.setAttribute('checked-icon-text', SITNA_ICON_INFO);
        gfi.setAttribute('unchecked-icon-text', SITNA_ICON_INFO);
        if (meta) {
          tools.insertBefore(gfi, meta);
        } else {
          tools.insertBefore(gfi, tools.firstChild);
        }
      }

      const blocked =
        li.classList.contains('tc-ctl-wlm-elm-notvisible') ||
        (typeof layer?.getVisibility === 'function' &&
          layer.getVisibility() === false);
      const state = blocked ? 'disabled' : userOn ? 'enabled' : 'off';
      if (gfi.getAttribute('data-sitmun-wlm-gfi') !== state) {
        gfi.setAttribute('data-sitmun-wlm-gfi', state);
      }
      gfi.toggleAttribute('disabled', blocked);
      gfi.setAttribute('aria-disabled', blocked ? 'true' : 'false');
      gfi.toggleAttribute('checked', userOn);
      gfi.setAttribute('aria-label', this.gfiLabel());
      gfi.title = this.gfiTitle(blocked, userOn);
    });
  }

  private syncWfsWorkLayerRow(
    li: HTMLElement,
    layer: {
      id?: string;
      type?: string;
      title?: string;
      tree?: unknown;
      options?: { type?: string; nodeId?: string };
    }
  ): void {
    if (layer.type !== 'WFS' && layer.options?.type !== 'WFS') {
      return;
    }
    const nodeId = layer.options?.nodeId;
    const leafTitle = nodeId
      ? this.configLookup.findNode(nodeId)?.title?.trim()
      : undefined;
    if (leafTitle) {
      const heading = this.wfsWorkLayerHeading(nodeId);
      const titleEl = li.querySelector('.tc-ctl-wlm-lyr') as HTMLElement | null;
      if (titleEl && heading) {
        if (titleEl.textContent !== heading) {
          titleEl.textContent = heading;
        }
        if (titleEl.title !== heading) {
          titleEl.title = heading;
        }
      }
      const description = this.wfsWorkLayerDescription(nodeId);
      const pathEl = li.querySelector('.tc-ctl-wlm-path') as HTMLElement | null;
      if (pathEl && description) {
        if (pathEl.textContent !== description) {
          pathEl.textContent = description;
        }
        if (pathEl.title !== description) {
          pathEl.title = description;
        }
      }
      if (layer.title !== leafTitle) {
        layer.title = leafTitle;
        layer.tree = null;
      }
    }

    const tools = li.querySelector('.tc-ctl-wlm-tools');
    if (!tools) {
      return;
    }
    tools.querySelectorAll(':scope > sitna-button').forEach((button) => {
      if (
        button.classList.contains('tc-ctl-wlm-btn-zoom') ||
        button.classList.contains('tc-ctl-wlm-btn-del') ||
        button.classList.contains('tc-ctl-wlm-btn-more')
      ) {
        return;
      }
      button.classList.add('tc-ctl-wlm-btn-dl');
    });
  }

  private wfsWorkLayerHeading(nodeId: string | undefined): string {
    const titles = this.catalogPathTitles(nodeId);
    return titles.length > 1 ? titles[0] : '';
  }

  private wfsWorkLayerDescription(nodeId: string | undefined): string {
    return this.catalogPathTitles(nodeId).slice(1).join(WLM_PATH_SEPARATOR);
  }

  private catalogPathTitles(nodeId: string | undefined): string[] {
    if (!nodeId) {
      return [];
    }
    const appCfg = this.sitnaApi.getGlobal('currentAppCfg');
    if (!appCfg) {
      return [];
    }
    return catalogLayerPathTitles(nodeId, appCfg);
  }
}
