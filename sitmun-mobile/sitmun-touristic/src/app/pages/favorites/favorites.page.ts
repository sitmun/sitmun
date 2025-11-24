import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoutingService } from 'src/app/services/routing.service';
import { LanguageService } from 'src/app/services/language.service';
import { DatabaseService } from 'src/app/services/database.service';
import { AuthorizationService, Node } from 'src/app/services/authorization.service';
import { LoadingController, Platform } from '@ionic/angular';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.page.html',
  styleUrls: ['./favorites.page.scss'],
})
export class FavoritesPage implements OnInit {

  selectedLanguage: string | null = null;
  languageOptions: any[] = [];
  rootNode: Node | any = {};
  nodes: Node[] | any[] = [];
  elements: any[] = [];
  
  constructor(private router: Router, private route: ActivatedRoute,
    private routingService: RoutingService, private languageService: LanguageService, private platform: Platform,
    private databaseService: DatabaseService , private authorizationService: AuthorizationService,
    private loadingCtrl: LoadingController) {
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
    if (this.platform.is('ios')) {
      const element = document.querySelector('.floating-container');
      if (element) {
        element.classList.add('element-ios');
      }
    }
  }

  getCategories() {
    this.databaseService.getCategories().then(data => {
      this.elements = data;
    });
  }
  
  ionViewWillEnter() {
    this.selectedLanguage = this.languageService.getLanguage();
    this.languageOptions = this.languageService.getLanguageOptions();
    this.getCategories();
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
      this.nodes = data.nodes;
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
