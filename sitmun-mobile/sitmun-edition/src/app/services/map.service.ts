import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { ToastController } from '@ionic/angular';
import { LanguageService } from './language.service';

declare var M: any;
declare var ol: any;

@Injectable({
  providedIn: 'root'
})
export class MapService {

  editableLayers: any[] = [];
  move: any = null;
  private mapProfileApplication: any;

  constructor(private toastController: ToastController, private languageService: LanguageService) { }

  async initMap(container: string, profile: any, zoom: number = 9, extent: number[] = [], mapProj: string ) {
    this.editableLayers = [];
    this.mapProfileApplication = profile.application;
    M.proxy(false);
    const mapa = new M.map({
      container,
      projection: 'EPSG:3857*m',
      bbox: [411307.6492025334, 4836400.090687951, 491184.3437605426, 4883026.677941912],
    });
    if (profile) {
      await this.applyMapDataFromProfile(mapa, profile.application, zoom, extent, mapProj);
      await this.applyMapBackgroundsAndLayers(mapa, profile);
    }
    return mapa;
  }

  addClickFunctionToEditableLayers(clickFn: Function) {
    this.editableLayers.forEach(l => {
      l.on(M.evt.LOAD, (features: any[]) => {
        features.forEach((f:any) => f.setAttribute('vendor.mapea.click', clickFn));
      });
    });
  }

  private async applyMapDataFromProfile(mapa: any, application: any, zoom: number, extent: number[], mapProj: string) {
    let srs = application.srs;
    console.log(`SRS del mapa: ${srs}`);
    let center = [application.pointOfInterest.x, application.pointOfInterest.y];
    let bbox = application.initialExtent;
    //origen descraga mapa se define extent    
    if (extent && extent.length === 4) {
      bbox = extent;
      center = [(bbox[0] + bbox[2])/2, (bbox[1] + bbox[3])/2];
      //si se selecciona tipo de proyección, hay que transformar las coordenadas
      if (mapProj !== '') {
        center = ol.proj.transform(center, mapProj, srs);
        const bboxMin = ol.proj.transform([bbox[0], bbox[1]], mapProj, srs);
        const bboxMax = ol.proj.transform([bbox[2], bbox[3]], mapProj, srs);
        bbox = bboxMin.concat(bboxMax);
      }    
    }else{
    //let zoom = application.defaultZoomLevel;
      center = ol.proj.transform(center, srs, 'EPSG:3857');
      const bboxMin = ol.proj.transform([bbox[0], bbox[1]], srs, 'EPSG:3857');
      const bboxMax = ol.proj.transform([bbox[2], bbox[3]], srs, 'EPSG:3857');
      bbox = bboxMin.concat(bboxMax);
    }
    console.log(`Estableciendo bbox: ${bbox}`);
    mapa.setBbox(bbox);
    console.log(`Estableciendo zoom: ${zoom}`);
    mapa.setZoom(zoom);
    console.log(`Estableciendo centro: ${center}`);
    mapa.setCenter(center);
  }

  private async applyMapBackgroundsAndLayers(mapa: any, profile: any) {
    this.applyMapBackgrounds(mapa, profile);
    this.applyMapLayers(mapa, profile);
  }

  private applyMapBackgrounds(mapa: any, profile: any) {
    const backgrounds: any[] = profile.backgrounds;
    const groups: any[] = profile.groups;
    const layers: any[] = profile.layers;
    const services: any[] = profile.services;
    const mapBg: any[] = [];
    for(let b of backgrounds) {
      let group = groups.find(g => g.id === b.id);
      let bg = this.createMapBackground(group, layers, services);
      mapBg.push(bg);
    }
    this.createBackgroundPlugin(mapa, mapBg);
  }

  private applyMapLayers(mapa: any, profile: any) {
    const trees: any[] = profile.trees;
    const layers: any[] = profile.layers;
    const services: any[] = profile.services;
    const tasks: any[] = profile.tasks;
    const groupLayers: any[] = [];
    trees.forEach((t: any) => {
      const gLayers: any[] = [];
      const groupOpts = {
        name: t.title,
        legend: t.title,
        layers: gLayers
      };
      const rootNode: string = t.rootNode;
      const treeNodes = t.nodes;
      if (rootNode.includes('/tree/')) { //root "falso"
        const children = treeNodes[rootNode].children;
        children.forEach((c: string) => {
          const node = treeNodes[c];
          let MLayer = this.processCartographyNode(node, treeNodes, layers, services, tasks);          
          groupOpts.layers.push(MLayer);
        });
      } else {
        const node = treeNodes[rootNode];
        let MLayer = this.processCartographyNode(node, treeNodes, layers, services, tasks);
        groupOpts.layers.push(MLayer);
      }
      groupLayers.push(new M.layer.LayerGroup(groupOpts));
    });
    mapa.addLayers(groupLayers);
    //this.createTOCPlugin(mapa);
  }

  private createMapBackground(group: any, layers: any[], services: any[]) {
    const bg: any = {};
    bg.title = group.title;
    bg.id = group.id.split('/')[1];
    const bgLayers = [];
    console.log(layers.length);
    const filteredLayers = layers.filter(l => group.layers.includes(l.id));
    console.log(`Capas filtradas: ${filteredLayers.length}`);
    for(let l of filteredLayers) {
      let serviceData = services.find(s => s.id === l.service);
      const bgLayer = this.createLayer(serviceData, l, true);
      bgLayers.push(bgLayer);
    }
    bg.layers = bgLayers;
    return bg;
  }

