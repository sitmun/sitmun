import { Component, OnInit } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { DatabaseService } from 'src/app/services/database.service';
import { LanguageService } from 'src/app/services/language.service';
import { NetworkService } from 'src/app/services/network.service';

@Component({
  selector: 'app-applist',
  templateUrl: './applist.page.html',
  styleUrls: ['./applist.page.scss'],
})
export class ApplistPage implements OnInit {

  messages_: any = {}
  selectedLanguage: string | null = null;
  languageOptions: any[] = [];
  applications: any[] = [];
  territories: any[] = [];
  selectedTerritory: any = {};
  selectedTerritoryId: number = 0;
  selectedApp: any = {};
  isModalOpen = false;
  nextPage = 'map';
  networkConnected = true;

  constructor(private languageService: LanguageService, private router: Router,
    private authorizationService: AuthorizationService, private networkService: NetworkService,
    private databaseService: DatabaseService) {

  }

  async ionViewWillEnter() {
    this.selectedLanguage = this.languageService.getLanguage();
    this.languageOptions = this.languageService.getLanguageOptions();
    this.updateNetworkStatus(await this.networkService.getStatus());
    this.networkService.addListener(this.updateNetworkStatus.bind(this));
  }

  ngOnInit() {
    this.refreshApplications();
  }

  refreshApplications() {
    if (this.networkConnected) {
      this.getApplications();
    } else {
      this.getOfflineApplications();
    }
  }

  getApplications() {
    this.authorizationService.getApplications().then(resp => {
      this.applications = resp;
    }).catch(error => {
      console.log('Error obteniendo las aplicaciones disponibles:', error);
    });
  }

  async getOfflineApplications() {
    this.applications = await this.databaseService.getApps();
  }

  async getTerritoriesByApp(idApp: Number) {
    if (this.networkConnected) {
      this.territories = (await this.authorizationService.getTerritoriesByApp(idApp));
    } else {
      this.territories = await this.databaseService.getTerritoriesByApp(idApp);
    }
  }

  async mapPage(app: any) {
    this.selectedApp = app;
    await this.getTerritoriesByApp(this.selectedApp.id);
    this.selectedTerritory = this.territories[0];
    this.selectedTerritoryId = this.selectedTerritory.id;
    this.nextPage = 'map';
    if (this.territories.length === 1) {
      this.openMap();
    } else {
      this.openTerritoryModal();
    }
  }

  openTerritoryModal() {
    this.isModalOpen = true;
  }

  closeTerritoryModal(openPage: boolean) {
    this.isModalOpen = false;
    if (openPage) {
      this.selectedTerritory = this.territories.find(t => t.id === this.selectedTerritoryId);
      if (this.nextPage === 'map') {
        setTimeout(this.openMap.bind(this), 500);
      } else if (this.nextPage === 'download') {
        setTimeout(this.openDownload.bind(this), 500);
      }
    }
  }

  openMap() {
    console.log(`App: ${this.selectedApp.id}, Terr: ${this.selectedTerritory}`);
    const navigationExtras: NavigationExtras = {
      state: {
        app: this.selectedApp,
        ter: this.selectedTerritory
      }
    };
    this.router.navigate(['map'], navigationExtras);
  }

  async downloadPage(app: any) {
    this.selectedApp = app;
    await this.getTerritoriesByApp(this.selectedApp.id);
    this.selectedTerritory = this.territories[0];
    this.selectedTerritoryId = this.selectedTerritory.id;
    this.nextPage = 'download';
    if (this.territories.length === 1) {
      this.openDownload();
    } else {
      this.openTerritoryModal();
    }    
  }

  openDownload() {
    const navigationExtras: NavigationExtras = {
      state: {
        app: this.selectedApp,
        ter: this.selectedTerritory
      }
    };
    this.navigate('download', navigationExtras);
  }

  navigate(path: string, navigationExtras: NavigationExtras) {
    this.router.navigate([path], navigationExtras);
  }

  setLanguage(langCode: string) {
    this.selectedLanguage = langCode;
    this.languageService.setLanguage(langCode);
  }

  updateNetworkStatus(connected: boolean) {
    this.networkConnected = connected;
    this.refreshApplications();
  }
}
