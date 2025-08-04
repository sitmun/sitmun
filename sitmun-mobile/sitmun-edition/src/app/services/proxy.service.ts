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

  async sendbgLayerServices(mapServices: any[], extent: any, zoom: number, projection: string, instance: string) {
    const url = instance.replace("backend", "middleware").concat('/proxy/mbtiles');
    console.log(url);
    const options = {
      url,
      method: 'POST',
      headers: {
        'Accept': 'text/plain',
        'Content-Type': 'application/json'
      },
      data: {
        mapServices: mapServices,
        minLon: Number(extent.minX),
        minLat: Number(extent.minY),
        maxLon: Number(extent.maxX),
        maxLat: Number(extent.maxY),
        minZoom: zoom-1,
        maxZoom: zoom+1,
        srs: projection
      },
      params: {}
    };
    return this.request(options);
  }

  async getbgLayerFileWeight(mapServices: any[], extent: any, zoom: number, projection: string) {
    const url = (await this.instancesService.getInstanceUrl()).replace("backend", "middleware").concat('/proxy/mbtiles/estimate');
    console.log(url);
    const options = {
      url,
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      data: {
        mapServices: mapServices,
        minLon: Number(extent.minX),
        minLat: Number(extent.minY),
        maxLon: Number(extent.maxX),
        maxLat: Number(extent.maxY),
        minZoom: zoom-1,
        maxZoom: zoom+1,
        srs: projection
      },
      params: {}
    };
    return this.request(options);
  }

  async checkbgServices(jobId: string, instance: string) {
    const url = instance.replace("backend", "middleware").concat(`/proxy/mbtiles/${jobId}`);
    console.log(url);
    const options: any = {
      url,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      params: {}
    };
    return this.request(options);
  }

  private request(options: any) {
    return new Promise<any>((resolve, reject) => {
      Http.request(options).then(resp => {
        resolve(resp);
      }).catch(error => {
        reject(error);
      });
    });
  }
}
