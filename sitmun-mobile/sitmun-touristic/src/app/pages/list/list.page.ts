import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthorizationService, Node } from 'src/app/services/authorization.service';
import { RoutingService } from 'src/app/services/routing.service';
import { LanguageService } from 'src/app/services/language.service';

@Component({
  selector: 'app-list',
  templateUrl: './list.page.html',
  styleUrls: ['./list.page.scss'],
})
export class ListPage {

  selectedLanguage: string | null = null;
  selectedFlag: string | null = null;
  languageOptions: any[] = [];
  rootNode: Node|any = {};
  nodes: Node[] = [];
  isModalOpen: boolean = false;
  imageModal: String = "";
  
  constructor(private router: Router, private route: ActivatedRoute, private authorizationService: AuthorizationService,
    private routingService: RoutingService, private languageService: LanguageService, private _location: Location) {
      this.route.queryParams.subscribe(params => {
      let navigation = this.router.getCurrentNavigation();
      if (navigation) {
        let tempState = navigation.extras.state;
        if (tempState && tempState['rootNode'] && tempState['nodes']) {
          this.rootNode = tempState['rootNode'];
          this.nodes = tempState['nodes'];
        }
      }
    });
  }

  ionViewWillEnter() {
    this.selectedLanguage = this.languageService.getLanguage();
    this.selectedFlag = this.languageService.getFlag();
    this.languageOptions = this.languageService.getLanguageOptions();
  }

  refreshPage() {
    this.authorizationService.getLastPageNodes().then(data => {
      this.rootNode = data.rootNode;
      this.nodes = data.nodes;
    });
  }

  async startPage() {
    const data = await this.authorizationService.getPagesNodesBD();
    this.routingService.redirect(data);
  }

  async nextPage(idNode: string | undefined) {
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
    this.updateFlag(langCode);
    this.refreshPage();
  }

  updateFlag(langCode: string) {
    this.selectedFlag = this.languageService.updateFlag(langCode);
  }

  closeModal(){
    this.isModalOpen = false;
  }

  openModal(event: Event, image: String | undefined){
    event.stopPropagation();
    this.imageModal = image || '';
    this.isModalOpen = true;
  }

}
