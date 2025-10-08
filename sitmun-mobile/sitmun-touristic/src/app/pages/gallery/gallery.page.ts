import { Component, OnInit } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { DatabaseService } from 'src/app/services/database.service';
import { LanguageService } from 'src/app/services/language.service';
import { RequestService } from 'src/app/services/request.service';
import { RoutingService } from 'src/app/services/routing.service';

@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.page.html',
  styleUrls: ['./gallery.page.scss'],
})
export class GalleryPage implements OnInit {

  selectedLanguage: string | null = null;
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
      private languageService: LanguageService, private requestService: RequestService, private databaseService: DatabaseService,
      private loadingCtrl: LoadingController) { }
  
    ngOnInit() {
    }

  ionViewWillEnter() {
    this.loaded = false;
    this.selectedLanguage = this.languageService.getLanguage();
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

  async getData() {
    console.log("Obteniendo elementos");
    const results = await this.requestService.templateRequest(this.task, this.taskNode.mapping, this.parentData);
    this.elements = results;
    console.log("Elementos obtenidos");
    this.loaded = true;
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

  async setLanguage(langCode: string) {
    this.showLoading();
    this.selectedLanguage = langCode;
    this.languageService.setLanguage(langCode);
    await this.getData(); // Reload data with the new language
    this.refreshProfile(); // Refresh profile to ensure language is updated
  }

  refreshProfile() {
    this.authorizationService.getProfile().then(profile => {
      this.databaseService.addProfile(profile);
      const data = this.authorizationService.getPagesByProfile(profile, this.rootNode.id);
      this.rootNode = data.rootNode;
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

  closeModalImg(){
    this.isModalOpenImg = false;
  }

  openModalImg(event: Event, image: String | undefined){
    event.stopPropagation();
    this.imageModal = image || '';
    this.isModalOpenImg = true;
  }

}
