import { Injectable } from '@angular/core';
import { Http } from '@capacitor-community/http';
import { InstancesService } from './instances.service';

@Injectable({
  providedIn: 'root'
})
export class ProxyService {

  constructor(private instancesService: InstancesService) { }

  async proxyRequest(type: string, typeId: string) {
    const url = this.instancesService.getProxyRequestUrl(type, typeId);
    console.log(url);
    return new Promise<any[]>((resolve, reject) => {
      Http.get({url}).then(data => {
        resolve(data.data);
      }).catch(error => {
        reject(error);
      });
    });
  }
}
