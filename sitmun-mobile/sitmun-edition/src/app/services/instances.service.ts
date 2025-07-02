import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class InstancesService {

  authorizationUrl = '';
  private proxyUrl = 'http://localhost:8080/proxy';
  private proxyRequestTemplate = '/{appId}/{terId}/{type}/{typeId}';

  constructor(private databaseService: DatabaseService) { }

  setProxyUrl(proxyUrl: string, appId: string, terId: string) {
      this.proxyUrl = proxyUrl.concat(this.proxyRequestTemplate.replace('{appId}', appId).replace('{terId}', terId));
  }

  getProxyRequestUrl(type: string, typeId: string) {
    return this.proxyUrl.replace('{type}', type).replace('{typeId}', typeId);
  }

  async getInstanceUrl(){
     const instances = await this.databaseService.getInstances();
     let instanceUrl = '';
    if (instances.length > 0) {
      instanceUrl = instances[0].instance;
    }
    return instanceUrl;
  }
}
