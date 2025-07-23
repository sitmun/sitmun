import { Component, OnInit } from '@angular/core';
import { AuthorizationService, Node } from 'src/app/services/authorization.service';
import { RoutingService } from 'src/app/services/routing.service';
import { LanguageService } from 'src/app/services/language.service';
import { RequestService } from 'src/app/services/request.service';
import { DatabaseService } from 'src/app/services/database.service';

@Component({
  selector: 'app-detailedlist',
  templateUrl: './detailedlist.page.html',
  styleUrls: ['./detailedlist.page.scss'],
})
export class DetailedlistPage implements OnInit {

  selectedLanguage: string | null = null;
  selectedFlag: string | null = null;
  languageOptions: any[] = [];
  rootNode: Node|any = {};
  taskNode: Node|any = {};
  parentData: any = {};
  task: any = {};
  elements: any[] = [];
  isModalOpen = false;
  isModalOpenImg = false;
  currentExtraInfo = {title: '', content: ''};
  imageModal: String = '';
  loaded = false;
  arraySkeleton: any[] = new Array(3);
  
  constructor(private authorizationService: AuthorizationService, private routingService: RoutingService,
    private languageService: LanguageService, private requestService: RequestService, private databaseService: DatabaseService) {
  }

  ngOnInit(): void {
    //this.getParams();
    //this.getData();
  }

  ionViewWillEnter() {
    this.loaded = false;
    this.selectedLanguage = this.languageService.getLanguage();
    this.selectedFlag = this.languageService.getFlag();
    this.languageOptions = this.languageService.getLanguageOptions();
    this.getParams();
    this.getData();
  }

  getParams() {
    let navigation = window.history;
    if (navigation) {
      let tempState = navigation.state;
      if (tempState) {
        this.rootNode = tempState['rootNode'];
        this.taskNode = tempState['taskNodes'][0];
        this.task = tempState['tasks'][0];
        if (tempState['parentData']){
          this.parentData = tempState['parentData'];
        }
      }
    }
  }

  getData() {
    console.log("Obteniendo elementos");
    this.requestService.templateRequest(this.task, this.taskNode.mapping, this.parentData).then(results => {
      this.elements = results;
      console.log("Elementos obtenidos");
      this.setFavorites();
      this.loaded = true;
    });
  }

  async setFavorites() {
    console.log("Comprobando favoritos");
    const favorites = await this.getFavorites();
    const idCat = Number(this.rootNode.id.split('/')[1]);
    const idNode = Number(this.taskNode.id.split('/')[1]);
    const idTask = Number(this.task.id.split('/')[1]);
    for (let e of this.elements){
      e['isFav'] = favorites.findIndex(fav => fav.id_node === idNode && fav.id_task === idTask && fav.id_category === idCat && fav.id_element === e.id) >= 0
      //e['isFav'] = this.isFavorite(e);
    }
    console.log("Favoritos comprobados");
  }

  async getFavorites() {
    const idCat = Number(this.rootNode.id.split('/')[1]);
    const favorites = await this.databaseService.getFavorites(idCat);
    return favorites;
  }

  isFavorite(elem: any) {
    return elem.id % 2 !== 0;
  }

  toggleFavorite(event: any, elem: any) {
    const btn = event.target;
    const favorite = {
      id_node: Number(this.taskNode.id.split('/')[1]),
      id_task: Number(this.task.id.split('/')[1]),
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

  async locateElement(elem: any) {
    console.log(elem.geom);
    const mapData = {features: [elem], activeLayer: this.taskNode.resource || '*'};
    //this.routingService.navigate('map', mapData);
    const data = await this.authorizationService.getPagesMapNode();
    this.routingService.redirect(data, mapData);
  }

  async startPage() {
    const data = await this.authorizationService.getPagesNodesBD();
    this.routingService.redirect(data);
  }

  async nextPage(idNode: string, parentData: any = {}) {
    if(idNode) {
      const data = await this.authorizationService.getPagesNodesBD(idNode);
      this.routingService.redirect(data, parentData);
    }
  }

  backPage() {
    this.routingService.navigateBack();
  }

  setLanguage(langCode: string) {
    this.selectedLanguage = langCode;
    this.languageService.setLanguage(langCode);
  }

  isValidHref(href: String): boolean {    
    return (
      href &&
      (href.startsWith('tel:') ||
      href.startsWith('mailto:') ||
      href.startsWith('http://') ||
      href.startsWith('https://'))
    );
  }

  getBtnText(href: String): string {
    if (href.startsWith('tel:')) {
      return 'Llamar';
    } else if (href.startsWith('mailto:')) {
      return 'Enviar Email';
    } else if (href.startsWith('http://') || href.startsWith('https://')) {
      return 'Abrir Sitio Web';
    }
    return '';
  }

  openExtraInfo(elem: any, key: string, keyLabel: string) {
    if (this.taskNode.children) {
      this.nextPage(this.taskNode.id, elem);
    } else if (elem[key]) {
      this.openExtraInfoModal(elem[keyLabel], elem[key]);
    }
  }

  openExtraInfoModal(title: string, content: string) {
    this.currentExtraInfo.title = title;
    this.currentExtraInfo.content = content;
    this.isModalOpen = true;
  }

  closeExtraInfoModal() {
    this.isModalOpen = false;
  }

  closeModalImg(){
    this.isModalOpenImg = false;
  }

  openModalImg(event: Event, image: String | undefined){
    event.stopPropagation();
    this.imageModal = image || '';
    this.isModalOpenImg = true;
  }

  openLink(link: string) {
    window.open(link, '_system');
  }

}
