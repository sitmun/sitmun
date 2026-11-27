import { inject, Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { SitnaApiService } from './sitna-api.service';
import { NotificationService } from '../notifications/services/NotificationService';
import type { Meld, MeldJoinPoint } from '../types/meld.types';

declare function require(module: string): any;

const meld = require('meld') as Meld;

interface BaseLayerConfig {
  id?: string;
  title?: string;
  isBase?: boolean;
}

/**
 * Keeps one broken background from removing the others (#380).
 *
 * API-SITNA 4.10 adds the base layers in a loop with no `try` (`TC/Map.js`,
 * `for (…) await self.addLayer(…)`), so the first one that fails ends the loop: every
 * background after it is lost, and a broken first background leaves the basemap list
 * empty. A WMTS background fails, for example, without `matrixSet`, with a layer name the
 * service does not offer, or with a grid in another CRS than the map.
 *
 * This advice on `TC.Map.prototype.addLayer` lets a base layer fail while the map is still
 * loading: it warns which background was left out and resolves, so the loop goes on.
 * API-SITNA's own reject handler already drops the failed layer from `baseLayers`.
 */
@Injectable({ providedIn: 'root' })
export class SitnaBaseLayerGuard {
  private readonly sitnaApi = inject(SitnaApiService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  private removeAdvice: (() => void) | null = null;

  ensurePatched(): void {
    if (this.removeAdvice) {
      return;
    }
    const proto = this.sitnaApi.getTC()?.Map?.prototype;
    if (!proto || typeof proto.addLayer !== 'function') {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const guard = this;
    const handle = meld.around(
      proto,
      'addLayer',
      function (this: unknown, joinPoint: MeldJoinPoint): unknown {
        const result = joinPoint.proceed();
        const layer = joinPoint.args[0] as BaseLayerConfig | undefined;
        const loading = !(this as { isLoaded?: boolean }).isLoaded;
        const pending = typeof (result as PromiseLike<unknown> | undefined)?.then === 'function';
        if (!loading || !layer || typeof layer !== 'object' || !layer.isBase || !pending) {
          return result;
        }
        // zone.js swaps the global Promise, so check for a thenable rather than `instanceof Promise`.
        return Promise.resolve(result).catch((error: unknown) => {
          guard.skip(layer, error);
          return undefined;
        });
      }
    );
    this.removeAdvice = () => handle.remove();
  }

  /** Remove the advice. Intended for tests. */
  restore(): void {
    this.removeAdvice?.();
    this.removeAdvice = null;
  }

  private skip(layer: BaseLayerConfig, error: unknown): void {
    const title = layer.title || layer.id || '';
    console.warn(`[SitnaBaseLayerGuard] Background "${title}" left out`, error);
    this.notifications.warning(
      this.translate.instant('map.warning.baseLayerSkipped', { title })
    );
  }
}
