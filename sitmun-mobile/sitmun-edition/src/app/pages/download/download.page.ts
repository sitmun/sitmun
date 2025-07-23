import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { LanguageService } from 'src/app/services/language.service';
import { Router, ActivatedRoute, NavigationExtras } from '@angular/router';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { WfsService } from 'src/app/services/wfs.service';
import { TreeNode, TreeviewService } from 'src/app/services/treeview.service';
import { NetworkService } from 'src/app/services/network.service';
import { DatabaseService } from 'src/app/services/database.service';
import { LoadingController } from '@ionic/angular';

declare var ol: any;

@Component({
  selector: 'app-download',
  templateUrl: './download.page.html',
  styleUrls: ['./download.page.scss'],
})
export class DownloadPage implements OnInit {

  messages_: any = {}
  selectedLanguage: string | null = null;
  languageOptions: any[] = [];
  networkConnected = true;
  extent = {
    minX: '',
    minY: '',  
    maxX: '',     
    maxY: ''
  };
  zoomValue = 9;
  app: any = {};
  ter: any = {};
  treeData: TreeNode[] = [];
  profile: any = {};
  layersSizeBytes: number = 0;
  layersSizeMBytes: number = 0;
  mapProj: string[] = ['EPSG:3857', 'EPSG:4326', 'EPSG:25831', 'EPSG:25830'];
  mapProjSelected: string = 'EPSG:3857';
  mapProjSelectedPrev: string = 'EPSG:3857';
  mapPage: boolean = false;
  openToast = false;

  constructor(private languageService: LanguageService, private location: Location, private wfsService: WfsService,
    private router: Router, private route: ActivatedRoute, private authorizationService: AuthorizationService,
    private treeviewService: TreeviewService, private networkService: NetworkService, private databaseService: DatabaseService,
    private loadingCtrl: LoadingController) {
    this.route.queryParams.subscribe(params => {
        const navigation = this.router.getCurrentNavigation();
        if (navigation) {
          const tempState = navigation.extras.state;
          if (tempState){
            if (tempState['app']) {
              this.app = tempState['app'];
            }
            if (tempState['ter']) {
              this.ter = tempState['ter'];
            }
            if (tempState['zoom']) {
              this.zoomValue = tempState['zoom'];
            }
            if (tempState['bbox']) {
              this.extent.minX = tempState['bbox'].x.min;
              this.extent.minY = tempState['bbox'].y.min;
              this.extent.maxX = tempState['bbox'].x.max;
              this.extent.maxY = tempState['bbox'].y.max;
            }
            if (tempState['map']) {
              this.mapPage = tempState['map'];
            }
          }
        }
    });
  }

  ngOnInit() {
    this.initPage(); 
  }

  private async initPage(){
    this.profile = await this.authorizationService.getProfile(this.app.id, this.ter.id);
    this.treeData = await this.treeviewService.createTreeData(this.profile);
    console.log("treedata");
    console.log(this.treeData);

    await this.getLayersData();
  }

  async ionViewWillEnter() {
    this.selectedLanguage = this.languageService.getLanguage();
    this.languageOptions = this.languageService.getLanguageOptions();
    this.updateNetworkStatus(await this.networkService.getStatus());
    this.networkService.addListener(this.updateNetworkStatus.bind(this));
    if (this.mapPage) {
        this.getCoords(this.profile.application.srs, this.mapProjSelected); //convertir coordenadas desde mapa
    }
  }

  async downloadLayers() {
    this.showLoading();
    const checkedLayers = this.treeviewService.getCheckedLayers(this.treeData);
    let extent = '';
    if (this.extent.minX && this.extent.minY && this.extent.maxX && this.extent.maxY) {
      extent = `${this.extent.minX},${this.extent.minY},${this.extent.maxX},${this.extent.maxY}`;
    }
    await this.databaseService.insertApp(this.app.id, this.app.title, this.app.logo);
    await this.databaseService.insertTerritory(this.ter.id, this.app.id, this.ter.name);
   
    await this.databaseService.deleteLayersByAppAndTer(this.app.id, this.ter.id); //eliminar capas previas

    for (const cl of checkedLayers) {
      if (cl.action) {
        await this.loadFeaturesByTask(cl.action, extent, this.mapProjSelected, this.zoomValue);
      }
    }
    
    await this.getLayersData();
    this.hideLoading();
    this.openToast = true; //descarga completada
    console.log(checkedLayers);
  }

  updateLayers() {
    const checkedLayers = this.treeviewService.getCheckedLayers(this.treeData);
    console.log(checkedLayers);
  }

