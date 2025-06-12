import { Injectable } from '@angular/core';
import { Http } from '@capacitor-community/http';
import { InstancesService } from './instances.service';
import * as uriTemplate from 'uri-templates';
import * as jp from 'jsonpath';
import * as xpath from 'xpath';
import * as xmldom from 'xmldom';
import { MapaService } from './mapa.service';

@Injectable({
  providedIn: 'root'
})
export class RequestService {

  responseType = 'json';
  pathPos = 0;
  posLength = 1;

  constructor(private instancesService: InstancesService, private mapaService: MapaService) { }

  addParamsToUrl(task: any) {
    const params = task.parameters;
    if (params) {
      const keys = Object.keys(params);
      const queryParams: string[] = [];
      keys.forEach(k => {
        const param = params[k];
        if (param.type === 'query' && param.required) {
          queryParams.push(k);
        }
      });
      if (queryParams.length > 0) {
        task.url = `${task.url}{?${queryParams.toString()}}`;
      }
    }
  }

  async templateRequest(task: any, mapping: any, parentData: any = {}, params: any = {}) {
    this.addParamsToUrl(task);
    this.responseType = 'json';
    const uri = await this.generateUrlByTemplate(task.url, task.parameters, mapping, parentData, params);
    console.log(`Requested url: ${uri}`);
    let url = uri;
    try {
      url = decodeURIComponent(uri);
    } catch(error) {
      console.error(error);
    }
    const urlParts = url.split('?');
    params = this.addParams(params, urlParts.length > 1 ? urlParts[1] : '');
    const options = {
      url: urlParts[0],
      method: 'GET',
      headers: {
        'Accept': 'application/json,application/xml'
      },
      params
    };
    return new Promise<any[]>((resolve, reject) => {
      Http.request(options).then(data => {
        resolve(this.mappingResponse(data.data, mapping));
      }).catch(error => {
        reject(error);
      });
    });
  }

  private async generateUrlByTemplate(template: string, params: any, mapping: any, parentData: any, urlParams: any) {
    const strInput = JSON.stringify(mapping.input);
    const position = strInput.includes('${LONGITUD}') || strInput.includes('${LONGITUD}') ? await this.mapaService.getLocation() : null;
    //const url = await this.generateStandard(template, params, mapping, parentData, urlParams, position);
    const url = await this.generateWithUriTemplate(template, params, mapping, parentData, urlParams, position);
    this.removeAllParams(strInput, urlParams);
    return url;
  }

  private async generateStandard(template: string, params: any, mapping: any, parentData: any, urlParams: any, position: any) {
    let url = template;
    const matches = this.getMatches(template);
    matches.forEach(r => {
      url = url.replace(r[0], this.calculateInputs(r[1], params, mapping, parentData, position, urlParams));
    });
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
        result = this.getCalculatedInputValue(mapInput.value, parentData, position, urlParams);
      } else {
        result = mapInput.value;
      }
    }
    return result;
  }

  private getCalculatedInputValue(param: string, parentData: any, position: any, urlParams: any) {
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
      default:
        return param;
    }
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

  private getXPathValueOld(obj: any, path: string) {
    let result = null;
    if (path) {
      const segments = path.substring(1).split('/');
      result = obj;
      for (let seg of segments) {
        if(seg.startsWith('@')) {
          result = result['$'][seg.substring(1)];
        } else if (seg.endsWith('[pos]')) {
          const elements: any[] = result[seg.replace('[pos]', '')];
          this.posLength = elements.length;
          result = elements[this.pathPos];
        } else {
          result = result[seg];
        }
      }
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
        newParams[k] = params[k];
      }
    });
    if (urlParams) {
      const urlParamsMap = urlParams.split('&').map((s) => {
        const keyValue = s.split('=');
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
