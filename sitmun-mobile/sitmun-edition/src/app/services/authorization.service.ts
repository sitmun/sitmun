import { Injectable } from '@angular/core';
import { Http } from '@capacitor-community/http';
import { InstancesService } from './instances.service';
import { LoginService } from './login.service';

@Injectable({
  providedIn: 'root'
})
export class AuthorizationService {

  private filter: Function = (obj: any) => { return true;};

  constructor(private instancesService: InstancesService, private loginService: LoginService) { }

  async getApplications() {
    const url = this.instancesService.authorizationUrl.concat('/api/config/client/application');
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
    const url = this.instancesService.authorizationUrl.concat(`/api/config/client/application/${idApp}/territories`);
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
    const url = this.instancesService.authorizationUrl.concat(`/api/config/client/profile/${idApp}/${idTer}`);
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
