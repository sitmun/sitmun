import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { DatabaseService } from './database.service';
import { constants } from 'src/environments/constants';
import { ToastController } from '@ionic/angular';
import { LanguageService } from './language.service';

declare var M: any;
declare var ol: any;

@Injectable({
  providedIn: 'root'
})
export class MapaService {

  constructor(private databaseService: DatabaseService, private toastController: ToastController, private languageService: LanguageService) { }

  async initMap(container: string, hasFeatures: boolean = true, activeLayer: string) {
    M.proxy(false);
    const mapa = new M.map({
      container,
      projection: 'EPSG:3857*m',
      bbox: [411307.6492025334, 4836400.090687951, 491184.3437605426, 4883026.677941912]
    });    
    if (!hasFeatures) {
      await this.applyMapDataFromProfile(mapa);
    }
    await this.applyMapBackgroundsAndLayers(mapa, activeLayer);
    this.createInformationPlugin(mapa);
    return mapa;
  }

  async applyMapDataFromProfile(mapa: any) {
    const application = JSON.parse((await this.databaseService.getProfileData('application'))[0].json);
    let srs = application.srs;
    let center = [application.pointOfInterest.x, application.pointOfInterest.y];
    let bbox = application.initialExtent;
    let zoom = application.defaultZoomLevel;
    center = ol.proj.transform(center, srs, 'EPSG:3857');
    const bboxMin = ol.proj.transform([bbox[0], bbox[1]], srs, 'EPSG:3857');
    const bboxMax = ol.proj.transform([bbox[2], bbox[3]], srs, 'EPSG:3857');
    bbox = bboxMin.concat(bboxMax);
    console.log(`Estableciendo bbox: ${bbox}`);
    mapa.setBbox(bbox);
    /*console.log(`Estableciendo zoom: ${zoom}`);
    mapa.setZoom(zoom);*/
    console.log(`Estableciendo centro: ${center}`);
    mapa.setCenter(center);
  }

  private async applyMapBackgroundsAndLayers(mapa: any, activeLayer: string) {
    //const backgrounds: any[] = JSON.parse((await this.databaseService.getProfileData('backgrounds'))[0].json);
    //const groups: any[] = JSON.parse((await this.databaseService.getProfileData('groups'))[0].json);
    const layers: any[] = JSON.parse((await this.databaseService.getProfileData('layers'))[0].json);
    const services: any[] = JSON.parse((await this.databaseService.getProfileData('services'))[0].json);
    const trees: any[] = JSON.parse((await this.databaseService.getProfileData('trees'))[0].json);
    //this.applyMapBackgrounds(mapa, backgrounds, groups, layers, services);
    this.applyMapLayers(mapa, trees, layers, services, activeLayer);
  }

  private applyMapBackgrounds(mapa: any, backgrounds: any[], groups: any[], layers: any[], services: any[]) {
    if (backgrounds && backgrounds.length > 0) {
      const mapBg: any[] = [];
      for(let b of backgrounds) {
        let group = groups.find(g => g.id === b.id);
        let bg = this.createMapBackground(group, layers, services);
        mapBg.push(bg);
      }
      this.createBackgroundPlugin(mapa, mapBg);
    }
  }

  private applyMapLayers(mapa: any, trees: any[], layers: any[], services: any[], activeLayer: string) {
    const cartographyTree = trees.find(t => t.type === constants.codeValue.treeType.cartography);
    if (cartographyTree) {
      const rootNode: string = cartographyTree.rootNode;
      const treeNodes = cartographyTree.nodes;
      if (rootNode.includes('/tree/')) { //root "falso"
        const children = treeNodes[rootNode].children;
        children.forEach((c: string) => {
          const node = treeNodes[c];
          let MLayer = this.processCartographyNode(node, treeNodes, layers, services, activeLayer);          
          mapa.addLayers(MLayer);
        });
      } else {
        const node = treeNodes[rootNode];
        let MLayer = this.processCartographyNode(node, treeNodes, layers, services, activeLayer);
        mapa.addLayers(MLayer);
      }
      this.createTOCPlugin(mapa, cartographyTree.title);
    }

  }