  private processCartographyNode(node: any, treeNodes: any, layers: any[], services: any[], tasks: any[]) {
    const layerId = node.resource;
    const taskId = node.action;
    let result;
    if (layerId || taskId) { // Nodo hoja
      const layer = layers.find(l => l.id === layerId);
      const service = services.find(s => s.id === layer.service);
      const task = tasks.find(t => t.id === taskId);
      layer.title = 'Capa de referencia';
      const groupLayers = [];
      if (layer && service) {
        groupLayers.push(this.createLayer(service, layer));
      }
      if (task) {
        groupLayers.push(this.createLayerByTask(task));
      }
      const groupOpts = {
        name: node.title,
        legend: node.title,
        layers: groupLayers
      };
      result = new M.layer.LayerGroup(groupOpts);
    } else { // Nodo carpeta
      const groupLayers: any[] = [];
      const groupOpts = {
        name: node.title,
        legend: node.title,
        layers: groupLayers
      };
      const children = node.children;
      children.forEach((c: string) => {
        const node = treeNodes[c];
        let MLayer = this.processCartographyNode(node, treeNodes, layers, services, tasks);
        groupOpts.layers.push(MLayer);
      });
      result = new M.layer.LayerGroup(groupOpts);
    }
    return result;
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

  createLayerByTask(task: any) {
    let layerOptions = {
      url: task.url,
      name: task.parameters.typename.value,
      legend: 'Capa editable',
      isBase: false,
      displayInLayerSwitcher: true,
      visible: true
    };
    const result = this.buildLayerByType('WFS', layerOptions);
    result.idLayer = task.id;
    console.log(`Creado layer: ${layerOptions}`);
    return result;
  }

  private buildLayerByType(type: string, options: any, extraOptions: any = {}) {
    let layer = null;
    switch (type) {
      case 'WMS':
        layer = new M.layer.WMS(options);
        break;
      case 'WMTS':
        options.matrixSet = extraOptions.matrixSet;
        layer = new M.layer.WMTS(options, {format: extraOptions.format});
        break;
      case 'WFS':
        layer = new M.layer.WFS(options);
        this.editableLayers.push(layer);
        break;
      default:
        break;
    }
    return layer;
  }

  createFeaturesGeojson(geojson: any, geomProj: string, mapProj: string) {
    const format = new M.format.GeoJSON();
    const features = format.read(geojson, mapProj);
    //feature.getImpl().getOLFeature().getGeometry().transform(geomProj, mapProj);
    return features;
  }

  private createBackgroundPlugin(mapa: any, layerOpts: any[]) {
    const bgPlugin = new M.plugin.BackImgLayer({
      collapsed: true,
      collapsible: true,
      columnsNumber: 3,
      empty: false,
      position: 'TL',
      layerOpts
    });
    mapa.addPlugin(bgPlugin);
  }

  private createTOCPlugin(mapa: any) {
    const tocPlugin = new M.plugin.Layerswitcher({
      collapsed: true,
      collapsible: true,
      isDraggable: false,
      position: 'TR',
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

  async getLocation() {
    let position = null;
    try {
      const permission = await Geolocation.requestPermissions();
      if(permission.location === 'granted') {
        position = await Geolocation.getCurrentPosition();
        position= {
          x: position.coords.longitude,
          y: position.coords.latitude
        };
        console.log('Ubicacion: ', position);
      } else {        
        console.log('No se tienen permisos para obtener la ubicación, obteniendo de la configuración del mapa');
        await this.errorLocationToast("permissionError");
        position = this.getLocationByProfile();
      }
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      if ((error as Error).message?.toLowerCase().includes('location services')) {
        await this.errorLocationToast("locationError");
      }else{
        await this.errorLocationToast("error");
      }   

      position = this.getLocationByProfile();
    }
    return position;
  }

  private async errorLocationToast(typeError: string) {
    if (typeError === 'permissionError') {
      this.languageService.translateTag('map.locationPermissionError').subscribe(text => this.createToast(text, 'warning', 'bottom'));
    } else if (typeError === 'locationError') {
      this.languageService.translateTag('map.locationDisabled').subscribe(text => this.createToast(text, 'warning', 'bottom'));
    }else{
      this.languageService.translateTag('map.locationError').subscribe(text => this.createToast(text, 'warning', 'bottom'));
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
  

  getLocationByProfile() {
    let position = {
      x: 4,
      y: 40
    }
    const application = this.mapProfileApplication;
    const center = application.pointOfInterest;
    const proj = application.srs;
    if (center && center.x && center.y && proj) {
      const coords = this.transformCoords([center.x, center.y], proj, 'EPSG:4326');
      position = {
        x: coords[0],
        y: coords[1]
      };
    }
    return position;
  }

  transformCoords(coords: number[], projOrig: string, projDest: string) {
    const result = ol.proj.transform(coords, projOrig, projDest);
    return result;
  }

  addMoveInteraction(mapa: any, olFeatures: any[], callback: Function) {
    const olMap = mapa.getMapImpl();
    const collection = new ol.Collection(olFeatures);
    this.move = new ol.interaction.Translate({
      features: collection
    });
    this.move.on('translateend', (evt: any) => {
      callback();
    });
    olMap.addInteraction(this.move);
  }

  removeMoveInteraction(mapa:any) {
    if (this.move) {
      mapa.getMapImpl().removeInteraction(this.move);
      this.move = null;
    }
  }
}
