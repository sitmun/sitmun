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
  extentOri: any = {};
  zoomValue = 9;
  app: any = {};
  ter: any = {};
  treeData: TreeNode[] = [];
  profile: any = {};
  mapProj: string[] = ['EPSG:3857', 'EPSG:4326', 'EPSG:25831', 'EPSG:25830'];
  mapProjSelected = '';
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
              this.extentOri = tempState['bbox'];
              this.extent.minX = tempState['bbox'].x.min;
              this.extent.minY = tempState['bbox'].y.min;
              this.extent.maxX = tempState['bbox'].x.max;
              this.extent.maxY = tempState['bbox'].y.max;
            }
          }
        }
    });
  }

  ngOnInit() {
    this.authorizationService.getProfile(this.app.id, this.ter.id).then(profile => {
      this.profile = profile;
      this.treeData = this.treeviewService.createTreeData(profile.trees);

      if (this.mapProjSelected !== '' && this.extentOri.length > 0) {
        const coordsTransformed = this.transformCoords([parseFloat(this.extentOri.x.min), parseFloat(this.extentOri.y.min)],
        [parseFloat(this.extentOri.x.max), parseFloat(this.extentOri.y.max)], profile.application.srs, this.mapProjSelected);
        this.extent.minX = coordsTransformed.x.min.toString();
        this.extent.maxX = coordsTransformed.x.max.toString();
        this.extent.minY = coordsTransformed.y.min.toString();
        this.extent.maxY = coordsTransformed.y.max.toString();
      }        
    });
  }

  async ionViewWillEnter() {
    this.selectedLanguage = this.languageService.getLanguage();
    this.languageOptions = this.languageService.getLanguageOptions();
    this.updateNetworkStatus(await this.networkService.getStatus());
    this.networkService.addListener(this.updateNetworkStatus.bind(this));
  }

  async downloadLayers() {
    this.showLoading();
    const checkedLayers = this.treeviewService.getCheckedLayers(this.treeData);
    let extent = '';
    if (this.extent.minX && this.extent.minY && this.extent.maxX && this.extent.maxY) {
      extent = `${this.extent.minX},${this.extent.minY},${this.extent.maxX},${this.extent.maxY}`;
    }
    await this.databaseService.insertApp(this.app.id, this.app.title, this.app.logo);
    await this.databaseService.insertTerritory(this.ter.id, this.ter.name);
    await this.databaseService.loadConnectionDefault();
    checkedLayers.forEach(cl => {
      this.loadFeaturesByLayer(cl, extent, this.mapProjSelected);
    });
    this.hideLoading();
    this.openToast = true; //descarga completada
    console.log(checkedLayers);
  }

  updateLayers() {
    const checkedLayers = this.treeviewService.getCheckedLayers(this.treeData);
    console.log(checkedLayers);
  }

  loadFeaturesByLayer(layerId: string, extent: string, mapProj: string) {
    const layer = this.profile.layers.find((l: any) => l.id === layerId);
    const service = this.profile.services.find((s: any) => s.id === layer.service);
    this.wfsService.getFeatures(service.url, layer.layers[0], extent, mapProj).then(response => {
      console.log(response.data);
      this.databaseService.insertLayer(layerId.split('/')[1], layer.title, JSON.stringify(response.data));
      this.databaseService.insertAppTerLayer(this.app.id, this.ter.id, layerId);
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
    if (this.mapProjSelected !== '' && Object.values(this.extent).every(valor => valor !== '')) {
      const coordsTransformed = this.transformCoords([parseFloat(this.extentOri.x.min), parseFloat(this.extentOri.y.min)],
        [parseFloat(this.extentOri.x.max), parseFloat(this.extentOri.y.max)], this.profile.application.srs, this.mapProjSelected);
        this.extent.minX = coordsTransformed.x.min.toString();
        this.extent.maxX = coordsTransformed.x.max.toString();
        this.extent.minY = coordsTransformed.y.min.toString();
        this.extent.maxY = coordsTransformed.y.max.toString();
    }   
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