  private processCartographyNode(node: any, treeNodes: any, layers: any[], services: any[], activeLayer: string) {
    const layerId = node.resource;
    let result;
    if (layerId) { // Capa
      const layer = layers.find(l => l.id === layerId);
      const service = services.find(s => s.id === layer.service);
      result = this.createLayer(service, layer);
      if (activeLayer !== '*' && activeLayer !== layer.id) {
        result.setVisible(false);
      }
    } else { // Grupo de capas
      const groupLayers: any[] = [];
      const groupOpts = {
        name: node.title,
        legend: node.title,
        layers: groupLayers
      };
      const children = node.children;
      children.forEach((c: string) => {
        const node = treeNodes[c];
        let MLayer = this.processCartographyNode(node, treeNodes, layers, services, activeLayer);
        groupOpts.layers.push(MLayer);
      });
      result = new M.layer.LayerGroup(groupOpts);
    }
    return result;
  }

  private createBackgroundPlugin(mapa: any, layerOpts: any[]) {
    const bgPlugin = new M.plugin.BackImgLayer({
      collapsed: true,
      collapsible: true,
      columnsNumber: 3,
      empty: false,
      position: 'TR',
      layerOpts
    });
    mapa.addPlugin(bgPlugin);
  }

  private createTOCPlugin(mapa: any, tooltip: string) {
    const tocPlugin = new M.plugin.Layerswitcher({
      collapsed: true,
      collapsible: true,
      isDraggable: false,
      position: 'TR',
      tooltip,
      modeSelectLayers: 'eyes',
      tools: [],
      isMoveLayers: false,
      https: true,
      http: true,
      showCatalog: false,
      useProxy: false,
      displayLabel: false,
      addLayers: false,
      statusLayers: true,
      order: 1,
      useAttributions: true,
    });
    mapa.addPlugin(tocPlugin);
  }

  private createInformationPlugin(mapa: any) {
    const infoPlugin = new M.plugin.Information({
      position: 'TL',
      format: 'application/json'
    });
    mapa.addPlugin(infoPlugin);
    setTimeout(() => {
      infoPlugin.controls_[0].activate();
    }, 500);    
  }

  private createMapBackground(group: any, layers: any[], services: any[]) {
    const bg: any = {};
    bg.title = group.title;
    bg.id = group.id.split('/')[1];    
    const bgLayers = this.createBackgroundLayers(group, layers, services);
    bg.layers = bgLayers;
    return bg;
  }

  getBaseLayer(profile: any, idGroup: string, title: string) {
    const group = profile.groups.find((g: any) => g.id = idGroup);
    const bgLayers = this.createBackgroundLayers(group, profile.layers, profile.services);
    const groupOpts = {
      name: title,
      legend: title,
      layers: bgLayers,
      isBase: true,
    };
    return new M.layer.LayerGroup(groupOpts);
  }

  private createBackgroundLayers(group: any, layers: any[], services: any[]) {
    const bgLayers = [];
    const filteredLayers = layers.filter(l => group.layers.includes(l.id));
    for(let l of filteredLayers) {
      let serviceData = services.find(s => s.id === l.service);
      const bgLayer = this.createLayer(serviceData, l, true);
      bgLayers.push(bgLayer);
    }
    return bgLayers;
  }

  createLayer(service: any, layer: any, base: boolean = false) {
    let layerOptions = {
      url: service.url,
      name: layer.layers[0],
      legend: layer.title,
      isBase: base,
      displayInLayerSwitcher: !base,
      visible: true
    };
    const result = this.buildLayerByType(service.type, layerOptions, service.parameters);
    result.idLayer = layer.id;
    console.log(`Creado layer: ${layerOptions}`);
    return result;
  }

  private buildLayerByType(type: string, options: any, extraOptions: any) {
    switch (type) {
      case 'WMS':
        return new M.layer.WMS(options);
      case 'WMTS':
        options.matrixSet = extraOptions.matrixSet;
        return new M.layer.WMTS(options, {format: extraOptions.format});
      case 'WFS':
        options.extract = true;
        return new M.layer.WFS(options);
      default:
        break;
    }
  }

