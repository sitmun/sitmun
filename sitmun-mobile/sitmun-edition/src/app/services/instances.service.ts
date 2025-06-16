import { Injectable } from '@angular/core';
import { Http } from '@capacitor-community/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InstancesService {

  private instancesUrl = environment.instancesUrl;
  instanceName = '';
  authorizationUrl = '';
  private proxyUrl = 'http://localhost:8080/proxy';
  private proxyRequestTemplate = '/{appId}/{terId}/{type}/{typeId}';

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

  setProxyUrl(proxyUrl: string, appId: string, terId: string) {
      this.proxyUrl = proxyUrl.concat(this.proxyRequestTemplate.replace('{appId}', appId).replace('{terId}', terId));
  }

  getProxyRequestUrl(type: string, typeId: string) {
    return this.proxyUrl.replace('{type}', type).replace('{typeId}', typeId);
  }
}
