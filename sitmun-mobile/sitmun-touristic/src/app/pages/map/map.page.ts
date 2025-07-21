import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LanguageService } from 'src/app/services/language.service';
import { MapaService } from 'src/app/services/mapa.service';
import { AuthorizationService, Node } from 'src/app/services/authorization.service';
import { RoutingService } from 'src/app/services/routing.service';
import { RequestService } from 'src/app/services/request.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { DatabaseService } from 'src/app/services/database.service';
import { TreeNode, TreeviewService } from 'src/app/services/treeview.service';

declare var M: any;
declare var ol: any;

@Component({
  selector: 'app-map',
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
})
export class MapPage implements OnInit {

  selectedLanguage: string | null = null;
  selectedFlag: string | null = null;
  languageOptions: any[] = [];
  private features: any[] = [];
  private activeLayer = '*';
  searchTasks: any[] = [];
  searchNodes: Node[] = [];
  private searchSubj = new Subject<string>();
  searchResults: Record<string, any[]> = {};
  searchKeys: string[] = [];
  isSearchModalOpen = false;
  isBgModalOpen = false;
  bgTreeData: TreeNode[] = [];
  private _mapa: any;
  private layer: any;
  
  constructor(private router: Router, private route: ActivatedRoute,
    private languageService: LanguageService, private mapaService: MapaService,
    private authorizationService: AuthorizationService, private routingService: RoutingService,
    private requestService: RequestService, private databaseService: DatabaseService,
    private treeviewService: TreeviewService) {
      this.route.queryParams.subscribe(params => {
      let navigation = this.router.getCurrentNavigation();
      if (navigation) {
        let tempState = navigation.extras.state;
        if (tempState) {
          if (tempState['tasks']) {
            this.searchTasks = tempState['tasks'];
          }
          if (tempState['taskNodes']) {
            this.searchNodes = tempState['taskNodes'];
          }
          if (tempState['features'] || tempState['parentData'].features) {
            this.features = tempState['features'] || tempState['parentData'].features;
          }
          if (tempState['activeLayer'] || tempState['parentData'].activeLayer) {
            this.activeLayer = tempState['activeLayer'] || tempState['parentData'].activeLayer;
          } else {
            this.activeLayer = '*';
          }
        }
      }
    });
  }

  ngOnInit() {
    this.createMap();
    if (this.searchNodes && this.searchNodes.length > 0) {
      this.searchSubj.pipe(
        debounceTime(300), // espera a que el usuario deje de teclear
        distinctUntilChanged(),
        filter(term => term.length >= 3) // solo sigue si hay al menos 3 letras
      ).subscribe(query => this.search(query));
    }
  }

  async createMap() {
    this._mapa = await this.mapaService.initMap('map', this.features.length > 0, this.activeLayer);
    const mapProj = this._mapa.getProjection().code;
    const mFeatures: any[] = [];
    this.features.forEach(f => mFeatures.push(this.mapaService.createFeature(f, mapProj)));
    this.addFeaturesToLayer(mFeatures);
    const profileBg = await this.getBackgroundProfile();
    this.bgTreeData = this.treeviewService.createBackgroundsTreeData(profileBg);
    const bgNode = this.bgTreeData.find(n => n.checked);
    if (bgNode) {
      this.toggleBgCheck(bgNode, null);
    }
  }

  addFeaturesToLayer(mFeatures: any[], clear: boolean = false) {
    if (mFeatures && mFeatures.length > 0) {
      if (!this.layer) {
        this.layer = new M.layer.Vector({name: 'pois'}, {displayInLayerSwitcher: false});
        //this.layer.setVisible(false);  
        this._mapa.addLayers(this.layer);
      }
      
      console.log('aplicando estilo a la capa');
      let style = new M.style.Generic({
        point: {
          icon: {
            src: '../../assets/icon/location-point.png',
            scale: 0.1,
            anchor: [0.5, 1], 
            anchorxunits: 'fraction',
            anchoryunits: 'fraction',
          },
          label: {
            text: '{{name}}',
            font: 'normal 10px Helvetica, Arial, sans-serif',
          }
        },
        line: {
          fill: {
            color: 'rgb(255, 115, 0)',
            opacity: 1
          },
          stroke: {
            color: 'rgb(255, 115, 0)',
            width: 1.5
          }
        },
        polygon: {
          fill: {
            color: 'rgb(255, 115, 0)',
            opacity: 0.5
          },
          stroke: {
            color: 'rgb(255, 115, 0)',
            width: 1.5
          }
        }
      });
      this.layer.setStyle(style);
      if (clear) {
        this.layer.removeFeatures(this.layer.getFeatures());
      }
      this.layer.addFeatures(mFeatures);
      const extent = this.layer.getMaxExtent();
      if (extent) {
        this._mapa.setBbox(extent);
        if (this.features.length === 1 && mFeatures[0].getGeometry().type === 'Point') {          
          this._mapa.setZoom(17);
        }
      }
    }
  }