  async loadFeaturesByLayer(layerId: string, extent: string, mapProj: string, zoom: number) {
    const layer = this.profile.layers.find((l: any) => l.id === layerId);
    const service = this.profile.services.find((s: any) => s.id === layer.service);
    const resp = await this.wfsService.getFeatures(service.url, layer.layers[0], extent, mapProj);
    console.log(resp.data);
    await this.databaseService.insertLayer(this.app.id, this.ter.id, layerId, layer.title, JSON.stringify(resp.data), extent, zoom, mapProj);
  }

  async loadFeaturesByTask(taskId: string, extent: string, mapProj: string, zoom: number) {
    const task = this.profile.tasks.find((t: any) => t.id === taskId);
    const layerName = task.parameters.typename.value;
    const resp = await this.wfsService.getFeatures(task.url, layerName, extent, mapProj);
    console.log(resp.data);
    await this.databaseService.insertLayer(this.app.id, this.ter.id, taskId, layerName, JSON.stringify(resp.data), extent, zoom, mapProj);
  }

  private getLayersData(){
    //obtener capas descargadas
    this.databaseService.getLayersByAppAndTer(this.app.id, this.ter.id).then(layers => {
      const geojsonTotal: string[] = [];
      const layerLoadIds: string[] = [];
      layers.forEach(l => {
        layerLoadIds.push(l.id_layer);
        geojsonTotal.push(l.geojson);
      });
      
      this.treeviewService.setCheckedLayers(this.treeData, layerLoadIds); //check capas recursivo

      this.layersSizeBytes = new Blob(geojsonTotal).size;  
      this.layersSizeMBytes = Math.round(this.layersSizeBytes / (1024 * 1024) * 10) / 10;  //peso capas

      //zoom, extent y proyeccion. igual en todas capas
      if (layers[0]) {
        this.zoomValue = layers[0].zoom;
        this.mapProjSelected = layers[0].proj;
        this.mapProjSelectedPrev = layers[0].proj;
        if (layers[0].extension !== '') {
          const coords = layers[0].extension.split(",");
          this.extent.minX = coords[0];
          this.extent.minY = coords[1];
          this.extent.maxX = coords[2];
          this.extent.maxY = coords[3];
        }
      }
    });
  }

  backPage() {
    this.location.back();
  }

  setLanguage(langCode: string) {
    this.selectedLanguage = langCode;
    this.languageService.setLanguage(langCode);
  }

  updateNetworkStatus(connected: boolean) {
    this.networkConnected = connected;
  }

  onZoomChange(event: any) {
    console.log(event.detail.value);
    this.zoomValue = event.detail.value;
  }

  toggleExpand(node: TreeNode) {
    this.treeviewService.toggleExpand(node);
  }

  toggleCheck(node: TreeNode) {
    this.treeviewService.toggleCheck(node);
  }


  openMap() {
    const checkedLayers = this.treeviewService.getCheckedLayers(this.treeData);

    const navigationExtras: NavigationExtras = {
      state: {
        app: this.app,
        ter: this.ter,
        zoom: this.zoomValue,
        layers: checkedLayers,
        download: true,
        extent: this.extent,
        mapProject: this.mapProjSelected
      }
    };
    this.navigate('map', navigationExtras);
  }

  navigate(path: string, navigationExtras: NavigationExtras) {
    this.router.navigate([path], navigationExtras);
  }

  onProjChange(){
    if (Object.values(this.extent).every(valor => valor !== '')) {
     this.getCoords(this.mapProjSelectedPrev, this.mapProjSelected);
    }
    this.mapProjSelectedPrev = this.mapProjSelected;
  }

  private getCoords(projOrig: string, projDest: string){
    const coordsTransformed = this.transformCoords([parseFloat(this.extent.minX), parseFloat(this.extent.minY)],
    [parseFloat(this.extent.maxX), parseFloat(this.extent.maxY)], projOrig, projDest);
    this.extent.minX = coordsTransformed.x.min.toString();
    this.extent.maxX = coordsTransformed.x.max.toString();
    this.extent.minY = coordsTransformed.y.min.toString();
    this.extent.maxY = coordsTransformed.y.max.toString();
  }

  private transformCoords(coordsMin: number[], coordsMax: number[], projOrig: string, projDest: string) {
    const resultMin = ol.proj.transform(coordsMin, projOrig, projDest);
    const resultMax = ol.proj.transform(coordsMax, projOrig, projDest);
    const result = {
      x: {
        min: resultMin[0],
        max: resultMax[0]
      },
      y: {
        min: resultMin[1],
        max: resultMax[1]
      }
    };
    return result;
  }

  closeToast() {
    this.openToast = false;
  }

  async showLoading() {
    const loading = await this.loadingCtrl.create({});

    loading.present();
  }

  hideLoading() {
    this.loadingCtrl.dismiss();
  }

}
