import { Injectable } from '@angular/core';
import { Http } from '@capacitor-community/http';
import { LoginService } from './login.service';
import { InstancesService } from './instances.service';

@Injectable({
  providedIn: 'root'
})
export class AuthorizationService {

  private filter: Function = (obj: any) => { return true;};
  authorizationUrl = '';
  private profileData: any;

  constructor(private loginService: LoginService, private instancesServices: InstancesService) { }

  async getApplications() {
    const url = (await this.instancesServices.getInstanceUrl()).concat('/api/config/client/application');
    console.log(url);
    const options = {
      url,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer '.concat(this.loginService.getToken())
      },
      params: {}
    };
    this.filter = (a: any) => {return a.type === 'ED';};
    return this.request(options, this.filterCallback.bind(this));
  }

  async getTerritoriesByApp(idApp: Number) {
    const url = (await this.instancesServices.getInstanceUrl()).concat(`/api/config/client/application/${idApp}/territories`);
    console.log(url);
    const options = {
      url,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer '.concat(this.loginService.getToken())
      },
      params: {}
    };
    return this.request(options, this.basicCallback);
  }

  async getProfile(idApp: Number, idTer: Number) {
    //const url = this.authorizationUrl.concat(`/api/config/client/profile/${idApp}/${idTer}`);
    const url = (await this.instancesServices.getInstanceUrl()).concat(`/api/config/client/profile/${idApp}/${idTer}`);
    console.log(url);
    const options = {
      url,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer '.concat(this.loginService.getToken())
      },
      params: {}
    };
    return this.request(options, this.profileCallback.bind(this));
  }

  getProfileData() {
    return this.profileData;
  }

  private profileCallback(resp: any) {
    this.profileData = resp.data;
    return resp.data;
  }

  private basicCallback(resp: any) {
    return resp.data.content ? resp.data.content : resp.data;
  }

  private filterCallback(resp: any) {
    return resp.data.content.filter((obj: any) => this.filter(obj));
  }

  private request(options: any, callback: Function) {
    return new Promise<any>((resolve, reject) => {
      Http.request(options).then(resp => {
        resolve(callback(resp));
      }).catch(error => {
        reject(error);
      });
    });
  }
}