  ionViewWillEnter() {
    this.selectedLanguage = this.languageService.getLanguage();
    this.selectedFlag = this.languageService.getFlag();
    this.languageOptions = this.languageService.getLanguageOptions();
  }

  openSearchModal() {
    this.isSearchModalOpen = true;
  }

  closeSearchModal() {
    this.isSearchModalOpen = false;
  }

  openBgModal() {
    this.isBgModalOpen = true;
  }

  closeBgModal() {
    this.isBgModalOpen = false;
  }
  
  async toggleBgCheck(node: TreeNode, event: any) {
    const checked = node.checked;
    let baseLayer: any = 'OSM'; // Si ninguna capa de fondo seleccionada, se aplicará la por defecto
    if (checked) {
      this.bgTreeData.forEach(tn => tn.checked = false);
      if (event) {
        const inputs = document.querySelectorAll<HTMLInputElement>('.bg-check');
        inputs.forEach(i => i.checked = false);
        event.target.checked = checked;
      }
      node.checked = checked;
      const profile = await this.getBackgroundProfile();
      baseLayer = this.mapaService.getBaseLayer(profile, node.resource || '', node.name);
    } 
    this._mapa.removeLayers(this._mapa.getBaseLayers());
    this._mapa.addLayers(baseLayer);
  }

  async getBackgroundProfile() {
    const profile = {
      backgrounds: JSON.parse((await this.databaseService.getProfileData('backgrounds'))[0].json),
      groups: JSON.parse((await this.databaseService.getProfileData('groups'))[0].json),
      layers: JSON.parse((await this.databaseService.getProfileData('layers'))[0].json),
      services: JSON.parse((await this.databaseService.getProfileData('services'))[0].json)
    };
    return profile;
  }

  onSearchInput(event: any): void {
    const query = event.target.value;
    this.searchSubj.next(query);
  }

  async search(query: string) {
    if (this.searchTasks) {
      this.searchKeys = [];
      this.searchResults = {};
      this.searchNodes.forEach(node => {
        const t = this.searchTasks.find(t => t.id === node.action);
        const filterParams: Record<string, any> = {
          keyWord: query
        };
        const propertyKey = Object.keys(node.mapping.input).find(k => k.toLowerCase() === 'propertyname');
        if (propertyKey) {
          filterParams['propertyname'] = node.mapping.input[propertyKey].value.split(',');
        }
        this.searchRequest(node, t, filterParams);
      });
    }
  }

  async searchRequest(node: Node, task: any, filterParams: any) {
    this.searchPromise(task, node.mapping, {}, filterParams).then(results => {
      if (results && results.length > 0) {
        if (!this.searchKeys.includes(node.title)) {
          this.searchKeys.push(node.title);
        }
        if (node.children && node.children.length > 0) {
          results.forEach((r: any) => r.childNode = node.children[0]);
        }
        this.searchResults[node.title] = this.removeDuplicateSearchResults(results);
      }
    });
  }

  async searchPromise( task: any, mapping: any, parentData: any, filterParams: any) {
    return await this.requestService.templateRequest(task, mapping, parentData, filterParams);
  }

  removeDuplicateSearchResults(results: any[]) {
    const distinctMap: any = {};
    results.forEach(r => distinctMap[r.id] = r);
    return Object.values(distinctMap);
  }

  async locateElement(elem: any, clear = true) {
    if (elem.geom) {
      const mFeature = this.mapaService.createFeature(elem, this._mapa.getProjection().code);
      this.addFeaturesToLayer([mFeature], clear);
    } else if (elem.childNode) {
      const data = await this.authorizationService.getPagesNodesBD(elem.childNode);
      const results = await this.searchPromise(data.tasks[0], data.taskNodes[0].mapping, elem, {});
      //results.forEach(r => this.locateElement(r, false));
      this.locateElements(results);
    }
    this.closeSearchModal();
  }

  locateElements(elements: any[]) {
    const mFeatures: any[] = [];
    elements.forEach(e => {
      mFeatures.push(this.mapaService.createFeature(e, this._mapa.getProjection().code));
    });
    this.addFeaturesToLayer(mFeatures, true);
  }

  async startPage() {
    const data = await this.authorizationService.getPagesNodesBD();
    this.routingService.redirect(data);
  }

  async nextPage(idNode: string) {
    if(idNode) {
      const data = await this.authorizationService.getPagesNodesBD(idNode);
      this.routingService.redirect(data);
    }
  }

  backPage() {
    this.routingService.navigateBack();
  }

  setLanguage(langCode: string) {
    this.selectedLanguage = langCode;
    this.languageService.setLanguage(langCode);
    this.updateFlag(langCode);
  }

  updateFlag(langCode: string) {
    this.selectedFlag = this.languageService.updateFlag(langCode);
  }
}
