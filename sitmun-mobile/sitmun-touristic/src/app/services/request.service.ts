import { Injectable } from '@angular/core';
import { Http, HttpOptions } from '@capacitor-community/http';
import { InstancesService } from './instances.service';
import * as uriTemplate from 'uri-templates';
import * as jp from 'jsonpath';
import * as xpath from 'xpath';
import * as xmldom from 'xmldom';
import { MapaService } from './mapa.service';
import { create } from 'xmlbuilder2';
import { XMLBuilder } from 'xmlbuilder2/lib/interfaces';
import { DatabaseService } from './database.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RequestService {

  responseType = 'json';
  pathPos = 0;
  posLength = 1;
  cacheExpirationTime = environment.cacheExpirationTime * 60000;

  constructor(private instancesService: InstancesService, private mapaService: MapaService,
    private databaseService: DatabaseService
  ) { }

  setTaskUrl(task: any) {
    let newUrl = task.url;
    const instanceName = this.instancesService.instanceName;
    if (instanceName === 'casa') {
      newUrl = newUrl.replace('localhost', '192.168.1.140');
    } else if (instanceName === 'oficina') {
      newUrl = newUrl.replace('localhost', '192.168.60.173');
    } else if (instanceName === 'eduardo') {
      newUrl = newUrl.replace('localhost', '192.168.61.157');
    }
    task.url = newUrl;
  }

  addParamsToUrlAndGetBody(task: any) {
    const params = task.parameters;
    const body: string[] = [];
    let url = task.url;
    if (params) {
      const keys = Object.keys(params);
      const queryParams: string[] = [];
      keys.forEach(k => {
        const param = params[k];
        if (param.required) {
          if (param.type === 'query') {
            queryParams.push(k);
          } else if (param.type === 'body') {
            body.push(k);
          }
        }
      });
      if (queryParams.length > 0) {
        url = `${task.url}{?${queryParams.toString()}}`;
      }
    }
    return {body, url};
  }

  async templateRequest(task: any, mapping: any, parentData: any = {}, params: any = {}) {
    this.setTaskUrl(task);
    const requestData = this.addParamsToUrlAndGetBody(task);
    this.responseType = 'json';
    const uri = await this.generateUrlByTemplate(requestData.url, task.parameters, mapping, parentData, params);
    console.log(`Requested url: ${uri}`);
    let url = uri;
    try {
      url = decodeURIComponent(uri);
    } catch(error) {
      console.error(error);
    }
    const urlParts = url.split('?');
    params = this.addParams(params, urlParts.length > 1 ? urlParts[1] : '');
    const options: HttpOptions = {
      url: urlParts[0],
      method: 'GET',
      headers: {
        'Accept': 'application/json,application/xml'
      },
      params
    };
    if (requestData.body.length > 0) {
      const body: Record<string, string> = {};
      requestData.body.forEach(k => {
        body[k] = this.calculateInputs(k, null, mapping, {}, null, {});
      });
      options.method = 'POST',
      options['data'] = body;
    }
    const cache = await this.getCache(urlParts[0], JSON.stringify(params));
    if (cache) {
      return cache;
    } else {
      return new Promise<any[]>((resolve, reject) => {
        Http.request(options).then(data => {
          const response = this.mappingResponse(data.data, mapping);
          this.addCache(urlParts[0], JSON.stringify(params), JSON.stringify(response)).then(() => {
              resolve(response);
          });
        }).catch(error => {
          reject(error);
        });
      });
    }
  }

  private async getCache(url: string, params: string) {
    let response: any | null = null;
    const cache = await this.databaseService.getCacheData(url, params);
    if (cache.length > 0 && (cache[0].request_date + this.cacheExpirationTime) <= new Date().getTime()) {
      response = JSON.parse(cache[0].response);
    }
    return response;
  }

  private async addCache(url: string, params: string, response: string) {
    await this.databaseService.removeCache(url, params);
    await this.databaseService.insertCacheData(url, params, response);
  }

  private async generateUrlByTemplate(template: string, params: any, mapping: any, parentData: any, urlParams: any) {
    const strInput = JSON.stringify(mapping.input);
    const position = strInput.includes('${LONGITUD}') || strInput.includes('${LONGITUD}') ? await this.mapaService.getLocation() : null;
    const url = await this.generateWithUriTemplate(template, params, mapping, parentData, urlParams, position);
    this.removeAllParams(strInput.toUpperCase(), urlParams);
    return url;
  }

  private async generateWithUriTemplate(template: string, params: any, mapping: any, parentData: any, urlParams: any, position: any) {
    const ut = uriTemplate(template);
    const url = ut.fill((key: string) => {
      return this.calculateInputs(key, params, mapping, parentData, position, urlParams);
    });
    return decodeURI(url);
  }

  private removeAllParams(strInput: string, params: any) {
    this.removeParams(strInput, '${STARTDATE}', params, 'startdate');
    this.removeParams(strInput, '${ENDDATE}', params, 'enddate');
    this.removeParams(strInput, '${KEYWORD}', params, 'keyWord');
    this.removeParams(strInput, '${LATITUD}', params, 'latitud');
    this.removeParams(strInput, '${LONGITUD}', params, 'longitud');
    this.removeParams(strInput, '${DISTANCE}', params, 'distance');
    this.removeParams(strInput, '${WFSFILTER}', params, 'keyWord');
    this.removeParams(strInput, 'PROPERTYNAME', params, 'propertyname');
  }

  private removeParams(strInput: string, mapKey: string, params: any, paramKey: string) {
    if (strInput.includes(mapKey) && params[paramKey]) {
      params[paramKey] = undefined;
    }
  }

  private calculateInputs(key: string, params: any, mapping: any, parentData: any, position: any, urlParams: any) {
    let result = params ? params[key].value : '';
    const mapInput = mapping ? mapping.input[key] : null;
    if (mapInput) {
      if (mapInput.calculated) {
        result = this.getCalculatedInputValue(mapInput.value, parentData, position, urlParams, mapping);
      } else {
        result = mapInput.value;
      }
    }
    return result;
  }

  private getCalculatedInputValue(param: string, parentData: any, position: any, urlParams: any, mapping: any) {
    const paramKey = param.substring(param.indexOf('${') + 2, param.indexOf('}'));
    if (parentData[paramKey]) {
      return parentData[paramKey];
    }
    switch(paramKey) {
      case 'LATITUD':
        return urlParams.latitud ? urlParams.latitud : (position ? position.y : 40);
      case 'LONGITUD':
        return urlParams.longitud ? urlParams.longitud : (position ? position.x : 4);
      case 'STARTDATE':
        return urlParams.startdate ? urlParams.startdate : this.getToday();
      case 'ENDDATE':
        return urlParams.enddate ? urlParams.enddate : this.getNext15();
      case 'KEYWORD':
        return urlParams.keyWord ? `%${urlParams.keyWord}%` : '%_%';
      case 'DISTANCE':
        return urlParams.distance ? urlParams.distance : 1000;
      case 'WFSFILTER':
        return urlParams.keyWord ? this.buildWfsFilter(urlParams) : '';
      case 'WFSUNITARYFILTER':
        return this.buildWfsUnitaryFilter(mapping, parentData);
      default:
        return param;
    }
  }

  buildWfsFilter(params: any) {
    let doc = null;
    if (params.propertyname) {
      doc = create()
      .ele('ogc:Filter', {
        'xmlns:ogc': 'http://www.opengis.net/ogc'
      });
      const orElem = doc.ele('ogc:Or');
      params.propertyname.forEach((prop: string) => this.wfsPropertyFilter(orElem, prop, params.keyWord));
    }
    return doc !== null ? doc.end({ headless: true }) : '';
  }

  buildWfsUnitaryFilter(mapping: any, parentData: any) {
    const query = parentData['id'];
    let prop = mapping.output['id'].value;
    if (prop.startsWith('$')) {
      prop = prop.substring(prop.lastIndexOf('.') + 1);
    } else {
      prop = prop.substring(prop.lastIndexOf('/') + 1);
    }
    let doc = create()
    .ele('ogc:Filter', {
      'xmlns:ogc': 'http://www.opengis.net/ogc'
    });
    this.wfsPropertyEquals(doc, prop, query);
    return doc !== null ? doc.end({ headless: true }) : '';
  }

  wfsPropertyFilter(doc: XMLBuilder, property: string, query: string) {
    const orParent = doc.ele('Or');
    this.wfsPropertyLike(orParent, property, query.toLowerCase());
    this.wfsPropertyLike(orParent, property, query.toUpperCase());
  }

  wfsPropertyLike(doc: XMLBuilder, property: string, query: string) {
    const propDoc = doc.ele('PropertyIsLike', {
      escape: '\\',
      singleChar: '_',
      wildCard: '*',
      matchCase: 'false'
    });
    propDoc.ele('PropertyName').txt(property);
    propDoc.ele('Literal').txt(`*${query}*`);
  }

  wfsPropertyEquals(doc: XMLBuilder, property: string, query: string) {
    const propDoc = doc.ele('PropertyIsEqualTo');
    propDoc.ele('PropertyName').txt(property);
    propDoc.ele('Literal').txt(query);
  }

  private mappingResponse(response: any, mapping: any): any {
    let mapResult: any[] = [];
    this.pathPos = 0;
    this.posLength = 0;
    if (typeof response === 'string') {
      this.responseType = 'xml';
      const doc = new xmldom.DOMParser().parseFromString(response.replace(/>\s+</g, '><'), 'text/xml');
      if (Object.keys(mapping.namespaces).length === 0) {
        this.clearDocNamespaces(doc);
      }
      mapResult = this.mappingResponse(doc, mapping);
    } else {
      if (this.responseType === 'xml') {
        this.pathPos = 1;
        this.posLength = 1;
      }
      if (Array.isArray(response)) {
        response.forEach(obj => {
          mapResult.push(this.mappingObject(obj, mapping));
        });
      } else {
        while (this.pathPos <= this.posLength) {
          const mappedObj = this.mappingObject(response, mapping);
          mapResult.push(mappedObj);
          this.pathPos += 1;
        }
      }
    }
    return mapResult;
  }

  clearDocNamespaces(doc: any) {
    if (doc.namespaceURI) {
      doc.namespaceURI = '';
    }
    if (doc.childNodes && doc.childNodes.length > 0) {
      for (let i = 0; i < doc.childNodes.length; i++) {
        this.clearDocNamespaces(doc.childNodes[i]);
      }
    }
  }

  private mappingObject(obj: any, mapping: any): any {
    const result: Record<string, any> = {};
    if(mapping && mapping.output) {
      const mapKeys = Object.keys(mapping.output);
      mapKeys.forEach(k => {
        if (mapping.output[k].calculated) {
          result[k] = this.calculateOutput(obj, mapping.output[k].value, mapping.namespaces);
        } else {
          result[k] = this.getPathValue(obj, mapping.output[k].value, mapping.namespaces);
        }
        
      });
    } else {
      return obj;
    }
    return result;
  }

  private calculateOutput(obj: any, expresion: string, namespaces: any) {
    let result = expresion;
    const matches = this.getMatches(expresion);

    matches.forEach(r => {
      result = result.replace(r[0], this.getPathValue(obj, r[1], namespaces));
    });
    return result;
  }

  getMatches(expresion: string) {
    const regex = /\$\{([^}]*)\}/g;
    const matches = [];
    let match;

    while ((match = regex.exec(expresion)) !== null) {
      matches.push(match);
    }
    return matches;
  }

  private getPathValue(obj: any, path: string, namespaces: any) {
    let result = null;
    if (this.responseType === 'json') {
      result = this.getJsonPathValue(obj, path);
    } else {
      result = this.getXPathValue(obj, path, namespaces);
    }

    return result;
  }

  private getJsonPathValue(obj: any, path: string) {
    if (path) {
      if (path.includes('[pos]')) {
        const posPath = path.substring(0, path.indexOf('[pos]'));
        const elements = jp.query(obj, posPath);
        if (elements && Array.isArray(elements) && elements.length >= 1) {
          this.posLength = elements[0].length - 1;
        }
        path = path.replace('[pos]', `[${this.pathPos}]`);
      }
      const elem: any[] = jp.query(obj, path, 1);
      return elem.length > 0 ? elem[0] : null;
    }
    return null;
  }

  private getXPathValue(obj: any, path: string, namespaces: any) {
    let result = null;
    if (path) {
      const select = xpath.useNamespaces(namespaces);
      if (path.includes('[pos]')) {
        const posPath = path.substring(0, path.indexOf('[pos]'));
        const elements = select(posPath, obj);
        if (elements && Array.isArray(elements)) {
          this.posLength = elements.length;
        }
        path = path.replace('[pos]', `[${this.pathPos}]`);
      }
      const selection = select(path, obj);
      result = this.getSelectionValue(selection);
    }
    return result;
  }

  private getSelectionValue(selection: any) {
    let result = '';
    if (selection) {
      if (Array.isArray(selection)) {
        result = selection.length > 0 ? selection[0].textContent : '';
      } else {
        result = selection.textContent;
      }
    }

    return result;
  }

  private addParams(params: any, urlParams: string) {
    const newParams: any = {};
    Object.keys(params).forEach(k => {
      if (params[k]) {
        const value = params[k];
        newParams[k] = value;
      }
    });
    if (urlParams) {
      const urlParamsMap = urlParams.split('&').map((s) => {
        const equalIndex = s.indexOf('=');
        const keyValue = [s.substring(0, equalIndex), s.substring(equalIndex + 1)];
        return {key: keyValue[0], value: keyValue[1]};
      });
      urlParamsMap.forEach(p => {
        newParams[p.key] = p.value;
      });
    }
    return newParams;
  }

  private getToday() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  private getNext15() {
    const next15days = new Date();
    next15days.setDate(next15days.getDate() + 15);
    return next15days.toISOString().split('T')[0];
  }
}
