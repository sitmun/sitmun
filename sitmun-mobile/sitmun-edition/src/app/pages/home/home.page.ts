import { Component, OnInit, OnDestroy } from '@angular/core';
import { InstancesService } from 'src/app/services/instances.service';
import { AlertController, Platform } from '@ionic/angular';
import { LanguageService } from 'src/app/services/language.service';
import { LoginService } from 'src/app/services/login.service';
import { Router } from '@angular/router';
import { DatabaseService } from 'src/app/services/database.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NetworkService } from 'src/app/services/network.service';

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
  messages_: any = {};
  selectedLanguage: string | null = null;
  languageOptions: any[] = [];
  networkConnected = true;
  loginForm: FormGroup;
  loginusers: any[] = [];
  offline = {
    instances: new Array(),
    users: new Array()
  }
  loginError = false;
  errorMsg = '';
  dbinit = false;

  constructor(private platform: Platform, private instancesService: InstancesService, private router: Router,
    private alertController: AlertController, private languageService: LanguageService, private loginService: LoginService,
    private databaseService: DatabaseService, private formBuilder: FormBuilder, private networkService: NetworkService
  ) {
    this.loginForm = this.formBuilder.group({
      instance: ['', Validators.required],
      user: ['', null],
      password: ['', null]
    });
  }

  async ionViewWillEnter() {
    this.selectedLanguage = this.languageService.getLanguage();
    this.languageOptions = this.languageService.getLanguageOptions();
    if (!this.dbinit) {
      await this.databaseService.initUsersDatabase();
      this.dbinit = true;
    }
    this.loginService.logout();
    this.loginForm.reset();
    this.updateNetworkStatus(await this.networkService.getStatus());
    this.networkService.addListener(this.updateNetworkStatus.bind(this));
    if (!this.networkConnected) {
      await this.getCachedUsers();
    }
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
      this.instancesService.getSitmunInstances().then((data: object) => {
        this.instances = data;
        this.instanceOptions = [];
        Object.keys(this.instances).forEach((key: string) => this.instanceOptions.push({value: key, name: this.instances[key].name}))
      });
    });
  }

  ngOnDestroy(): void {
    this.languageService.unsubscribeLang();
  }

  onInstanceChange(event: any) {
    const target = event.target;
    this.setInstanceOnService(target.value);
  }

  onOfflineInstanceChange(event: any) {
    const target = event.target;
    this.refreshOfflineUsers(target.value);
    this.setInstanceOnService(target.value);
  }

  setInstanceOnService(instance: string) {
    const selectInstance = this.instances[instance];
    this.instancesService.instanceName = instance;
    this.instancesService.authorizationUrl = selectInstance.urlBackend;
    this.instancesService.setProxyUrl(selectInstance.urlProxy, selectInstance.touristicAppId, selectInstance.terId);
  }

  access() {
    this.loginForm.get('instance')?.markAsTouched();
    if (this.loginForm.valid) {
      const formValue = this.loginForm.value;
      if (this.networkConnected) {
        this.loginService.login(formValue.user, formValue.password).then(resp => {
          if (resp) {
            this.loginOnline(formValue);
          } else {
            this.errorMsg = 'Usuario o contraseña incorrectos';
            this.loginError = true;
          }
        }).catch(error => {
          console.error('Login error:', error);
        });
      } else {
        this.loginOffline(formValue);
      }
    } else {
      this.errorMsg = 'No se ha seleccionado una instancia';
      this.loginError = true;
    }
  }

  async loginOnline(formValue: any) {
    this.loginError = false;
    await this.databaseService.insertUserLogin(formValue.instance, formValue.user);
    await this.databaseService.initDatabase(`${formValue.instance}_${formValue.user}`);
    this.nextPage();
  }

  async loginOffline(formValue: any) {
    this.loginError = false;
    await this.databaseService.insertUserLogin(formValue.instance, formValue.user);
    await this.databaseService.initDatabase(`${formValue.instance}_${formValue.user}`);
    this.nextPage();
  }

  nextPage() {
    this.router.navigate(['applist']);
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
            //navigator['app'].exitApp();
            console.log('exit app');
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
  }

  updateNetworkStatus(connected: boolean) {
    this.networkConnected = connected;
    if (!connected) {
      this.getCachedUsers();
    }
  }

  async getCachedUsers() {
    this.loginusers = await this.databaseService.getLoginUsers();
    const instances = new Set<string>();
    this.loginusers.forEach(u => instances.add(u.instance));
    this.offline.instances = Array.from(instances);
    this.loginForm.reset();
    this.loginForm.patchValue({
      instance: this.offline.instances[0]
    });
    this.refreshOfflineUsers(this.offline.instances[0]);
  }

  refreshOfflineUsers(instance: string) {
    this.offline.users = this.loginusers.filter(u => u.instance === instance).map(u => u.name);
  }
}
