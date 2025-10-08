import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoutingService } from 'src/app/services/routing.service';
import { LanguageService } from 'src/app/services/language.service';
import { DatabaseService } from 'src/app/services/database.service';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { LoadingController, Platform } from '@ionic/angular';

@Component({
  selector: 'app-favitems',
  templateUrl: './favitems.page.html',
  styleUrls: ['./favitems.page.scss'],
})
export class FavitemsPage implements OnInit {

  selectedLanguage: string | null = null;
  languageOptions: any[] = [];
  category: any = {};
  favorites: any[] = [];
  isModalOpen = false;
  imageModal: String = '';
  
  constructor(private router: Router, private route: ActivatedRoute,
    private routingService: RoutingService, private languageService: LanguageService, private platform: Platform,
    private databaseService: DatabaseService , private authorizationService: AuthorizationService,
    private loadingCtrl: LoadingController) {
      this.route.queryParams.subscribe(params => {
      let navigation = this.router.getCurrentNavigation();
      if (navigation) {
        let tempState = navigation.extras.state;
        if (tempState) {
          this.category = tempState['category'];
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
    this.getFavorites();
  }

  getFavorites() {
    this.databaseService.getFavorites(this.category.id).then(data => {
      this.favorites = data.map((f) => {
        f.element = JSON.parse(f.element);
        return f;
      });
    });
  }
  
  ionViewWillEnter() {
    this.selectedLanguage = this.languageService.getLanguage();
    this.languageOptions = this.languageService.getLanguageOptions();
  }

  async locateElement(elem: any) {
    console.log(elem.geom);
    const mapData = {features: [elem]};
    //this.routingService.navigate('map', mapData);
    const data = await this.authorizationService.getPagesMapNode();
    this.routingService.redirect(data, mapData);
  }

  async locateAllElements(){
    const favoritesElement = this.favorites.map((f) => {
      return f.element;
    });
    const mapData = {features: favoritesElement}
    //this.routingService.navigate('map', mapData);
    const data = await this.authorizationService.getPagesMapNode();
    this.routingService.redirect(data, mapData);
  }

  async deleteFavorite(fav: any) {
    await this.databaseService.removeFavorite(fav);
    this.getFavorites();
  }

  async toggleVisited(boton: any, fav: any) {
    const btn = boton.target;
    let visitChange = false;
    if (btn.classList.contains('active')) {
      btn.classList.remove('active');
      visitChange = false;
    } else {
      btn.classList.add('active');
      visitChange = true;
    }
    await this.databaseService.visitFavoriteChange(fav, visitChange);
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
    this.showLoading();
    this.selectedLanguage = langCode;
    this.languageService.setLanguage(langCode);
    this.refreshProfile(); // Refresh profile to ensure language is updated
  }

  refreshProfile() {
    this.authorizationService.getProfile().then(profile => {
      this.databaseService.addProfile(profile);
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

  closeModal(){
    this.isModalOpen = false;
  }

  openModal(event: Event, image: String | undefined){
    event.stopPropagation();
    this.imageModal = image || '';
    this.isModalOpen = true;
  }

}
