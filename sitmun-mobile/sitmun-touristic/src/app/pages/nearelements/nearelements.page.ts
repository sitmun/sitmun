import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthorizationService, Node } from 'src/app/services/authorization.service';
import { RoutingService } from 'src/app/services/routing.service';
import { LanguageService } from 'src/app/services/language.service';
import { RequestService } from 'src/app/services/request.service';

@Component({
  selector: 'app-nearelements',
  templateUrl: './nearelements.page.html',
  styleUrls: ['./nearelements.page.scss'],
})
export class NearelementsPage implements OnInit {

  selectedLanguage: string | null = null;
  selectedFlag: string | null = null;
  languageOptions: any[] = [];
  rootNode: Node|any = {};
  taskNode: Node|any = {};
  parentData: any = {};
  task: any = {};
  elements: any[] = [];
  
  constructor(private router: Router, private route: ActivatedRoute, private authorizationService: AuthorizationService,
    private routingService: RoutingService, private languageService: LanguageService, private requestService: RequestService,
    private _location: Location) {
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
    const proxyParams = this.task.id.split('/');
    this.requestService.templateRequest(this.task, this.taskNode.mapping, this.parentData).then(results => {
      this.elements = results.sort((a, b) => a.distance - b.distance);
    });
  }

  ionViewWillEnter() {
    this.selectedLanguage = this.languageService.getLanguage();
    this.selectedFlag = this.languageService.getFlag();
    this.languageOptions = this.languageService.getLanguageOptions();
  }

  toggleFavorite(event: any, elem: any) {
    const btn = event.target;
    if (btn.classList.contains('active')) {
      btn.classList.remove('active');
    } else {
      btn.classList.add('active');
    }
    console.log(elem);
  }

  async locateElement(elem: any) {
    console.log(elem.geom);
    const mapData = {features: [elem]};
    //this.routingService.navigate('map', mapData);
    const data = await this.authorizationService.getPagesMapNode();
    this.routingService.redirect(data, mapData);
  }

  async showSchedule(elem: any) {
    if(elem && this.taskNode.id) {
      const data = await this.authorizationService.getPagesNodesBD(this.taskNode.id);
      this.routingService.redirect(data, elem);
    }
  }

  roundDistance(distance: string) {
    return Number.parseFloat(distance).toFixed();
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

}
