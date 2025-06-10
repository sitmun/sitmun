import { Injectable } from '@angular/core';
import { Http } from '@capacitor-community/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InstancesService {

  private instancesUrl = environment.instancesUrl;
  instanceName = 'menorca';
  authorizationUrl = 'http://localhost:8080';
  private initPageUrlTemplate = '/api/config/client/profile/{appId}/{terId}';
  initPageUrl = '/api/config/client/profile/19/4';

  constructor() { }

  async getSitmunInstances() {
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
  }
  
  setInitPageUrl(appId: string, terId: string) {
    this.initPageUrl = this.initPageUrlTemplate.replace('{appId}', appId).replace('{terId}', terId);
  }
}
