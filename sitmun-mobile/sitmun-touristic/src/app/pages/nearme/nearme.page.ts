import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthorizationService, Node } from 'src/app/services/authorization.service';
import { DatabaseService } from 'src/app/services/database.service';
import { LanguageService } from 'src/app/services/language.service';
import { RoutingService } from 'src/app/services/routing.service';
import { constants } from 'src/environments/constants';
import { Device } from '@capacitor/device';
import { MapaService } from 'src/app/services/mapa.service';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';
import { LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-nearme',
  templateUrl: './nearme.page.html',
  styleUrls: ['./nearme.page.scss'],
})
export class NearmePage implements OnInit {

  selectedLanguage: string | null = null;
  languageOptions: any[] = [];
  rootNode: Node|any = {};
  taskNodes: Node[] = [];
  distance = 5000;
  distanceMiles = 3.0;
  metricSystem = true;
  searchPoint = 'location';
  categories: any[] = [];
  selectedCategories: string[] = []; 
  isModalOpen = false;
  isToastOpen = false;
  position: any = {x: 0, y: 0, permission: false};

  constructor(private router: Router, private route: ActivatedRoute, private authorizationService: AuthorizationService,
    private routingService: RoutingService, private languageService: LanguageService,
    private databaseService: DatabaseService, private mapService: MapaService, private loadingCtrl: LoadingController) {
      this.route.queryParams.subscribe(params => {
        let navigation = this.router.getCurrentNavigation();
        if (navigation) {
          let tempState = navigation.extras.state;
          if (tempState) {
            this.rootNode = tempState['rootNode'];
            this.taskNodes = tempState['nodes'];
          }
        }
      });
  }

  ngOnInit() {  
    //this.getCategories();
    this.getCategoriesNodes();
  }

  getCategories() {
    this.categories = [];
    console.log('Obteniendo categorias');
    this.databaseService.getProfileData('trees').then((trees) => {
      const jsonTrees = JSON.parse(trees[0].json);
      const cartographyTree = jsonTrees.find((t: any) => t.type === constants.codeValue.treeType.cartography);
      const treeNodes = cartographyTree.nodes;
      const nodeKeys = Object.keys(treeNodes);
      const layersNodes: any[] = [];
      nodeKeys.forEach(k => {
        const n = treeNodes[k];
        if (n.resource) {
          layersNodes.push({id: n.resource, name: n.title});
        }
      });
      this.categories.push(...layersNodes);
    });
  }

  getCategoriesNodes() {
    this.categories = [];
    this.taskNodes.forEach(n => {
      if (n.action) {
        this.categories.push({id: n.id, name: n.title});
      }
    });
  }

  ionViewWillEnter() {
    this.selectedLanguage = this.languageService.getLanguage();
    this.languageOptions = this.languageService.getLanguageOptions();

    this.getLanguageSystem();
  }

  async startPage() {
    const data = await this.authorizationService.getPagesNodesBD();
    this.routingService.redirect(data);
  }

  async nextPage(idNode: string, filterData: any) {
    if(idNode) {
      const data = await this.authorizationService.getPagesNodesBD(idNode);
      this.routingService.redirect(data, filterData);
    }
  }

  backPage() {
    this.routingService.navigateBack();
  }

  setLanguage(langCode: string) {
    this.showLoading();
    this.selectedLanguage = langCode;
    this.languageService.setLanguage(langCode);
    this.refreshProfile(); // Refresh profile to ensure language is updated
  }

  refreshProfile() {
    this.authorizationService.getProfile().then(profile => {
      this.databaseService.addProfile(profile);
      const data = this.authorizationService.getPagesByProfile(profile, this.rootNode.id);
      this.rootNode = data.rootNode;
      this.taskNodes = data.nodes;
      this.getCategoriesNodes();
      this.hideLoading();
    });
  }

  async showLoading() {
    const loading = await this.loadingCtrl.create({});

    loading.present();
  }

  hideLoading() {
    this.loadingCtrl.dismiss();
  }

  //obtiene el idioma del sistema y modifica valores distancia
  private async getLanguageSystem() {
    const tag = await Device.getLanguageTag();
    console.log('Language tag:', tag.value);

    if (tag.value === 'en-US' || tag.value === 'en-GB') {
      this.metricSystem = false;
      this.distanceMiles = 3.0; 
    } else {
      this.distance = 5000; 
    }
  };

  toggleCategory(event:any, idCat:string) {
    const btn = event.target;
    if (btn.classList.contains('selected')) {
      this.selectedCategories = this.selectedCategories.filter(c => c !== idCat);
      btn.classList.remove('selected');
    } else {
      btn.classList.add('selected');
      this.selectedCategories.push(idCat);
    }
  }

  async search() {

    if (this.selectedCategories.length === 0) {
      this.isToastOpen = true;
      return;
    }

    //Reconvertir distancia a metros 
    this.metricSystem ? this.distance : this.distance = Math.round(this.distanceMiles * 1609.34708789);

    if (this.searchPoint === 'location') { //usuario selecciona su ubicacion
      this.position = await this.mapService.getLocation();    
      if (!this.position.permission) {
        this.isModalOpen = true;
      } else {
        this.sendSearchData();
      }
    } else {
      const pos = await this.mapService.getLocationByConfig(); //usuario selecciona centro mapa
      this.position.x = pos.x;
      this.position.y = pos.y;
      this.sendSearchData();
    }
  }

  private sendSearchData() {
    const filterData = {
      DISTANCE: this.distance,
      LONGITUD: this.position.x,
      LATITUD: this.position.y
    };
    console.log(filterData);
    this.nextPage(this.selectedCategories[0], filterData);
  }

  async openSettings(){
    this.isModalOpen = false;

    await NativeSettings.open({
      optionAndroid: AndroidSettings.ApplicationDetails,
      optionIOS: IOSSettings.App,
    });
  }

  continueModal() {
    this.isModalOpen = false;
    this.sendSearchData();
  }

  closeModal() {
    this.isModalOpen = false;
  } 

}
