import { Component, OnInit, OnDestroy } from '@angular/core';
import { InstancesService } from 'src/app/services/instances.service';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { RoutingService } from 'src/app/services/routing.service';
import { AlertController, LoadingController, Platform } from '@ionic/angular';
import { LanguageService } from 'src/app/services/language.service';
import { DatabaseService } from 'src/app/services/database.service';
import { Geolocation, PermissionStatus } from '@capacitor/geolocation';
import { App } from '@capacitor/app';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';
import { firstValueFrom } from 'rxjs';


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
  selectedInstance: string = '';
  messages_: any = {};
  selectedLanguage: string | null = null;
  languageOptions: any[] = [];

  constructor(private platform: Platform, private instancesService: InstancesService, private authorizationService: AuthorizationService,
    private routingService: RoutingService, private alertController: AlertController, private languageService: LanguageService,
    private databaseService: DatabaseService, private loadingCtrl: LoadingController
  ) { }

  ionViewWillEnter() {
    this.selectedLanguage = this.languageService.getLanguage();
    this.languageOptions = this.languageService.getLanguageOptions();
  }

  ionViewDidEnter() {
    this.subscriptionBack = this.platform.backButton.subscribeWithPriority(-1, (evt) => {
      this.showExitMessage();
    });
    this.routingService.clearhistoric();
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
      }).catch(error => {
        this.showErrorAlert('home.territoriesError');
        console.error(error);
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
    const header = await firstValueFrom(this.languageService.translateTag('home.header'));
    const message = await firstValueFrom(this.languageService.translateTag('home.message'));
    const settings = await firstValueFrom(this.languageService.translateTag('home.settings'));

    const alert = await this.alertController.create({
      header: header,
      message: message,
      buttons: [
                {
                  text: settings,
                  handler: async () => {
                    await NativeSettings.open({
                      optionAndroid: AndroidSettings.ApplicationDetails,
                      optionIOS: IOSSettings.App,
                    });
                  },
                },
                {
                  text: 'OK',
                  role: 'confirm'
                },
              ]
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

  async access() {
    if (this.selectedInstance) {
      this.showLoading();

      const selectInstance = this.instances[this.selectedInstance];
      this.instancesService.instanceName = this.selectedInstance;
      this.instancesService.authorizationUrl = selectInstance.urlBackend;
      this.databaseService.initDatabase().then(() => {
        this.authorizationService.getTouristicApp().then(apps => {
          const idApp = apps[0].id;
          this.authorizationService.getTerritoryByApp(idApp).then(territories => {
            const idTer = territories.content[0].id;
            this.instancesService.setInitPageUrl(idApp, idTer);

            this.authorizationService.getProfile().then(profile => {
              this.databaseService.addProfile(profile).then(() => {
                const data = this.authorizationService.getPagesByProfile(profile);
                this.hideLoading();
                this.routingService.addHistoric('/home', {});
                this.routingService.redirect(data);
              }).catch(error => {
                this.showErrorAlert('home.saveConfError');
                console.error(error);
                this.hideLoading();
              });
            }).catch(error => {
              this.showErrorAlert('home.getConfError');
              console.error(error);
              this.hideLoading();
            });
          }).catch(error => {
            this.showErrorAlert('home.territoryError');
            console.error(error);
            this.hideLoading();
          });
        }).catch(error => {
          this.showErrorAlert('home.appError');
          console.error(error);
          this.hideLoading();
        });
      }).catch(error => {
        this.showErrorAlert('home.databaseError');
        console.error(error);
        this.hideLoading();
      });
    }
  }

  async showLoading() {
    const loading = await this.loadingCtrl.create({});

    loading.present();
  }

  hideLoading() {
    this.loadingCtrl.dismiss();
  }

  async showErrorAlert(msg: string) {
    const message = await firstValueFrom(this.languageService.translateTag(msg));
    const header = await firstValueFrom(this.languageService.translateTag('home.headerError'));

    const alert = await this.alertController.create({
      header: header,
      message: message,
      buttons: ['Ok'],
    });

    await alert.present();
  }

  async showExitMessage() {
    const exit = await firstValueFrom(this.languageService.translateTag("exit.title"));
    const message = await firstValueFrom(this.languageService.translateTag("exit.message"));
    const cont = await firstValueFrom(this.languageService.translateTag("exit.continue"));

    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: exit,
      message: message,
      buttons: [
        {
          text: exit,
          cssClass: 'secondary',
          handler: (blah) => {
            console.log('exit app');
            App.exitApp();
          }
        }, {
          text: cont,
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
  }
}
