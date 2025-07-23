import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthorizationService, Node } from 'src/app/services/authorization.service';
import { RoutingService } from 'src/app/services/routing.service';
import { LanguageService } from 'src/app/services/language.service';
import { RequestService } from 'src/app/services/request.service';

@Component({
  selector: 'app-schedule',
  templateUrl: './schedule.page.html',
  styleUrls: ['./schedule.page.scss'],
})
export class SchedulePage implements OnInit {

  selectedLanguage: string | null = null;
  selectedFlag: string | null = null;
  languageOptions: any[] = [];
  rootNode: Node|any = {};
  taskNode: Node|any = {};
  task: any = {};
  parentData: any = {};
  elements: any[] = [];
  intervalId: any; 
  loaded = false;
  arraySkeleton: any[] = new Array(6);
  
  constructor(private router: Router, private route: ActivatedRoute, private authorizationService: AuthorizationService,
    private routingService: RoutingService, private languageService: LanguageService, private requestService: RequestService) {
      this.route.queryParams.subscribe(params => {
      let navigation = this.router.getCurrentNavigation();
      if (navigation) {
        let tempState = navigation.extras.state;
        if (tempState) {
          this.rootNode = tempState['rootNode'];
          this.taskNode = tempState['taskNodes'][0];
          this.task = tempState['tasks'][0];
          if (tempState['parentData']) {
            this.parentData = tempState['parentData'];
          }
        }
      }
    });
  }

  ngOnInit(): void {
  }

  ionViewWillEnter() {
    this.loaded = false;
    this.selectedLanguage = this.languageService.getLanguage();
    this.selectedFlag = this.languageService.getFlag();
    this.languageOptions = this.languageService.getLanguageOptions();
    this.startPolling();
  }

  ionViewWillLeave() {
    this.stopPolling();
  }

  startPolling() {
    this.intervalId = setInterval(this.getSchedule.bind(this), 120000);
    this.getSchedule();
  }

  stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getSchedule() {
    const proxyParams = this.task.id.split('/');
    this.requestService.templateRequest(this.task, this.taskNode.mapping, this.parentData).then(results => {
      this.elements = results.sort((a: any, b: any) => a.hour.localeCompare(b.hour));
      this.loaded = true;
    });
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
    this.selectedLanguage = langCode;
    this.languageService.setLanguage(langCode);
    this.updateFlag(langCode);
  }

  updateFlag(langCode: string) {
    this.selectedFlag = this.languageService.updateFlag(langCode);
  }

}
