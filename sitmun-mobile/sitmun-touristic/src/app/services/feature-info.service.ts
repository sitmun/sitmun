import { Injectable } from '@angular/core';
import { LanguageService } from './language.service';

declare var M: any;
declare var ol: any;

@Injectable({
  providedIn: 'root'
})
export class FeatureInfoService {

  pluginImpl: any;

  constructor(private langService: LanguageService) { }

  init(map: any) {
    const pl = map.getPlugins().find((p: any) => p.name === 'information');
    if (pl) {
      this.pluginImpl = pl.controls_[0].getImpl();
      this.pluginImpl.buildWMSInfoURL = this.buildWMSInfoURL.bind(this);
    }
  }

  buildWMSInfoURL(wmsLayers: any[]) {
    const olMap = this.pluginImpl.facadeMap_.getMapImpl();
    const viewResolution = olMap.getView().getResolution();
    const srs = this.pluginImpl.facadeMap_.getProjection().code;
    return wmsLayers.map((layer) => {
      const olLayer = layer.getImpl().getOL3Layer();
      let param;
      if (layer.isVisible() && layer.isQueryable() && !M.utils.isNullOrEmpty(olLayer)) {
        param = {};
        const informationParams: any = {
          INFO_FORMAT: this.pluginImpl.format_,
          FEATURE_COUNT: this.pluginImpl.featureCount_,
          LANG: this.langService.getLanguage(),
        };
        const regexBuffer = /buffer/i;
        const source = olLayer.getSource();
        const coord = this.pluginImpl.evt.coordinate;
        if (!regexBuffer.test(layer.url)) {
          informationParams.BUFFER = this.pluginImpl.buffer_;
        }
        const url = source.getFeatureInfoUrl(coord, viewResolution, srs, informationParams);
        param = { layer: layer.legend || layer.name, url };
      }
      return param;
    });
  }
}
