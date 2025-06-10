import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
  
  constructor(private router: Router, private route: ActivatedRoute, private authorizationService: AuthorizationService,
    private routingService: RoutingService, private languageService: LanguageService, private requestService: RequestService,
    private databaseService: DatabaseService , private _location: Location) {
      this.route.queryParams.subscribe(params => {
      let navigation = this.router.getCurrentNavigation();
      if (navigation) {
        let tempState = navigation.extras.state;
        if (tempState) {
          this.rootNode = tempState['rootNode'];
          this.taskNode = tempState['taskNodes'][0];
          this.task = tempState['tasks'][0];
          if (tempState['parentData']){
            this.parentData = tempState['parentData'];
          }
        }
      }
    });
  }

  ngOnInit(): void {
    console.log("Obteniendo elementos");
    this.requestService.templateRequest(this.task, this.taskNode.mapping, this.parentData).then(results => {
      this.elements = results;
      console.log("Elementos obtenidos");
      this.setFavorites();
    });
  }

  ionViewWillEnter() {
    this.selectedLanguage = this.languageService.getLanguage();
    this.selectedFlag = this.languageService.getFlag();
    this.languageOptions = this.languageService.getLanguageOptions();
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

  locateElement(elem: any) {
    console.log(elem.geom);
    this.routingService.navigate('map', {features: [elem], activeLayer: this.taskNode.resource || '*'});
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

}