  createFeature(obj: any, mapProj: string) {
    let feature: any = null;
    if (!(obj.geom instanceof Object)) {
      feature = this.createFeatureByWKT(obj.geom, obj.proj, mapProj);
    } else {
      feature = this.createFeatureByGeoJson(obj.geom, obj.proj, mapProj);
    }
    const id = `featureid_${obj.id}`;
    //feature.setId(id);
    feature.setAttributes(obj);
    return feature;
  }

  createFeatureByWKT(wkt: string, geomProj: string, mapProj: string) {
    const format = new M.format.WKT();
    const feature = format.read(wkt);
    feature.getImpl().getOLFeature().getGeometry().transform(geomProj, mapProj);
    return feature;
  }

  createFeatureByGeoJson(jsonGeom: Object, geomProj: string, mapProj: string) {
    const feature = new M.Feature();
    feature.setGeometry(jsonGeom);
    feature.getImpl().getOLFeature().getGeometry().transform(geomProj, mapProj);
    return feature;
  }

  async getLocation() {
    let position = {x: 4, y: 40, permission: false};
    try {
      const permission = await Geolocation.requestPermissions();
      if(permission.location === 'granted') {
        const currentPos = await Geolocation.getCurrentPosition();
        position = {
          x: currentPos.coords.longitude,
          y: currentPos.coords.latitude,
          permission: true
        };
        console.log('Ubicacion: ', position);
      } else {
        console.log('No se tienen permisos para obtener la ubicación, obteniendo de la configuración del mapa');
        await this.errorLocationToast("permissionError");
        const pos = await this.getLocationByConfig();
        position.x = pos.x;
        position.y = pos.y;
        position.permission = false;
      }
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);      
      if ((error as Error).message?.toLowerCase().includes('location services')) {
        await this.errorLocationToast("locationError");
      }else{
        await this.errorLocationToast("error");
      }      
    }
    console.log(`Position: ${position.x}, ${position.y}. Permiso: ${position.permission}`);
    return position;
  }

  private errorLocationToast(typeError: string) {
    if (typeError === 'permissionError') {
      this.languageService.translateTag('map.locationPermissionError').subscribe((text: string) => this.createToast(text, 'warning', 'bottom'));
    } else if (typeError === 'locationError') {
      this.languageService.translateTag('map.locationDisabled').subscribe((text: string) => this.createToast(text, 'warning', 'bottom'));
    }else{
      this.languageService.translateTag('map.locationError').subscribe((text: string) => this.createToast(text, 'warning', 'bottom'));
    }
  }

  async createToast(msg: string, type: string, pos: "top" | "bottom" | "middle" | undefined) {
    const toast = await this.toastController.create({
      message: msg,
      duration: 3000,
      color: type,
      position: pos
    });
    await toast.present();
  }

  async getLocationByConfig() {
    const application = JSON.parse((await this.databaseService.getProfileData('application'))[0].json);
    const center = application.pointOfInterest;
    const proj = application.srs;
    let position = {x: 4, y: 40};
    if (center && center.x && center.y && proj) {
      const coords = this.transformCoords([center.x, center.y], proj, 'EPSG:4326');
      position = {
        x: coords[0],
        y: coords[1]
      };
    }
    return position;
  }

  async getLocationByProj(proj: string) {
    let position: any = await this.getLocation();
    if (position) {
      const coords = this.transformCoords([position.x, position.y], 'EPSG:4326', proj);
      position.x = coords[0];
      position.y = coords[1];
    }
    return position;
  }

  transformCoords(coords: number[], projOrig: string, projDest: string) {
    const result = ol.proj.transform(coords, projOrig, projDest);
    return result;
  }

  calculateCoordsByBuffer(projection: string = 'EPSG:4326', buffer: Number = 1000) {
    const dist = [buffer, buffer];
    const dif = ol.proj.transform(dist, 'EPSG:3857', projection);
    return dif;
  }
}
