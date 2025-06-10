import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RoutingService } from 'src/app/services/routing.service';
import { LanguageService } from 'src/app/services/language.service';
import { DatabaseService } from 'src/app/services/database.service';
import { AuthorizationService } from 'src/app/services/authorization.service';

@Component({
  selector: 'app-favitems',
  templateUrl: './favitems.page.html',
  styleUrls: ['./favitems.page.scss'],
})
export class FavitemsPage implements OnInit {

  selectedLanguage: string | null = null;
  selectedFlag: string | null = null;
  languageOptions: any[] = [];
  category: any = {};
  favorites: any[] = [];
  isModalOpen = false;
  imageModal: String = '';
  
  constructor(private router: Router, private route: ActivatedRoute,
    private routingService: RoutingService, private languageService: LanguageService,
    private databaseService: DatabaseService , private _location: Location,
  private authorizationService: AuthorizationService) {
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
    this.selectedFlag = this.languageService.getFlag();
    this.languageOptions = this.languageService.getLanguageOptions();
  }

  locateElement(elem: any) {
    console.log(elem.geom);
    this.routingService.navigate('map', {features: [elem]});
  }

  locateAllElements(){
    const favoritesElement = this.favorites.map((f) => {
      return f.element;
    });

    this.routingService.navigate('map', {features: favoritesElement});
  }

  async deleteFavorite(fav: any) {
    await this.databaseService.removeFavorite(fav);
    this.getFavorites();
  }

  async toggleVisited(event: any, fav: any) {
    const btn = event.target;
    let visitChange = false;
    if (fav.visited){
      visitChange = false;
      btn.classList.remove('active');
    }else{
      visitChange = true;
      btn.classList.add('active');
    }
    await this.databaseService.visitFavoriteChange(fav, visitChange);
    this.getFavorites();
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
    this.updateFlag(langCode);
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
