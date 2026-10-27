import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthorizationService, Node } from 'src/app/services/authorization.service';
import { RoutingService } from 'src/app/services/routing.service';
import { LanguageService } from 'src/app/services/language.service';
import { DatabaseService } from 'src/app/services/database.service';
import { constants } from 'src/environments/constants';
import { LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
})
export class MenuPage {

  selectedLanguage: string | null = null;
  languageOptions: any[] = [];
  rootNode: Node|any = {};
  nodes: Node[] = [];
  imgLogo: string = '';

  constructor(private router: Router, private route: ActivatedRoute, private authorizationService: AuthorizationService,
    private routingService: RoutingService, private languageService: LanguageService, private databaseService: DatabaseService,
    private loadingCtrl: LoadingController) {
      
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
    this.languageOptions = this.languageService.getLanguageOptions();

    this.databaseService.getProfileData("trees").then(data => {
      const trees: any[] = JSON.parse(data[0].json);
      const touristicTree = trees.find(t => t.type === constants.codeValue.treeType.touristicTree);
      this.imgLogo = touristicTree.image;
    });
  }

  refreshPage() {
    this.authorizationService.getProfile().then(profile => {
      this.databaseService.addProfile(profile);
      const data = this.authorizationService.getPagesByProfile(profile, this.rootNode.id);
      this.rootNode = data.rootNode;
      this.nodes = data.nodes;
      this.hideLoading();
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
    this.routingService.navigateBack();
  }

  setLanguage(langCode: string) {
    this.showLoading();
    this.selectedLanguage = langCode;
    this.languageService.setLanguage(langCode);
    this.refreshPage();
  }

  async showLoading() {
    const loading = await this.loadingCtrl.create({});

    loading.present();
  }

  hideLoading() {
    this.loadingCtrl.dismiss();
  }

}
