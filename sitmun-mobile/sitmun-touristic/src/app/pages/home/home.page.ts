import { Component, OnInit, OnDestroy } from '@angular/core';
import { InstancesService } from 'src/app/services/instances.service';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { RoutingService } from 'src/app/services/routing.service';
import { AlertController, LoadingController, Platform } from '@ionic/angular';
import { LanguageService } from 'src/app/services/language.service';
import { DatabaseService } from 'src/app/services/database.service';
import { Geolocation, PermissionStatus } from '@capacitor/geolocation';
import { App } from '@capacitor/app';

const LABELS: Record<string, string> = {
  title: 'exit.title',
  message: 'exit.message',
  exit: 'exit.exit',
  continue: 'exit.continue'
}

interface Instance {
  value: string;
  name: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {

  private subscriptionBack: any = null;
  instances: Record<string, any> = {};
  instanceOptions: Instance[] = [];
  selectedInstance: string = ''
  messages_: any = {}
  selectedLanguage: string | null = null;
  selectedFlag: string | null = null;
  languageOptions: any[] = [];

  constructor(private platform: Platform, private instancesService: InstancesService, private authorizationService: AuthorizationService,
    private routingService: RoutingService, private alertController: AlertController, private languageService: LanguageService,
    private databaseService: DatabaseService, private loadingCtrl: LoadingController
  ) { }

  ionViewWillEnter() {
    this.selectedLanguage = this.languageService.getLanguage();
    this.selectedFlag = this.languageService.getFlag();
    this.languageOptions = this.languageService.getLanguageOptions();
  }

  ionViewDidEnter() {
    this.subscriptionBack = this.platform.backButton.subscribeWithPriority(-1, (evt) => {
      this.showExitMessage();
    });
  }

  ionViewDidLeave() {
    if(this.subscriptionBack){
      this.subscriptionBack.unsubscribe();
      this.subscriptionBack = null;
    }
  }

  ngOnInit(): void {
    this._loadLang();
    this.languageService.subscribeLang(this._loadLang);
    this.platform.ready().then(() => {
      console.log('Obteniendo instancias');
      this.instancesService.getSitmunInstances().then((data: object) => {
        this.instances = data;
        this.instanceOptions = [];
        const instancesKeys = Object.keys(this.instances);
        instancesKeys.forEach((key: string) => this.instanceOptions.push({value: key, name: this.instances[key].name}));

        if (instancesKeys.length == 1) {
          this.selectedInstance = instancesKeys[0];
          this.access();
        }
      });
    });
    this.requestPermisions();
  }

  async requestPermisions() {
    let permStatus: PermissionStatus = await Geolocation.checkPermissions();
    if (permStatus.location === 'denied') {
      permStatus = await Geolocation.requestPermissions();
      if (permStatus.location === 'denied') {
        this.showAlert();
      }
    }
  }

  async showAlert() {
    const alert = await this.alertController.create({
      header: 'Permiso Denegado',
      message: 'La aplicación puede no funcionar correctamente en algunos casos.',
      buttons: ['OK'],
    });

    await alert.present();
  }

  ngOnDestroy(): void {
    this.languageService.unsubscribeLang();
  }

  onInstanceChange(event: any) {
    const target = event.target;
    this.selectedInstance = target.value;
  }
/*
  async access() {
    if (this.selectedInstance) {
      this.showLoading();
      const selectInstance = this.instances[this.selectedInstance];
      this.instancesService.instanceName = this.selectedInstance;
      await this.databaseService.initDatabase();
      this.instancesService.authorizationUrl = selectInstance.urlBackend;
      this.authorizationService.getTouristicApp().then((apps: any[]) => {
        const idApp = apps[0].id;
        this.authorizationService.getTerritoryByApp(idApp).then(territories => {
          const idTer = territories.content[0].id;
          this.instancesService.setInitPageUrl(idApp, idTer);
          this.authorizationService.getProfile().then(profile => {
            this.hideLoading();
            const data = this.authorizationService.getPagesByProfile(profile);
            this.routingService.redirect(data);
          });
        });
      });
    }
  }
*/

  async access() {
    if (this.selectedInstance) {
      const tiempo0 = Date.now();
      this.showLoading();

      this.databaseService.initDatabase();

      const selectInstance = this.instances[this.selectedInstance];
      this.instancesService.instanceName = this.selectedInstance;

      this.instancesService.authorizationUrl = selectInstance.urlBackend;

      const tiempo2 = Date.now();
      const apps = await this.authorizationService.getTouristicApp();
      console.log(`Tiempo de carga getTouristicApp: ${Date.now() - tiempo2} ms`);

      const idApp = apps[0].id;

      const tiempo3 = Date.now();
      const territories = await this.authorizationService.getTerritoryByApp(idApp);
      console.log(`Tiempo de carga GetTerritoryByApp: ${Date.now() - tiempo3} ms`);

      const idTer = territories.content[0].id;
      this.instancesService.setInitPageUrl(idApp, idTer);

      const tiempo4 = Date.now();
      const profile = await this.authorizationService.getProfile();
      console.log(`Tiempo de carga getProfile: ${Date.now() - tiempo4} ms`);

      const tiempo1 = Date.now();
      await this.databaseService.addProfile(profile);
      console.log(`Tiempo de carga Base de datos: ${Date.now() - tiempo1} ms`);

      const tiempo5 = Date.now();
      const data = this.authorizationService.getPagesByProfile(profile);
      console.log(`Tiempo de carga getPagesByProfile: ${Date.now() - tiempo5} ms`);

      this.hideLoading();

      const tiempoTotal = Date.now() - tiempo0;
      console.log(`Tiempo total de carga: ${tiempoTotal} ms`);

      this.routingService.redirect(data);
    }
  }

  async showLoading() {
    const loading = await this.loadingCtrl.create({});

    loading.present();
  }

  hideLoading() {
    this.loadingCtrl.dismiss();
  }

  async showExitMessage() {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Salir',
      message: '¿Quiere salir de la aplicación?',
      buttons: [
        {
          text: 'Salir',
          cssClass: 'secondary',
          handler: (blah) => {
            console.log('exit app');
            App.exitApp();
          }
        }, {
          text: 'Continuar',
          cssClass: 'secondary',
          handler: () => {
            console.log('Continue');
          }
        }
      ]
    });
    await alert.present();
  }
  
  private _loadLang = () => {
    this.messages_ = this.languageService.loadLang(LABELS);
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
