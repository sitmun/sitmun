import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthorizationService, Node } from 'src/app/services/authorization.service';
import { RoutingService } from 'src/app/services/routing.service';
import { LanguageService } from 'src/app/services/language.service';
import { RequestService } from 'src/app/services/request.service';
import { DatabaseService } from 'src/app/services/database.service';
import { MapaService } from 'src/app/services/mapa.service';
import { LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-events',
  templateUrl: './events.page.html',
  styleUrls: ['./events.page.scss'],
})
export class EventsPage implements OnInit {

  selectedLanguage: string | null = null;
  languageOptions: any[] = [];
  rootNode: Node|any = {};
  taskNodes: Node[]|any[] = [];
  eventsNode: Node | any = null;
  tasks: any[] = [];
  eventsTask: any = null;
  categories: any[] = [];
  locations: any[] = [];
  events: any[] = [];
  noEvents = false;
  isModalOpen = false;
  filters: Record<string, any> = {
    keyWord: '',
    category: '*',
    muni: '*',
    startdate: '',
    enddate: '',
    near: false
  };

  constructor(private router: Router, private route: ActivatedRoute, private authorizationService: AuthorizationService,
    private routingService: RoutingService, private languageService: LanguageService, private requestService: RequestService,
    private databaseService: DatabaseService , private _location: Location, private mapService: MapaService,
    private loadingCtrl: LoadingController) {
      this.filters['startdate'] = this.getToday();
      this.filters['enddate'] = this.getNext15();
      this.route.queryParams.subscribe(params => {
      let navigation = this.router.getCurrentNavigation();
      if (navigation) {
        let tempState = navigation.extras.state;        
        if (tempState) {
          this.rootNode = tempState['rootNode'];
          this.taskNodes = tempState['taskNodes'];
          this.tasks = tempState['tasks'];
        }
      }
    });
  }

  ngOnInit() {
    console.log("Obteniendo categorias y eventos");
    this.taskNodes.forEach(node => {
      const t = this.tasks.find(t => t.id === node.action);
      if (node.viewMode === 'evt') {
        this.eventsTask = t;
        this.eventsNode = node;
        this.filterEvents();
      } else if (node.viewMode === 'evtcat') {
        this.getCategories(t, node);
      } else if (node.viewMode === 'evtloc') {
        this.getLocations(t, node);
      }
    });    
  }

  ionViewWillEnter() {
    this.selectedLanguage = this.languageService.getLanguage();
    this.languageOptions = this.languageService.getLanguageOptions();
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
    this._location.back();
  }

  setLanguage(langCode: string) {
    this.selectedLanguage = langCode;
    this.languageService.setLanguage(langCode);
  }

  dateFormat(dateStr: string) {
    const date = new Date(dateStr);
  
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const anio = date.getFullYear();
  
    return `${dia}/${mes}/${anio}`;
  }

  getCategories(task: any, node: any) {
    this.requestService.templateRequest(task, node.mapping).then(results => {
      this.categories = results;
      console.log("Categorias obtenidas");
    });
  }

  getLocations(task: any, node: any) {
    this.requestService.templateRequest(task, node.mapping).then(results => {
      this.locations = results;
      console.log("Localizaciones obtenidas");
    });
  }

  filterByCategory(event: any, catName: string) {
    this.filters['category'] = catName;
    this.filterEvents();
  }

  async filterEvents() {
    this.isModalOpen = false;
    this.showLoading();
    console.log(this.filters);
    const filterParams = await this.createFiltersParams();
    this.requestService.templateRequest(this.eventsTask, this.eventsNode.mapping, {}, filterParams).then(results => {
      this.events = results.sort((a: any, b: any) => a.startdate.localeCompare(b.startdate));
      this.setFavorites();
      this.noEvents = this.events.length === 0;
      this.resetCarruselScroll();
      this.hideLoading();
      console.log("Eventos obtenidos");
    });
  }

  async createFiltersParams() {
    const filterParams: any = {};
    const keys = Object.keys(this.filters);
    const position = this.filters['near'] ? await this.mapService.getLocation() : null;
    keys.forEach(k => {
      const value = this.filters[k];
      if (k === 'near') {
        filterParams['latitud'] = value && position ? position.x : 4;
        filterParams['longitud'] = value && position ? position.y : 40;
        const distance = value | 1000000;
        //const dif = value ? this.mapService.calculateCoordsByBuffer(this.eventsNode.mapping.output.proj.value, buffer) : [buffer, buffer];
        filterParams['distance'] = distance;
      } else if (value && value !== '*') {
        let paramKey: string = k;
        if (!['startdate', 'enddate', 'keyWord'].includes(k)){
          paramKey = this.eventsNode.mapping.output[k].value;
          paramKey = paramKey.substring(paramKey.lastIndexOf('.') + 1);
        }
        filterParams[paramKey] = value;
      }
    });
    return filterParams;
  }

  async showLoading() {
    const loading = await this.loadingCtrl.create({});

    loading.present();
  }

  hideLoading() {
    this.loadingCtrl.dismiss();
  }

  resetCarruselScroll() {
    const carrusel = document.querySelector('#events-carrusel');
    if (carrusel) {
      carrusel.scrollTo({left: 0, behavior: 'smooth'});
    }
  }

  toggleActiveBtn(btn: any) {
    const btnOld = document.querySelector('.carr-elem.active');
    if (btnOld) {
      btnOld.classList.remove('active');
    }
    btn.classList.add('active');
  }

  async locateElement(elem: any) {
    console.log(elem.geom);
    const mapData = {features: [elem], activeLayer: this.eventsNode.resource || '*'};
    //this.routingService.navigate('map', mapData);
    const data = await this.authorizationService.getPagesMapNode();
    this.routingService.redirect(data, mapData);
  }
  
  toggleFavorite(event: any, elem: any) {
    const btn = event.target;
    if (this.eventsNode && this.eventsTask) {
      const favorite = {
        id_node: Number(this.eventsNode.id.split('/')[1]),
        id_task: Number(this.eventsTask.id.split('/')[1]),
        id_element: elem.id,
        id_category: Number(this.rootNode.id.split('/')[1]),
        element: JSON.stringify(elem)
      };
      if (btn.classList.contains('active')) {
        btn.classList.remove('active');
        this.databaseService.removeFavorite(favorite);
      } else {
        const category = {
          id: Number(this.rootNode.id.split('/')[1]),
          image: this.rootNode.image,
          name: this.rootNode.title,
        }
        btn.classList.add('active');
        this.databaseService.addFavorite(category, favorite);
      }
      console.log(elem);
    }
  }

  async setFavorites() {
    console.log("Comprobando favoritos");
    const favorites = await this.getFavorites();
    const idCat = Number(this.rootNode.id.split('/')[1]);
    const idNode = Number(this.eventsNode.id.split('/')[1]);
    const idTask = Number(this.eventsTask.id.split('/')[1]);
    for (let e of this.events){
      e['isFav'] = favorites.findIndex(fav => {
        return fav.id_node === idNode && fav.id_task === idTask &&
        fav.id_category === idCat && fav.id_element === e.id;
      }) >= 0;      
    }
    console.log("Favoritos comprobados");
  }

  async getFavorites() {
    const idCat = Number(this.rootNode.id.split('/')[1]);
    const favorites = await this.databaseService.getFavorites(idCat);
    return favorites;
  }

  getToday() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  getNext15() {
    const next15days = new Date();
    next15days.setDate(next15days.getDate() + 15);
    return next15days.toISOString().split('T')[0];
  }

  openModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

}
