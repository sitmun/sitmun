import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RoutingService } from 'src/app/services/routing.service';
import { LanguageService } from 'src/app/services/language.service';
import { DatabaseService } from 'src/app/services/database.service';
import { AuthorizationService, Node } from 'src/app/services/authorization.service';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.page.html',
  styleUrls: ['./favorites.page.scss'],
})
export class FavoritesPage implements OnInit {

  selectedLanguage: string | null = null;
  selectedFlag: string | null = null;
  languageOptions: any[] = [];
  rootNode: Node | any = {};
  nodes: Node[] | any[] = [];
  elements: any[] = [];
  
  constructor(private router: Router, private route: ActivatedRoute,
    private routingService: RoutingService, private languageService: LanguageService,
    private databaseService: DatabaseService , private _location: Location,
  private authorizationService: AuthorizationService) {
      this.route.queryParams.subscribe(params => {
      let navigation = this.router.getCurrentNavigation();
      if (navigation) {
        let tempState = navigation.extras.state;
        if (tempState) {
          this.rootNode = tempState['rootNode'];
          this.nodes = tempState['nodes'];
        }
      }
    });
  }

  ngOnInit() {
    this.getCategories();
  }

  getCategories() {
    this.databaseService.getCategories().then(data => {
      this.elements = data;
    });
  }
  
  ionViewWillEnter() {
    this.selectedLanguage = this.languageService.getLanguage();
    this.selectedFlag = this.languageService.getFlag();
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

  nextElements(elem: any) {
    if(elem) {
      this.routingService.navigate('favitems', {category: elem});
    }
  }

  async deleteCategory(cat: any) {
    await this.databaseService.removeCategory(cat.id);
    this.getCategories();
  }

  backPage() {
    this._location.back();
  }

  setLanguage(langCode: string) {
    this.selectedLanguage = langCode;
    this.languageService.setLanguage(langCode);
    this.updateFlag(langCode);
  }

  updateFlag(langCode: string) {
    this.selectedFlag = this.languageService.updateFlag(langCode);
  }

  async locateAllElements(){
    const favs = await this.databaseService.getAllFavorites();
    const favoritesElement = favs.map((f) => {
      f.element = JSON.parse(f.element);
      return f.element;
    });
    const mapData = {features: favoritesElement}
    //this.routingService.navigate('map', mapData);
    const data = await this.authorizationService.getPagesMapNode();
    this.routingService.redirect(data, mapData); 
  }

}
