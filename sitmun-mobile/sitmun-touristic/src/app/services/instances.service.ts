import { Injectable } from '@angular/core';
import { Http } from '@capacitor-community/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InstancesService {

  private instancesUrl = environment.instancesUrl;
  instanceName = '';
  authorizationUrl = 'http://localhost:9000/backend';
  private initPageUrlTemplate = '/api/config/client/profile/{appId}/{terId}';
  initPageUrl = '';

  constructor() { }

  async getSitmunInstances() {
    if (this.instancesUrl) {
      const options = {
        url: this.instancesUrl,
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        params: {}
      };
      return new Promise<object>((resolve, reject) => {
        Http.request(options).then(data => {
          resolve(data.data);
        }).catch(error => {
          reject(error);
        });
      });
    } else {
      return new Promise<object>((resolve, reject) => {
        resolve(environment.instancesData);
      });
    }
  }
  
  setInitPageUrl(appId: string, terId: string) {
    this.initPageUrl = this.initPageUrlTemplate.replace('{appId}', appId).replace('{terId}', terId);
  }
}
