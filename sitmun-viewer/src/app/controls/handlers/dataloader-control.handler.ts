import { Injectable } from '@angular/core';

import type { AppCfg, AppTasks } from '@api/model/app-cfg';

import { SitnaApiService } from '../../services/sitna-api.service';
import { UIStateService } from '../../services/ui-state.service';
import { ControlHandlerBase } from '../control-handler-base';
import { SitnaControlConfig } from '../control-handler.interface';

/**
 * Handler for the native SITNA dataLoader control.
 * Allows users to load data layers via WMS suggestions and drag-and-drop.
 *
 * Control Type: sitna.dataLoader
 * Patches: scripts/patch-dataloader-legacy-controls.js
 * Configuration: div, wmsSuggestions, and enableDragAndDrop.
 * Nullish modern options are filled in so DataLoader does not read the obsolete
 * externalWMS / fileImport children.
 */
@Injectable({
  providedIn: 'root'
})
export class DataLoaderControlHandler extends ControlHandlerBase {
  readonly controlIdentifier = 'sitna.dataLoader';
  readonly sitnaConfigKey = 'dataLoader';
  readonly requiredPatches = undefined;

  constructor(
    sitnaApi: SitnaApiService,
    private uiStateService: UIStateService
  ) {
    super(sitnaApi);
  }

  /**
   * Build configuration for dataLoader control.
   * Defaults (div, enableDragAndDrop) from app-config; task parameters override.
   */
  override buildConfiguration(
    task: AppTasks,
    _context: AppCfg
  ): SitnaControlConfig | null {
    const config: SitnaControlConfig = {
      ...this.mergeWithParameters(this.getDefaultConfig(), task.parameters)
    };
    if (config['wmsSuggestions'] == null) {
      config['wmsSuggestions'] = [];
    }
    if (config['enableDragAndDrop'] == null) {
      config['enableDragAndDrop'] = false;
    }
    this.uiStateService.enableToolsButton();
    return config;
  }
}
